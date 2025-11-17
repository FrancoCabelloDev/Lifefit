from django.contrib import admin

from .models import Exercise, RoutineExercise, WorkoutRoutine, WorkoutSession


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ("name", "gym", "category", "muscle_group")
    list_filter = ("category", "gym")
    search_fields = ("name", "muscle_group", "equipment")


class RoutineExerciseInline(admin.TabularInline):
    model = RoutineExercise
    extra = 1


@admin.register(WorkoutRoutine)
class WorkoutRoutineAdmin(admin.ModelAdmin):
    list_display = ("name", "gym", "level", "status", "points_reward", "is_public")
    list_filter = ("level", "status", "gym")
    search_fields = ("name", "objective")
    inlines = [RoutineExerciseInline]


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ("user", "gym", "performed_at", "status", "completion_percentage", "points_awarded")
    list_filter = ("status", "gym")
    search_fields = ("user__email", "notes")
