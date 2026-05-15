from rest_framework import permissions, viewsets, filters
from rest_framework.exceptions import PermissionDenied

from .models import Payment, Subscription, SubscriptionPlan
from .serializers import PaymentSerializer, SubscriptionPlanSerializer, SubscriptionSerializer


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["display_order", "price", "name", "created_at"]
    ordering = ["display_order", "price"]

    def get_queryset(self):
        queryset = SubscriptionPlan.objects.all()
        if self.request.user.is_authenticated and self.request.user.role == self.request.user.Role.SUPER_ADMIN:
            return queryset
        return queryset.filter(is_active=True)

    def has_admin_permission(self):
        return self.request.user.is_authenticated and self.request.user.role == self.request.user.Role.SUPER_ADMIN

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
            raise PermissionDenied("Solo los super administradores pueden archivar planes.")
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

    from rest_framework.decorators import action
    from rest_framework.response import Response
    from rest_framework import status

    @action(detail=True, methods=["delete"])
    def hard_delete(self, request, pk=None):
        if not self.has_admin_permission():
            raise PermissionDenied("Solo los super administradores pueden eliminar planes.")
        plan = self.get_object()
        if plan.subscriptions.exists():
            return Response(
                {"detail": "No puedes eliminar este plan porque tiene suscripciones activas. Por favor, archívalo en su lugar."},
                status=status.HTTP_400_BAD_REQUEST
            )
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        if not self.has_admin_permission():
            raise PermissionDenied("Solo los super administradores pueden ordenar planes.")
        
        orders = request.data
        if not isinstance(orders, list):
            return Response({"detail": "Se esperaba una lista de objetos con id y display_order."}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.db import transaction
        with transaction.atomic():
            for item in orders:
                plan_id = item.get("id")
                order = item.get("display_order")
                if plan_id is not None and order is not None:
                    SubscriptionPlan.objects.filter(id=plan_id).update(display_order=order)
        
        return Response({"detail": "Orden actualizado exitosamente."})


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
