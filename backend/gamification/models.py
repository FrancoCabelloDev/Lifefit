from django.db import models
from django.conf import settings

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