from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeatureFlagViewSet, GlobalAnnouncementViewSet, SystemAnalyticsView, UsageAnalyticsView

router = DefaultRouter()
router.register(r'feature-flags', FeatureFlagViewSet, basename='feature-flags')
router.register(r'announcements', GlobalAnnouncementViewSet, basename='announcements')

urlpatterns = [
    path('analytics/dashboard/', SystemAnalyticsView.as_view(), name='system-analytics-dashboard'),
    path('analytics/usage/', UsageAnalyticsView.as_view(), name='system-analytics-usage'),
    path('', include(router.urls)),
]
