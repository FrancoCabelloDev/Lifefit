from django.conf import settings
from django.db import models

from core.models import BaseModel


class SubscriptionPlan(BaseModel):
    class BillingCycle(models.TextChoices):
        MONTHLY = "monthly", "Mensual"
        QUARTERLY = "quarterly", "Trimestral"
        ANNUAL = "annual", "Anual"
        CUSTOM = "custom", "Personalizado"

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="PEN")
    billing_cycle = models.CharField(max_length=20, choices=BillingCycle.choices, default=BillingCycle.MONTHLY)
    user_limit = models.PositiveIntegerField(null=True, blank=True)
    
    max_athletes = models.PositiveIntegerField(default=50, help_text="Máximo de atletas permitidos")
    max_coaches = models.PositiveIntegerField(default=2, help_text="Máximo de coaches permitidos")
    max_nutritionists = models.PositiveIntegerField(default=1, help_text="Máximo de nutricionistas permitidos")

    features = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0, help_text="Orden de aparición en la interfaz")

    class Meta:
        ordering = ["display_order", "price"]

    def __str__(self) -> str:
        return self.name


class Subscription(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Activa"
        PAST_DUE = "past_due", "Pago atrasado"
        CANCELED = "canceled", "Cancelada"
        INCOMPLETE = "incomplete", "Incompleta"

    owner_gym = models.ForeignKey(
        "gyms.Gym",
        related_name="subscriptions",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="subscriptions",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    plan = models.ForeignKey(SubscriptionPlan, related_name="subscriptions", on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    next_billing_date = models.DateField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self) -> str:
        target = self.owner_gym or self.owner_user
        return f"{target} - {self.plan.name}"


class Payment(BaseModel):
    class PaymentStatus(models.TextChoices):
        SUCCESS = "success", "Pagado"
        PENDING = "pending", "Pendiente"
        FAILED = "failed", "Fallido"

    subscription = models.ForeignKey(Subscription, related_name="payments", on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    currency = models.CharField(max_length=10, default="USD")
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.SUCCESS)
    paid_at = models.DateTimeField()
    provider = models.CharField(max_length=50, default="manual")
    external_id = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-paid_at"]

    def __str__(self) -> str:
        return f"{self.subscription} - {self.amount} {self.currency}"
