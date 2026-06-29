from django.conf import settings
from django.db import models

from core.models import BaseModel


class Challenge(BaseModel):
    class ChallengeType(models.TextChoices):
        ATTENDANCE = "attendance", "Asistencia"
        DISTANCE = "distance", "Distancia"
        WORKOUTS = "workouts", "Entrenamientos"
        NUTRITION = "nutrition", "Nutrición"
        MIXED = "mixed", "Mixto"

    class Status(models.TextChoices):
        DRAFT = "draft", "Borrador"
        ACTIVE = "active", "Activo"
        COMPLETED = "completed", "Completado"
        ARCHIVED = "archived", "Archivado"

    # Tipos medibles automáticamente desde datos del sistema
    AUTO_VERIFIABLE_TYPES = {ChallengeType.ATTENDANCE, ChallengeType.WORKOUTS, ChallengeType.NUTRITION}

    class VerificationType(models.TextChoices):
        AUTOMATIC = "automatic", "Automática"
        MANUAL = "manual", "Manual (aprobación del responsable)"

    class TargetRole(models.TextChoices):
        ALL          = "all",          "Todos"
        ATHLETE      = "athlete",      "Solo atletas"
        COACH        = "coach",        "Solo coaches"
        NUTRITIONIST = "nutritionist", "Solo nutricionistas"

    gym = models.ForeignKey(
        "gyms.Gym",
        related_name="challenges",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=20, choices=ChallengeType.choices, default=ChallengeType.WORKOUTS)
    start_date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_date = models.DateField()
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="responsible_challenges",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    reward_points = models.PositiveIntegerField(default=100)
    goal_value = models.PositiveIntegerField(default=10)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    verification_type = models.CharField(
        max_length=20,
        choices=VerificationType.choices,
        default=VerificationType.AUTOMATIC,
        help_text="Automática: el sistema calcula el progreso. Manual: el responsable aprueba.",
    )
    max_participants = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Límite de inscriptos. Null = sin límite.",
    )
    target_role = models.CharField(
        max_length=20,
        choices=TargetRole.choices,
        default=TargetRole.ALL,
        help_text="Rol al que va dirigido el reto. Solo usuarios con ese rol pueden unirse.",
    )

    class Meta:
        ordering = ["-start_date", "name"]
        indexes = [
            models.Index(fields=["gym", "status"]),
            models.Index(fields=["gym", "status", "target_role"]),
        ]

    def __str__(self) -> str:
        return self.name


class ChallengeParticipation(BaseModel):
    class ParticipationStatus(models.TextChoices):
        JOINED = "joined", "Unido"
        PENDING_REVIEW = "pending_review", "Pendiente de revisión"
        COMPLETED = "completed", "Completado"
        REJECTED = "rejected", "Rechazado"
        DROPPED = "dropped", "Abandonado"

    challenge = models.ForeignKey(Challenge, related_name="participants", on_delete=models.CASCADE)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="challenge_participations",
        on_delete=models.CASCADE,
    )
    progress = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=ParticipationStatus.choices,
        default=ParticipationStatus.JOINED,
    )
    points_earned = models.PositiveIntegerField(default=0)
    last_update = models.DateTimeField(auto_now=True)

    # ── Verificación manual ──────────────────────────────────────────────────
    evidence_note = models.TextField(
        blank=True,
        help_text="Evidencia textual enviada por el atleta para retos de verificación manual.",
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="verified_participations",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Coach o nutricionista que aprobó/rechazó la participación.",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    rejection_note = models.TextField(
        blank=True,
        help_text="Motivo del rechazo comunicado al atleta.",
    )
    is_winner = models.BooleanField(
        default=False,
        help_text="True si el staff declaró a este atleta ganador del reto.",
    )

    class Meta:
        unique_together = ("challenge", "user")
        ordering = ["-last_update"]
        indexes = [
            models.Index(fields=["challenge", "status"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.challenge.name}"

    @property
    def is_auto_verifiable(self) -> bool:
        return self.challenge.verification_type == Challenge.VerificationType.AUTOMATIC

    @property
    def progress_percentage(self) -> int:
        goal = self.challenge.goal_value
        if not goal:
            return 0
        return min(100, round(self.progress * 100 / goal))


class Badge(BaseModel):
    gym = models.ForeignKey("gyms.Gym", related_name="badges", on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=255, blank=True)
    condition = models.CharField(max_length=255)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class UserBadge(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="badges", on_delete=models.CASCADE)
    badge = models.ForeignKey(Badge, related_name="awards", on_delete=models.CASCADE)
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "badge")
        ordering = ["-awarded_at"]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.badge.name}"


