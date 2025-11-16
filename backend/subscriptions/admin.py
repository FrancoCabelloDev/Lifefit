from django.contrib import admin

from .models import Payment, Subscription, SubscriptionPlan


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "billing_cycle", "is_active")
    list_filter = ("billing_cycle", "is_active")
    search_fields = ("name",)


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("plan", "owner_gym", "owner_user", "status", "start_date", "next_billing_date")
    list_filter = ("status", "plan")
    search_fields = ("owner_gym__name", "owner_user__email")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("subscription", "amount", "currency", "status", "paid_at")
    list_filter = ("status", "currency")
