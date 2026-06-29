import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)

from gyms.models import Gym
from .models import GymPointsConfig, Reward, RewardRedemption, UserPoints
from .serializers import (
    AthleteStatsSerializer,
    GymPointsConfigSerializer,
    RewardRedemptionSerializer,
    RewardSerializer,
)

User = get_user_model()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_stats(request):
    """
    Devuelve puntos confirmados, puntos pendientes de aprobación y el
    historial reciente del atleta autenticado.
    """
    user = request.user

    approved_qs = UserPoints.objects.filter(user=user, status=UserPoints.Status.APPROVED)
    pending_qs  = UserPoints.objects.filter(user=user, status=UserPoints.Status.PENDING)

    total_confirmed = approved_qs.aggregate(total=Sum("points"))["total"] or 0
    total_pending   = pending_qs.aggregate(total=Sum("pending_points"))["total"] or 0

    # Historial: aprobados recientes primero, luego pendientes
    recent_entries = (
        UserPoints.objects
        .filter(user=user)
        .select_related("reviewed_by")
        .order_by("-created_at")[:15]
    )
    recent_data = [
        {
            "id":            str(p.id),
            "points":        p.points,
            "pending_points": p.pending_points,
            "status":        p.status,
            "source":        p.source,
            "description":   p.description,
            "reviewed_by":   p.reviewed_by.get_full_name() if p.reviewed_by else None,
            "reviewed_at":   p.reviewed_at,
            "created_at":    p.created_at,
        }
        for p in recent_entries
    ]

    return Response({
        "total_points":   total_confirmed,
        "pending_points": total_pending,
        "recent_points":  recent_data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ranking(request):
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

    from django.db.models import IntegerField
    from django.db.models.functions import Coalesce
    athletes = (
        User.objects.filter(gym=gym, role="athlete")
        .annotate(total_points=Coalesce(Sum("points__points"), 0, output_field=IntegerField()))
        .order_by("-total_points")
    )

    athlete_points = []
    for i, athlete in enumerate(athletes, start=1):
        athlete_points.append({
            "rank": i,
            "athlete_id": str(athlete.id),
            "name": athlete.get_full_name() or athlete.email,
            "email": athlete.email,
            "avatar_url": athlete.avatar_url if hasattr(athlete, "avatar_url") else None,
            "total_points": athlete.total_points,
        })

    current_user_id = str(request.user.id)
    my_entry = next((e for e in athlete_points if e["athlete_id"] == current_user_id), None)

    return Response({
        "gym": gym.name,
        "ranking": athlete_points,
        "my_rank": my_entry["rank"] if my_entry else None,
        "my_points": my_entry["total_points"] if my_entry else None,
    })


# ── Points approval ──────────────────────────────────────────────────────────
# Session-level pending/approve removed. Points are granted at the weekly level
# via POST /api/workouts/approve-week/<athlete_id>/ from the adherencia view.



# ── GymPointsConfig ───────────────────────────────────────────────────────────

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def gym_points_config(request, gym_slug=None):
    gym = Gym.objects.filter(slug=gym_slug).first()
    if not gym:
        return Response({"detail": "Gimnasio no encontrado."}, status=404)

    cfg, _ = GymPointsConfig.objects.get_or_create(gym=gym)

    if request.method == "PATCH":
        if request.user.role not in ("gym_admin", "super_admin"):
            return Response({"detail": "No autorizado."}, status=403)
        serializer = GymPointsConfigSerializer(cfg, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    return Response(GymPointsConfigSerializer(cfg).data)


# ── Rewards ───────────────────────────────────────────────────────────────────

class RewardViewSet(viewsets.ModelViewSet):
    serializer_class = RewardSerializer
    permission_classes = [IsAuthenticated]

    def _gym(self):
        return Gym.objects.filter(slug=self.kwargs["gym_slug"]).first()

    def get_queryset(self):
        gym = self._gym()
        if not gym:
            return Reward.objects.none()
        qs = Reward.objects.filter(gym=gym)
        # Gym admin sees all; athletes only see active ones
        if self.request.user.role == "athlete":
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        gym = self._gym()
        serializer.save(gym=gym)

    def check_admin(self):
        if self.request.user.role not in ("gym_admin", "super_admin"):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Solo el administrador puede gestionar recompensas.")

    def create(self, request, *args, **kwargs):
        self.check_admin()
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self.check_admin()
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.check_admin()
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.check_admin()
        return super().destroy(request, *args, **kwargs)


# ── RewardRedemptions ─────────────────────────────────────────────────────────

class RewardRedemptionViewSet(viewsets.ModelViewSet):
    serializer_class = RewardRedemptionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def _gym(self):
        return Gym.objects.filter(slug=self.kwargs["gym_slug"]).first()

    def get_queryset(self):
        gym = self._gym()
        if not gym:
            return RewardRedemption.objects.none()
        user = self.request.user
        if user.role == "athlete":
            return RewardRedemption.objects.filter(athlete=user, reward__gym=gym)
        # Gym admin / nutritionist see all gym redemptions
        return RewardRedemption.objects.filter(reward__gym=gym).select_related("athlete", "reward")

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError

        user = self.request.user
        gym = self._gym()
        reward_id = serializer.validated_data["reward"].id

        with transaction.atomic():
            reward = Reward.objects.select_for_update().get(pk=reward_id)

            if reward.gym_id != gym.id:
                raise ValidationError({"detail": "Recompensa no pertenece a este gimnasio."})

            if not reward.is_active:
                raise ValidationError({"detail": "Esta recompensa no está disponible."})

            # Re-check stock inside the lock to prevent over-redemption
            if reward.available_stock is not None and reward.available_stock <= 0:
                raise ValidationError({"detail": "No hay stock disponible para esta recompensa."})

            total_points = (
                UserPoints.objects
                .filter(user=user, status=UserPoints.Status.APPROVED)
                .aggregate(t=Sum("points"))["t"] or 0
            )
            if total_points < reward.points_cost:
                raise ValidationError({
                    "detail": f"Puntos insuficientes. Necesitas {reward.points_cost} pts, tienes {total_points}."
                })

            serializer.save(athlete=user)

    @action(detail=True, methods=["patch"], url_path="review")
    def review(self, request, gym_slug=None, pk=None):
        """Admin approves or rejects a redemption request."""
        if request.user.role not in ("gym_admin", "super_admin"):
            return Response({"detail": "No autorizado."}, status=403)

        redemption = self.get_object()
        new_status = request.data.get("status")

        if new_status not in (RewardRedemption.Status.APPROVED, RewardRedemption.Status.REJECTED):
            return Response({"detail": "Estado inválido. Use 'approved' o 'rejected'."}, status=400)

        if redemption.status != RewardRedemption.Status.PENDING:
            return Response({"detail": "Solo se pueden revisar solicitudes pendientes."}, status=400)

        redemption.status      = new_status
        redemption.notes       = request.data.get("notes", "")
        redemption.reviewed_by = request.user
        redemption.reviewed_at = timezone.now()
        redemption.save(update_fields=["status", "notes", "reviewed_by", "reviewed_at", "updated_at"])

        if new_status == RewardRedemption.Status.APPROVED:
            cost = redemption.reward.points_cost
            # Deduct points atomically — born approved so they count immediately
            UserPoints.objects.create(
                user=redemption.athlete,
                points=-cost,
                pending_points=-cost,
                status=UserPoints.Status.APPROVED,
                reviewed_by=request.user,
                reviewed_at=timezone.now(),
                source="reward_redemption",
                description=f"Canje: {redemption.reward.name}",
            )

        return Response(RewardRedemptionSerializer(redemption).data)
