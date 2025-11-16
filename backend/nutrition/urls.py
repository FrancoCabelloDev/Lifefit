from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    NutritionItemViewSet,
    NutritionMealViewSet,
    NutritionPlanViewSet,
    UserNutritionPlanViewSet,
)

router = DefaultRouter()
router.register("plans", NutritionPlanViewSet, basename="nutrition-plan")
router.register("meals", NutritionMealViewSet, basename="nutrition-meal")
router.register("items", NutritionItemViewSet, basename="nutrition-item")
router.register("assignments", UserNutritionPlanViewSet, basename="nutrition-assignment")

urlpatterns = [
    path("", include(router.urls)),
]
