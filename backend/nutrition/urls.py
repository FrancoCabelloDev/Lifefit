from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    MealTemplateViewSet,
    NutritionItemViewSet,
    NutritionMealViewSet,
    NutritionPlanViewSet,
    UserMealLogViewSet,
    UserNutritionPlanViewSet,
)

router = DefaultRouter()
router.register("plans", NutritionPlanViewSet, basename="nutrition-plan")
router.register("meal-templates", MealTemplateViewSet, basename="meal-template")
router.register("meal-logs", UserMealLogViewSet, basename="meal-log")
router.register("meals", NutritionMealViewSet, basename="nutrition-meal")
router.register("items", NutritionItemViewSet, basename="nutrition-item")
router.register("assignments", UserNutritionPlanViewSet, basename="nutrition-assignment")

urlpatterns = [
    path("", include(router.urls)),
]
