from django.contrib.auth import get_user_model
from rest_framework import serializers

from gyms.models import Gym
from .models import Exercise, RoutineExercise, SessionExerciseLog, UserRoutineAssignment, WorkoutRoutine, WorkoutSession

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
    completed_today = serializers.SerializerMethodField()

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
            "completed_today",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "routine_exercises", "created_by", "completed_by_me", "completed_today"]

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
    
    def get_completed_today(self, obj):
        """Verifica si el usuario completó esta rutina hoy"""
        today_sessions = getattr(obj, "_today_sessions", None)
        if today_sessions is not None:
            return len(today_sessions) > 0
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        from datetime import date
        return obj.sessions.filter(
            user=request.user,
            status=WorkoutSession.Status.COMPLETED,
            performed_at__date=date.today()
        ).exists()


class SessionExerciseLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionExerciseLog
        fields = ["id", "routine_exercise", "sets_completed", "completed"]
        read_only_fields = ["id"]


class WorkoutSessionSerializer(serializers.ModelSerializer):
    user_detail    = serializers.SerializerMethodField()
    exercise_logs  = SessionExerciseLogSerializer(many=True, required=False)

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
            "exercise_logs",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "user_detail", "points_awarded"]
        extra_kwargs = {
            "user": {"required": False},
            "gym": {"required": False, "allow_null": True},
        }

    def get_user_detail(self, obj):
        return {
            "id": obj.user_id,
            "email": obj.user.email,
            "first_name": obj.user.first_name,
            "last_name": obj.user.last_name,
        }

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
        logs_data = validated_data.pop("exercise_logs", [])
        request = self.context.get("request")

        if request and request.user.role == User.Role.ATHLETE:
            validated_data.setdefault("user", request.user)
            if not validated_data.get("gym"):
                routine = validated_data.get("routine")
                validated_data["gym"] = request.user.gym or (routine.gym if routine else None)

        # Auto-calculate completion_percentage from logs when provided
        if logs_data:
            total = len(logs_data)
            done  = sum(1 for l in logs_data if l.get("completed"))
            validated_data["completion_percentage"] = round((done / total) * 100, 2) if total else 0

        session = super().create(validated_data)

        if logs_data:
            SessionExerciseLog.objects.bulk_create([
                SessionExerciseLog(
                    session=session,
                    routine_exercise_id=l["routine_exercise"].id,
                    sets_completed=l.get("sets_completed", 0),
                    completed=l.get("completed", False),
                )
                for l in logs_data
            ], ignore_conflicts=True)

        return session

    def update(self, instance, validated_data):
        logs_data = validated_data.pop("exercise_logs", None)

        if logs_data is not None:
            total = len(logs_data)
            done  = sum(1 for l in logs_data if l.get("completed"))
            validated_data["completion_percentage"] = round((done / total) * 100, 2) if total else 0

        session = super().update(instance, validated_data)

        if logs_data is not None:
            # Upsert: delete existing logs and recreate
            session.exercise_logs.all().delete()
            SessionExerciseLog.objects.bulk_create([
                SessionExerciseLog(
                    session=session,
                    routine_exercise_id=l["routine_exercise"].id,
                    sets_completed=l.get("sets_completed", 0),
                    completed=l.get("completed", False),
                )
                for l in logs_data
            ], ignore_conflicts=True)

        return session


class UserRoutineAssignmentSerializer(serializers.ModelSerializer):
    routine_detail = WorkoutRoutineSerializer(source="routine", read_only=True)

    class Meta:
        model = UserRoutineAssignment
        fields = ["id", "user", "routine", "routine_detail", "assigned_by", "start_date", "end_date", "status", "compliance_percentage", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at", "assigned_by", "routine_detail"]


class WeeklyRoutinePlanSerializer(serializers.ModelSerializer):
    routine_detail = WorkoutRoutineSerializer(source="routine", read_only=True)
    day_label = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        from .models import WeeklyRoutinePlan
        model = WeeklyRoutinePlan
        fields = ["id", "athlete", "coach", "routine", "routine_detail", "day_of_week", "day_label", "suggested_time", "notes", "created_at"]
        read_only_fields = ["id", "coach", "routine_detail", "day_label", "created_at"]
        extra_kwargs = {
            "athlete": {"required": False},
        }
