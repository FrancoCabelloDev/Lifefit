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
    completed_by_me = serializers.SerializerMethodField()

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
            "points_reward",
            "created_by",
            "is_public",
            "notes",
            "routine_exercises",
            "completed_by_me",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "routine_exercises", "created_by", "completed_by_me"]

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        return super().create(validated_data)

    def get_completed_by_me(self, obj):
        count = getattr(obj, "completed_count", None)
        if count is not None:
            return count > 0
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.sessions.filter(user=request.user, status=WorkoutSession.Status.COMPLETED).exists()


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
            "points_awarded",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "user_detail", "points_awarded"]
        extra_kwargs = {
            "user": {"required": False},
            "gym": {"required": False, "allow_null": True},
        }

    def get_user_detail(self, obj):
        return {"id": obj.user_id, "email": obj.user.email, "first_name": obj.user.first_name, "last_name": obj.user.last_name}

    def validate(self, attrs):
        request = self.context.get("request")
        user = attrs.get("user") or (request.user if request else None)

        if user and user.role != User.Role.SUPER_ADMIN:
            gym = attrs.get("gym")
            if gym and user.gym_id and gym.id != user.gym_id:
                raise serializers.ValidationError("No puedes registrar sesiones para otro gimnasio.")

        if request and request.user.is_authenticated and request.user.role == User.Role.ATHLETE:
            attrs.setdefault("user", request.user)
            if not attrs.get("gym"):
                routine = attrs.get("routine")
                attrs["gym"] = request.user.gym or (routine.gym if routine else None)

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.role == User.Role.ATHLETE:
            validated_data.setdefault("user", request.user)
            if not validated_data.get("gym"):
                routine = validated_data.get("routine")
                validated_data["gym"] = request.user.gym or (routine.gym if routine else None)
        return super().create(validated_data)
