from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone

try:
    from cloudinary.models import CloudinaryField as _CloudinaryField
    _CLOUDINARY = True
except ImportError:
    _CLOUDINARY = False

from core.models import BaseModel


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")

        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", User.Role.ATHLETE)

        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            if not extra_fields.get("is_google_account"):
                raise ValueError("Users must have a password")
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.SUPER_ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(BaseModel, AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        GYM_ADMIN = "gym_admin", "Gym Admin"
        COACH = "coach", "Coach"
        ATHLETE = "athlete", "Athlete"
        NUTRITIONIST = "nutritionist", "Nutricionista"
        RECEPTIONIST = "receptionist", "Atención al Cliente"



    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.ATHLETE)
    dni = models.CharField(max_length=20, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    gym = models.ForeignKey(
        "gyms.Gym",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    puntos = models.IntegerField(default=0)
    nivel = models.IntegerField(default=1)
    google_id = models.CharField(max_length=255, blank=True, null=True)
    google_picture = models.URLField(blank=True, null=True)
    is_google_account = models.BooleanField(default=False)

    # Perfil profesional (coach / nutritionist)
    profile_picture = (
        _CloudinaryField("image", folder="users/profiles/", null=True, blank=True)
        if _CLOUDINARY else
        models.ImageField(upload_to="users/profiles/", null=True, blank=True)
    )
    bio = models.TextField(blank=True, max_length=600)
    specialty = models.CharField(max_length=100, blank=True)
    years_experience = models.PositiveSmallIntegerField(null=True, blank=True)
    max_clients = models.PositiveSmallIntegerField(default=20)

    # Datos físicos del atleta (autoreportados)
    height_cm = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)

    # Objetivos del atleta
    class FitnessGoal(models.TextChoices):
        WEIGHT_LOSS     = "weight_loss",     "Pérdida de peso"
        MUSCLE_GAIN     = "muscle_gain",     "Ganancia muscular"
        ENDURANCE       = "endurance",       "Resistencia"
        FLEXIBILITY     = "flexibility",     "Flexibilidad"
        SPORT_PERF      = "sport_perf",      "Rendimiento deportivo"
        GENERAL_FITNESS = "general_fitness", "Fitness general"

    fitness_goal    = models.CharField(max_length=30, choices=FitnessGoal.choices, blank=True)
    goal_notes      = models.TextField(blank=True, max_length=400)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    class Meta:
        ordering = ["-date_joined"]
        indexes = [
            models.Index(fields=["gym", "role"]),
        ]

    @property
    def active_membership(self):
        return self.gym_subscriptions.filter(status="active").select_related("plan").first()

    def get_full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self) -> str:
        return self.email
