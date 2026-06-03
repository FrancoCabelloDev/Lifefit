from django.db import models
from django.conf import settings
from django.utils import timezone

from core.models import BaseModel


class UserPoints(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="points")
    points = models.IntegerField()
    source = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    related_challenge = models.ForeignKey(
        "challenges.Challenge",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    related_nutrition_plan = models.ForeignKey(
        "nutrition.NutritionPlan",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="points_awarded",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.points} pts ({self.source})"


class AthleteStreak(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="streak",
    )
    gym = models.ForeignKey(
        "gyms.Gym",
        on_delete=models.CASCADE,
        related_name="streaks",
    )
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = [("user", "gym")]

    def __str__(self):
        return f"{self.user.email} - racha {self.current_streak} días"

    def register_activity(self, activity_date=None):
        today = activity_date or timezone.now().date()
        if self.last_activity_date == today:
            return
        if self.last_activity_date and (today - self.last_activity_date).days == 1:
            self.current_streak += 1
        else:
            self.current_streak = 1
        if self.current_streak > self.longest_streak:
            self.longest_streak = self.current_streak
        self.last_activity_date = today
        self.save(update_fields=["current_streak", "longest_streak", "last_activity_date", "updated_at"])