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
        """Crea comidas para el plan de pérdida de peso para 7 días completos"""
        
        breakfast_options = [
            {
                "name": "Avena con Frutas y Nueces",
                "calories": 400,
                "protein": 15,
                "carbs": 55,
                "fats": 12,
                "ingredients": "60g avena\n1 plátano\n10g almendras\n5g miel\n200ml leche descremada",
                "instructions": "Cocinar la avena con leche. Agregar plátano en rodajas, almendras picadas y miel.",
            },
            {
                "name": "Claras de Huevo con Pan Integral",
                "calories": 380,
                "protein": 25,
                "carbs": 45,
                "fats": 8,
                "ingredients": "4 claras de huevo\n2 rebanadas pan integral\nEspinacas\nTomate\nAguacate",
                "instructions": "Batir claras y cocinar. Tostar pan. Servir con vegetales frescos.",
            },
            {
                "name": "Yogurt con Granola y Frutas",
                "calories": 420,
                "protein": 20,
                "carbs": 58,
                "fats": 10,
                "ingredients": "200g yogurt griego\n40g granola\n100g fresas\n1 manzana pequeña",
                "instructions": "Mezclar yogurt con granola. Agregar frutas picadas.",
            },
        ]
        
        lunch_options = [
            {
                "name": "Pechuga de Pollo con Quinoa",
                "calories": 550,
                "protein": 50,
                "carbs": 50,
                "fats": 15,
                "ingredients": "150g pechuga de pollo\n80g quinoa cocida\nLechuga, tomate, pepino\n1 cdta aceite de oliva",
                "instructions": "Asar el pollo con especias. Servir con quinoa y ensalada fresca.",
            },
            {
                "name": "Pescado a la Plancha con Vegetales",
                "calories": 520,
                "protein": 48,
                "carbs": 42,
                "fats": 18,
                "ingredients": "150g filete de pescado\n100g camote\nZanahoria, calabaza\nLimón",
                "instructions": "Cocinar pescado a la plancha. Asar vegetales al horno.",
            },
            {
                "name": "Pavo con Arroz Integral",
                "calories": 540,
                "protein": 52,
                "carbs": 48,
                "fats": 14,
                "ingredients": "150g pechuga de pavo\n80g arroz integral\nEjotes, pimientos\nEspecias",
                "instructions": "Saltear pavo con vegetales. Servir con arroz integral.",
            },
        ]
        
        dinner_options = [
            {
                "name": "Salmón al Horno con Brócoli",
                "calories": 500,
                "protein": 45,
                "carbs": 25,
                "fats": 25,
                "ingredients": "150g salmón\n200g brócoli\n1 cdta aceite de oliva\nLimón y especias",
                "instructions": "Hornear el salmón a 180°C por 15 minutos. Brócoli al vapor.",
            },
            {
                "name": "Pechuga con Ensalada Grande",
                "calories": 480,
                "protein": 50,
                "carbs": 28,
                "fats": 20,
                "ingredients": "150g pechuga\nLechuga, espinaca, tomate, pepino\nAguacate\nVinagreta light",
                "instructions": "Asar pechuga. Preparar ensalada abundante con vinagreta.",
            },
            {
                "name": "Atún con Vegetales Salteados",
                "calories": 490,
                "protein": 48,
                "carbs": 30,
                "fats": 22,
                "ingredients": "150g atún fresco\nBrócoli, pimientos, cebolla\nSalsa de soya light\nJengibre",
                "instructions": "Sellar atún. Saltear vegetales con salsa de soya y jengibre.",
            },
        ]
        
        snack_options = [
            {
                "name": "Yogurt Griego con Berries",
                "calories": 250,
                "protein": 20,
                "carbs": 25,
                "fats": 8,
                "ingredients": "150g yogurt griego\n50g fresas\n50g arándanos\n10g miel",
                "instructions": "Mezclar yogurt con berries y endulzar con miel.",
            },
            {
                "name": "Manzana con Mantequilla de Almendra",
                "calories": 260,
                "protein": 8,
                "carbs": 32,
                "fats": 12,
                "ingredients": "1 manzana grande\n20g mantequilla de almendra\nCanela",
                "instructions": "Cortar manzana en rebanadas. Servir con mantequilla de almendra.",
            },
            {
                "name": "Batido Verde Proteico",
                "calories": 240,
                "protein": 22,
                "carbs": 28,
                "fats": 6,
                "ingredients": "1 scoop proteína\nEspinaca\n1/2 plátano\n200ml agua\nHielo",
                "instructions": "Licuar todos los ingredientes hasta obtener consistencia suave.",
            },
        ]
        
        meal_count = 0
        for day in range(1, 8):  # Días 1-7
            breakfast = breakfast_options[(day - 1) % len(breakfast_options)]
            lunch = lunch_options[(day - 1) % len(lunch_options)]
            dinner = dinner_options[(day - 1) % len(dinner_options)]
            snack = snack_options[(day - 1) % len(snack_options)]
            
            meals = [
                {"type": "breakfast", "order": 1, **breakfast},
                {"type": "snack", "order": 2, **snack},
                {"type": "lunch", "order": 3, **lunch},
                {"type": "dinner", "order": 4, **dinner},
            ]
            
            for meal_data in meals:
                MealTemplate.objects.get_or_create(
                    plan=plan,
                    day_number=day,
                    meal_type=meal_data["type"],
                    name=meal_data["name"],
                    defaults={
                        "calories": meal_data["calories"],
                        "protein_g": meal_data["protein"],
                        "carbs_g": meal_data["carbs"],
                        "fats_g": meal_data["fats"],
                        "ingredients": meal_data["ingredients"],
                        "instructions": meal_data["instructions"],
                        "order": meal_data["order"],
                    },
                )
                meal_count += 1

        self.stdout.write(f"  → {meal_count} comidas agregadas (7 días completos)")

    def _create_muscle_gain_meals(self, plan):
        """Crea comidas para el plan de ganancia muscular para 7 días completos"""
        
        breakfast_options = [
            {
                "name": "Huevos Rancheros con Aguacate",
                "calories": 600,
                "protein": 35,
                "carbs": 55,
                "fats": 25,
                "ingredients": "3 huevos\n2 tortillas\n1/2 aguacate\nFrijoles\nSalsa",
                "instructions": "Preparar huevos. Calentar tortillas. Servir con frijoles, aguacate y salsa.",
            },
            {
                "name": "Omelette de Claras con Pan",
                "calories": 620,
                "protein": 38,
                "carbs": 58,
                "fats": 22,
                "ingredients": "6 claras + 1 huevo entero\nQueso\nJamón de pavo\n2 rebanadas pan integral\nAguacate",
                "instructions": "Batir huevos y cocinar con relleno. Tostar pan.",
            },
            {
                "name": "Pancakes Proteicos con Miel",
                "calories": 610,
                "protein": 40,
                "carbs": 62,
                "fats": 20,
                "ingredients": "2 scoops proteína\n2 huevos\n80g avena\n1 plátano\n15g miel",
                "instructions": "Licuar ingredientes. Cocinar pancakes. Servir con miel y plátano.",
            },
        ]
        
        lunch_options = [
            {
                "name": "Bistec con Arroz y Frijoles",
                "calories": 850,
                "protein": 60,
                "carbs": 85,
                "fats": 25,
                "ingredients": "200g bistec\n120g arroz integral\n100g frijoles\nVegetales",
                "instructions": "Asar bistec. Cocinar arroz y calentar frijoles.",
            },
            {
                "name": "Pollo al Curry con Arroz Basmati",
                "calories": 880,
                "protein": 62,
                "carbs": 92,
                "fats": 28,
                "ingredients": "200g pollo\n120g arroz basmati\nCurry, coco\nVegetales mixtos",
                "instructions": "Cocinar pollo en salsa de curry. Servir con arroz.",
            },
            {
                "name": "Salmón con Camote y Espárragos",
                "calories": 860,
                "protein": 58,
                "carbs": 88,
                "fats": 30,
                "ingredients": "180g salmón\n200g camote\nEspárragos\nAceite de oliva",
                "instructions": "Hornear salmón y camote. Asar espárragos.",
            },
        ]
        
        dinner_options = [
            {
                "name": "Pasta con Pollo y Vegetales",
                "calories": 750,
                "protein": 55,
                "carbs": 90,
                "fats": 18,
                "ingredients": "150g pollo\n100g pasta integral\nBrócoli, pimientos\nSalsa tomate\nQueso",
                "instructions": "Cocinar pasta. Saltear pollo con vegetales. Mezclar con salsa.",
            },
            {
                "name": "Carne Molida con Papa",
                "calories": 780,
                "protein": 58,
                "carbs": 85,
                "fats": 22,
                "ingredients": "180g carne molida\n200g papa\nCebolla, ajo\nVegetales",
                "instructions": "Cocinar carne con cebolla y ajo. Acompañar con papa cocida.",
            },
            {
                "name": "Tacos de Pescado con Arroz",
                "calories": 760,
                "protein": 52,
                "carbs": 92,
                "fats": 20,
                "ingredients": "150g pescado\n3 tortillas\n80g arroz\nRepollo, salsa\nAguacate",
                "instructions": "Cocinar pescado. Calentar tortillas. Armar tacos con vegetales.",
            },
        ]
        
        snack_options = [
            {
                "name": "Batido Proteico con Plátano",
                "calories": 450,
                "protein": 40,
                "carbs": 50,
                "fats": 10,
                "ingredients": "2 scoops proteína\n1 plátano\n300ml leche\n20g avena\nCanela",
                "instructions": "Licuar todos los ingredientes.",
            },
            {
                "name": "Sandwich de Pavo y Queso",
                "calories": 480,
                "protein": 35,
                "carbs": 52,
                "fats": 15,
                "ingredients": "100g pechuga de pavo\n2 rebanadas pan integral\nQueso\nLechuga, tomate",
                "instructions": "Armar sandwich con todos los ingredientes.",
            },
            {
                "name": "Barras de Granola Caseras",
                "calories": 460,
                "protein": 20,
                "carbs": 65,
                "fats": 14,
                "ingredients": "1 barra proteica\n30g nueces\n1 plátano\nMiel",
                "instructions": "Comer barra con nueces y plátano.",
            },
        ]
        
        meal_count = 0
        for day in range(1, 8):
            breakfast = breakfast_options[(day - 1) % len(breakfast_options)]
            lunch = lunch_options[(day - 1) % len(lunch_options)]
            dinner = dinner_options[(day - 1) % len(dinner_options)]
            snack = snack_options[(day - 1) % len(snack_options)]
            
            meals = [
                {"type": "breakfast", "order": 1, **breakfast},
                {"type": "snack", "order": 2, **snack},
                {"type": "lunch", "order": 3, **lunch},
                {"type": "dinner", "order": 4, **dinner},
            ]
            
            for meal_data in meals:
                MealTemplate.objects.get_or_create(
                    plan=plan,
                    day_number=day,
                    meal_type=meal_data["type"],
                    name=meal_data["name"],
                    defaults={
                        "calories": meal_data["calories"],
                        "protein_g": meal_data["protein"],
                        "carbs_g": meal_data["carbs"],
                        "fats_g": meal_data["fats"],
                        "ingredients": meal_data["ingredients"],
                        "instructions": meal_data["instructions"],
                        "order": meal_data["order"],
                    },
                )
                meal_count += 1

        self.stdout.write(f"  → {meal_count} comidas agregadas (7 días completos)")

    def _create_maintenance_meals(self, plan):
        """Crea comidas para el plan de mantenimiento para 7 días completos"""
        
        breakfast_options = [
            {
                "name": "Tostadas Francesas con Frutas",
                "calories": 450,
                "protein": 20,
                "carbs": 60,
                "fats": 15,
                "ingredients": "2 rebanadas pan integral\n2 huevos\nLeche, canela\nFresas, plátano\nMiel",
                "instructions": "Remojar pan en mezcla de huevo. Cocinar hasta dorar. Servir con frutas.",
            },
            {
                "name": "Burrito de Desayuno",
                "calories": 480,
                "protein": 25,
                "carbs": 55,
                "fats": 18,
                "ingredients": "2 huevos\n1 tortilla grande\nFrijoles\nQueso\nSalsa",
                "instructions": "Revolver huevos. Calentar frijoles. Armar burrito con queso y salsa.",
            },
            {
                "name": "Bowl de Açaí",
                "calories": 460,
                "protein": 18,
                "carbs": 62,
                "fats": 16,
                "ingredients": "100g açaí\n1 plátano\nGranola\nCoco\nMiel",
                "instructions": "Licuar açaí con plátano. Servir con granola y coco.",
            },
        ]
        
        lunch_options = [
            {
                "name": "Bowl de Pollo Teriyaki",
                "calories": 650,
                "protein": 45,
                "carbs": 75,
                "fats": 18,
                "ingredients": "150g pollo\n100g arroz\nBrócoli, zanahoria\nSalsa teriyaki\nAjonjolí",
                "instructions": "Cocinar pollo con salsa. Preparar arroz y vegetales. Armar bowl.",
            },
            {
                "name": "Wrap de Pavo con Hummus",
                "calories": 620,
                "protein": 42,
                "carbs": 68,
                "fats": 20,
                "ingredients": "120g pavo\n1 wrap integral\nHummus\nLechuga, tomate\nPepino",
                "instructions": "Untar hummus. Agregar pavo y vegetales. Enrollar.",
            },
            {
                "name": "Ensalada César con Pollo",
                "calories": 640,
                "protein": 48,
                "carbs": 65,
                "fats": 22,
                "ingredients": "150g pollo\nLechuga romana\nCrutones\nQueso parmesano\nAderezo césar light",
                "instructions": "Asar pollo. Mezclar lechuga con aderezo. Agregar pollo y crutones.",
            },
        ]
        
        dinner_options = [
            {
                "name": "Atún Sellado con Quinoa",
                "calories": 600,
                "protein": 50,
                "carbs": 55,
                "fats": 20,
                "ingredients": "150g atún\n80g quinoa\n150g espárragos\nAceite de oliva, limón",
                "instructions": "Sellar atún 2 min por lado. Cocinar quinoa y espárragos.",
            },
            {
                "name": "Fajitas de Pollo",
                "calories": 620,
                "protein": 48,
                "carbs": 60,
                "fats": 22,
                "ingredients": "150g pollo\n2 tortillas\nPimientos, cebolla\nGuacamole\nCrema",
                "instructions": "Saltear pollo con vegetales. Calentar tortillas. Armar fajitas.",
            },
            {
                "name": "Pizza Casera de Vegetales",
                "calories": 640,
                "protein": 32,
                "carbs": 75,
                "fats": 24,
                "ingredients": "1 base integral\nSalsa tomate\nMozzarella\nPimientos, champiñones\nAlbahaca",
                "instructions": "Esparcir salsa y queso. Agregar vegetales. Hornear 15 min.",
            },
        ]
        
        snack_options = [
            {
                "name": "Smoothie Bowl de Berries",
                "calories": 350,
                "protein": 18,
                "carbs": 50,
                "fats": 10,
                "ingredients": "100g yogurt\n100g berries\n1/2 plátano\nGranola\nSemillas chía",
                "instructions": "Licuar yogurt, berries y plátano. Servir con granola y semillas.",
            },
            {
                "name": "Hummus con Vegetales",
                "calories": 320,
                "protein": 12,
                "carbs": 42,
                "fats": 14,
                "ingredients": "80g hummus\nZanahoria, pepino, apio\nPan pita",
                "instructions": "Cortar vegetales en bastones. Servir con hummus.",
            },
            {
                "name": "Trail Mix Casero",
                "calories": 340,
                "protein": 10,
                "carbs": 38,
                "fats": 18,
                "ingredients": "30g almendras\n30g nueces\n20g pasas\n20g chocolate oscuro",
                "instructions": "Mezclar todos los ingredientes en un contenedor.",
            },
        ]
        
        meal_count = 0
        for day in range(1, 8):
            breakfast = breakfast_options[(day - 1) % len(breakfast_options)]
            lunch = lunch_options[(day - 1) % len(lunch_options)]
            dinner = dinner_options[(day - 1) % len(dinner_options)]
            snack = snack_options[(day - 1) % len(snack_options)]
            
            meals = [
                {"type": "breakfast", "order": 1, **breakfast},
                {"type": "snack", "order": 2, **snack},
                {"type": "lunch", "order": 3, **lunch},
                {"type": "dinner", "order": 4, **dinner},
            ]
            
            for meal_data in meals:
                MealTemplate.objects.get_or_create(
                    plan=plan,
                    day_number=day,
                    meal_type=meal_data["type"],
                    name=meal_data["name"],
                    defaults={
                        "calories": meal_data["calories"],
                        "protein_g": meal_data["protein"],
                        "carbs_g": meal_data["carbs"],
                        "fats_g": meal_data["fats"],
                        "ingredients": meal_data["ingredients"],
                        "instructions": meal_data["instructions"],
                        "order": meal_data["order"],
                    },
                )
                meal_count += 1

        self.stdout.write(f"  → {meal_count} comidas agregadas (7 días completos)")
