from rest_framework import serializers

from .models import Branch, Gym


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
