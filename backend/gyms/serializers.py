from rest_framework import serializers

from core.serializers import FeatureFlagSerializer
from .models import (
    Branch, CheckIn, CoachAssignment, Gym, GymMembershipPlan,
    GymFeatureFlag, GymPayment, GymSubscription, Notification, NutritionistAssignment,
)


class BranchSerializer(serializers.ModelSerializer):
    gym = serializers.PrimaryKeyRelatedField(queryset=Gym.objects.all())

    class Meta:
        model = Branch
        fields = [
            "id",
            "gym",
            "name",
            "slug",
            "address",
            "city",
            "state",
            "country",
            "zipcode",
            "status",
            "phone",
            "latitude",
            "longitude",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class GymSerializer(serializers.ModelSerializer):
    branches = BranchSerializer(many=True, read_only=True)
    active_plan = serializers.SerializerMethodField()

    class Meta:
        model = Gym
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "location",
            "status",
            "logo",
            "ruc",
            "brand_color",
            "website",
            "contact_email",
            "metrics",
            "max_athletes",
            "max_coaches",
            "max_nutritionists",
            "branches",
            "active_plan",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "branches", "active_plan"]

    def get_active_plan(self, obj):
        from subscriptions.models import Subscription
        sub = obj.subscriptions.filter(status="active").first()
        if sub:
            return {
                "name": sub.plan.name,
                "price": float(sub.plan.price),
                "billing_cycle": sub.plan.get_billing_cycle_display(),
                "start_date": sub.start_date
            }
        return None


class PublicGymSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gym
        fields = [
            "id",
            "name",
            "slug",
            "location",
            "logo",
            "brand_color",
        ]
        read_only_fields = fields


class GymMembershipPlanSerializer(serializers.ModelSerializer):
    gym_name = serializers.CharField(source="gym.name", read_only=True)

    class Meta:
        model = GymMembershipPlan
        fields = [
            "id",
            "gym",
            "gym_name",
            "name",
            "description",
            "price",
            "duration_days",
            "features",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "gym_name"]


class GymFeatureFlagSerializer(serializers.ModelSerializer):
    feature_flag_detail = FeatureFlagSerializer(source="feature_flag", read_only=True)

    class Meta:
        model = GymFeatureFlag
        fields = [
            "id",
            "gym",
            "feature_flag",
            "feature_flag_detail",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CheckInSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()

    class Meta:
        model = CheckIn
        fields = [
            "id",
            "user",
            "user_name",
            "user_role",
            "gym",
            "branch",
            "branch_name",
            "method",
            "timestamp",
            "created_at",
        ]
        read_only_fields = ["id", "timestamp", "created_at", "user_name", "user_role", "branch_name"]

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email

    def get_user_role(self, obj):
        return obj.user.role

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else None


class CheckInCreateSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(required=False)
    email = serializers.EmailField(required=False)
    dni = serializers.CharField(required=False)
    branch_id = serializers.UUIDField(required=False, allow_null=True)
    method = serializers.ChoiceField(choices=CheckIn.Method.choices, default=CheckIn.Method.MANUAL)


class CoachAssignmentSerializer(serializers.ModelSerializer):
    coach_name = serializers.SerializerMethodField()
    athlete_name = serializers.SerializerMethodField()

    class Meta:
        model = CoachAssignment
        fields = [
            "id",
            "coach",
            "coach_name",
            "athlete",
            "athlete_name",
            "gym",
            "is_active",
            "assigned_at",
            "created_at",
        ]
        read_only_fields = ["id", "assigned_at", "created_at", "coach_name", "athlete_name"]

    def get_coach_name(self, obj):
        return f"{obj.coach.first_name} {obj.coach.last_name}".strip() or obj.coach.email

    def get_athlete_name(self, obj):
        return f"{obj.athlete.first_name} {obj.athlete.last_name}".strip() or obj.athlete.email


class NotificationSerializer(serializers.ModelSerializer):
    recipient_name = serializers.SerializerMethodField()
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id", "recipient", "recipient_name", "actor", "actor_name",
            "notification_type", "title", "message", "gym", "is_read", "link",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "recipient_name", "actor_name"]

    def get_recipient_name(self, obj):
        return f"{obj.recipient.first_name} {obj.recipient.last_name}".strip() or obj.recipient.email

    def get_actor_name(self, obj):
        if not obj.actor:
            return None
        return f"{obj.actor.first_name} {obj.actor.last_name}".strip() or obj.actor.email


class NutritionistAssignmentSerializer(serializers.ModelSerializer):
    nutritionist_name = serializers.SerializerMethodField()
    athlete_name = serializers.SerializerMethodField()

    class Meta:
        model = NutritionistAssignment
        fields = [
            "id",
            "nutritionist",
            "nutritionist_name",
            "athlete",
            "athlete_name",
            "gym",
            "is_active",
            "assigned_at",
            "created_at",
        ]
        read_only_fields = ["id", "assigned_at", "created_at", "nutritionist_name", "athlete_name"]

    def get_nutritionist_name(self, obj):
        return f"{obj.nutritionist.first_name} {obj.nutritionist.last_name}".strip() or obj.nutritionist.email

    def get_athlete_name(self, obj):
        return f"{obj.athlete.first_name} {obj.athlete.last_name}".strip() or obj.athlete.email


class GymSubscriptionSerializer(serializers.ModelSerializer):
    athlete_name = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    plan_price = serializers.SerializerMethodField()

    class Meta:
        model = GymSubscription
        fields = [
            "id", "athlete", "athlete_name", "gym", "plan", "plan_name",
            "plan_price", "status", "start_date", "end_date", "auto_renew",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "athlete_name", "plan_name", "plan_price"]

    def get_athlete_name(self, obj):
        return f"{obj.athlete.first_name} {obj.athlete.last_name}".strip() or obj.athlete.email

    def get_plan_name(self, obj):
        return obj.plan.name if obj.plan else None

    def get_plan_price(self, obj):
        return float(obj.plan.price) if obj.plan else None


class GymPaymentSerializer(serializers.ModelSerializer):
    athlete_name = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()

    class Meta:
        model = GymPayment
        fields = [
            "id", "gym", "subscription", "athlete", "athlete_name",
            "plan", "plan_name", "amount", "currency", "status",
            "paid_at", "due_date", "payment_method", "reference", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "athlete_name", "plan_name"]

    def get_athlete_name(self, obj):
        if not obj.athlete:
            return None
        return f"{obj.athlete.first_name} {obj.athlete.last_name}".strip() or obj.athlete.email

    def get_plan_name(self, obj):
        return obj.plan.name if obj.plan else None