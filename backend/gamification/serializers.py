from django.utils import timezone
from rest_framework import serializers

from .models import GymPointsConfig, Reward, RewardRedemption, UserPoints


class UserPointsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPoints
        fields = ["id", "points", "source", "description", "created_at"]


class AthleteStatsSerializer(serializers.Serializer):
    total_points = serializers.IntegerField()
    level = serializers.IntegerField()
    xp_in_level = serializers.IntegerField()
    xp_to_next = serializers.IntegerField()
    recent_points = UserPointsSerializer(many=True)


# ── Puntos & Recompensas ──────────────────────────────────────────────────────

class GymPointsConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymPointsConfig
        fields = [
            "id",
            "nutrition_week_points",
            "workout_week_points",
            "challenge_points",
            "updated_at",
        ]


class RewardSerializer(serializers.ModelSerializer):
    available_stock = serializers.ReadOnlyField()

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.image:
            try:
                rep['image'] = instance.image.url
            except Exception:
                rep['image'] = None
        else:
            rep['image'] = None
        return rep

    class Meta:
        model = Reward
        fields = [
            "id",
            "name",
            "description",
            "image",
            "points_cost",
            "stock",
            "available_stock",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class RewardRedemptionSerializer(serializers.ModelSerializer):
    reward_name = serializers.CharField(source="reward.name", read_only=True)
    reward_points_cost = serializers.IntegerField(source="reward.points_cost", read_only=True)
    athlete_name = serializers.SerializerMethodField()

    class Meta:
        model = RewardRedemption
        fields = [
            "id",
            "reward",
            "reward_name",
            "reward_points_cost",
            "athlete_name",
            "status",
            "notes",
            "reviewed_by",
            "reviewed_at",
            "created_at",
        ]
        read_only_fields = ["id", "reviewed_by", "reviewed_at", "created_at"]

    def get_athlete_name(self, obj):
        return obj.athlete.get_full_name() or obj.athlete.email
