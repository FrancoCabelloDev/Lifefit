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

def _award_points(user_id: int, points: int, source: str = "challenge") -> None:
    """Registra puntos ganados por completar un reto."""
    try:
        from gamification.models import PointsLog
        PointsLog.objects.create(
            user_id=user_id,
            points=points,
            source=source,
            description="Reto completado",
        )
    except Exception:
        logger.warning("No se pudo crear PointsLog para user %s, source=%s", user_id, source, exc_info=True)


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

    _award_points(participation.user_id, points)

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
