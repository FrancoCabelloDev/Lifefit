"""Badge award engine.

Badge.condition format: "<key>:<threshold>"
Supported keys:
  workouts_completed   — total completed WorkoutSessions
  challenges_completed — completed ChallengeParticipations
  checkins             — total CheckIns
"""
from django.db import transaction

from .models import Badge, ChallengeParticipation, UserBadge


def check_and_award_badges(user):
    """Award any unearned badges whose conditions the user now meets."""
    if not user.gym_id:
        return

    already_earned = set(
        UserBadge.objects.filter(user=user).values_list("badge_id", flat=True)
    )
    candidates = Badge.objects.filter(gym_id=user.gym_id).exclude(id__in=already_earned)

    with transaction.atomic():
        for badge in candidates:
            if _meets_condition(user, badge.condition):
                UserBadge.objects.get_or_create(user=user, badge=badge)


def _meets_condition(user, condition: str) -> bool:
    try:
        key, raw_value = condition.split(":", 1)
        threshold = int(raw_value)
    except (ValueError, AttributeError):
        return False

    if key == "workouts_completed":
        from workouts.models import WorkoutSession
        return (
            WorkoutSession.objects.filter(user=user, status="completed").count()
            >= threshold
        )

    if key == "challenges_completed":
        return (
            ChallengeParticipation.objects.filter(
                user=user, status=ChallengeParticipation.ParticipationStatus.COMPLETED
            ).count()
            >= threshold
        )

    if key == "checkins":
        from gyms.models import CheckIn
        return CheckIn.objects.filter(user=user).count() >= threshold

    return False
