from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from .models import FeatureFlag, GlobalAnnouncement
from .serializers import FeatureFlagSerializer, GlobalAnnouncementSerializer
from .permissions import IsSuperAdmin


class FeatureFlagViewSet(viewsets.ModelViewSet):
    queryset = FeatureFlag.objects.all()
    serializer_class = FeatureFlagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return super().get_permissions()


class GlobalAnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = GlobalAnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.utils import timezone
        queryset = GlobalAnnouncement.objects.all().order_by("-created_at")
        if self.request.user.role != get_user_model().Role.SUPER_ADMIN:
            queryset = queryset.filter(is_active=True, expires_at__gt=timezone.now())
        return queryset

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return super().get_permissions()

    @action(detail=False, methods=["get"])
    def active(self, request):
        from django.utils import timezone
        qs = GlobalAnnouncement.objects.filter(is_active=True, expires_at__gt=timezone.now()).order_by("-created_at")
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class SystemAnalyticsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, *args, **kwargs):
        User = get_user_model()
        from gyms.models import Gym
        from subscriptions.models import Subscription, Payment
        from datetime import date, timedelta
        from django.utils import timezone
        import calendar

        today = timezone.now().date()

        # Current month MRR
        mrr = (
            Subscription.objects
            .filter(status="active")
            .aggregate(total=Sum("plan__price"))
        )["total"] or 0

        # Previous month MRR (for growth)
        first_of_this_month = today.replace(day=1)
        last_month_end = first_of_this_month - timedelta(days=1)
        first_of_last_month = last_month_end.replace(day=1)

        prev_subscriptions = Subscription.objects.filter(
            status__in=["active", "past_due"],
            start_date__lte=last_month_end,
        ).exclude(
            status="canceled", end_date__lt=first_of_last_month
        )
        prev_mrr = prev_subscriptions.aggregate(total=Sum("plan__price"))["total"] or 0

        mrr_growth = 0
        if prev_mrr > 0:
            mrr_growth = round(((mrr - prev_mrr) / prev_mrr) * 100, 1)

        # Gyms
        active_gyms = Gym.objects.filter(status=Gym.Status.ACTIVE).count()
        new_gyms_this_month = Gym.objects.filter(created_at__gte=first_of_this_month).count()

        # Athletes
        total_athletes = User.objects.filter(role=User.Role.ATHLETE).count()
        new_athletes_this_week = User.objects.filter(
            role=User.Role.ATHLETE,
            date_joined__gte=today - timedelta(days=7)
        ).count()

        # Revenue history (last 6 months)
        six_months_ago = today - timedelta(days=180)
        revenue_by_month = (
            Payment.objects
            .filter(status="success", paid_at__gte=six_months_ago)
            .annotate(month=TruncMonth("paid_at"))
            .values("month")
            .annotate(total=Sum("amount"))
            .order_by("month")
        )

        revenue_history = [
            {"month": r["month"].strftime("%Y-%m"), "total": float(r["total"])}
            for r in revenue_by_month
        ]

        # Gym creation history (last 12 months)
        twelve_months_ago = today - timedelta(days=365)
        gyms_by_month = (
            Gym.objects
            .filter(created_at__gte=twelve_months_ago)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )

        gym_history = [
            {"month": g["month"].strftime("%Y-%m"), "count": g["count"]}
            for g in gyms_by_month
        ]

        return Response({
            "mrr": float(mrr),
            "mrrGrowth": f"+{mrr_growth}%" if mrr_growth >= 0 else f"{mrr_growth}%",
            "activeGyms": active_gyms,
            "totalAthletes": total_athletes,
            "totalAthletesGrowth": f"+{new_athletes_this_week} esta semana",
            "newGymsThisMonth": new_gyms_this_month,
            "revenueHistory": revenue_history,
            "gymHistory": gym_history,
        })


class UsageAnalyticsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, *args, **kwargs):
        from workouts.models import WorkoutSession
        from django.utils import timezone
        from datetime import timedelta

        today = timezone.now().date()
        week_ago = today - timedelta(days=7)

        workouts_today = WorkoutSession.objects.filter(
            status=WorkoutSession.Status.COMPLETED,
            performed_at__date=today
        ).count()

        workouts_this_week = WorkoutSession.objects.filter(
            status=WorkoutSession.Status.COMPLETED,
            performed_at__date__gte=week_ago
        ).count()

        chart_data = [
            {"date": (today - timedelta(days=i)).strftime('%b %d'), "workouts": WorkoutSession.objects.filter(status="completed", performed_at__date=today - timedelta(days=i)).count()}
            for i in range(6, -1, -1)
        ]

        return Response({
            "workoutsToday": workouts_today,
            "workoutsThisWeek": workouts_this_week,
            "chartData": chart_data
        })


class GymAnalyticsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, *args, **kwargs):
        from gyms.models import Gym
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models.functions import TruncMonth
        from django.db.models import Count

        today = timezone.now().date()
        twelve_months_ago = today - timedelta(days=365)

        gyms_by_month = (
            Gym.objects
            .filter(created_at__gte=twelve_months_ago)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )

        return Response([
            {"month": g["month"].strftime("%Y-%m"), "count": g["count"]}
            for g in gyms_by_month
        ])


class UserAnalyticsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, *args, **kwargs):
        User = get_user_model()

        roles = (
            User.objects.exclude(role=User.Role.SUPER_ADMIN)
            .values("role")
            .annotate(count=Count("id"))
            .order_by("role")
        )

        role_labels = {
            User.Role.GYM_ADMIN: "Admins de Gimnasio",
            User.Role.COACH: "Coaches",
            User.Role.NUTRITIONIST: "Nutricionistas",
            User.Role.RECEPTIONIST: "Atención al Cliente",
            User.Role.ATHLETE: "Atletas",
        }

        return Response([
            {"role": r["role"], "label": role_labels.get(r["role"], r["role"]), "count": r["count"]}
            for r in roles
        ])


class EngagementAnalyticsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, *args, **kwargs):
        from workouts.models import WorkoutSession
        from gyms.models import CheckIn
        from django.utils import timezone
        from datetime import timedelta

        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        dau = CheckIn.objects.filter(timestamp__date=today).values("user").distinct().count()
        wau = CheckIn.objects.filter(timestamp__date__gte=week_ago).values("user").distinct().count()
        mau = CheckIn.objects.filter(timestamp__date__gte=month_ago).values("user").distinct().count()

        workout_dau = WorkoutSession.objects.filter(
            status=WorkoutSession.Status.COMPLETED, performed_at__date=today
        ).values("user").distinct().count()

        workout_mau = WorkoutSession.objects.filter(
            status=WorkoutSession.Status.COMPLETED, performed_at__date__gte=month_ago
        ).values("user").distinct().count()

        return Response({
            "checkins": {"dau": dau, "wau": wau, "mau": mau},
            "workouts": {"dau": workout_dau, "mau": workout_mau},
        })
