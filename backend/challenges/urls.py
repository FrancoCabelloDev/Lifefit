from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BadgeViewSet,
    ChallengeParticipationViewSet,
    ChallengeViewSet,
    UserBadgeViewSet,
    UserProgressViewSet,
)

router = DefaultRouter()
router.register("challenges", ChallengeViewSet, basename="challenge")
router.register("participations", ChallengeParticipationViewSet, basename="challenge-participation")
router.register("badges", BadgeViewSet, basename="badge")
router.register("user-badges", UserBadgeViewSet, basename="user-badge")
router.register("progress", UserProgressViewSet, basename="user-progress")

urlpatterns = [
    path("", include(router.urls)),
]
