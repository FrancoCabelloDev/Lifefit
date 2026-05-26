from rest_framework import serializers

from core.serializers import FeatureFlagSerializer
from .models import Branch, Gym, GymMembershipPlan, GymFeatureFlag


class BranchSerializer(serializers.ModelSerializer):
    gym = serializers.PrimaryKeyRelatedField(queryset=Gym.objects.all())

    class Meta:
        model = Branch
        fields = [
            "id",
            "gym",
            "name",
            "slug",
            "address",
            "city",
            "state",
            "country",
            "zipcode",
            "status",
            "phone",
            "latitude",
            "longitude",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class GymSerializer(serializers.ModelSerializer):
    branches = BranchSerializer(many=True, read_only=True)

    class Meta:
        model = Gym
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "location",
            "status",
            "logo",
            "ruc",
            "brand_color",
            "website",
            "contact_email",
            "metrics",
            "max_athletes",
            "max_coaches",
            "max_nutritionists",
            "branches",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "branches"]


class PublicGymSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gym
        fields = [
            "id",
            "name",
            "slug",
            "location",
            "logo",
            "brand_color",
        ]
        read_only_fields = fields


class GymMembershipPlanSerializer(serializers.ModelSerializer):
    gym_name = serializers.CharField(source="gym.name", read_only=True)

    class Meta:
        model = GymMembershipPlan
        fields = [
            "id",
            "gym",
            "gym_name",
            "name",
            "description",
            "price",
            "duration_days",
            "features",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "gym_name"]


class GymFeatureFlagSerializer(serializers.ModelSerializer):
    feature_flag_detail = FeatureFlagSerializer(source="feature_flag", read_only=True)

    class Meta:
        model = GymFeatureFlag
        fields = [
            "id",
            "gym",
            "feature_flag",
            "feature_flag_detail",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
