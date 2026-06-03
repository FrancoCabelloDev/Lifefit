from django.db import models

from core.models import BaseModel


class Gym(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    logo = models.ImageField(upload_to="gyms/logos/", null=True, blank=True)
    ruc = models.CharField(max_length=20, blank=True)
    brand_color = models.CharField(max_length=7, blank=True, help_text="Hex color code")
    website = models.URLField(blank=True)
    contact_email = models.EmailField(blank=True)
    metrics = models.JSONField(default=dict, blank=True)
    
    max_athletes = models.IntegerField(default=100, help_text="Límite de atletas activos")
    max_coaches = models.IntegerField(default=2, help_text="Límite de coaches activos")
    max_nutritionists = models.IntegerField(default=2, help_text="Límite de nutricionistas activos")

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Branch(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    gym = models.ForeignKey(Gym, related_name="branches", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    slug = models.SlugField()
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    country = models.CharField(max_length=120, blank=True)
    zipcode = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    phone = models.CharField(max_length=30, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        unique_together = ("gym", "slug")
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} - {self.gym.name}"


class GymMembershipPlan(BaseModel):
    class Tier(models.TextChoices):
        BASIC   = "basic",   "Básico"
        PREMIUM = "premium", "Premium"

    gym = models.ForeignKey(Gym, related_name="membership_plans", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.IntegerField(default=30)
    features = models.JSONField(default=list, blank=True, help_text="Lista de beneficios a mostrar")
    is_active = models.BooleanField(default=True)
    tier = models.CharField(max_length=10, choices=Tier.choices, default=Tier.BASIC)

    class Meta:
        ordering = ["price", "name"]

    def __str__(self) -> str:
        return f"{self.name} - {self.gym.name} (S/{self.price})"


class GymFeatureFlag(BaseModel):
    gym = models.ForeignKey(Gym, related_name="feature_flags", on_delete=models.CASCADE)
    feature_flag = models.ForeignKey("core.FeatureFlag", related_name="gym_flags", on_delete=models.CASCADE)
    is_active = models.BooleanField(default=False)

    class Meta:
        unique_together = ("gym", "feature_flag")
        ordering = ["feature_flag__name"]

    def __str__(self) -> str:
        status = "ON" if self.is_active else "OFF"
        return f"{self.gym.name} - {self.feature_flag.name} ({status})"


class CheckIn(BaseModel):
    class Method(models.TextChoices):
        MANUAL = "manual", "Manual"
        QR = "qr", "QR Code"
        SELF = "self", "Autoregistro"

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="checkins",
    )
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name="checkins")
    branch = models.ForeignKey(
        Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="checkins"
    )
    method = models.CharField(max_length=10, choices=Method.choices, default=Method.MANUAL)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["gym", "timestamp"]),
            models.Index(fields=["user", "timestamp"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} @ {self.gym.name} [{self.timestamp:%Y-%m-%d %H:%M}]"


class NutritionistAssignment(BaseModel):
    nutritionist = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="nutritionist_assignments",
        limit_choices_to={"role": "nutritionist"},
    )
    athlete = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="nutritionist_assigned_athletes",
        limit_choices_to={"role": "athlete"},
    )
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name="nutritionist_assignments")
    is_active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("nutritionist", "athlete")
        ordering = ["-assigned_at"]

    def __str__(self) -> str:
        return f"{self.nutritionist.email} → {self.athlete.email}"


class Notification(BaseModel):
    class Type(models.TextChoices):
        ROUTINE_ASSIGNED = "routine_assigned", "Rutina Asignada"
        ROUTINE_UPDATED = "routine_updated", "Rutina Actualizada"
        PLAN_ASSIGNED = "plan_assigned", "Plan Nutricional Asignado"
        PLAN_UPDATED = "plan_updated", "Plan Nutricional Actualizado"
        CHALLENGE_COMPLETED = "challenge_completed", "Reto Completado"
        BADGE_EARNED = "badge_earned", "Medalla Obtenida"
        CHECKIN_REMINDER = "checkin_reminder", "Recordatorio de Check-in"
        MESSAGE = "message", "Mensaje"
        SYSTEM = "system", "Sistema"

    recipient = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="notifications"
    )
    actor = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="acted_notifications"
    )
    notification_type = models.CharField(max_length=30, choices=Type.choices)
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name="notifications", null=True, blank=True)
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"[{self.notification_type}] {self.recipient.email} - {self.title}"


class CoachAssignment(BaseModel):
    coach = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="coach_assignments",
        limit_choices_to={"role": "coach"},
    )
    athlete = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="athlete_assignments",
        limit_choices_to={"role": "athlete"},
    )
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name="coach_assignments")
    is_active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("coach", "athlete")
        ordering = ["-assigned_at"]

    def __str__(self) -> str:
        return f"{self.coach.email} → {self.athlete.email}"


class GymSubscription(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Activa"
        EXPIRED = "expired", "Vencida"
        CANCELED = "canceled", "Cancelada"

    athlete = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="gym_subscriptions"
    )
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name="gym_subscriptions")
    plan = models.ForeignKey(
        GymMembershipPlan, on_delete=models.SET_NULL, null=True, related_name="subscriptions"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    auto_renew = models.BooleanField(default=False)

    class Meta:
        ordering = ["-start_date", "athlete__first_name"]

    def __str__(self) -> str:
        return f"{self.athlete.email} → {self.plan.name if self.plan else 'Sin plan'} ({self.get_status_display()})"


class GymPayment(BaseModel):
    class PaymentStatus(models.TextChoices):
        SUCCESS = "success", "Pagado"
        PENDING = "pending", "Pendiente"
        FAILED = "failed", "Fallido"
        REFUNDED = "refunded", "Reembolsado"

    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name="gym_payments")
    subscription = models.ForeignKey(
        GymSubscription, on_delete=models.SET_NULL, null=True, blank=True, related_name="payments"
    )
    athlete = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, related_name="gym_payments"
    )
    plan = models.ForeignKey(
        GymMembershipPlan, on_delete=models.SET_NULL, null=True, related_name="payments"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="PEN")
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.SUCCESS)
    paid_at = models.DateTimeField()
    due_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=50, default="manual")
    reference = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-paid_at"]

    def __str__(self) -> str:
        return f"{self.gym.name} - {self.athlete} - S/{self.amount} ({self.get_status_display()})"


class NutritionistAppointment(BaseModel):
    class AppointmentType(models.TextChoices):
        FIRST = "first", "Primera Consulta"
        FOLLOWUP = "followup", "Consulta de Seguimiento"

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Programada"
        COMPLETED = "completed", "Completada"
        CANCELLED = "cancelled", "Cancelada"
        NO_SHOW = "no_show", "No Asistió"

    nutritionist = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="nutritionist_appointments",
        limit_choices_to={"role": "nutritionist"},
    )
    athlete = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="athlete_appointments",
        limit_choices_to={"role": "athlete"},
    )
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name="nutritionist_appointments")
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=30)
    appointment_type = models.CharField(
        max_length=20, choices=AppointmentType.choices, default=AppointmentType.FOLLOWUP
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["scheduled_at"]
        indexes = [
            models.Index(fields=["nutritionist", "scheduled_at"]),
            models.Index(fields=["athlete", "scheduled_at"]),
            models.Index(fields=["gym", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.nutritionist.email} + {self.athlete.email} @ {self.scheduled_at:%Y-%m-%d %H:%M}"


class BodyMeasurement(BaseModel):
    nutritionist = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="recorded_measurements",
        limit_choices_to={"role": "nutritionist"},
    )
    athlete = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="body_measurements",
        limit_choices_to={"role": "athlete"},
    )
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name="body_measurements")
    measured_at = models.DateField()

    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    body_fat_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    muscle_mass_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    waist_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    hip_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    arm_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    visceral_fat = models.PositiveSmallIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    @property
    def bmi(self):
        if self.weight_kg and self.height_cm and self.height_cm > 0:
            h_m = float(self.height_cm) / 100
            return round(float(self.weight_kg) / (h_m ** 2), 1)
        return None

    class Meta:
        ordering = ["-measured_at"]
        indexes = [
            models.Index(fields=["athlete", "-measured_at"]),
            models.Index(fields=["nutritionist", "-measured_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.athlete.email} @ {self.measured_at} — {self.weight_kg}kg"


class NutritionistMessage(BaseModel):
    nutritionist = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="sent_nutri_messages",
        limit_choices_to={"role": "nutritionist"},
    )
    athlete = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="received_nutri_messages",
        limit_choices_to={"role": "athlete"},
    )
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name="nutri_messages")
    sender_is_nutritionist = models.BooleanField(default=True)
    body = models.TextField()
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["nutritionist", "athlete", "-created_at"]),
        ]

    def __str__(self) -> str:
        sender = self.nutritionist.email if self.sender_is_nutritionist else self.athlete.email
        return f"[MSG] {sender} → {self.athlete.email if self.sender_is_nutritionist else self.nutritionist.email}"
