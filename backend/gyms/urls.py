from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BranchViewSet,
    CheckInViewSet,
    CoachAssignmentViewSet,
    GymPaymentViewSet,
    GymSubscriptionViewSet,
    GymViewSet,
    NotificationViewSet,
    NutritionistAssignmentViewSet,
    PublicGymViewSet,
    GymMembershipPlanViewSet,
    GymFeatureFlagViewSet,
    athlete_profile,
    gym_dashboard_stats,
)

router = DefaultRouter()
router.register("public", PublicGymViewSet, basename="public-gym")
router.register("gyms", GymViewSet, basename="gym")
router.register("branches", BranchViewSet, basename="branch")
router.register("membership-plans", GymMembershipPlanViewSet, basename="membership-plan")
router.register("feature-flags", GymFeatureFlagViewSet, basename="gym-feature-flag")
router.register("checkins", CheckInViewSet, basename="checkin")
router.register("coach-assignments", CoachAssignmentViewSet, basename="coach-assignment")
router.register("nutritionist-assignments", NutritionistAssignmentViewSet, basename="nutritionist-assignment")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("subscriptions", GymSubscriptionViewSet, basename="gym-subscription")
router.register("payments", GymPaymentViewSet, basename="gym-payment")

urlpatterns = [
    path("dashboard/stats/", gym_dashboard_stats, name="gym-dashboard-stats"),
    path("athlete-profile/<uuid:athlete_id>/", athlete_profile, name="athlete-profile"),
    path("", include(router.urls)),
]
