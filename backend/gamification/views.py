from django.contrib.auth import get_user_model
from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from gyms.models import Gym
from .models import UserPoints
from .serializers import AthleteStatsSerializer

User = get_user_model()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_stats(request):
    gym_slug = request.query_params.get("gym")
    gym = Gym.objects.filter(slug=gym_slug).first() if gym_slug else None

    total_points = (
        UserPoints.objects.filter(user=request.user).aggregate(total=Sum("points"))["total"] or 0
    )

    recent_points = UserPoints.objects.filter(user=request.user).order_by("-created_at")[:10]
    recent_data = [
        {
            "id": str(p.id),
            "points": p.points,
            "source": p.source,
            "description": p.description,
            "created_at": p.created_at,
        }
        for p in recent_points
    ]

    return Response({
        "total_points": total_points,
        "recent_points": recent_data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ranking(request):
    """
    Ranking de atletas por puntos totales dentro de un gimnasio.
    ?gym_id= (UUID) o ?gym_slug= (slug)
    """
    gym_id   = request.query_params.get("gym_id")
    gym_slug = request.query_params.get("gym_slug") or request.query_params.get("gym")

    if gym_id:
        gym = Gym.objects.filter(id=gym_id).first()
    elif gym_slug:
        gym = Gym.objects.filter(slug=gym_slug).first()
    else:
        return Response({"detail": "Se requiere gym_id o gym_slug."}, status=400)

    if not gym:
        return Response({"detail": "Gimnasio no encontrado."}, status=404)

    athletes = User.objects.filter(gym=gym, role="athlete")

    athlete_points = []
    for athlete in athletes:
        total = (
            UserPoints.objects.filter(user=athlete)
            .aggregate(total=Sum("points"))["total"] or 0
        )
        athlete_points.append({
            "athlete_id": str(athlete.id),
            "name": athlete.get_full_name() or athlete.email,
            "email": athlete.email,
            "avatar_url": athlete.avatar_url if hasattr(athlete, "avatar_url") else None,
            "total_points": total,
        })

    athlete_points.sort(key=lambda x: x["total_points"], reverse=True)

    for i, entry in enumerate(athlete_points, start=1):
        entry["rank"] = i

    # Mark current user's position
    current_user_id = str(request.user.id)
    my_entry = next((e for e in athlete_points if e["athlete_id"] == current_user_id), None)

    return Response({
        "gym": gym.name,
        "ranking": athlete_points,
        "my_rank": my_entry["rank"] if my_entry else None,
        "my_points": my_entry["total_points"] if my_entry else None,
    })
