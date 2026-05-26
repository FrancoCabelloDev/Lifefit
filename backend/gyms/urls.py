from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BranchViewSet, GymViewSet, PublicGymViewSet, GymMembershipPlanViewSet, GymFeatureFlagViewSet

router = DefaultRouter()
router.register("public", PublicGymViewSet, basename="public-gym")
router.register("gyms", GymViewSet, basename="gym")
router.register("branches", BranchViewSet, basename="branch")
router.register("membership-plans", GymMembershipPlanViewSet, basename="membership-plan")
router.register("feature-flags", GymFeatureFlagViewSet, basename="gym-feature-flag")

urlpatterns = [
    path("", include(router.urls)),
]
