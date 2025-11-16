from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ExerciseViewSet, RoutineExerciseViewSet, WorkoutRoutineViewSet, WorkoutSessionViewSet

router = DefaultRouter()
router.register("exercises", ExerciseViewSet, basename="exercise")
router.register("routines", WorkoutRoutineViewSet, basename="routine")
router.register("routine-exercises", RoutineExerciseViewSet, basename="routine-exercise")
router.register("sessions", WorkoutSessionViewSet, basename="session")

urlpatterns = [
    path("", include(router.urls)),
]
