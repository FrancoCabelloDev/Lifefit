from rest_framework import serializers

from .models import MealTemplate, NutritionItem, NutritionMeal, NutritionPlan, UserMealLog, UserNutritionPlan


class MealTemplateSerializer(serializers.ModelSerializer):
    meal_type_display = serializers.CharField(source="get_meal_type_display", read_only=True)
    
    class Meta:
        model = MealTemplate
        fields = [
            "id",
            "plan",
            "day_number",
            "meal_type",
            "meal_type_display",
            "name",
            "description",
            "calories",
            "protein_g",
            "carbs_g",
            "fats_g",
            "ingredients",
            "instructions",
            "order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "meal_type_display"]


class UserMealLogSerializer(serializers.ModelSerializer):
    meal_detail = MealTemplateSerializer(source="meal_template", read_only=True)
    
    class Meta:
        model = UserMealLog
        fields = [
            "id",
            "user",
            "meal_template",
            "meal_detail",
            "date",
            "completed",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "meal_detail"]


class NutritionPlanSerializer(serializers.ModelSerializer):
    meal_templates = MealTemplateSerializer(many=True, read_only=True)
    total_meals = serializers.SerializerMethodField()
    
    class Meta:
        model = NutritionPlan
        fields = [
            "id",
            "gym",
            "name",
            "description",
            "calories_per_day",
            "protein_g",
            "carbs_g",
            "fats_g",
            "duration_days",
            "status",
            "points_reward",
            "meal_templates",
            "total_meals",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "meal_templates", "total_meals"]
    
    def get_total_meals(self, obj):
        return obj.meal_templates.count()


class NutritionPlanDetailSerializer(NutritionPlanSerializer):
    """Serializer with full meal templates details"""
    meals_by_day = serializers.SerializerMethodField()
    
    class Meta(NutritionPlanSerializer.Meta):
        fields = NutritionPlanSerializer.Meta.fields + ["meals_by_day"]
    
    def get_meals_by_day(self, obj):
        """Group meals by day_number"""
        meals_dict = {}
        for meal in obj.meal_templates.all():
            day = meal.day_number if meal.day_number else 0
            if day not in meals_dict:
                meals_dict[day] = []
            meals_dict[day].append(MealTemplateSerializer(meal).data)
        return meals_dict


# Legacy serializers for backward compatibility
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
