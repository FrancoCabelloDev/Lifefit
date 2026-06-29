from rest_framework import serializers
from .models import FeatureFlag, GlobalAnnouncement


class FeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureFlag
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "deleted_at"]


class GlobalAnnouncementSerializer(serializers.ModelSerializer):
    target_gym_name = serializers.SerializerMethodField()

    class Meta:
        model = GlobalAnnouncement
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_target_gym_name(self, obj):
        return obj.target_gym.name if obj.target_gym else None
