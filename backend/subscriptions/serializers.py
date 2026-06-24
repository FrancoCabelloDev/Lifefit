from django.contrib.auth import get_user_model
from rest_framework import serializers

from gyms.models import Gym
from .models import Payment, Subscription, SubscriptionPlan

User = get_user_model()


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "name",
            "description",
            "price",
            "currency",
            "billing_cycle",
            "user_limit",
            "max_athletes",
            "max_coaches",
            "max_nutritionists",
            "features",
            "is_active",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio no puede ser negativo.")
        return value

    def validate(self, data):
        max_athletes = data.get("max_athletes", getattr(self.instance, "max_athletes", None))
        max_coaches  = data.get("max_coaches",  getattr(self.instance, "max_coaches",  None))
        max_nutri    = data.get("max_nutritionists", getattr(self.instance, "max_nutritionists", None))
        if max_athletes is not None and max_athletes < 1:
            raise serializers.ValidationError({"max_athletes": "Debe permitir al menos 1 atleta."})
        if max_coaches is not None and max_coaches < 0:
            raise serializers.ValidationError({"max_coaches": "El límite de coaches no puede ser negativo."})
        if max_nutri is not None and max_nutri < 0:
            raise serializers.ValidationError({"max_nutritionists": "El límite de nutricionistas no puede ser negativo."})
        return data


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_detail = SubscriptionPlanSerializer(source="plan", read_only=True)
    gym_name = serializers.CharField(source="owner_gym.name", read_only=True)
    gym_slug = serializers.CharField(source="owner_gym.slug", read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "owner_gym",
            "owner_user",
            "plan",
            "plan_detail",
            "gym_name",
            "gym_slug",
            "status",
            "start_date",
            "end_date",
            "next_billing_date",
            "cancel_at_period_end",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "plan_detail", "gym_name", "gym_slug"]

    def validate(self, data):
        start_date       = data.get("start_date",       getattr(self.instance, "start_date",       None))
        end_date         = data.get("end_date",          getattr(self.instance, "end_date",          None))
        next_billing     = data.get("next_billing_date", getattr(self.instance, "next_billing_date", None))

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({
                "end_date": "La fecha de fin no puede ser anterior a la fecha de inicio."
            })
        if start_date and next_billing and next_billing < start_date:
            raise serializers.ValidationError({
                "next_billing_date": "La fecha del próximo cobro no puede ser anterior a la fecha de inicio."
            })
        return data


class PaymentSerializer(serializers.ModelSerializer):
    subscription_detail = SubscriptionSerializer(source="subscription", read_only=True)
    gym_name = serializers.CharField(source="subscription.owner_gym.name", read_only=True)
    gym_slug = serializers.CharField(source="subscription.owner_gym.slug", read_only=True)
    plan_name = serializers.CharField(source="subscription.plan.name", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "subscription",
            "subscription_detail",
            "gym_name",
            "gym_slug",
            "plan_name",
            "amount",
            "currency",
            "status",
            "paid_at",
            "provider",
            "external_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "subscription_detail", "gym_name", "gym_slug", "plan_name"]
