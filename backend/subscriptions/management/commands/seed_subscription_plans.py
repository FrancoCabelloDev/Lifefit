from django.core.management.base import BaseCommand

from subscriptions.models import SubscriptionPlan


class Command(BaseCommand):
    help = "Seed default subscription plans (Starter, Pro, Gym)."

    def handle(self, *args, **options):
        plans = [
            {
                "name": "Starter",
                "description": "Dashboard básico, hasta 3 rutinas, retos limitados.",
                "price": 0,
                "billing_cycle": SubscriptionPlan.BillingCycle.MONTHLY,
                "user_limit": 1,
                "features": [
                    "Dashboard básico",
                    "Hasta 3 rutinas",
                    "Retos limitados",
                    "Ranking básico",
                ],
            },
            {
                "name": "Pro",
                "description": "Para atletas comprometidos con rutinas y retos ilimitados.",
                "price": 12,
                "billing_cycle": SubscriptionPlan.BillingCycle.MONTHLY,
                "user_limit": 1,
                "features": [
                    "Rutinas ilimitadas",
                    "Todos los retos",
                    "Plan de nutrición",
                    "Ranking global",
                    "Insignias premium",
                ],
            },
            {
                "name": "Gym",
                "description": "Para gimnasios con panel administrativo completo.",
                "price": 99,
                "billing_cycle": SubscriptionPlan.BillingCycle.MONTHLY,
                "user_limit": None,
                "features": [
                    "Usuarios ilimitados",
                    "Panel administrativo",
                    "Branding personalizado",
                    "Reportes avanzados",
                    "Integraciones (Stripe, etc.)",
                    "RBAC y auditoría",
                ],
            },
        ]

        for plan_data in plans:
            plan, created = SubscriptionPlan.objects.update_or_create(
                name=plan_data["name"],
                defaults=plan_data,
            )
            self.stdout.write(
                self.style.SUCCESS(f"{'Creado' if created else 'Actualizado'} plan {plan.name}")
            )
