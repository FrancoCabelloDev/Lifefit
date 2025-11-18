from django.core.management.base import BaseCommand

from nutrition.models import MealTemplate, NutritionPlan


class Command(BaseCommand):
    help = "Crea planes de nutrición de ejemplo con comidas para 7 días"

    def handle(self, *args, **options):
        self.stdout.write("Creando planes de nutrición...")

        # Plan 1: Pérdida de Peso
        plan_perdida, created = NutritionPlan.objects.get_or_create(
            name="Plan Pérdida de Peso",
            defaults={
                "description": "Plan diseñado para perder peso de forma saludable con déficit calórico moderado",
                "calories_per_day": 1800,
                "protein_g": 150,
                "carbs_g": 150,
                "fats_g": 60,
                "duration_days": 7,
                "status": "active",
                "points_reward": 100,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"✓ Creado: {plan_perdida.name}"))
            self._create_weight_loss_meals(plan_perdida)
        else:
            self.stdout.write(self.style.WARNING(f"- Ya existe: {plan_perdida.name}"))

        # Plan 2: Ganancia Muscular
        plan_ganancia, created = NutritionPlan.objects.get_or_create(
            name="Plan Ganancia Muscular",
            defaults={
                "description": "Plan alto en proteínas y calorías para maximizar el crecimiento muscular",
                "calories_per_day": 2800,
                "protein_g": 200,
                "carbs_g": 320,
                "fats_g": 80,
                "duration_days": 7,
                "status": "active",
                "points_reward": 150,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"✓ Creado: {plan_ganancia.name}"))
            self._create_muscle_gain_meals(plan_ganancia)
        else:
            self.stdout.write(self.style.WARNING(f"- Ya existe: {plan_ganancia.name}"))

        # Plan 3: Mantenimiento
        plan_mantenimiento, created = NutritionPlan.objects.get_or_create(
            name="Plan Mantenimiento Balanceado",
            defaults={
                "description": "Plan equilibrado para mantener peso y composición corporal",
                "calories_per_day": 2200,
                "protein_g": 165,
                "carbs_g": 240,
                "fats_g": 73,
                "duration_days": 7,
                "status": "active",
                "points_reward": 75,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"✓ Creado: {plan_mantenimiento.name}"))
            self._create_maintenance_meals(plan_mantenimiento)
        else:
            self.stdout.write(self.style.WARNING(f"- Ya existe: {plan_mantenimiento.name}"))

        self.stdout.write(self.style.SUCCESS("\n✅ Proceso completado"))

    def _create_weight_loss_meals(self, plan):
        """Crea comidas para el plan de pérdida de peso (solo Día 1 como ejemplo)"""
        meals = [
            {
                "day": 1,
                "type": "breakfast",
                "name": "Avena con Frutas y Nueces",
                "calories": 400,
                "protein": 15,
                "carbs": 55,
                "fats": 12,
                "ingredients": "60g avena\n1 plátano\n10g almendras\n5g miel\n200ml leche descremada",
                "instructions": "Cocinar la avena con leche. Agregar plátano en rodajas, almendras picadas y miel.",
            },
            {
                "day": 1,
                "type": "lunch",
                "name": "Pechuga de Pollo con Quinoa",
                "calories": 550,
                "protein": 50,
                "carbs": 50,
                "fats": 15,
                "ingredients": "150g pechuga de pollo\n80g quinoa cocida\nLechuga, tomate, pepino\n1 cdta aceite de oliva",
                "instructions": "Asar el pollo con especias. Servir con quinoa y ensalada fresca.",
            },
            {
                "day": 1,
                "type": "dinner",
                "name": "Salmón al Horno con Brócoli",
                "calories": 500,
                "protein": 45,
                "carbs": 25,
                "fats": 25,
                "ingredients": "150g salmón\n200g brócoli\n1 cdta aceite de oliva\nLimón y especias",
                "instructions": "Hornear el salmón a 180°C por 15 minutos. Brócoli al vapor.",
            },
            {
                "day": 1,
                "type": "snack",
                "name": "Yogurt Griego con Berries",
                "calories": 250,
                "protein": 20,
                "carbs": 25,
                "fats": 8,
                "ingredients": "150g yogurt griego\n50g fresas\n50g arándanos\n10g miel",
                "instructions": "Mezclar yogurt con berries y endulzar con miel.",
            },
        ]

        for meal_data in meals:
            MealTemplate.objects.get_or_create(
                plan=plan,
                day_number=meal_data["day"],
                meal_type=meal_data["type"],
                name=meal_data["name"],
                defaults={
                    "calories": meal_data["calories"],
                    "protein_g": meal_data["protein"],
                    "carbs_g": meal_data["carbs"],
                    "fats_g": meal_data["fats"],
                    "ingredients": meal_data["ingredients"],
                    "instructions": meal_data["instructions"],
                    "order": 1,
                },
            )

        self.stdout.write(f"  → {len(meals)} comidas agregadas")

    def _create_muscle_gain_meals(self, plan):
        """Crea comidas para el plan de ganancia muscular (solo Día 1)"""
        meals = [
            {
                "day": 1,
                "type": "breakfast",
                "name": "Huevos Rancheros con Aguacate",
                "calories": 600,
                "protein": 35,
                "carbs": 55,
                "fats": 25,
                "ingredients": "3 huevos\n2 tortillas\n1/2 aguacate\nFrijoles\nSalsa",
                "instructions": "Preparar huevos. Calentar tortillas. Servir con frijoles, aguacate y salsa.",
            },
            {
                "day": 1,
                "type": "lunch",
                "name": "Bistec con Arroz y Frijoles",
                "calories": 850,
                "protein": 60,
                "carbs": 85,
                "fats": 25,
                "ingredients": "200g bistec\n120g arroz integral\n100g frijoles\nVegetales",
                "instructions": "Asar bistec. Cocinar arroz y calentar frijoles.",
            },
            {
                "day": 1,
                "type": "dinner",
                "name": "Pasta con Pollo y Vegetales",
                "calories": 750,
                "protein": 55,
                "carbs": 90,
                "fats": 18,
                "ingredients": "150g pollo\n100g pasta integral\nBrócoli, pimientos\nSalsa tomate\nQueso",
                "instructions": "Cocinar pasta. Saltear pollo con vegetales. Mezclar con salsa.",
            },
            {
                "day": 1,
                "type": "snack",
                "name": "Batido Proteico con Plátano",
                "calories": 450,
                "protein": 40,
                "carbs": 50,
                "fats": 10,
                "ingredients": "2 scoops proteína\n1 plátano\n300ml leche\n20g avena\nCanela",
                "instructions": "Licuar todos los ingredientes.",
            },
        ]

        for meal_data in meals:
            MealTemplate.objects.get_or_create(
                plan=plan,
                day_number=meal_data["day"],
                meal_type=meal_data["type"],
                name=meal_data["name"],
                defaults={
                    "calories": meal_data["calories"],
                    "protein_g": meal_data["protein"],
                    "carbs_g": meal_data["carbs"],
                    "fats_g": meal_data["fats"],
                    "ingredients": meal_data["ingredients"],
                    "instructions": meal_data["instructions"],
                    "order": 1,
                },
            )

        self.stdout.write(f"  → {len(meals)} comidas agregadas")

    def _create_maintenance_meals(self, plan):
        """Crea comidas para el plan de mantenimiento (solo Día 1)"""
        meals = [
            {
                "day": 1,
                "type": "breakfast",
                "name": "Tostadas Francesas con Frutas",
                "calories": 450,
                "protein": 20,
                "carbs": 60,
                "fats": 15,
                "ingredients": "2 rebanadas pan integral\n2 huevos\nLeche, canela\nFresas, plátano\nMiel",
                "instructions": "Remojar pan en mezcla de huevo. Cocinar hasta dorar. Servir con frutas.",
            },
            {
                "day": 1,
                "type": "lunch",
                "name": "Bowl de Pollo Teriyaki",
                "calories": 650,
                "protein": 45,
                "carbs": 75,
                "fats": 18,
                "ingredients": "150g pollo\n100g arroz\nBrócoli, zanahoria\nSalsa teriyaki\nAjonjolí",
                "instructions": "Cocinar pollo con salsa. Preparar arroz y vegetales. Armar bowl.",
            },
            {
                "day": 1,
                "type": "dinner",
                "name": "Atún Sellado con Quinoa",
                "calories": 600,
                "protein": 50,
                "carbs": 55,
                "fats": 20,
                "ingredients": "150g atún\n80g quinoa\n150g espárragos\nAceite de oliva, limón",
                "instructions": "Sellar atún 2 min por lado. Cocinar quinoa y espárragos.",
            },
            {
                "day": 1,
                "type": "snack",
                "name": "Smoothie Bowl de Berries",
                "calories": 350,
                "protein": 18,
                "carbs": 50,
                "fats": 10,
                "ingredients": "100g yogurt\n100g berries\n1/2 plátano\nGranola\nSemillas chía",
                "instructions": "Licuar yogurt, berries y plátano. Servir con granola y semillas.",
            },
        ]

        for meal_data in meals:
            MealTemplate.objects.get_or_create(
                plan=plan,
                day_number=meal_data["day"],
                meal_type=meal_data["type"],
                name=meal_data["name"],
                defaults={
                    "calories": meal_data["calories"],
                    "protein_g": meal_data["protein"],
                    "carbs_g": meal_data["carbs"],
                    "fats_g": meal_data["fats"],
                    "ingredients": meal_data["ingredients"],
                    "instructions": meal_data["instructions"],
                    "order": 1,
                },
            )

        self.stdout.write(f"  → {len(meals)} comidas agregadas")
