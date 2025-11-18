from django.conf import settings
from django.db import models

from core.models import BaseModel


class NutritionPlan(BaseModel):
    """Plan de nutrición general con información de macros objetivo"""
    
    class Status(models.TextChoices):
        DRAFT = "draft", "Borrador"
        ACTIVE = "active", "Activo"
        ARCHIVED = "archived", "Archivado"

    gym = models.ForeignKey(
        "gyms.Gym",
        related_name="nutrition_plans",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    calories_per_day = models.PositiveIntegerField(default=2000, help_text="Calorías objetivo por día")
    protein_g = models.PositiveIntegerField(default=150, help_text="Gramos de proteína por día")
    carbs_g = models.PositiveIntegerField(default=200, help_text="Gramos de carbohidratos por día")
    fats_g = models.PositiveIntegerField(default=65, help_text="Gramos de grasas por día")
    duration_days = models.PositiveIntegerField(default=7, help_text="Duración del plan en días (ej: 7, 14, 30)")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    points_reward = models.PositiveIntegerField(default=0, help_text="Puntos al completar el plan")

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class MealTemplate(BaseModel):
    """Plantilla de comida para un día y momento específico del plan"""
    
    class MealType(models.TextChoices):
        BREAKFAST = "breakfast", "Desayuno"
        LUNCH = "lunch", "Almuerzo"
        DINNER = "dinner", "Cena"
        SNACK = "snack", "Snack"

    plan = models.ForeignKey(NutritionPlan, related_name="meal_templates", on_delete=models.CASCADE)
    day_number = models.PositiveIntegerField(
        help_text="Día del plan (1-7 para semanal, null para opciones flexibles)"
    )
    meal_type = models.CharField(max_length=20, choices=MealType.choices)
    name = models.CharField(max_length=255, help_text="Nombre de la comida (ej: Avena con Frutas)")
    description = models.TextField(blank=True, help_text="Descripción o instrucciones")
    calories = models.PositiveIntegerField(default=0)
    protein_g = models.PositiveIntegerField(default=0)
    carbs_g = models.PositiveIntegerField(default=0)
    fats_g = models.PositiveIntegerField(default=0)
    ingredients = models.TextField(blank=True, help_text="Lista de ingredientes separados por línea")
    instructions = models.TextField(blank=True, help_text="Instrucciones de preparación")
    order = models.PositiveIntegerField(default=1, help_text="Orden de visualización")

    class Meta:
        ordering = ["plan", "day_number", "order", "meal_type"]
        indexes = [
            models.Index(fields=["plan", "day_number", "meal_type"]),
        ]

    def __str__(self) -> str:
        day_str = f"Día {self.day_number}" if self.day_number else "Flexible"
        return f"{self.plan.name} - {day_str} - {self.get_meal_type_display()}: {self.name}"


class UserMealLog(BaseModel):
    """Registro de comidas completadas por el usuario"""
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="meal_logs", on_delete=models.CASCADE)
    meal_template = models.ForeignKey(MealTemplate, related_name="user_logs", on_delete=models.CASCADE)
    date = models.DateField(help_text="Fecha en que se consumió la comida")
    completed = models.BooleanField(default=False)
    notes = models.TextField(blank=True, help_text="Notas del usuario")
    
    class Meta:
        ordering = ["-date", "meal_template__order"]
        unique_together = ("user", "meal_template", "date")
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "completed"]),
        ]

    def __str__(self) -> str:
        status = "✓" if self.completed else "○"
        return f"{status} {self.user.email} - {self.meal_template.name} ({self.date})"


# Mantener modelos legacy para compatibilidad
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
