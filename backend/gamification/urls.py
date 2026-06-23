from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"rewards", views.RewardViewSet, basename="reward")
router.register(r"redemptions", views.RewardRedemptionViewSet, basename="redemption")

urlpatterns = [
    path("my-stats/", views.my_stats),
    path("ranking/", views.ranking),
    path("points/<uuid:pk>/approve/", views.approve_points),
    path("<slug:gym_slug>/points-config/", views.gym_points_config),
    path("<slug:gym_slug>/", include(router.urls)),
]
