from django.contrib import admin

from .models import Branch, CheckIn, CoachAssignment, Gym, GymMembershipPlan


@admin.register(Gym)
class GymAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "brand_color", "website")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ("name", "gym", "city", "status")
    list_filter = ("status", "gym")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "city", "state", "gym__name")


@admin.register(CheckIn)
class CheckInAdmin(admin.ModelAdmin):
    list_display = ("user", "gym", "branch", "method", "timestamp")
    list_filter = ("method", "gym", "timestamp")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    date_hierarchy = "timestamp"


@admin.register(CoachAssignment)
class CoachAssignmentAdmin(admin.ModelAdmin):
    list_display = ("coach", "athlete", "gym", "is_active", "assigned_at")
    list_filter = ("is_active", "gym")
    search_fields = ("coach__email", "athlete__email", "coach__first_name", "athlete__first_name")


@admin.register(GymMembershipPlan)
class GymMembershipPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "gym", "price", "duration_days", "is_active")
    list_filter = ("is_active", "gym")
    search_fields = ("name", "gym__name")
