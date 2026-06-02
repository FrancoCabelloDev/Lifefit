from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FeatureFlagViewSet, GlobalAnnouncementViewSet,
    SystemAnalyticsView, UsageAnalyticsView,
    GymAnalyticsView, UserAnalyticsView, EngagementAnalyticsView,
)

router = DefaultRouter()
router.register(r'feature-flags', FeatureFlagViewSet, basename='feature-flags')
router.register(r'announcements', GlobalAnnouncementViewSet, basename='announcements')

urlpatterns = [
    path('analytics/dashboard/', SystemAnalyticsView.as_view(), name='system-analytics-dashboard'),
    path('analytics/usage/', UsageAnalyticsView.as_view(), name='system-analytics-usage'),
    path('analytics/gyms/', GymAnalyticsView.as_view(), name='system-analytics-gyms'),
    path('analytics/users/', UserAnalyticsView.as_view(), name='system-analytics-users'),
    path('analytics/engagement/', EngagementAnalyticsView.as_view(), name='system-analytics-engagement'),
    path('', include(router.urls)),
]
