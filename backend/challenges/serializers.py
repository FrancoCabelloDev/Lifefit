from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Badge, Challenge, ChallengeParticipation, UserBadge, UserProgress

User = get_user_model()


class ChallengeSerializer(serializers.ModelSerializer):
    responsible_name = serializers.SerializerMethodField()
    responsible_role = serializers.SerializerMethodField()

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
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "responsible_name", "responsible_role"]

    def get_responsible_name(self, obj):
        if obj.responsible:
            return f"{obj.responsible.first_name} {obj.responsible.last_name}".strip() or obj.responsible.email
        return None

    def get_responsible_role(self, obj):
        if obj.responsible:
            return obj.responsible.role
        return None


class ChallengeParticipationSerializer(serializers.ModelSerializer):
    user_detail = serializers.SerializerMethodField(read_only=True)
    challenge_detail = ChallengeSerializer(source="challenge", read_only=True)

    class Meta:
        model = ChallengeParticipation
        fields = [
            "id",
            "challenge",
            "challenge_detail",
            "user",
            "user_detail",
            "progress",
            "status",
            "points_earned",
            "last_update",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "last_update", "created_at", "updated_at", "user_detail", "challenge_detail"]

    def get_user_detail(self, obj):
        return {"id": obj.user_id, "email": obj.user.email, "first_name": obj.user.first_name, "last_name": obj.user.last_name}


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


class UserProgressSerializer(serializers.ModelSerializer):
    user_detail = serializers.SerializerMethodField()

    class Meta:
        model = UserProgress
        fields = [
            "id",
            "user",
            "user_detail",
            "level",
            "total_points",
            "current_xp",
            "next_level_xp",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "user_detail"]

    def get_user_detail(self, obj):
        return {"id": obj.user_id, "email": obj.user.email, "first_name": obj.user.first_name, "last_name": obj.user.last_name}
