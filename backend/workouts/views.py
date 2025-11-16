from django.contrib.auth import get_user_model
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

    def get_queryset(self):
        user = self.request.user
        queryset = WorkoutRoutine.objects.select_related("gym", "created_by")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            return queryset.filter(gym_id=user.gym_id)
        if user.role == User.Role.ATHLETE and user.gym_id:
            return queryset.filter(gym_id=user.gym_id, status=WorkoutRoutine.Status.PUBLISHED)
        return queryset.none()

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
            serializer.save(user=user, gym=user.gym)
            return
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id:
            serializer.save()
            return
        if user.role == User.Role.ATHLETE and instance.user_id == user.id:
            serializer.save(user=user, gym=user.gym)
            return
        raise PermissionDenied("No puedes modificar esta sesión.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id
        ):
            instance.delete()
            return
        if user.role == User.Role.ATHLETE and instance.user_id == user.id:
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta sesión.")
