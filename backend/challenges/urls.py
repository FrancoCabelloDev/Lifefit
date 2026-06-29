from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AthleteDashboardView,
    BadgeViewSet,
    ChallengeParticipationViewSet,
    ChallengeViewSet,
    UserBadgeViewSet,
)

router = DefaultRouter()
router.register("challenges", ChallengeViewSet, basename="challenge")
router.register("participations", ChallengeParticipationViewSet, basename="challenge-participation")
router.register("badges", BadgeViewSet, basename="badge")
router.register("user-badges", UserBadgeViewSet, basename="user-badge")

urlpatterns = [
    path("", include(router.urls)),
    path("progress/my_dashboard/", AthleteDashboardView.as_view(), name="athlete-dashboard"),
]
