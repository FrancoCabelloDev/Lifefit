from rest_framework import serializers
from .models import FeatureFlag, GlobalAnnouncement


class FeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureFlag
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "deleted_at"]


class GlobalAnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalAnnouncement
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
