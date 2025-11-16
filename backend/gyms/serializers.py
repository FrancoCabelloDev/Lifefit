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
            "brand_color",
            "website",
            "contact_email",
            "metrics",
            "branches",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "branches"]
