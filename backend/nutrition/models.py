from django.conf import settings
from django.db import models

try:
    from cloudinary.models import CloudinaryField as _CloudinaryField
    import cloudinary
    _cld = cloudinary.config()
    _CLOUDINARY = bool(getattr(_cld, "cloud_name", None) and getattr(_cld, "api_key", None))
except ImportError:
    _CLOUDINARY = False

from core.models import BaseModel


class Food(BaseModel):
    """Alimento base con macros por 100g — fuente CENAN (Tablas Peruanas de Composición de Alimentos)"""

    class FoodGroup(models.TextChoices):
        MEATS       = "meats",       "Carnes y derivados"
        DAIRY       = "dairy",       "Lácteos y huevos"
        CEREALS     = "cereals",     "Cereales y derivados"
        LEGUMES     = "legumes",     "Legumbres y derivados"
        VEGETABLES  = "vegetables",  "Verduras y hortalizas"
        FRUITS      = "fruits",      "Frutas"
        FATS        = "fats",        "Grasas y aceites"
        BEVERAGES   = "beverages",   "Bebidas"
        OTHERS      = "others",      "Otros"

    gym = models.ForeignKey(
        "gyms.Gym",
        related_name="foods",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Null = alimento global (CENAN), no nulo = creado por el nutricionista del gym",
    )
    created_by = models.ForeignKey(
        "accounts.User",
        related_name="created_foods",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    name        = models.CharField(max_length=255)
    food_group  = models.CharField(max_length=20, choices=FoodGroup.choices, default=FoodGroup.OTHERS)
    source      = models.CharField(max_length=100, default="CENAN", help_text="Fuente de datos nutricionales")

    # Macros por 100g
    calories_per_100g  = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    protein_per_100g   = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    carbs_per_100g     = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fats_per_100g      = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fiber_per_100g     = models.DecimalField(max_digits=6, decimal_places=2, default=0, blank=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["gym", "food_group"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self) -> str:
        return self.name


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
    created_for = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="personal_nutrition_plans",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Si está seteado, es un plan personal de ese atleta y no aparece en la biblioteca.",
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["gym", "status"]),
        ]

    def __str__(self) -> str:
        return self.name
    
    def get_meals_by_day(self):
        """Retorna las comidas organizadas por día"""
        meals_dict = {}
        for meal in self.meal_templates.all().order_by('day_number', 'order'):
            day = meal.day_number
            if day not in meals_dict:
                meals_dict[day] = []
            meals_dict[day].append(meal)
        return meals_dict
    
    def get_total_meals(self):
        """Retorna el total de comidas en el plan"""
        return self.meal_templates.count()


class MealTemplate(BaseModel):
    """Plantilla de comida para un día y momento específico del plan"""

    class MealType(models.TextChoices):
        BREAKFAST        = "breakfast",        "Desayuno"
        MID_MORNING      = "mid_morning",      "Media mañana"
        LUNCH            = "lunch",            "Almuerzo"
        AFTERNOON_SNACK  = "afternoon_snack",  "Merienda"
        DINNER           = "dinner",           "Cena"
        LATE_SNACK       = "late_snack",       "Recena"

    class Weekday(models.TextChoices):
        MONDAY    = "monday",    "Lunes"
        TUESDAY   = "tuesday",   "Martes"
        WEDNESDAY = "wednesday", "Miércoles"
        THURSDAY  = "thursday",  "Jueves"
        FRIDAY    = "friday",    "Viernes"
        SATURDAY  = "saturday",  "Sábado"
        SUNDAY    = "sunday",    "Domingo"

    WEEKDAY_ORDER = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6,
    }

    plan = models.ForeignKey(NutritionPlan, related_name="meal_templates", on_delete=models.CASCADE)
    day_number = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Legado — usar weekday para planes nuevos",
    )
    weekday = models.CharField(
        max_length=10, choices=Weekday.choices, null=True, blank=True,
        help_text="Día de la semana (planes con estructura semanal)",
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
            models.Index(fields=["plan", "weekday", "meal_type"]),
        ]

    def sync_macros_from_items(self):
        """Recalcula los macros totales de la comida desde sus MealFoodItems."""
        items = self.food_items.all()
        if items.exists():
            from django.db.models import Sum
            agg = items.aggregate(
                c=Sum("calories"), p=Sum("protein_g"),
                cb=Sum("carbs_g"), f=Sum("fats_g"),
            )
            self.calories  = int(agg["c"] or 0)
            self.protein_g = int(agg["p"] or 0)
            self.carbs_g   = int(agg["cb"] or 0)
            self.fats_g    = int(agg["f"] or 0)
            self.save(update_fields=["calories", "protein_g", "carbs_g", "fats_g"])

    def __str__(self) -> str:
        if self.weekday:
            day_str = self.get_weekday_display()
        elif self.day_number:
            day_str = f"Día {self.day_number}"
        else:
            day_str = "Flexible"
        return f"{self.plan.name} - {day_str} - {self.get_meal_type_display()}: {self.name}"


class MealFoodItem(BaseModel):
    """Alimento específico dentro de una comida, con cantidad y macros calculados automáticamente."""

    meal     = models.ForeignKey(MealTemplate, related_name="food_items", on_delete=models.CASCADE)
    food     = models.ForeignKey(Food, related_name="meal_uses", on_delete=models.CASCADE)
    quantity_g = models.DecimalField(max_digits=7, decimal_places=1, help_text="Cantidad en gramos")
    order    = models.PositiveSmallIntegerField(default=1)

    # Macros calculados al guardar (cantidad × macros/100g)
    calories = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    protein_g = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    carbs_g   = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fats_g    = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fiber_g   = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    class Meta:
        ordering = ["meal", "order"]

    def save(self, *args, **kwargs):
        factor = self.quantity_g / 100
        self.calories  = round(float(self.food.calories_per_100g)  * float(factor), 2)
        self.protein_g = round(float(self.food.protein_per_100g)   * float(factor), 2)
        self.carbs_g   = round(float(self.food.carbs_per_100g)     * float(factor), 2)
        self.fats_g    = round(float(self.food.fats_per_100g)      * float(factor), 2)
        self.fiber_g   = round(float(self.food.fiber_per_100g)     * float(factor), 2)
        super().save(*args, **kwargs)
        self.meal.sync_macros_from_items()

    def delete(self, *args, **kwargs):
        meal = self.meal
        super().delete(*args, **kwargs)
        meal.sync_macros_from_items()

    def __str__(self) -> str:
        return f"{self.food.name} {self.quantity_g}g → {self.meal.name}"


class UserMealLog(BaseModel):
    """Registro de comidas del usuario con evidencia fotográfica y aprobación del nutricionista"""

    class MealLogStatus(models.TextChoices):
        COMPLETED   = "completed",   "Completado"
        SKIPPED     = "skipped",     "Saltado"
        ALTERNATIVE = "alternative", "Comí otra cosa"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="meal_logs", on_delete=models.CASCADE)
    meal_template = models.ForeignKey(MealTemplate, related_name="user_logs", on_delete=models.CASCADE)
    date = models.DateField(help_text="Fecha en que se consumió la comida")
    status = models.CharField(max_length=20, choices=MealLogStatus.choices, default=MealLogStatus.COMPLETED)
    alternative_food_text = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    # Evidencia fotográfica
    photo = (
        _CloudinaryField("image", folder="meal_proofs/", null=True, blank=True)
        if _CLOUDINARY else
        models.ImageField(upload_to="meal_proofs/%Y/%m/", null=True, blank=True)
    )

    # Validación del nutricionista: null=sin foto/pendiente, True=aprobado, False=rechazado
    nutritionist_approved = models.BooleanField(null=True, blank=True, default=None)
    nutritionist_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="reviewed_meal_logs",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Evita doble otorgamiento de XP
    xp_awarded = models.BooleanField(default=False)

    class Meta:
        ordering = ["-date", "meal_template__order"]
        unique_together = ("user", "meal_template", "date")
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["nutritionist_approved", "date"]),
        ]

    def __str__(self) -> str:
        return f"{self.status} {self.user.email} - {self.meal_template.name} ({self.date})"


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
        SCHEDULED = "scheduled", "Programado"
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
    review_requested_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Fecha en que el atleta solicitó revisión de su semana al nutricionista",
    )

    class Meta:
        ordering = ["-start_date"]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.plan.name}"
