from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Sum
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
        queryset = GlobalAnnouncement.objects.all().order_by("-created_at")
        if self.request.user.role != self.request.user.Role.SUPER_ADMIN:
            queryset = queryset.filter(is_active=True)
            # Todo: filter by target_audience if needed (athletes, gym_admins)
        return queryset

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return super().get_permissions()


class SystemAnalyticsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, *args, **kwargs):
        User = get_user_model()
        from gyms.models import Gym
        from subscriptions.models import Subscription, Payment
        from datetime import date, timedelta
        from django.utils import timezone
        
        today = timezone.now().date()
        
        # MRR
        mrr = (
            Subscription.objects
            .filter(status="active")
            .aggregate(total=Sum("plan__price"))
        )["total"] or 0
        
        # Gyms
        active_gyms = Gym.objects.filter(status=Gym.Status.ACTIVE).count()
        
        # Athletes
        total_athletes = User.objects.filter(role=User.Role.ATHLETE).count()
        new_athletes_this_week = User.objects.filter(
            role=User.Role.ATHLETE, 
            date_joined__gte=today - timedelta(days=7)
        ).count()

        return Response({
            "mrr": float(mrr),
            "mrrGrowth": "+0%", # Placeholder
            "activeGyms": active_gyms,
            "totalAthletes": total_athletes,
            "totalAthletesGrowth": f"+{new_athletes_this_week} esta semana"
        })


class UsageAnalyticsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, *args, **kwargs):
        from workouts.models import WorkoutSession
        from django.utils import timezone
        from datetime import timedelta
        
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        # Workouts
        workouts_today = WorkoutSession.objects.filter(
            status=WorkoutSession.Status.COMPLETED,
            performed_at__date=today
        ).count()
        
        workouts_this_week = WorkoutSession.objects.filter(
            status=WorkoutSession.Status.COMPLETED,
            performed_at__date__gte=week_ago
        ).count()

        # Data for chart (mocked for now based on this week)
        # Ideally we group by day
        chart_data = [
            {"date": (today - timedelta(days=i)).strftime('%b %d'), "workouts": WorkoutSession.objects.filter(status="completed", performed_at__date=today - timedelta(days=i)).count()}
            for i in range(6, -1, -1)
        ]

        return Response({
            "workoutsToday": workouts_today,
            "workoutsThisWeek": workouts_this_week,
            "chartData": chart_data
        })
