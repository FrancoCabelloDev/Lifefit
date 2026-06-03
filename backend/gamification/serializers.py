from rest_framework import serializers
from .models import AthleteStreak, UserPoints


class AthleteStreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = AthleteStreak
        fields = ["current_streak", "longest_streak", "last_activity_date"]


class UserPointsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPoints
        fields = ["id", "points", "source", "description", "created_at"]


class AthleteStatsSerializer(serializers.Serializer):
    total_points = serializers.IntegerField()
    level = serializers.IntegerField()
    xp_in_level = serializers.IntegerField()
    xp_to_next = serializers.IntegerField()
    streak = AthleteStreakSerializer()
    recent_points = UserPointsSerializer(many=True)
