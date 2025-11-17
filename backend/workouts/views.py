from django.contrib.auth import get_user_model
from django.db.models import Count, F, Q
from rest_framework import filters, permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from .models import Exercise, RoutineExercise, WorkoutRoutine, WorkoutSession
from .serializers import (
    ExerciseSerializer,
    RoutineExerciseSerializer,
    WorkoutRoutineSerializer,
    WorkoutSessionSerializer,
)

User = get_user_model()


class IsCoachOrBetter(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.COACH}


class ExerciseViewSet(viewsets.ModelViewSet):
    serializer_class = ExerciseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "muscle_group", "equipment"]

    def get_queryset(self):
        user = self.request.user
        queryset = Exercise.objects.all()
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.gym_id:
            return queryset.filter(gym_id=user.gym_id)
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            serializer.save(gym=user.gym)
            return
        raise PermissionDenied("No tienes permisos para crear ejercicios.")

    def perform_update(self, serializer):
        user = self.request.user
        exercise = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and exercise.gym_id == user.gym_id:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar este ejercicio.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id):
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar este ejercicio.")


class WorkoutRoutineViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutRoutineSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "objective", "level"]

    def _global_or_user_gym_filter(self, user):
        filters = Q(gym__isnull=True)
        if user.gym_id:
            filters |= Q(gym_id=user.gym_id)
        return filters

    def get_queryset(self):
        user = self.request.user
        queryset = (
            WorkoutRoutine.objects.select_related("gym", "created_by")
            .annotate(
                completed_count=Count(
                    "sessions",
                    filter=Q(sessions__user=user, sessions__status=WorkoutSession.Status.COMPLETED),
                )
            )
        )
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH}:
            if user.gym_id:
                return queryset.filter(self._global_or_user_gym_filter(user))
            return queryset.filter(gym__isnull=True)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(self._global_or_user_gym_filter(user), status=WorkoutRoutine.Status.PUBLISHED)
        return queryset.filter(gym__isnull=True, status=WorkoutRoutine.Status.PUBLISHED)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            serializer.save(gym=user.gym, created_by=user)
            return
        raise PermissionDenied("No tienes permisos para crear rutinas.")

    def perform_update(self, serializer):
        user = self.request.user
        routine = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and routine.gym_id == user.gym_id:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar esta rutina.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (user.role in {User.Role.GYM_ADMIN} and instance.gym_id == user.gym_id):
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta rutina.")


class RoutineExerciseViewSet(viewsets.ModelViewSet):
    serializer_class = RoutineExerciseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = RoutineExercise.objects.select_related("routine", "exercise")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.gym_id:
            return queryset.filter(routine__gym_id=user.gym_id)
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        routine = serializer.validated_data["routine"]
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and routine.gym_id == user.gym_id
        ):
            serializer.save()
            return
        raise PermissionDenied("No tienes permisos para agregar ejercicios a esta rutina.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.routine.gym_id == user.gym_id
        ):
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar este bloque de rutina.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.routine.gym_id == user.gym_id
        ):
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar este bloque de rutina.")


class WorkoutSessionViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _sync_session_points(self, session):
        if not session.user_id:
            return

        reward = 0
        if (
            session.status == WorkoutSession.Status.COMPLETED
            and session.routine
            and session.routine.points_reward
        ):
            reward = session.routine.points_reward

        delta = reward - (session.points_awarded or 0)
        if delta:
            User.objects.filter(pk=session.user_id).update(puntos=F("puntos") + delta)
        if reward != session.points_awarded:
            session.points_awarded = reward
            session.save(update_fields=["points_awarded"])

    def get_queryset(self):
        user = self.request.user
        queryset = WorkoutSession.objects.select_related("user", "gym", "routine")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            return queryset.filter(gym_id=user.gym_id)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(user=user)
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.ATHLETE:
            routine = serializer.validated_data.get("routine")
            session_gym = user.gym or (routine.gym if routine else None)
            session = serializer.save(user=user, gym=session_gym)
        else:
            session = serializer.save()
        self._sync_session_points(session)

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            session = serializer.save()
            self._sync_session_points(session)
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id:
            session = serializer.save()
            self._sync_session_points(session)
            return
        if user.role == User.Role.ATHLETE and instance.user_id == user.id:
            routine = serializer.validated_data.get("routine") or instance.routine
            session_gym = user.gym or (routine.gym if routine else None)
            session = serializer.save(user=user, gym=session_gym)
            self._sync_session_points(session)
            return
        raise PermissionDenied("No puedes modificar esta sesión.")

    def perform_destroy(self, instance):
        user = self.request.user

        def _deduct_points():
            if instance.points_awarded and instance.user_id:
                User.objects.filter(pk=instance.user_id).update(puntos=F("puntos") - instance.points_awarded)

        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id
        ):
            _deduct_points()
            instance.delete()
            return
        if user.role == User.Role.ATHLETE and instance.user_id == user.id:
            _deduct_points()
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta sesión.")
