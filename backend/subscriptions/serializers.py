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
            "features",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_detail = SubscriptionPlanSerializer(source="plan", read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "owner_gym",
            "owner_user",
            "plan",
            "plan_detail",
            "status",
            "start_date",
            "end_date",
            "next_billing_date",
            "cancel_at_period_end",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "plan_detail"]


class PaymentSerializer(serializers.ModelSerializer):
    subscription_detail = SubscriptionSerializer(source="subscription", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "subscription",
            "subscription_detail",
            "amount",
            "currency",
            "status",
            "paid_at",
            "provider",
            "external_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "subscription_detail"]
