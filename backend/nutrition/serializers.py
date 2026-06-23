from rest_framework import serializers

from .models import Food, MealFoodItem, MealTemplate, NutritionItem, NutritionMeal, NutritionPlan, UserMealLog, UserNutritionPlan


class FoodSerializer(serializers.ModelSerializer):
    food_group_display = serializers.CharField(source="get_food_group_display", read_only=True)
    created_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Food
        fields = [
            "id",
            "name",
            "food_group",
            "food_group_display",
            "source",
            "calories_per_100g",
            "protein_per_100g",
            "carbs_per_100g",
            "fats_per_100g",
            "fiber_per_100g",
            "gym",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "gym", "created_by", "created_at", "updated_at", "food_group_display", "created_by_name"]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return None


class MealFoodItemSerializer(serializers.ModelSerializer):
    food_name       = serializers.CharField(source="food.name", read_only=True)
    food_group      = serializers.CharField(source="food.food_group", read_only=True)

    class Meta:
        model = MealFoodItem
        fields = [
            "id", "meal", "food", "food_name", "food_group",
            "quantity_g", "order",
            "calories", "protein_g", "carbs_g", "fats_g", "fiber_g",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "food_name", "food_group",
            "calories", "protein_g", "carbs_g", "fats_g", "fiber_g",
            "created_at", "updated_at",
        ]


class MealTemplateSerializer(serializers.ModelSerializer):
    meal_type_display = serializers.CharField(source="get_meal_type_display", read_only=True)
    weekday_display = serializers.CharField(source="get_weekday_display", read_only=True)
    food_items = MealFoodItemSerializer(many=True, read_only=True)

    class Meta:
        model = MealTemplate
        fields = [
            "id",
            "plan",
            "day_number",
            "weekday",
            "weekday_display",
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
            "food_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "meal_type_display", "weekday_display", "food_items"]


class UserMealLogSerializer(serializers.ModelSerializer):
    meal_detail = MealTemplateSerializer(source="meal_template", read_only=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = UserMealLog
        fields = [
            "id",
            "user",
            "meal_template",
            "meal_detail",
            "date",
            "status",
            "alternative_food_text",
            "notes",
            "photo_url",
            "nutritionist_approved",
            "nutritionist_notes",
            "xp_awarded",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user", "photo_url", "nutritionist_approved",
            "nutritionist_notes", "xp_awarded", "created_at", "updated_at",
        ]

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.photo.url)
        return obj.photo.url


class NutritionPlanSerializer(serializers.ModelSerializer):
    meals_by_day = serializers.SerializerMethodField()
    total_meals = serializers.SerializerMethodField()
    user_assignment = serializers.SerializerMethodField()

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
            "created_at",
            "updated_at",
            "meals_by_day",
            "total_meals",
            "user_assignment",
        ]

    def get_meals_by_day(self, obj):
        meals_by_day = {}
        meal_templates = obj.meal_templates.all().order_by("day_number", "order")
        for meal in meal_templates:
            key = meal.weekday if meal.weekday else str(meal.day_number)
            if key not in meals_by_day:
                meals_by_day[key] = []
            meals_by_day[key].append(MealTemplateSerializer(meal).data)
        return meals_by_day

    def get_total_meals(self, obj):
        return len(obj.meal_templates.all())
    
    def get_user_assignment(self, obj):
        assignments = getattr(obj, "_user_assignments", None)
        if assignments is not None:
            if assignments:
                assignment = assignments[0]
                return {
                    'id': str(assignment.id),
                    'status': assignment.status,
                    'compliance_percentage': float(assignment.compliance_percentage),
                    'start_date': assignment.start_date.isoformat(),
                    'end_date': assignment.end_date.isoformat() if assignment.end_date else None,
                }
            return None
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        
        try:
            assignment = UserNutritionPlan.objects.filter(
                user=request.user,
                plan=obj
            ).order_by('-created_at').first()
            
            if assignment:
                return {
                    'id': str(assignment.id),
                    'status': assignment.status,
                    'compliance_percentage': float(assignment.compliance_percentage),
                    'start_date': assignment.start_date.isoformat(),
                    'end_date': assignment.end_date.isoformat() if assignment.end_date else None,
                }
        except UserNutritionPlan.DoesNotExist:
            pass
        
        return None


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
    assigned_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserNutritionPlan
        fields = [
            "id",
            "user",
            "plan",
            "plan_detail",
            "assigned_by",
            "assigned_by_name",
            "start_date",
            "end_date",
            "status",
            "compliance_percentage",
            "review_requested_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "review_requested_at", "created_at", "updated_at", "plan_detail", "assigned_by_name"]

    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            name = f"{obj.assigned_by.first_name} {obj.assigned_by.last_name}".strip()
            return name or obj.assigned_by.email
        return None
