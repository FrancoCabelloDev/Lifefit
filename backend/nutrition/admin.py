from django.contrib import admin

from .models import MealTemplate, NutritionItem, NutritionMeal, NutritionPlan, UserMealLog, UserNutritionPlan


class MealTemplateInline(admin.TabularInline):
    model = MealTemplate
    extra = 1
    fields = ("day_number", "meal_type", "name", "calories", "protein_g", "carbs_g", "fats_g", "order")


class NutritionItemInline(admin.TabularInline):
    model = NutritionItem
    extra = 1


@admin.register(NutritionPlan)
class NutritionPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "gym", "calories_per_day", "protein_g", "carbs_g", "fats_g", "duration_days", "status", "points_reward")
    list_filter = ("status", "gym", "duration_days")
    search_fields = ("name", "description")
    inlines = [MealTemplateInline]
    fieldsets = (
        ("Información General", {
            "fields": ("gym", "name", "description", "status", "duration_days", "points_reward")
        }),
        ("Objetivos Nutricionales", {
            "fields": ("calories_per_day", "protein_g", "carbs_g", "fats_g")
        }),
    )


@admin.register(MealTemplate)
class MealTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "plan", "day_number", "meal_type", "calories", "protein_g", "carbs_g", "fats_g", "order")
    list_filter = ("meal_type", "day_number", "plan__gym")
    search_fields = ("name", "plan__name", "ingredients")
    fieldsets = (
        ("Información Básica", {
            "fields": ("plan", "day_number", "meal_type", "name", "order")
        }),
        ("Contenido Nutricional", {
            "fields": ("calories", "protein_g", "carbs_g", "fats_g")
        }),
        ("Receta", {
            "fields": ("description", "ingredients", "instructions")
        }),
    )


@admin.register(UserMealLog)
class UserMealLogAdmin(admin.ModelAdmin):
    list_display = ("user", "meal_template", "date", "completed", "created_at")
    list_filter = ("completed", "date", "meal_template__meal_type")
    search_fields = ("user__email", "meal_template__name", "notes")
    date_hierarchy = "date"
    readonly_fields = ("created_at", "updated_at")


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

