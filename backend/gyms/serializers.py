from rest_framework import serializers

from core.serializers import FeatureFlagSerializer
from .models import (
    AthleteGoal, BodyMeasurement, Branch, CheckIn, CoachAssignment, CoachMessage, Gym,
    GymMembershipPlan, GymFeatureFlag, GymPayment, GymSubscription, Notification,
    NutritionistAssignment, NutritionistAppointment, NutritionistAvailability, NutritionistMessage,
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


class PublicGymMembershipPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymMembershipPlan
        fields = ["id", "name", "description", "price", "duration_days", "features", "tier"]
        read_only_fields = fields


class PublicGymSerializer(serializers.ModelSerializer):
    active_members_count = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    plans = serializers.SerializerMethodField()

    class Meta:
        model = Gym
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "location",
            "logo",
            "brand_color",
            "website",
            "contact_email",
            "active_members_count",
            "min_price",
            "plans",
        ]
        read_only_fields = fields

    def get_active_members_count(self, obj):
        return obj.gym_subscriptions.filter(status="active").count()

    def get_min_price(self, obj):
        plan = obj.membership_plans.filter(is_active=True).order_by("price").first()
        return float(plan.price) if plan else None

    def get_plans(self, obj):
        plans = obj.membership_plans.filter(is_active=True).order_by("price")
        return PublicGymMembershipPlanSerializer(plans, many=True).data


class GymMembershipPlanSerializer(serializers.ModelSerializer):
    gym_name = serializers.CharField(source="gym.name", read_only=True)
    features = serializers.JSONField(default=list)

    def validate_features(self, value):
        if value is None:
            return []
        if isinstance(value, str):
            return [v.strip() for v in value.split(",") if v.strip()]
        if not isinstance(value, list):
            raise serializers.ValidationError("features debe ser una lista")
        return value

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
            "tier",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "gym", "created_at", "updated_at", "gym_name"]


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

    def validate(self, attrs):
        from core.permissions import get_athlete_tier
        athlete = attrs.get("athlete")
        if athlete and get_athlete_tier(athlete) != "premium":
            raise serializers.ValidationError(
                {"athlete": "Este atleta necesita el Plan Premium para ser asignado a un coach."}
            )
        return attrs

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

    def validate(self, attrs):
        from core.permissions import get_athlete_tier
        athlete = attrs.get("athlete")
        if athlete and get_athlete_tier(athlete) != "premium":
            raise serializers.ValidationError(
                {"athlete": "Este atleta necesita el Plan Premium para ser asignado a un nutricionista."}
            )
        return attrs

    def get_nutritionist_name(self, obj):
        return f"{obj.nutritionist.first_name} {obj.nutritionist.last_name}".strip() or obj.nutritionist.email

    def get_athlete_name(self, obj):
        return f"{obj.athlete.first_name} {obj.athlete.last_name}".strip() or obj.athlete.email


class GymSubscriptionSerializer(serializers.ModelSerializer):
    athlete_name = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    plan_price = serializers.SerializerMethodField()
    plan_tier = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = GymSubscription
        fields = [
            "id", "athlete", "athlete_name", "gym", "plan", "plan_name",
            "plan_price", "plan_tier", "status", "start_date", "end_date", "auto_renew",
            "days_remaining", "is_expired", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "athlete_name", "plan_name", "plan_price", "plan_tier", "days_remaining", "is_expired", "gym"]

    def get_athlete_name(self, obj):
        return f"{obj.athlete.first_name} {obj.athlete.last_name}".strip() or obj.athlete.email

    def get_plan_name(self, obj):
        return obj.plan.name if obj.plan else None

    def get_plan_tier(self, obj):
        return obj.plan.tier if obj.plan else None

    def get_plan_price(self, obj):
        return float(obj.plan.price) if obj.plan else None

    def get_days_remaining(self, obj):
        if not obj.end_date:
            return None
        from datetime import date
        delta = obj.end_date - date.today()
        return delta.days if delta.days >= 0 else 0

    def get_is_expired(self, obj):
        if not obj.end_date:
            return False
        from datetime import date
        return obj.end_date < date.today()


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


class BodyMeasurementSerializer(serializers.ModelSerializer):
    bmi = serializers.SerializerMethodField()
    recorded_by = serializers.SerializerMethodField()

    class Meta:
        model = BodyMeasurement
        fields = [
            "id", "athlete", "nutritionist", "gym", "measured_at",
            "weight_kg", "height_cm", "body_fat_pct", "muscle_mass_kg",
            "waist_cm", "hip_cm", "arm_cm", "visceral_fat", "notes",
            "bmi", "recorded_by", "created_at",
        ]
        read_only_fields = ["id", "nutritionist", "gym", "bmi", "recorded_by", "created_at"]

    def get_bmi(self, obj):
        return obj.bmi

    def get_recorded_by(self, obj):
        if obj.nutritionist:
            return f"{obj.nutritionist.first_name} {obj.nutritionist.last_name}".strip()
        return None


class AthleteGoalSerializer(serializers.ModelSerializer):
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = AthleteGoal
        fields = [
            "id", "athlete", "gym",
            "target_weight_kg", "target_body_fat_pct", "target_date",
            "notes", "days_remaining", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "athlete", "gym", "created_at", "updated_at"]

    def get_days_remaining(self, obj):
        if not obj.target_date:
            return None
        from datetime import date
        delta = obj.target_date - date.today()
        return max(delta.days, 0)


class NutritionistAvailabilitySerializer(serializers.ModelSerializer):
    day_label = serializers.SerializerMethodField()

    class Meta:
        model = NutritionistAvailability
        fields = [
            "id", "nutritionist", "gym", "day_of_week", "day_label",
            "start_time", "end_time", "slot_duration_minutes", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "nutritionist", "gym", "created_at", "updated_at"]

    def get_day_label(self, obj):
        return dict(NutritionistAvailability.DAY_CHOICES).get(obj.day_of_week, "")

    def validate(self, attrs):
        start = attrs.get("start_time")
        end = attrs.get("end_time")
        if start and end and start >= end:
            raise serializers.ValidationError("La hora de inicio debe ser anterior a la hora de fin.")
        return attrs


class NutritionistAppointmentSerializer(serializers.ModelSerializer):
    athlete_name = serializers.SerializerMethodField()
    athlete_email = serializers.SerializerMethodField()
    nutritionist_name = serializers.SerializerMethodField()
    appointment_type_display = serializers.CharField(source="get_appointment_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = NutritionistAppointment
        fields = [
            "id", "nutritionist", "nutritionist_name", "athlete", "athlete_name", "athlete_email",
            "gym", "scheduled_at", "duration_minutes", "appointment_type",
            "appointment_type_display", "status", "status_display", "notes",
            "clinical_notes", "reschedule_note", "cancelled_by",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "nutritionist", "athlete", "gym", "reschedule_note", "cancelled_by", "created_at", "updated_at"]

    def get_athlete_name(self, obj):
        return f"{obj.athlete.first_name} {obj.athlete.last_name}".strip() or obj.athlete.email

    def get_athlete_email(self, obj):
        return obj.athlete.email

    def get_nutritionist_name(self, obj):
        return f"{obj.nutritionist.first_name} {obj.nutritionist.last_name}".strip() or obj.nutritionist.email


class NutritionistMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    athlete_name = serializers.SerializerMethodField()

    class Meta:
        model = NutritionistMessage
        fields = [
            "id", "nutritionist", "athlete", "athlete_name", "sender_name",
            "gym", "sender_is_nutritionist", "body", "is_read", "created_at",
        ]
        read_only_fields = ["id", "nutritionist", "gym", "created_at"]

    def get_sender_name(self, obj):
        if obj.sender_is_nutritionist:
            return f"{obj.nutritionist.first_name} {obj.nutritionist.last_name}".strip()
        return f"{obj.athlete.first_name} {obj.athlete.last_name}".strip()

    def get_athlete_name(self, obj):
        return f"{obj.athlete.first_name} {obj.athlete.last_name}".strip() or obj.athlete.email

class CoachMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    athlete_name = serializers.SerializerMethodField()

    class Meta:
        model = CoachMessage
        fields = [
            "id", "coach", "athlete", "athlete_name", "sender_name",
            "gym", "sender_is_coach", "body", "is_read", "created_at",
        ]
        read_only_fields = ["id", "coach", "gym", "sender_is_coach", "created_at"]

    def get_sender_name(self, obj):
        if obj.sender_is_coach:
            return f"{obj.coach.first_name} {obj.coach.last_name}".strip()
        return f"{obj.athlete.first_name} {obj.athlete.last_name}".strip()

    def get_athlete_name(self, obj):
        return f"{obj.athlete.first_name} {obj.athlete.last_name}".strip() or obj.athlete.email
