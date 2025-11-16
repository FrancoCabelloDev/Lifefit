from django.contrib import admin

from .models import Badge, Challenge, ChallengeParticipation, UserBadge, UserProgress


@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ("name", "gym", "type", "status", "start_date", "end_date")
    list_filter = ("status", "type", "gym")
    search_fields = ("name", "description")


@admin.register(ChallengeParticipation)
class ChallengeParticipationAdmin(admin.ModelAdmin):
    list_display = ("user", "challenge", "progress", "status", "points_earned")
    list_filter = ("status", "challenge__gym")
    search_fields = ("user__email", "challenge__name")


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ("name", "gym", "condition")
    search_fields = ("name", "condition")


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ("user", "badge", "awarded_at")
    search_fields = ("user__email", "badge__name")


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ("user", "level", "total_points", "current_xp", "next_level_xp")
    search_fields = ("user__email",)
