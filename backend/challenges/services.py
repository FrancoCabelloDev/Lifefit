"""
challenges/services.py
──────────────────────
Capa de servicios para la verificación de retos.

Principios aplicados:
  - Las vistas y señales delegan aquí; no contienen lógica de negocio.
  - Cada función hace una sola cosa (SRP).
  - Toda operación que toca puntos/estado es atómica (select_for_update + transaction).
  - Las funciones son idempotentes: llamarlas varias veces con los mismos datos
    produce el mismo resultado (seguro para cron y señales).
"""

from __future__ import annotations

import logging
from datetime import date
from typing import TYPE_CHECKING

from django.db import transaction

from django.utils import timezone

if TYPE_CHECKING:
    from django.contrib.auth import get_user_model
    from .models import Challenge, ChallengeParticipation

    User = get_user_model()

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Cálculo de progreso automático
# ─────────────────────────────────────────────────────────────────────────────

def _count_attendance(user_id, start_date: date, end_date: date) -> int:
    """Cuenta check-ins del atleta dentro del período del reto."""
    from gyms.models import CheckIn
    return CheckIn.objects.filter(
        user_id=user_id,
        timestamp__date__gte=start_date,
        timestamp__date__lte=end_date,
    ).count()


def _count_workouts(user_id, start_date: date, end_date: date) -> int:
    """Cuenta sesiones de entrenamiento completadas en el período."""
    from workouts.models import WorkoutSession
    return WorkoutSession.objects.filter(
        user_id=user_id,
        status=WorkoutSession.Status.COMPLETED,
        performed_at__date__gte=start_date,
        performed_at__date__lte=end_date,
    ).count()


def _count_nutrition(user_id, start_date: date, end_date: date) -> int:
    """
    Cuenta días distintos en que el atleta completó al menos una comida
    de su plan nutricional dentro del período.
    """
    from nutrition.models import UserMealLog
    return (
        UserMealLog.objects.filter(
            user_id=user_id,
            completed=True,
            date__gte=str(start_date),
            date__lte=str(end_date),
        )
        .values("date")
        .distinct()
        .count()
    )


_PROGRESS_CALCULATORS = {
    "attendance": _count_attendance,
    "workouts": _count_workouts,
    "nutrition": _count_nutrition,
}


def compute_auto_progress(participation: "ChallengeParticipation") -> int:
    """
    Calcula el progreso actual de una participación automática.
    Devuelve el valor entero (sin modificar el objeto).
    """
    challenge = participation.challenge
    calculator = _PROGRESS_CALCULATORS.get(challenge.type)
    if not calculator:
        return participation.progress  # tipo no medible automáticamente

    return calculator(
        participation.user_id,
        challenge.start_date,
        challenge.end_date,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Otorgar puntos
# ─────────────────────────────────────────────────────────────────────────────

def _award_points(user_id: int, points: int, source: str = "challenge", challenge=None) -> None:
    """Registra puntos ganados por completar un reto. Nace aprobado (se cuenta de inmediato)."""
    try:
        from gamification.models import UserPoints
        UserPoints.objects.create(
            user_id=user_id,
            points=points,
            pending_points=points,
            status=UserPoints.Status.APPROVED,
            source=source,
            description="Reto completado" if challenge is None else f"Reto completado: {challenge.name}",
            related_challenge=challenge,
        )
    except Exception:
        logger.warning("No se pudo crear UserPoints para user %s, source=%s", user_id, source, exc_info=True)


# ─────────────────────────────────────────────────────────────────────────────
# Completar participación
# ─────────────────────────────────────────────────────────────────────────────

def _notify(recipient_id: int, notification_type: str, title: str, message: str = "", gym_id=None) -> None:
    """Crea una notificación sin interrumpir el flujo principal si falla."""
    try:
        from gyms.models import Notification
        from gyms.views import create_notification
        from django.contrib.auth import get_user_model
        User = get_user_model()
        recipient = User.objects.get(pk=recipient_id)
        create_notification(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
        )
    except Exception as exc:
        logger.warning("No se pudo crear notificación para user %s: %s", recipient_id, exc)


def _mark_completed(participation: "ChallengeParticipation", verified_by_id=None) -> None:
    """
    Marca la participación como completada y otorga los puntos de recompensa.
    Idempotente: no otorga puntos dos veces.
    """
    from .models import ChallengeParticipation
    from .awards import check_and_award_badges

    if participation.status == ChallengeParticipation.ParticipationStatus.COMPLETED:
        return  # ya completada, nada que hacer

    points = participation.challenge.reward_points

    with transaction.atomic():
        # Re-leer con lock para evitar doble otorgamiento en race conditions
        locked = (
            ChallengeParticipation.objects
            .select_for_update()
            .get(pk=participation.pk)
        )
        if locked.status == ChallengeParticipation.ParticipationStatus.COMPLETED:
            return

        update_fields = ["status", "points_earned", "last_update"]
        locked.status = ChallengeParticipation.ParticipationStatus.COMPLETED
        locked.points_earned = points

        if verified_by_id:
            locked.verified_by_id = verified_by_id
            locked.verified_at = timezone.now()
            update_fields += ["verified_by", "verified_at"]

        locked.save(update_fields=update_fields)

    _award_points(participation.user_id, points, challenge=participation.challenge)

    # Notificar al atleta que completó el reto
    _notify(
        recipient_id=participation.user_id,
        notification_type="challenge_completed",
        title=f'¡Reto completado: {participation.challenge.name}!',
        message=f'Ganaste {points} puntos de experiencia. ¡Sigue así!',
    )

    try:
        check_and_award_badges(participation.user)
    except Exception as exc:
        logger.warning("check_and_award_badges falló para user %s: %s", participation.user_id, exc)


# ─────────────────────────────────────────────────────────────────────────────
# API pública del servicio
# ─────────────────────────────────────────────────────────────────────────────

def sync_participation_progress(participation: "ChallengeParticipation") -> "ChallengeParticipation":
    """
    Recalcula el progreso de una participación automática y la completa
    si supera el goal_value.

    Llaman a esta función:
      - Las señales de CheckIn, WorkoutSession y UserMealLog.
      - El comando de gestión `sync_challenge_progress`.
      - El endpoint `sync_progress` (admin/coach).
    """
    from .models import Challenge, ChallengeParticipation

    challenge = participation.challenge

    # Solo procesar retos activos con verificación automática
    if challenge.status != Challenge.Status.ACTIVE:
        return participation
    if challenge.verification_type != Challenge.VerificationType.AUTOMATIC:
        return participation
    if participation.status == ChallengeParticipation.ParticipationStatus.COMPLETED:
        return participation

    new_progress = compute_auto_progress(participation)

    if new_progress != participation.progress:
        ChallengeParticipation.objects.filter(pk=participation.pk).update(
            progress=new_progress
        )
        participation.progress = new_progress

    if new_progress >= challenge.goal_value:
        _mark_completed(participation)
        participation.refresh_from_db()

    return participation


def submit_evidence(participation: "ChallengeParticipation", note: str) -> "ChallengeParticipation":
    """
    El atleta envía evidencia para un reto de verificación manual.
    Cambia el estado a PENDING_REVIEW.
    """
    from .models import Challenge, ChallengeParticipation

    challenge = participation.challenge

    if challenge.verification_type != Challenge.VerificationType.MANUAL:
        raise ValueError("Este reto se verifica automáticamente; no requiere envío de evidencia.")

    if participation.status == ChallengeParticipation.ParticipationStatus.COMPLETED:
        raise ValueError("Esta participación ya fue completada.")

    if not note or not note.strip():
        raise ValueError("La evidencia no puede estar vacía.")

    participation.evidence_note = note.strip()
    participation.status = ChallengeParticipation.ParticipationStatus.PENDING_REVIEW
    participation.rejection_note = ""  # limpiar rechazo previo si reenvía
    participation.save(update_fields=["evidence_note", "status", "rejection_note", "last_update"])

    # Notificar al responsable del reto que tiene una evidencia pendiente de revisión
    challenge = participation.challenge
    if challenge.responsible_id:
        _notify(
            recipient_id=challenge.responsible_id,
            notification_type="challenge_pending_review",
            title=f'Evidencia pendiente: {challenge.name}',
            message=(
                f'{participation.user.get_full_name() or participation.user.email} '
                f'envió evidencia para el reto "{challenge.name}".'
            ),
        )

    return participation


def approve_participation(
    participation: "ChallengeParticipation",
    verified_by_id: int,
) -> "ChallengeParticipation":
    """
    El coach o nutricionista responsable aprueba la participación.
    Solo aplicable a retos de verificación manual en estado PENDING_REVIEW.
    """
    from .models import Challenge, ChallengeParticipation

    if participation.challenge.verification_type != Challenge.VerificationType.MANUAL:
        raise ValueError("Solo se pueden aprobar retos de verificación manual.")

    if participation.status != ChallengeParticipation.ParticipationStatus.PENDING_REVIEW:
        raise ValueError(
            f"La participación debe estar en 'Pendiente de revisión' para aprobarse. "
            f"Estado actual: {participation.get_status_display()}"
        )

    # Asumir progreso total en aprobación manual
    participation.progress = participation.challenge.goal_value
    participation.save(update_fields=["progress", "last_update"])

    # _mark_completed ya notifica al atleta con CHALLENGE_COMPLETED
    _mark_completed(participation, verified_by_id=verified_by_id)
    participation.refresh_from_db()
    return participation


def reject_participation(
    participation: "ChallengeParticipation",
    verified_by_id: int,
    rejection_note: str,
) -> "ChallengeParticipation":
    """
    El coach o nutricionista rechaza la participación con una nota.
    El atleta puede corregir y reenviar evidencia.
    """
    from .models import Challenge, ChallengeParticipation

    if participation.challenge.verification_type != Challenge.VerificationType.MANUAL:
        raise ValueError("Solo se pueden rechazar retos de verificación manual.")

    if participation.status != ChallengeParticipation.ParticipationStatus.PENDING_REVIEW:
        raise ValueError(
            f"Solo se puede rechazar una participación en revisión. "
            f"Estado actual: {participation.get_status_display()}"
        )

    if not rejection_note or not rejection_note.strip():
        raise ValueError("Debes indicar el motivo del rechazo.")

    with transaction.atomic():
        participation.status = ChallengeParticipation.ParticipationStatus.REJECTED
        participation.verified_by_id = verified_by_id
        participation.verified_at = timezone.now()
        participation.rejection_note = rejection_note.strip()
        participation.save(update_fields=[
            "status", "verified_by", "verified_at", "rejection_note", "last_update"
        ])

    # Notificar al atleta que su evidencia fue rechazada
    _notify(
        recipient_id=participation.user_id,
        notification_type="challenge_rejected",
        title=f'Evidencia rechazada: {participation.challenge.name}',
        message=f'Motivo: {rejection_note.strip()}. Puedes corregir y reenviar tu evidencia.',
    )

    return participation


def sync_all_active_participations() -> dict:
    """
    Recalcula el progreso de todas las participaciones automáticas activas.
    Usado por el comando de gestión y tareas periódicas (cron).
    Devuelve un resumen del resultado.
    """
    from .models import Challenge, ChallengeParticipation

    participations = (
        ChallengeParticipation.objects
        .select_related("challenge", "user")
        .filter(
            challenge__status=Challenge.Status.ACTIVE,
            challenge__verification_type=Challenge.VerificationType.AUTOMATIC,
            status=ChallengeParticipation.ParticipationStatus.JOINED,
        )
    )

    updated = 0
    completed = 0
    errors = 0

    for p in participations:
        try:
            before = p.status
            sync_participation_progress(p)
            p.refresh_from_db()
            updated += 1
            if p.status == ChallengeParticipation.ParticipationStatus.COMPLETED and before != p.status:
                completed += 1
        except Exception as exc:
            logger.error("Error sincronizando participación %s: %s", p.pk, exc)
            errors += 1

    return {"updated": updated, "completed": completed, "errors": errors}


# ─────────────────────────────────────────────────────────────────────────────
# Notificaciones de reto
# ─────────────────────────────────────────────────────────────────────────────

def notify_gym_athletes_new_challenge(challenge) -> int:
    """
    Envía una notificación a todos los atletas activos del gimnasio cuando
    se crea un nuevo reto. Devuelve la cantidad de notificaciones enviadas.
    No interrumpe el flujo si falla alguna notificación individual.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    if not challenge.gym_id:
        return 0

    target_roles = []
    if challenge.target_role == "all":
        target_roles = ["athlete", "coach", "nutritionist"]
    else:
        target_roles = [challenge.target_role]

    athletes = User.objects.filter(
        gym_id=challenge.gym_id,
        is_active=True,
        role__in=target_roles,
    ).exclude(id=challenge.responsible_id)

    end_str = challenge.end_date.strftime("%d/%m/%Y") if challenge.end_date else "—"
    sent = 0
    for athlete in athletes:
        _notify(
            recipient_id=athlete.pk,
            notification_type="challenge",
            title=f"Nuevo reto: {challenge.name}",
            message=(
                f"El reto '{challenge.name}' ya está disponible. "
                f"Premio: {challenge.reward_points} pts. Hasta el {end_str}."
            ),
        )
        sent += 1
    return sent


def declare_challenge_winner(
    participation,
    declared_by_id: int,
    bonus_points: int = 0,
) -> "ChallengeParticipation":
    """
    Declara al atleta de la participación como ganador del reto.
    - Marca is_winner = True en la participación.
    - Si el atleta aún no completó el reto, lo completa primero.
    - Otorga bonus_points adicionales si se especifican.
    - Notifica al ganador y a todos los atletas del gimnasio.
    Idempotente: si ya es winner, solo actualiza bonus si cambia.
    """
    from .models import ChallengeParticipation
    from django.contrib.auth import get_user_model
    User = get_user_model()

    challenge = participation.challenge

    with transaction.atomic():
        locked = (
            ChallengeParticipation.objects
            .select_for_update()
            .select_related("user", "challenge")
            .get(pk=participation.pk)
        )

        # Completar si no estaba completada
        if locked.status != ChallengeParticipation.ParticipationStatus.COMPLETED:
            locked.status = ChallengeParticipation.ParticipationStatus.COMPLETED
            locked.points_earned = challenge.reward_points
            locked.verified_by_id = declared_by_id
            locked.verified_at = timezone.now()
            _award_points(locked.user_id, challenge.reward_points, source="challenge", challenge=challenge)

        locked.is_winner = True
        locked.save(update_fields=["status", "points_earned", "is_winner", "verified_by", "verified_at"])

    # Bonus points por ganar
    if bonus_points > 0:
        _award_points(locked.user_id, bonus_points, source="challenge_winner", challenge=challenge)

    winner_name = f"{locked.user.first_name} {locked.user.last_name}".strip() or locked.user.email
    total_pts = challenge.reward_points + bonus_points

    # Notificar al ganador
    _notify(
        recipient_id=locked.user_id,
        notification_type="challenge",
        title=f"🥇 ¡Ganaste el reto '{challenge.name}'!",
        message=(
            f"Felicitaciones {locked.user.first_name}, eres el ganador. "
            f"Recibiste {total_pts} puntos en total."
        ),
    )

    # Notificar a todos los atletas del gym
    if challenge.gym_id:
        athletes = User.objects.filter(
            gym_id=challenge.gym_id,
            is_active=True,
        ).exclude(pk=locked.user_id)
        for athlete in athletes:
            _notify(
                recipient_id=athlete.pk,
                notification_type="challenge",
                title=f"🏆 Ganador del reto '{challenge.name}'",
                message=(
                    f"{winner_name} ganó el reto '{challenge.name}' "
                    f"con {total_pts} puntos. ¡Participa en el próximo!"
                ),
            )

    locked.refresh_from_db()
    return locked
