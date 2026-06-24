"""
challenges/signals.py
─────────────────────
Señales que disparan la sincronización automática del progreso de retos.

Regla: las señales son delgadas. Solo obtienen las participaciones relevantes
y delegan en services.sync_participation_progress().
"""

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .awards import check_and_award_badges

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers internos
# ─────────────────────────────────────────────────────────────────────────────

def _sync_auto_participations(user_id, challenge_type: str) -> None:
    """
    Busca participaciones activas y automáticas del tipo indicado para
    el usuario y lanza la sincronización de progreso en cada una.
    """
    from .models import Challenge, ChallengeParticipation
    from .services import sync_participation_progress

    participations = (
        ChallengeParticipation.objects
        .select_related("challenge", "user")
        .filter(
            user_id=user_id,
            status=ChallengeParticipation.ParticipationStatus.JOINED,
            challenge__type=challenge_type,
            challenge__status=Challenge.Status.ACTIVE,
            challenge__verification_type=Challenge.VerificationType.AUTOMATIC,
        )
    )

    for participation in participations:
        sync_participation_progress(participation)


# ─────────────────────────────────────────────────────────────────────────────
# Señales existentes (entrenamientos y badges)
# ─────────────────────────────────────────────────────────────────────────────

@receiver(post_save, sender="workouts.WorkoutSession")
def on_workout_session_save(sender, instance, **kwargs):
    """Actualiza progreso de retos tipo 'workouts' cuando una sesión se completa."""
    if instance.status != "completed" or not instance.user_id:
        return

    update_fields = kwargs.get("update_fields")
    if update_fields is not None and set(update_fields) == {"points_awarded"}:
        return

    try:
        user = instance.user
    except Exception:
        logger.warning("on_workout_session_save: fallo acceso a instance.user (pk=%s), usando DB", instance.user_id)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(pk=instance.user_id).first()

    if not user or user.role != "athlete":
        return

    _sync_auto_participations(instance.user_id, "workouts")
    check_and_award_badges(user)


@receiver(post_save, sender="challenges.ChallengeParticipation")
def on_participation_save(sender, instance, **kwargs):
    """Otorga badges cuando una participación queda completada."""
    if instance.status != "completed" or not instance.user_id:
        return

    try:
        user = instance.user
    except Exception:
        logger.warning("on_participation_save: fallo acceso a instance.user (pk=%s), usando DB", instance.user_id)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(pk=instance.user_id).first()

    if user:
        check_and_award_badges(user)


@receiver(post_save, sender="challenges.UserProgress")
def on_progress_save(sender, instance, **kwargs):
    """Otorga badges basados en nivel cuando cambia el progreso."""
    if not instance.user_id:
        return

    try:
        user = instance.user
    except Exception:
        logger.warning("on_progress_save: fallo acceso a instance.user (pk=%s), usando DB", instance.user_id)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(pk=instance.user_id).first()

    if user:
        check_and_award_badges(user)


# ─────────────────────────────────────────────────────────────────────────────
# Nuevas señales — verificación automática
# ─────────────────────────────────────────────────────────────────────────────

@receiver(post_save, sender="gyms.CheckIn")
def on_checkin_save(sender, instance, created, **kwargs):
    """
    Sincroniza progreso de retos tipo 'attendance' cuando el atleta
    hace check-in en el gimnasio.
    """
    if not created or not instance.user_id:
        return

    try:
        user = instance.user
    except Exception:
        logger.warning("on_checkin_save: fallo acceso a instance.user (pk=%s), usando DB", instance.user_id)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(pk=instance.user_id).first()

    if not user or user.role != "athlete":
        return

    _sync_auto_participations(instance.user_id, "attendance")


@receiver(post_save, sender="nutrition.UserMealLog")
def on_meal_log_save(sender, instance, **kwargs):
    """
    Sincroniza progreso de retos tipo 'nutrition' cuando el atleta
    marca una comida como completada en su plan.
    """
    if instance.status != "completed" or not instance.user_id:
        return

    try:
        user = instance.user
    except Exception:
        logger.warning("on_meal_log_save: fallo acceso a instance.user (pk=%s), usando DB", instance.user_id)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(pk=instance.user_id).first()

    if not user or user.role != "athlete":
        return

    _sync_auto_participations(instance.user_id, "nutrition")
