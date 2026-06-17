from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.constants import XP_PER_LEVEL
from gyms.models import Gym
from .models import AthleteStreak, UserPoints
from .serializers import AthleteStreakSerializer, AthleteStatsSerializer


def compute_level(total_points):
    level = max(1, total_points // XP_PER_LEVEL + 1)
    xp_in_level = total_points % XP_PER_LEVEL
    xp_to_next = XP_PER_LEVEL - xp_in_level
    return level, xp_in_level, xp_to_next


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_streak(request):
    gym_slug = request.query_params.get("gym")
    gym = Gym.objects.filter(slug=gym_slug).first() if gym_slug else None
    if not gym:
        return Response({"current_streak": 0, "longest_streak": 0, "last_activity_date": None})
    streak, _ = AthleteStreak.objects.get_or_create(user=request.user, gym=gym)
    return Response(AthleteStreakSerializer(streak).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_stats(request):
    gym_slug = request.query_params.get("gym")
    gym = Gym.objects.filter(slug=gym_slug).first() if gym_slug else None

    total_points = (
        UserPoints.objects.filter(user=request.user).aggregate(total=Sum("points"))["total"] or 0
    )
    level, xp_in_level, xp_to_next = compute_level(total_points)

    streak_data = {"current_streak": 0, "longest_streak": 0, "last_activity_date": None}
    if gym:
        streak, _ = AthleteStreak.objects.get_or_create(user=request.user, gym=gym)
        streak_data = AthleteStreakSerializer(streak).data

    recent_points = UserPoints.objects.filter(user=request.user).order_by("-created_at")[:10]
    recent_data = [
        {"id": str(p.id), "points": p.points, "source": p.source, "description": p.description, "created_at": p.created_at}
        for p in recent_points
    ]

    return Response({
        "total_points": total_points,
        "level": level,
        "xp_in_level": xp_in_level,
        "xp_to_next": xp_to_next,
        "streak": streak_data,
        "recent_points": recent_data,
    })
