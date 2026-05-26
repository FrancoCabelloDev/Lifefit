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
    gym = models.ForeignKey(Gym, related_name="membership_plans", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.IntegerField(default=30)
    features = models.JSONField(default=list, blank=True, help_text="Lista de beneficios a mostrar")
    is_active = models.BooleanField(default=True)

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
