from django.core.management.base import BaseCommand
from django.utils import timezone

from gyms.models import Gym
from nutrition.models import NutritionItem, NutritionMeal, NutritionPlan


class Command(BaseCommand):
    help = "Seed basic nutrition plans with meals and items for demo purposes."

    def handle(self, *args, **options):
        gym = Gym.objects.first()
        if not gym:
            self.stdout.write(self.style.ERROR("No hay gimnasios creados. Crea uno antes de ejecutar este seed."))
            return

        plan, _ = NutritionPlan.objects.get_or_create(
            gym=gym,
            name="Plan Balanceado 2000 kcal",
            defaults={
                "description": "Plan general para atletas que buscan mantener su peso.",
                "calories_per_day": 2000,
                "macros": {"carbs": 50, "protein": 25, "fat": 25},
                "status": NutritionPlan.Status.ACTIVE,
            },
        )

        breakfast, _ = NutritionMeal.objects.get_or_create(
            plan=plan,
            order=1,
            defaults={"name": "Desayuno energético", "meal_time": NutritionMeal.MealTime.BREAKFAST},
        )
        NutritionItem.objects.get_or_create(
            meal=breakfast,
            food="Avena con frutas",
            defaults={"portion": "1 taza", "macros": {"calories": 350}},
        )

        lunch, _ = NutritionMeal.objects.get_or_create(
            plan=plan,
            order=2,
            defaults={"name": "Almuerzo completo", "meal_time": NutritionMeal.MealTime.LUNCH},
        )
        NutritionItem.objects.get_or_create(
            meal=lunch,
            food="Pollo a la plancha con quinoa",
            defaults={"portion": "150g / 1 taza", "macros": {"calories": 600}},
        )

        dinner, _ = NutritionMeal.objects.get_or_create(
            plan=plan,
            order=3,
            defaults={"name": "Cena ligera", "meal_time": NutritionMeal.MealTime.DINNER},
        )
        NutritionItem.objects.get_or_create(
            meal=dinner,
            food="Ensalada de salmón",
            defaults={"portion": "200g", "macros": {"calories": 450}},
        )

        self.stdout.write(self.style.SUCCESS("Plan de nutrición demo creado/actualizado."))
