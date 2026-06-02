import uuid

from django.db import models
from django.utils import timezone


class BaseModel(models.Model):
    """Abstract base model with UUID primary key, timestamps, and soft-delete."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])

    def restore(self):
        self.deleted_at = None
        self.save(update_fields=["deleted_at", "updated_at"])

    class Meta:
        abstract = True


class GlobalAnnouncement(BaseModel):
    class Type(models.TextChoices):
        INFO = "info", "Información"
        WARNING = "warning", "Advertencia"
        SUCCESS = "success", "Éxito"

    class Audience(models.TextChoices):
        ALL = "all", "Todos"
        GYM_ADMINS = "gym_admins", "Dueños de Gimnasio"
        ATHLETES = "athletes", "Atletas"

    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.INFO)
    target_audience = models.CharField(max_length=20, choices=Audience.choices, default=Audience.ALL)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title





class FeatureFlag(BaseModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active_globally = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.code}) - {'ON' if self.is_active_globally else 'OFF'}"


class AuditLog(BaseModel):
    user = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=50)
    target_object_id = models.CharField(max_length=255, null=True, blank=True)
    target_object_repr = models.CharField(max_length=255, null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self):
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {self.user} -> {self.action}"
