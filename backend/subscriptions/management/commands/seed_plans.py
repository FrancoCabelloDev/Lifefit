from decimal import Decimal

from django.core.management.base import BaseCommand

from subscriptions.models import SubscriptionPlan


class Command(BaseCommand):
    help = "Crea planes de suscripción por defecto"

    def handle(self, *args, **options):
        plans = [
            SubscriptionPlan(
                name="Básico",
                description="Perfecto para estudios boutique.",
                price=Decimal("99.00"),
                currency="PEN",
                billing_cycle="monthly",
                max_athletes=500,
                max_coaches=2,
                max_nutritionists=2,
                features={
                    "rutinas": True,
                    "nutricion": True,
                    "retos": False,
                    "ranking": False,
                    "checkin": False,
                    "coach": False,
                },
                is_active=True,
                display_order=1,
            ),
            SubscriptionPlan(
                name="Pro",
                description="Para centros fitness en crecimiento.",
                price=Decimal("249.00"),
                currency="PEN",
                billing_cycle="monthly",
                max_athletes=2500,
                max_coaches=10,
                max_nutritionists=10,
                features={
                    "rutinas": True,
                    "nutricion": True,
                    "retos": True,
                    "ranking": True,
                    "checkin": True,
                    "coach": True,
                },
                is_active=True,
                display_order=2,
            ),
            SubscriptionPlan(
                name="Empresarial",
                description="Para cadenas de múltiples locales.",
                price=Decimal("499.00"),
                currency="PEN",
                billing_cycle="monthly",
                max_athletes=999999,
                max_coaches=50,
                max_nutritionists=20,
                features={
                    "rutinas": True,
                    "nutricion": True,
                    "retos": True,
                    "ranking": True,
                    "checkin": True,
                    "coach": True,
                },
                is_active=True,
                display_order=3,
            ),
        ]

        for plan in plans:
            existing = SubscriptionPlan.objects.filter(name=plan.name).first()
            if existing:
                self.stdout.write(f"  -> {plan.name} ya existe, actualizando...")
                existing.max_athletes = plan.max_athletes
                existing.max_coaches = plan.max_coaches
                existing.max_nutritionists = plan.max_nutritionists
                existing.price = plan.price
                existing.description = plan.description
                existing.features = plan.features
                existing.display_order = plan.display_order
                existing.save()
                continue
            plan.save()
            self.stdout.write(f"  OK {plan.name} creado.")

        self.stdout.write(self.style.SUCCESS("Seed de planes completado."))
