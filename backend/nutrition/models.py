from django.conf import settings
from django.db import models

from core.models import BaseModel


class NutritionPlan(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Borrador"
        ACTIVE = "active", "Activo"
        ARCHIVED = "archived", "Archivado"

    gym = models.ForeignKey("gyms.Gym", related_name="nutrition_plans", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    calories_per_day = models.PositiveIntegerField(default=2000)
    macros = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class NutritionMeal(BaseModel):
    class MealTime(models.TextChoices):
        BREAKFAST = "breakfast", "Desayuno"
        LUNCH = "lunch", "Almuerzo"
        DINNER = "dinner", "Cena"
        SNACK = "snack", "Snack"

    plan = models.ForeignKey(NutritionPlan, related_name="meals", on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=1)
    name = models.CharField(max_length=255)
    meal_time = models.CharField(max_length=20, choices=MealTime.choices, default=MealTime.BREAKFAST)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["order"]

    def __str__(self) -> str:
        return f"{self.name} ({self.plan.name})"


class NutritionItem(BaseModel):
    meal = models.ForeignKey(NutritionMeal, related_name="items", on_delete=models.CASCADE)
    food = models.CharField(max_length=255)
    portion = models.CharField(max_length=120)
    macros = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["meal", "id"]

    def __str__(self) -> str:
        return self.food


class UserNutritionPlan(BaseModel):
    class AssignmentStatus(models.TextChoices):
        ACTIVE = "active", "Activo"
        PAUSED = "paused", "Pausado"
        COMPLETED = "completed", "Completado"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="nutrition_assignments", on_delete=models.CASCADE)
    plan = models.ForeignKey(NutritionPlan, related_name="assignments", on_delete=models.CASCADE)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="assigned_nutrition_plans",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=AssignmentStatus.choices, default=AssignmentStatus.ACTIVE)
    compliance_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        ordering = ["-start_date"]
        unique_together = ("user", "plan", "status")

    def __str__(self) -> str:
        return f"{self.user.email} - {self.plan.name}"
