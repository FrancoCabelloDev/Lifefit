from datetime import date, timedelta

from django.db.models import Sum
from django.db.models.functions import TruncMonth
from rest_framework import permissions, status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

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
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["owner_gym__name", "plan__name", "owner_user__email"]
    ordering_fields = ["start_date", "next_billing_date", "plan__price"]
    ordering = ["-start_date"]

    def get_queryset(self):
        user = self.request.user
        queryset = Subscription.objects.select_related("plan", "owner_gym", "owner_user")

        filter_status = self.request.query_params.get("status")
        if filter_status:
            queryset = queryset.filter(status=filter_status)

        filter_plan = self.request.query_params.get("plan")
        if filter_plan:
            queryset = queryset.filter(plan_id=filter_plan)

        if user.role == user.Role.SUPER_ADMIN:
            return queryset
        if user.role == user.Role.GYM_ADMIN and user.gym_id:
            return queryset.filter(owner_gym=user.gym)
        return queryset.filter(owner_user=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [user.Role.SUPER_ADMIN, user.Role.GYM_ADMIN]:
            raise PermissionDenied("No tienes permisos para crear suscripciones.")
        serializer.save()

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

    def perform_destroy(self, instance):
        if self.request.user.role != self.request.user.Role.SUPER_ADMIN:
            raise PermissionDenied("Solo super_admin puede eliminar suscripciones.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def change_plan(self, request, pk=None):
        """Cambiar el plan de una suscripción activa"""
        subscription = self.get_object()
        if subscription.status not in ["active", "past_due"]:
            return Response(
                {"detail": "Solo se puede cambiar el plan de suscripciones activas o con pago atrasado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_plan_id = request.data.get("plan_id")
        if not new_plan_id:
            return Response({"detail": "Se requiere plan_id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_plan = SubscriptionPlan.objects.get(id=new_plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({"detail": "Plan no encontrado o inactivo."}, status=status.HTTP_404_NOT_FOUND)

        old_plan_name = subscription.plan.name
        subscription.plan = new_plan
        subscription.save(update_fields=["plan", "updated_at"])

        # Registrar cambio de plan (para auditoría)
        print(f"📝 Cambio de plan: {subscription.owner_gym} cambió de {old_plan_name} a {new_plan.name}")

        return Response({
            "detail": f"Plan cambiado de {old_plan_name} a {new_plan.name} exitosamente.",
            "subscription": self.get_serializer(subscription).data,
        })

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancelar suscripción al final del período actual"""
        subscription = self.get_object()
        if subscription.status != "active":
            return Response({"detail": "La suscripción no está activa."}, status=status.HTTP_400_BAD_REQUEST)

        subscription.cancel_at_period_end = True
        subscription.save(update_fields=["cancel_at_period_end", "updated_at"])

        return Response({
            "detail": "La suscripción se cancelará al final del período actual.",
            "subscription": self.get_serializer(subscription).data,
        })

    @action(detail=True, methods=["post"])
    def renew(self, request, pk=None):
        """Reactivar suscripción cancelada o renovar período"""
        subscription = self.get_object()

        if subscription.cancel_at_period_end:
            subscription.cancel_at_period_end = False
            subscription.save(update_fields=["cancel_at_period_end", "updated_at"])
            return Response({
                "detail": "Cancelación revertida. La suscripción continuará activa.",
                "subscription": self.get_serializer(subscription).data,
            })

        if subscription.status == "canceled":
            from datetime import date, timedelta
            subscription.status = "active"
            subscription.start_date = date.today()
            subscription.end_date = None
            subscription.next_billing_date = date.today() + timedelta(days=30)
            subscription.cancel_at_period_end = False
            subscription.save(update_fields=[
                "status", "start_date", "end_date",
                "next_billing_date", "cancel_at_period_end", "updated_at"
            ])
            return Response({
                "detail": "Suscripción reactivada exitosamente.",
                "subscription": self.get_serializer(subscription).data,
            })

        return Response(
            {"detail": "Esta suscripción ya está activa."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "subscription__owner_gym__name",
        "subscription__plan__name",
        "external_id",
    ]
    ordering_fields = ["paid_at", "amount", "status"]
    ordering = ["-paid_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related(
            "subscription",
            "subscription__plan",
            "subscription__owner_gym",
        )

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        gym_id = self.request.query_params.get("gym")
        if gym_id:
            qs = qs.filter(subscription__owner_gym_id=gym_id)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(paid_at__date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(paid_at__date__lte=date_to)

        if user.role == user.Role.SUPER_ADMIN:
            return qs
        if user.role == user.Role.GYM_ADMIN and user.gym_id:
            return qs.filter(subscription__owner_gym=user.gym)
        return qs.filter(subscription__owner_user=user)

    def perform_create(self, serializer):
        if self.request.user.role != self.request.user.Role.SUPER_ADMIN:
            raise PermissionDenied("No tienes permisos para registrar pagos.")
        serializer.save()

    def perform_destroy(self, instance):
        raise PermissionDenied("No puedes eliminar pagos.")

    @action(detail=False, methods=["get"])
    def metrics(self, request):
        today = date.today()
        first_day_of_month = today.replace(day=1)
        last_month_start = (first_day_of_month - timedelta(days=1)).replace(day=1)

        mrr = (
            Subscription.objects
            .filter(status="active")
            .aggregate(total=Sum("plan__price"))
        )["total"] or 0

        monthly_income = (
            Payment.objects
            .filter(status="success", paid_at__date__gte=first_day_of_month)
            .aggregate(total=Sum("amount"))
        )["total"] or 0

        last_month_income = (
            Payment.objects
            .filter(
                status="success",
                paid_at__date__gte=last_month_start,
                paid_at__date__lt=first_day_of_month,
            )
            .aggregate(total=Sum("amount"))
        )["total"] or 0

        mrr_change = 0
        if last_month_income > 0:
            mrr_change = round((float(monthly_income) - float(last_month_income)) / float(last_month_income) * 100, 1)

        pending = Payment.objects.filter(status="pending").count()
        total_gyms = (
            Subscription.objects
            .filter(status="active")
            .values("owner_gym")
            .distinct()
            .count()
        )

        return Response({
            "mrr": float(mrr),
            "arr": float(mrr) * 12,
            "monthly_income": float(monthly_income),
            "mrr_change": mrr_change,
            "pending_payments": pending,
            "total_gyms_with_subscriptions": total_gyms,
            "currency": "PEN",
        })

    @action(detail=False, methods=["get"])
    def revenue_history(self, request):
        six_months_ago = date.today() - timedelta(days=180)
        monthly = (
            Payment.objects
            .filter(status="success", paid_at__date__gte=six_months_ago)
            .annotate(month=TruncMonth("paid_at"))
            .values("month")
            .annotate(total=Sum("amount"))
            .order_by("month")
        )
        return Response([
            {"month": m["month"].strftime("%Y-%m"), "total": float(m["total"])}
            for m in monthly
        ])
