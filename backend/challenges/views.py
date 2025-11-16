from django.contrib.auth import get_user_model
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Badge, Challenge, ChallengeParticipation, UserBadge, UserProgress
from .serializers import (
    BadgeSerializer,
    ChallengeParticipationSerializer,
    ChallengeSerializer,
    UserBadgeSerializer,
    UserProgressSerializer,
)

User = get_user_model()


class IsCoachOrBetter(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.COACH}


class ChallengeViewSet(viewsets.ModelViewSet):
    serializer_class = ChallengeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "description", "type", "status"]

    def get_queryset(self):
        user = self.request.user
        queryset = Challenge.objects.select_related("gym")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            return queryset.filter(gym_id=user.gym_id)
        if user.role == User.Role.ATHLETE and user.gym_id:
            return queryset.filter(gym_id=user.gym_id, status=Challenge.Status.ACTIVE)
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            serializer.save(gym=user.gym)
            return
        raise PermissionDenied("No tienes permisos para crear retos.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar este reto.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (user.role == User.Role.GYM_ADMIN and instance.gym_id == user.gym_id):
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar este reto.")

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def join(self, request, pk=None):
        challenge = self.get_object()
        user = request.user
        if user.role == User.Role.SUPER_ADMIN:
            target_user_id = request.data.get("user") or user.id
            target_user = User.objects.get(pk=target_user_id)
        else:
            target_user = user
            if target_user.gym_id != challenge.gym_id:
                raise PermissionDenied("No perteneces a este gimnasio.")

        participation, created = ChallengeParticipation.objects.get_or_create(
            challenge=challenge,
            user=target_user,
            defaults={"progress": 0},
        )
        serializer = ChallengeParticipationSerializer(participation, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ChallengeParticipationViewSet(viewsets.ModelViewSet):
    serializer_class = ChallengeParticipationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = ChallengeParticipation.objects.select_related("challenge", "user", "challenge__gym")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            return queryset.filter(challenge__gym_id=user.gym_id)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(user=user)
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role == User.Role.ATHLETE:
            challenge = serializer.validated_data["challenge"]
            if challenge.gym_id != user.gym_id:
                raise PermissionDenied("No puedes unirte a retos de otro gym.")
            serializer.save(user=user)
            return
        raise PermissionDenied("No tienes permisos para crear participaciones manualmente.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.challenge.gym_id == user.gym_id:
            serializer.save()
            return
        if user.role == User.Role.ATHLETE and instance.user_id == user.id:
            serializer.save(user=user)
            return
        raise PermissionDenied("No puedes modificar esta participación.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN} and instance.challenge.gym_id == user.gym_id
        ):
            instance.delete()
            return
        if user.role == User.Role.ATHLETE and instance.user_id == user.id:
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta participación.")


class BadgeViewSet(viewsets.ModelViewSet):
    serializer_class = BadgeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Badge.objects.select_related("gym")
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
        raise PermissionDenied("No puedes crear insignias.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar esta insignia.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (user.role == User.Role.GYM_ADMIN and instance.gym_id == user.gym_id):
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta insignia.")


class UserBadgeViewSet(viewsets.ModelViewSet):
    serializer_class = UserBadgeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = UserBadge.objects.select_related("badge", "user")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            return queryset.filter(badge__gym_id=user.gym_id)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(user=user)
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.COACH}:
            serializer.save()
            return
        raise PermissionDenied("No puedes asignar insignias.")


class UserProgressViewSet(viewsets.ModelViewSet):
    serializer_class = UserProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = UserProgress.objects.select_related("user")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            return queryset.filter(user__gym_id=user.gym_id)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(user=user)
        return queryset.none()

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def leaderboard(self, request):
        user = request.user
        queryset = self.get_queryset().order_by("-total_points")[:20]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
