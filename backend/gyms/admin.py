from django.contrib import admin

from .models import Branch, Gym


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
