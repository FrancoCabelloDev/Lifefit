from django.contrib.auth import get_user_model
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from .models import Branch, Gym
from .serializers import BranchSerializer, GymSerializer

User = get_user_model()


class GymViewSet(viewsets.ModelViewSet):
    queryset = Gym.objects.all().order_by("name")
    serializer_class = GymSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Gym.objects.none()

        if user.role == User.Role.SUPER_ADMIN:
            return Gym.objects.all()

        if user.gym_id:
            return Gym.objects.filter(id=user.gym_id)

        return Gym.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("Solo los super administradores pueden crear gimnasios.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role == User.Role.GYM_ADMIN and user.gym_id == instance.id:
            serializer.save()
            return
        raise PermissionDenied("No tienes permisos para modificar este gimnasio.")

    def perform_destroy(self, instance):
        if self.request.user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("Solo los super administradores pueden eliminar gimnasios.")
        instance.delete()


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.select_related("gym").all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Branch.objects.select_related("gym")

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

        if user.role == User.Role.GYM_ADMIN and user.gym_id:
            serializer.save(gym=user.gym)
            return

        raise PermissionDenied("No tienes permisos para crear sucursales.")

    def perform_update(self, serializer):
        user = self.request.user
        branch = self.get_object()

        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return

        if user.role == User.Role.GYM_ADMIN and branch.gym_id == user.gym_id:
            serializer.save()
            return

        raise PermissionDenied("No tienes permisos para modificar esta sucursal.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            instance.delete()
            return

        if user.role == User.Role.GYM_ADMIN and instance.gym_id == user.gym_id:
            instance.delete()
            return

        raise PermissionDenied("No tienes permisos para eliminar esta sucursal.")
