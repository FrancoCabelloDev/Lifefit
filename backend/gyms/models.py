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
    brand_color = models.CharField(max_length=7, blank=True, help_text="Hex color code")
    website = models.URLField(blank=True)
    contact_email = models.EmailField(blank=True)
    metrics = models.JSONField(default=dict, blank=True)

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
