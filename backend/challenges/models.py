from django.conf import settings
from django.db import models

from core.models import BaseModel


class Challenge(BaseModel):
    class ChallengeType(models.TextChoices):
        ATTENDANCE = "attendance", "Asistencia"
        DISTANCE = "distance", "Distancia"
        WORKOUTS = "workouts", "Entrenamientos"
        NUTRITION = "nutrition", "Nutrición"
        MIXED = "mixed", "Mixto"

    class Status(models.TextChoices):
        DRAFT = "draft", "Borrador"
        ACTIVE = "active", "Activo"
        COMPLETED = "completed", "Completado"
        ARCHIVED = "archived", "Archivado"

    gym = models.ForeignKey(
        "gyms.Gym",
        related_name="challenges",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=20, choices=ChallengeType.choices, default=ChallengeType.WORKOUTS)
    start_date = models.DateField()
    end_date = models.DateField()
    reward_points = models.PositiveIntegerField(default=100)
    goal_value = models.PositiveIntegerField(default=10)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    class Meta:
        ordering = ["-start_date", "name"]

    def __str__(self) -> str:
        return self.name


class ChallengeParticipation(BaseModel):
    class ParticipationStatus(models.TextChoices):
        JOINED = "joined", "Unido"
        COMPLETED = "completed", "Completado"
        DROPPED = "dropped", "Abandonado"

    challenge = models.ForeignKey(Challenge, related_name="participants", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="challenge_participations", on_delete=models.CASCADE)
    progress = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=ParticipationStatus.choices, default=ParticipationStatus.JOINED)
    points_earned = models.PositiveIntegerField(default=0)
    last_update = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("challenge", "user")
        ordering = ["-last_update"]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.challenge.name}"


class Badge(BaseModel):
    gym = models.ForeignKey("gyms.Gym", related_name="badges", on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=255, blank=True)
    condition = models.CharField(max_length=255)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class UserBadge(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="badges", on_delete=models.CASCADE)
    badge = models.ForeignKey(Badge, related_name="awards", on_delete=models.CASCADE)
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "badge")
        ordering = ["-awarded_at"]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.badge.name}"


class UserProgress(BaseModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name="progress", on_delete=models.CASCADE)
    level = models.PositiveIntegerField(default=1)
    total_points = models.PositiveIntegerField(default=0)
    current_xp = models.PositiveIntegerField(default=0)
    next_level_xp = models.PositiveIntegerField(default=1000)

    class Meta:
        ordering = ["-total_points"]

    def __str__(self) -> str:
        return f"{self.user.email} progress"
