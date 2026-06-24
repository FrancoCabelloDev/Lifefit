from django.db import models
from django.db.models import Q, UniqueConstraint
from django.conf import settings
from django.utils import timezone

from core.models import BaseModel


class GymPointsConfig(BaseModel):
    """Configuración de puntos por acción para cada gym. One-to-one con Gym."""

    gym = models.OneToOneField(
        "gyms.Gym",
        on_delete=models.CASCADE,
        related_name="points_config",
    )
    nutrition_week_points = models.PositiveIntegerField(
        default=100,
        help_text="Puntos otorgados al atleta cuando el nutricionista aprueba su semana",
    )
    workout_week_points = models.PositiveIntegerField(
        default=50,
        help_text="Puntos otorgados al atleta al completar una semana de rutinas",
    )
    challenge_points = models.PositiveIntegerField(
        default=200,
        help_text="Puntos base otorgados al completar un reto",
    )

    class Meta:
        verbose_name = "Configuración de puntos"

    def __str__(self):
        return f"Config puntos — {self.gym.name}"


class Reward(BaseModel):
    """Recompensa canjeable disponible en el catálogo del gym."""

    gym = models.ForeignKey(
        "gyms.Gym",
        on_delete=models.CASCADE,
        related_name="rewards",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="rewards/", null=True, blank=True)
    points_cost = models.PositiveIntegerField()
    stock = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Null = stock ilimitado",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["points_cost", "name"]

    def __str__(self):
        return f"{self.name} — {self.points_cost} pts ({self.gym.name})"

    @property
    def available_stock(self):
        if self.stock is None:
            return None
        redeemed = self.redemptions.filter(status__in=["pending", "approved"]).count()
        return max(0, self.stock - redeemed)


class RewardRedemption(BaseModel):
    """Solicitud de canje de una recompensa por un atleta."""

    class Status(models.TextChoices):
        PENDING  = "pending",  "Pendiente"
        APPROVED = "approved", "Aprobado"
        REJECTED = "rejected", "Rechazado"

    athlete     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="redemptions",
    )
    reward      = models.ForeignKey(Reward, on_delete=models.CASCADE, related_name="redemptions")
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes       = models.TextField(blank=True, help_text="Nota del admin al aprobar/rechazar")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_redemptions",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.athlete.email} → {self.reward.name} ({self.status})"


class UserPoints(BaseModel):
    """
    Registro de puntos de un atleta.

    Los puntos nacen en estado ``pending`` cuando el atleta completa una sesión.
    El coach los mueve a ``approved`` manualmente; solo entonces se cuentan en
    el total visible del atleta.  Los puntos otorgados por otros orígenes
    (nutrition, challenges) nacen directamente en ``approved``.
    Los puntos semanales (source='workout_week') nacen directamente en
    ``approved`` cuando el coach cierra la semana.  El campo ``week_start``
    identifica el lunes de la semana premiada y, junto con ``user``, garantiza
    que no se apruebe la misma semana dos veces.
    """

    class Status(models.TextChoices):
        PENDING  = "pending",  "Pendiente"
        APPROVED = "approved", "Aprobado"

    user            = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="points",
    )
    points          = models.IntegerField(default=0)
    pending_points  = models.IntegerField(
        default=0,
        help_text="Puntos que el atleta solicita; se confirman al aprobar.",
    )
    status          = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    source          = models.CharField(max_length=100, blank=True)
    description     = models.TextField(blank=True)
    week_start      = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Lunes de la semana premiada. Solo aplica a source='workout_week'.",
    )
    reviewed_by     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_points",
    )
    reviewed_at     = models.DateTimeField(null=True, blank=True)
    related_session = models.ForeignKey(
        "workouts.WorkoutSession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="points_entries",
    )
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
        constraints = [
            UniqueConstraint(
                fields=["user", "week_start"],
                condition=Q(source="workout_week"),
                name="unique_workout_week_per_user",
            ),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.pending_points} pts [{self.status}] ({self.source})"

    def approve(self, reviewed_by) -> None:
        """Confirma los puntos pendientes. Idempotente si ya está aprobado."""
        if self.status == self.Status.APPROVED:
            return
        self.points      = self.pending_points
        self.status      = self.Status.APPROVED
        self.reviewed_by = reviewed_by
        self.reviewed_at = timezone.now()
        self.save(update_fields=["points", "status", "reviewed_by", "reviewed_at", "updated_at"])
