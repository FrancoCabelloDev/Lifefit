from rest_framework import serializers

from .models import NutritionItem, NutritionMeal, NutritionPlan, UserNutritionPlan


class NutritionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionItem
        fields = ["id", "meal", "food", "portion", "macros", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class NutritionMealSerializer(serializers.ModelSerializer):
    items = NutritionItemSerializer(many=True, read_only=True)

    class Meta:
        model = NutritionMeal
        fields = ["id", "plan", "order", "name", "meal_time", "notes", "items", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at", "items"]


class NutritionPlanSerializer(serializers.ModelSerializer):
    meals = NutritionMealSerializer(many=True, read_only=True)

    class Meta:
        model = NutritionPlan
        fields = [
            "id",
            "gym",
            "name",
            "description",
            "calories_per_day",
            "macros",
            "status",
            "meals",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "meals"]


class UserNutritionPlanSerializer(serializers.ModelSerializer):
    plan_detail = NutritionPlanSerializer(source="plan", read_only=True)

    class Meta:
        model = UserNutritionPlan
        fields = [
            "id",
            "user",
            "plan",
            "plan_detail",
            "assigned_by",
            "start_date",
            "end_date",
            "status",
            "compliance_percentage",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "plan_detail"]
