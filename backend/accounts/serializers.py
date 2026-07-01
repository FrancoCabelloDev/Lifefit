from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from gyms.serializers import GymSubscriptionSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    gym_slug = serializers.CharField(source='gym.slug', read_only=True)
    active_membership = serializers.SerializerMethodField(read_only=True)
    puntos = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "dni",
            "phone",
            "role",
            "gym",
            "gym_slug",
            "active_membership",
            "puntos",
            "date_joined",
            "is_google_account",
            "google_picture",
            # Perfil profesional
            "profile_picture",
            "bio",
            "specialty",
            "years_experience",
            "max_clients",
            # Objetivos atleta
            "fitness_goal",
            "goal_notes",
            # Datos físicos autoreportados
            "height_cm",
            "weight_kg",
        ]
        read_only_fields = [
            "id", "date_joined",
            "is_google_account", "google_picture",
            "gym_slug", "active_membership",
        ]

    def get_puntos(self, obj):
        from gamification.models import UserPoints
        from django.db.models import Sum
        return (
            UserPoints.objects
            .filter(user=obj, status=UserPoints.Status.APPROVED)
            .aggregate(total=Sum("points"))["total"] or 0
        )

    def get_active_membership(self, obj):
        membership = obj.active_membership
        if membership:
            return GymSubscriptionSerializer(membership).data
        return None


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name", "last_name", "phone", "dni",
            "profile_picture", "bio", "specialty",
            "years_experience", "max_clients",
            "fitness_goal", "goal_notes",
            "height_cm", "weight_kg",
        ]


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})
    gym_slug = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "role",
            "gym_slug",
            "password",
        ]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo ya está registrado.")
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        validate_password(password)
        
        gym_slug = attrs.pop("gym_slug", None)
        gym = None
        if gym_slug:
            from gyms.models import Gym
            gym = Gym.objects.filter(slug=gym_slug).first()
            if not gym:
                raise serializers.ValidationError({"gym_slug": "Gimnasio no encontrado."})
            attrs["gym"] = gym

        if gym:
            role = attrs.get("role", "athlete")
            if role == "athlete" and User.objects.filter(gym=gym, role="athlete").count() >= gym.max_athletes:
                raise serializers.ValidationError("El gimnasio ha alcanzado el límite máximo de atletas.")
            if role == "coach" and User.objects.filter(gym=gym, role="coach").count() >= gym.max_coaches:
                raise serializers.ValidationError("El gimnasio ha alcanzado el límite máximo de coaches.")
            if role == "nutritionist" and User.objects.filter(gym=gym, role="nutritionist").count() >= gym.max_nutritionists:
                raise serializers.ValidationError("El gimnasio ha alcanzado el límite máximo de nutricionistas.")

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    gym_slug = serializers.CharField(required=False, allow_blank=True, default="")

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        return token

    def validate(self, attrs):
        gym_slug = attrs.pop("gym_slug", "").strip()
        data = super().validate(attrs)
        user = self.user

        if gym_slug:
            # Gym-specific login: super_admin is not allowed
            if user.role == user.Role.SUPER_ADMIN:
                raise AuthenticationFailed(
                    "Los administradores de LifeFit deben ingresar desde el panel de control."
                )
            # User must belong to the requested gym
            if not user.gym or user.gym.slug != gym_slug:
                raise AuthenticationFailed(
                    "No tienes acceso a este gimnasio."
                )

        data["user"] = UserSerializer(self.user).data
        return data


class SetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})

    def validate_password(self, value):
        validate_password(value)
        return value
