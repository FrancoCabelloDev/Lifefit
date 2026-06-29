from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Badge, Challenge, ChallengeParticipation, UserBadge

User = get_user_model()


class ChallengeSerializer(serializers.ModelSerializer):
    responsible_name = serializers.SerializerMethodField()
    responsible_role = serializers.SerializerMethodField()
    current_participants = serializers.SerializerMethodField()
    is_full = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = [
            "id",
            "gym",
            "name",
            "description",
            "type",
            "start_date",
            "start_time",
            "end_date",
            "responsible",
            "responsible_name",
            "responsible_role",
            "reward_points",
            "goal_value",
            "status",
            "verification_type",
            "max_participants",
            "target_role",
            "current_participants",
            "is_full",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "created_at", "updated_at",
            "responsible_name", "responsible_role",
            "current_participants", "is_full",
        ]

    def get_responsible_name(self, obj):
        if obj.responsible:
            return f"{obj.responsible.first_name} {obj.responsible.last_name}".strip() or obj.responsible.email
        return None

    def get_responsible_role(self, obj):
        if obj.responsible:
            return obj.responsible.role
        return None

    def get_current_participants(self, obj):
        """
        Cuenta inscripciones activas (joined + pending_review + completed).
        Usa el prefetch '_active_participants' del ViewSet si está disponible
        para evitar N+1 queries. Dropped y rejected no ocupan cupo.
        """
        # Ruta rápida: el ViewSet pre-cargó las participaciones activas
        if hasattr(obj, "_active_participants"):
            return len(obj._active_participants)

        # Fallback (ej. detalle sin prefetch, o uso fuera del ViewSet)
        from .models import ChallengeParticipation
        return obj.participants.filter(
            status__in=[
                ChallengeParticipation.ParticipationStatus.JOINED,
                ChallengeParticipation.ParticipationStatus.PENDING_REVIEW,
                ChallengeParticipation.ParticipationStatus.COMPLETED,
            ]
        ).count()

    def get_is_full(self, obj):
        """True si el reto alcanzó su límite de participantes."""
        if obj.max_participants is None:
            return False
        return self.get_current_participants(obj) >= obj.max_participants


class ChallengeParticipationSerializer(serializers.ModelSerializer):
    user_detail = serializers.SerializerMethodField(read_only=True)
    challenge_detail = ChallengeSerializer(source="challenge", read_only=True)
    verified_by_name = serializers.SerializerMethodField(read_only=True)
    progress_percentage = serializers.IntegerField(read_only=True)

    class Meta:
        model = ChallengeParticipation
        fields = [
            "id",
            "challenge",
            "challenge_detail",
            "user",
            "user_detail",
            "progress",
            "progress_percentage",
            "status",
            "points_earned",
            "last_update",
            "is_winner",
            # Verificación
            "evidence_note",
            "verified_by",
            "verified_by_name",
            "verified_at",
            "rejection_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "last_update", "created_at", "updated_at",
            "user_detail", "challenge_detail", "verified_by_name",
            "progress_percentage", "verified_by", "verified_at",
            "points_earned", "is_winner",
        ]

    def get_user_detail(self, obj):
        return {
            "id": str(obj.user_id),
            "email": obj.user.email,
            "first_name": obj.user.first_name,
            "last_name": obj.user.last_name,
        }

    def get_verified_by_name(self, obj):
        if obj.verified_by:
            return f"{obj.verified_by.first_name} {obj.verified_by.last_name}".strip() or obj.verified_by.email
        return None


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ["id", "gym", "name", "description", "icon", "condition", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class UserBadgeSerializer(serializers.ModelSerializer):
    badge_detail = BadgeSerializer(source="badge", read_only=True)

    class Meta:
        model = UserBadge
        fields = ["id", "user", "badge", "badge_detail", "awarded_at"]
        read_only_fields = ["id", "awarded_at", "badge_detail"]

