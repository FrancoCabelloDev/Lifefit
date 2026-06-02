from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    gym_slug = serializers.CharField(source='gym.slug', read_only=True)

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
            "membership_plan",
            "puntos",
            "nivel",
            "date_joined",
            "is_google_account",
            "google_picture",
        ]
        read_only_fields = ["id", "date_joined", "puntos", "nivel", "is_google_account", "google_picture", "gym_slug"]


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "gym"]


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})
    gym_slug = serializers.CharField(write_only=True, required=True)
    membership_plan_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "role",
            "gym_slug",
            "membership_plan_id",
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

        membership_plan_id = attrs.pop("membership_plan_id", None)
        if membership_plan_id:
            from gyms.models import GymMembershipPlan
            plan = GymMembershipPlan.objects.filter(id=membership_plan_id, is_active=True).first()
            if not plan:
                raise serializers.ValidationError({"membership_plan_id": "Plan no válido."})
            attrs["membership_plan"] = plan

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class SetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})

    def validate_password(self, value):
        validate_password(value)
        return value
