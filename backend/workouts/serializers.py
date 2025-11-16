from django.contrib.auth import get_user_model
from rest_framework import serializers

from gyms.models import Gym
from .models import Exercise, RoutineExercise, WorkoutRoutine, WorkoutSession

User = get_user_model()


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = [
            "id",
            "gym",
            "name",
            "category",
            "equipment",
            "muscle_group",
            "description",
            "media_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RoutineExerciseSerializer(serializers.ModelSerializer):
    exercise_detail = ExerciseSerializer(source="exercise", read_only=True)

    class Meta:
        model = RoutineExercise
        fields = [
            "id",
            "routine",
            "exercise",
            "exercise_detail",
            "order",
            "sets",
            "reps",
            "rest_seconds",
            "tempo",
            "weight_kg",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "exercise_detail"]


class WorkoutRoutineSerializer(serializers.ModelSerializer):
    routine_exercises = RoutineExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = WorkoutRoutine
        fields = [
            "id",
            "gym",
            "name",
            "objective",
            "level",
            "duration_minutes",
            "status",
            "created_by",
            "is_public",
            "notes",
            "routine_exercises",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "routine_exercises", "created_by"]

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        return super().create(validated_data)


class WorkoutSessionSerializer(serializers.ModelSerializer):
    user_detail = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutSession
        fields = [
            "id",
            "user",
            "user_detail",
            "gym",
            "routine",
            "performed_at",
            "duration_minutes",
            "perceived_exertion",
            "completion_percentage",
            "notes",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "user_detail"]

    def get_user_detail(self, obj):
        return {"id": obj.user_id, "email": obj.user.email, "first_name": obj.user.first_name, "last_name": obj.user.last_name}

    def validate(self, attrs):
        gym = attrs.get("gym")
        user = attrs.get("user") or self.context["request"].user
        if gym and user.gym_id and gym.id != user.gym_id and user.role != User.Role.SUPER_ADMIN:
            raise serializers.ValidationError("No puedes registrar sesiones para otro gimnasio.")
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.role == User.Role.ATHLETE:
            validated_data["user"] = request.user
            validated_data.setdefault("gym", request.user.gym)
        return super().create(validated_data)
