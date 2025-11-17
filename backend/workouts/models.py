from django.conf import settings
from django.db import models

from core.models import BaseModel


class Exercise(BaseModel):
    class Category(models.TextChoices):
        STRENGTH = "strength", "Strength"
        CARDIO = "cardio", "Cardio"
        MOBILITY = "mobility", "Mobility"
        FLEXIBILITY = "flexibility", "Flexibility"
        HIIT = "hiit", "HIIT"

    gym = models.ForeignKey(
        "gyms.Gym",
        null=True,
        blank=True,
        related_name="exercises",
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.STRENGTH)
    equipment = models.CharField(max_length=255, blank=True)
    muscle_group = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    media_url = models.URLField(blank=True)

    class Meta:
        unique_together = ("gym", "name")
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class WorkoutRoutine(BaseModel):
    class Level(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    gym = models.ForeignKey(
        "gyms.Gym",
        related_name="routines",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    objective = models.TextField(blank=True)
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.BEGINNER)
    duration_minutes = models.PositiveIntegerField(default=30)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    points_reward = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_routines",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    is_public = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class RoutineExercise(BaseModel):
    routine = models.ForeignKey(WorkoutRoutine, related_name="routine_exercises", on_delete=models.CASCADE)
    exercise = models.ForeignKey(Exercise, related_name="routine_exercises", on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=1)
    sets = models.PositiveIntegerField(default=3)
    reps = models.PositiveIntegerField(default=10)
    rest_seconds = models.PositiveIntegerField(default=60)
    tempo = models.CharField(max_length=50, blank=True)
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["order"]
        unique_together = ("routine", "order", "exercise")

    def __str__(self) -> str:
        return f"{self.routine.name} - {self.exercise.name}"


class WorkoutSession(BaseModel):
    class Status(models.TextChoices):
        PLANNED = "planned", "Planned"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="workout_sessions", on_delete=models.CASCADE)
    gym = models.ForeignKey(
        "gyms.Gym",
        related_name="sessions",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    routine = models.ForeignKey(
        WorkoutRoutine,
        related_name="sessions",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    performed_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=30)
    perceived_exertion = models.PositiveIntegerField(default=5)
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNED)
    points_awarded = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-performed_at"]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.performed_at:%Y-%m-%d}"
