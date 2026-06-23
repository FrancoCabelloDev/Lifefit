from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ExerciseViewSet,
    RoutineExerciseViewSet,
    WorkoutRoutineViewSet,
    WorkoutSessionViewSet,
    WeeklyRoutinePlanViewSet,
    approve_week,
    coach_adherence,
    coach_athlete_detail,
    my_coach_status,
)

router = DefaultRouter()
router.register("exercises", ExerciseViewSet, basename="exercise")
router.register("routines", WorkoutRoutineViewSet, basename="routine")
router.register("routine-exercises", RoutineExerciseViewSet, basename="routine-exercise")
router.register("sessions", WorkoutSessionViewSet, basename="session")
router.register("weekly-plan", WeeklyRoutinePlanViewSet, basename="weekly-plan")

urlpatterns = [
    path("", include(router.urls)),
    path("adherence/", coach_adherence),
    path("my-coach-status/", my_coach_status),
    path("coach/athlete/<uuid:athlete_id>/", coach_athlete_detail),
    path("coach/athlete/<uuid:athlete_id>/approve-week/", approve_week),
]
