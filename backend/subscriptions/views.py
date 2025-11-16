from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from .models import Payment, Subscription, SubscriptionPlan
from .serializers import PaymentSerializer, SubscriptionPlanSerializer, SubscriptionSerializer


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = SubscriptionPlan.objects.all()
        if self.request.user.role == self.request.user.Role.SUPER_ADMIN:
            return queryset
        return queryset.filter(is_active=True)

    def has_admin_permission(self):
        return self.request.user.role == self.request.user.Role.SUPER_ADMIN

    def perform_create(self, serializer):
        if not self.has_admin_permission():
            raise PermissionDenied("Solo los super administradores pueden crear planes.")
        serializer.save()

    def perform_update(self, serializer):
        if not self.has_admin_permission():
            raise PermissionDenied("Solo los super administradores pueden modificar planes.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self.has_admin_permission():
            raise PermissionDenied("Solo los super administradores pueden eliminar planes.")
        instance.delete()


class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Subscription.objects.select_related("plan", "owner_gym", "owner_user")
        if user.role == user.Role.SUPER_ADMIN:
            return queryset
        if user.role == user.Role.GYM_ADMIN and user.gym_id:
            return queryset.filter(owner_gym=user.gym)
        return queryset.filter(owner_user=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == user.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role == user.Role.GYM_ADMIN and user.gym_id:
            serializer.save(owner_gym=user.gym)
            return
        serializer.save(owner_user=user)

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == user.Role.SUPER_ADMIN:
            serializer.save()
            return
        if instance.owner_gym_id and user.role == user.Role.GYM_ADMIN and instance.owner_gym_id == user.gym_id:
            serializer.save()
            return
        if instance.owner_user_id == user.id:
            serializer.save(owner_user=user)
            return
        raise PermissionDenied("No puedes modificar esta suscripción.")


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Payment.objects.select_related("subscription", "subscription__plan")
        if user.role == user.Role.SUPER_ADMIN:
            return queryset
        if user.role == user.Role.GYM_ADMIN and user.gym_id:
            return queryset.filter(subscription__owner_gym=user.gym)
        return queryset.filter(subscription__owner_user=user)
