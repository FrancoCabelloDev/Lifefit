from django.contrib import admin

from .models import NutritionItem, NutritionMeal, NutritionPlan, UserNutritionPlan


class NutritionItemInline(admin.TabularInline):
    model = NutritionItem
    extra = 1


@admin.register(NutritionPlan)
class NutritionPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "gym", "calories_per_day", "status")
    list_filter = ("status", "gym")
    search_fields = ("name",)


@admin.register(NutritionMeal)
class NutritionMealAdmin(admin.ModelAdmin):
    list_display = ("name", "plan", "order", "meal_time")
    list_filter = ("meal_time", "plan__gym")
    inlines = [NutritionItemInline]


@admin.register(UserNutritionPlan)
class UserNutritionPlanAdmin(admin.ModelAdmin):
    list_display = ("user", "plan", "status", "start_date", "compliance_percentage")
    list_filter = ("status", "plan__gym")
    search_fields = ("user__email", "plan__name")
