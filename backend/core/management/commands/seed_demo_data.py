from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from core.models import FeatureFlag
from gyms.models import (
    Branch,
    CheckIn,
    CoachAssignment,
    Gym,
    GymFeatureFlag,
    GymMembershipPlan,
    GymSubscription,
    Notification,
)
from nutrition.models import MealTemplate, NutritionPlan, UserMealLog
from subscriptions.models import Subscription, SubscriptionPlan
from workouts.models import (
    Exercise,
    RoutineExercise,
    WorkoutRoutine,
    WorkoutSession,
    UserRoutineAssignment,
)
from challenges.models import Badge, Challenge, ChallengeParticipation, UserBadge


class Command(BaseCommand):
    help = "Crea datos de prueba completos para PrimeGym con todos los roles"

    def handle(self, *args, **options):
        today = timezone.now().date()
        now = timezone.now()

        # ============================================================
        # 1. GIMNASIO PrimeGym
        # ============================================================
        gym, _ = Gym.objects.get_or_create(
            slug="primegym",
            defaults={
                "name": "PrimeGym",
                "description": "Gimnasio de prueba PrimeGym - Plan Pro",
                "location": "Lima, Perú",
                "brand_color": "#10b981",
                "contact_email": "franco_alex_07@hotmail.com",
                "status": Gym.Status.ACTIVE,
                "max_athletes": 500,
                "max_coaches": 10,
                "max_nutritionists": 5,
            },
        )
        gym.name = "PrimeGym"
        gym.description = "Gimnasio de prueba PrimeGym - Plan Pro"
        gym.location = "Lima, Perú"
        gym.brand_color = "#10b981"
        gym.contact_email = "franco_alex_07@hotmail.com"
        gym.status = Gym.Status.ACTIVE
        gym.max_athletes = 500
        gym.max_coaches = 10
        gym.max_nutritionists = 5
        gym.save()

        self.stdout.write(f">>> Gimnasio: {gym.name}")

        # ============================================================
        # 2. SUCURSAL
        # ============================================================
        branch, _ = Branch.objects.get_or_create(
            gym=gym,
            slug="sede-central",
            defaults={
                "name": "Sede Central",
                "address": "Av. Primavera 1234, San Borja",
                "city": "Lima",
                "country": "Perú",
                "status": Branch.Status.ACTIVE,
            },
        )
        self.stdout.write(f"[OK] Sucursal: {branch.name}")

        # ============================================================
        # 3. FEATURE FLAGS para PrimeGym
        # ============================================================
        flags = FeatureFlag.objects.all()
        for flag in flags:
            GymFeatureFlag.objects.get_or_create(
                gym=gym, feature_flag=flag, defaults={"is_active": True}
            )
        self.stdout.write(f"[OK] {flags.count()} FeatureFlags activados")

        # ============================================================
        # 4. PLAN SAAS PRO + SUSCRIPCIÓN
        # ============================================================
        pro_plan = SubscriptionPlan.objects.filter(name__icontains="Pro").first()
        if not pro_plan:
            pro_plan, _ = SubscriptionPlan.objects.get_or_create(
                name="Pro",
                defaults={
                    "description": "Plan Pro para gimnasios en crecimiento",
                    "price": Decimal("249.00"),
                    "currency": "PEN",
                    "billing_cycle": "monthly",
                    "max_athletes": 500,
                    "max_coaches": 10,
                    "max_nutritionists": 5,
                    "features": {
                        "rutinas": True,
                        "nutricion": True,
                        "retos": True,
                        "ranking": True,
                        "checkin": True,
                        "coach": True,
                    },
                    "is_active": True,
                },
            )

        sub, created = Subscription.objects.get_or_create(
            owner_gym=gym,
            defaults={
                "owner_user": None,
                "plan": pro_plan,
                "status": "active",
                "start_date": today - timedelta(days=60),
                "end_date": today + timedelta(days=300),
                "next_billing_date": today + timedelta(days=30),
                "cancel_at_period_end": False,
            },
        )
        if not created:
            sub.plan = pro_plan
            sub.status = "active"
            sub.save()
        self.stdout.write(f"[OK] Suscripción SaaS: Plan {pro_plan.name} activo")

        # ============================================================
        # 5. USUARIO ADMIN del gimnasio (franco_alex_07@hotmail.com)
        # ============================================================
        admin_user, _ = User.objects.get_or_create(
            email="franco_alex_07@hotmail.com",
            defaults={
                "first_name": "Franco",
                "last_name": "Cabello",
                "role": User.Role.GYM_ADMIN,
                "gym": gym,
                "is_active": True,
                "is_staff": False,
                "is_superuser": False,
            },
        )
        admin_user.role = User.Role.GYM_ADMIN
        admin_user.gym = gym
        # Sin contraseña accesible: se accede via Impersonación desde Super Admin
        admin_user.set_unusable_password()
        admin_user.save()

        # Eliminar usuario admin anterior si existe sin gym
        User.objects.filter(email="kerbeusxd.xd.07@gmail.com").delete()
        User.objects.filter(email="franco@gmail.com", gym__isnull=True).delete()

        self.stdout.write(f"[OK] Admin del gym: {admin_user.email} (sin contraseña - acceso via impersonación)")

        # ============================================================
        # 6. USUARIOS POR ROL
        # ============================================================
        users_data = [
            ("coach@primegym.com", "Carlos", "Gutierrez", User.Role.COACH),
            ("nutricionista@primegym.com", "María", "López", User.Role.NUTRITIONIST),
            ("recepcion@primegym.com", "Ana", "Martínez", User.Role.RECEPTIONIST),
            ("atleta1@primegym.com", "Pedro", "Ramírez", User.Role.ATHLETE),
            ("atleta2@primegym.com", "Lucía", "Fernández", User.Role.ATHLETE),
            ("atleta3@primegym.com", "Diego", "Torres", User.Role.ATHLETE),
            ("atleta4@primegym.com", "Valeria", "García", User.Role.ATHLETE),
        ]

        created_users = {}
        for email, first, last, role in users_data:
            u, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                    "gym": gym,
                    "is_active": True,
                },
            )
            u.first_name = first
            u.last_name = last
            u.role = role
            u.gym = gym
            # Sin contraseña accesible: se accede via Impersonación desde Gym Admin
            u.set_unusable_password()
            u.save()
            created_users[role] = created_users.get(role, []) + [u]
            self.stdout.write(f"  [USER] {email} ({role}) - sin contraseña - acceso via impersonación")

        coach = created_users.get(User.Role.COACH, [None])[0]
        nutritionist = created_users.get(User.Role.NUTRITIONIST, [None])[0]
        receptionist = created_users.get(User.Role.RECEPTIONIST, [None])[0]
        athletes = created_users.get(User.Role.ATHLETE, [])

        # ============================================================
        # 7. PLANES DE MEMBRESÍA (internos del gym)
        # ============================================================
        plans_data = [
            ("Básico", "Acceso a zonas comunes", Decimal("79.00"), 30, {"checkin": True}),
            ("Estándar", "Acceso completo + clases grupales", Decimal("129.00"), 30, {"checkin": True, "clases": True}),
            ("Premium", "Acceso total + entrenador personal", Decimal("199.00"), 30, {"checkin": True, "clases": True, "coach": True}),
        ]
        for name, desc, price, days, features in plans_data:
            GymMembershipPlan.objects.get_or_create(
                gym=gym,
                name=name,
                defaults={
                    "description": desc,
                    "price": price,
                    "duration_days": days,
                    "features": features,
                    "is_active": True,
                },
            )
        self.stdout.write(f"[OK] {len(plans_data)} Planes de Membresía creados")

        # ============================================================
        # 8. ASIGNACIONES (Coach -> Atletas, Nutritionist -> Atletas)
        # ============================================================
        if coach and len(athletes) >= 2:
            for athlete in athletes[:3]:
                CoachAssignment.objects.get_or_create(
                    coach=coach,
                    athlete=athlete,
                    gym=gym,
                    defaults={"is_active": True},
                )
            self.stdout.write(f"[OK] Coach asignado a {min(3, len(athletes))} atletas")

        if nutritionist and len(athletes) >= 2:
            for athlete in athletes[1:3]:
                from gyms.models import NutritionistAssignment
                NutritionistAssignment.objects.get_or_create(
                    nutritionist=nutritionist,
                    athlete=athlete,
                    gym=gym,
                    defaults={"is_active": True},
                )
            self.stdout.write(f"[OK] Nutricionista asignado a 2 atletas")

        # ============================================================
        # 9. EJERCICIOS
        # ============================================================
        exercises_data = [
            ("Sentadilla con Barra", "strength", "Barra", "Piernas"),
            ("Press de Banca", "strength", "Barra", "Pecho"),
            ("Peso Muerto", "strength", "Barra", "Espalda"),
            ("Press Militar", "strength", "Mancuernas", "Hombros"),
            ("Remo con Mancuerna", "strength", "Mancuerna", "Espalda"),
            ("Curl de Bíceps", "strength", "Mancuernas", "Brazos"),
            ("Fondos en Paralelas", "strength", "Peso corporal", "Pecho"),
            ("Dominadas", "strength", "Peso corporal", "Espalda"),
            ("Plancha", "mobility", "Peso corporal", "Core"),
            ("Burpees", "hiit", "Peso corporal", "Full body"),
        ]
        exercises = []
        for name, cat, equip, muscle in exercises_data:
            ex, _ = Exercise.objects.get_or_create(
                gym=gym,
                name=name,
                defaults={
                    "category": cat,
                    "equipment": equip,
                    "muscle_group": muscle,
                },
            )
            exercises.append(ex)
        self.stdout.write(f"[OK] {len(exercises)} Ejercicios creados")

        # ============================================================
        # 10. RUTINAS
        # ============================================================
        routines_data = [
            {
                "name": "Full Body Principiante",
                "objective": "Rutina completa para iniciarse",
                "level": "beginner",
                "duration": 45,
                "exercises": [(exercises[0], 3, 10), (exercises[1], 3, 10), (exercises[8], 3, 30)],
            },
            {
                "name": "Torso y Piernas",
                "objective": "Rutina intermedia de torso y piernas",
                "level": "intermediate",
                "duration": 60,
                "exercises": [(exercises[1], 4, 8), (exercises[3], 4, 10), (exercises[6], 3, 12), (exercises[0], 4, 10)],
            },
            {
                "name": "Fuerza Avanzada",
                "objective": "Rutina de fuerza para avanzados",
                "level": "advanced",
                "duration": 75,
                "exercises": [(exercises[2], 5, 5), (exercises[1], 5, 6), (exercises[0], 5, 8), (exercises[7], 4, 8)],
            },
        ]
        routines = []
        for rd in routines_data:
            routine, _ = WorkoutRoutine.objects.get_or_create(
                gym=gym,
                name=rd["name"],
                defaults={
                    "objective": rd["objective"],
                    "level": rd["level"],
                    "duration_minutes": rd["duration"],
                    "status": "published",
                    "is_public": True,
                    "points_reward": 50,
                },
            )
            RoutineExercise.objects.filter(routine=routine).delete()
            for order, (ex, sets, reps) in enumerate(rd["exercises"], 1):
                RoutineExercise.objects.create(
                    routine=routine,
                    exercise=ex,
                    order=order,
                    sets=sets,
                    reps=reps,
                    rest_seconds=60,
                )
            routines.append(routine)
        self.stdout.write(f"[OK] {len(routines)} Rutinas creadas")

        # Asignar rutina a atletas
        if athletes:
            for athlete in athletes:
                UserRoutineAssignment.objects.get_or_create(
                    user=athlete,
                    routine=routines[0],
                    defaults={
                        "assigned_by": coach or admin_user,
                        "status": "active",
                        "start_date": today - timedelta(days=7),
                    },
                )
            self.stdout.write(f"[OK] Rutinas asignadas a {len(athletes)} atletas")

        # ============================================================
        # 11. PLANES NUTRICIONALES
        # ============================================================
        nutrition_plans_data = [
            {
                "name": "Plan Definición",
                "desc": "Plan para pérdida de grasa y definición muscular",
                "calories": 1800,
                "protein": 150,
                "carbs": 150,
                "fats": 50,
                "days": 7,
                "meals": [
                    (1, "desayuno", "Avenida con proteína", 350, 25, 40, 10),
                    (1, "almuerzo", "Pollo con quinoa y verduras", 550, 40, 50, 15),
                    (1, "cena", "Ensalada de atún", 400, 35, 20, 15),
                    (1, "snack", "Batido de proteína", 200, 30, 10, 5),
                    (2, "desayuno", "Huevos revueltos con pan integral", 400, 30, 30, 15),
                    (2, "almuerzo", "Salmón con arroz integral", 600, 45, 50, 18),
                    (2, "cena", "Pechuga de pavo con verduras", 400, 40, 20, 12),
                    (2, "snack", "Yogur griego con frutos secos", 250, 15, 20, 12),
                ],
            },
            {
                "name": "Plan Volumen",
                "desc": "Plan para ganancia muscular",
                "calories": 2800,
                "protein": 180,
                "carbs": 350,
                "fats": 70,
                "days": 7,
                "meals": [
                    (1, "desayuno", "Batido hipercalórico", 600, 40, 70, 15),
                    (1, "almuerzo", "Arroz con pollo y aguacate", 800, 50, 80, 25),
                    (1, "cena", "Lomo saltado con quinoa", 700, 45, 60, 22),
                    (1, "snack", "Sándwich de pollo", 400, 30, 40, 10),
                    (2, "desayuno", "Tortilla de claras con avena", 500, 40, 50, 12),
                    (2, "almuerzo", "Bistec con papas y ensalada", 850, 55, 75, 28),
                    (2, "cena", "Pasta con albóndigas", 700, 40, 80, 20),
                    (2, "snack", "Requesón con miel y nueces", 350, 25, 25, 15),
                ],
            },
        ]
        plans_created = []
        for pd in nutrition_plans_data:
            plan, _ = NutritionPlan.objects.get_or_create(
                gym=gym,
                name=pd["name"],
                defaults={
                    "description": pd["desc"],
                    "calories_per_day": pd["calories"],
                    "protein_g": pd["protein"],
                    "carbs_g": pd["carbs"],
                    "fats_g": pd["fats"],
                    "duration_days": pd["days"],
                    "status": "published",
                },
            )
            MealTemplate.objects.filter(plan=plan).delete()
            for day, meal_type, name, cal, prot, carb, fat in pd["meals"]:
                MealTemplate.objects.create(
                    plan=plan,
                    day_number=day,
                    meal_type=meal_type,
                    name=name,
                    calories=cal,
                    protein_g=prot,
                    carbs_g=carb,
                    fats_g=fat,
                )
            plans_created.append(plan)
        self.stdout.write(f"[OK] {len(plans_created)} Planes Nutricionales creados")

        # ============================================================
        # 12. RETOS (CHALLENGES)
        # ============================================================
        challenges_data = [
            ("30 Días de Entrenamiento", "Completa 30 días de entrenamiento en el mes", "workouts", 30, 200),
            ("Reto de Asistencia", "Asiste al gimnasio 20 días este mes", "attendance", 20, 150),
            ("Desafío de Proteína", "Cumple tu consumo de proteína por 15 días", "nutrition", 15, 100),
        ]
        challenges = []
        for name, desc, ctype, goal, points in challenges_data:
            ch, _ = Challenge.objects.get_or_create(
                gym=gym,
                name=name,
                defaults={
                    "description": desc,
                    "type": ctype,
                    "goal_value": goal,
                    "reward_points": points,
                    "start_date": today - timedelta(days=5),
                    "end_date": today + timedelta(days=25),
                    "status": "active",
                },
            )
            challenges.append(ch)
        self.stdout.write(f"[OK] {len(challenges)} Retos creados")

        # ============================================================
        # 13. BADGES
        # ============================================================
        badges_data = [
            ("Principiante", "Completa tu primer entrenamiento"),
            ("Constante", "10 entrenamientos completados"),
            ("Dedicado", "30 entrenamientos completados"),
            ("Nutrición de Hierro", "Completa 7 días de plan nutricional"),
            ("Retador", "Completa tu primer reto"),
        ]
        badges = []
        for name, desc in badges_data:
            b, _ = Badge.objects.get_or_create(
                gym=gym,
                name=name,
                defaults={"description": desc, "icon": name.lower().replace(" ", "_"), "condition": "auto"},
            )
            badges.append(b)
        self.stdout.write(f"[OK] {len(badges)} Badges creados")

        # ============================================================
        # 14. SESIONES DE ENTRENAMIENTO (WorkoutSessions)
        # ============================================================
        for athlete in athletes[:3]:
            for days_ago in range(5, 0, -1):
                session_date = now - timedelta(days=days_ago)
                WorkoutSession.objects.get_or_create(
                    user=athlete,
                    gym=gym,
                    routine=routines[days_ago % len(routines)],
                    performed_at=session_date,
                    defaults={
                        "duration_minutes": 45 + days_ago * 5,
                        "perceived_exertion": 7,
                        "completion_percentage": 80 + days_ago * 3,
                        "status": "completed",
                    },
                )
        self.stdout.write(f"[OK] Sesiones de entrenamiento creadas (5 por atleta)")

        # ============================================================
        # 15. CHECK-INS
        # ============================================================
        for athlete in athletes:
            for days_ago in range(10, 0, -2):
                CheckIn.objects.get_or_create(
                    user=athlete,
                    gym=gym,
                    branch=branch,
                    timestamp=now - timedelta(days=days_ago),
                    defaults={"method": "manual"},
                )
        self.stdout.write(f"[OK] Check-ins creados ({len(athletes)} atletas x ~5 check-ins)")

        # ============================================================
        # 16. PARTICIPACIÓN EN RETOS
        # ============================================================
        for athlete in athletes:
            for ch in challenges:
                ChallengeParticipation.objects.get_or_create(
                    challenge=ch,
                    user=athlete,
                    defaults={"progress": 0, "status": "active"},
                )

        # Progreso de ejemplo para atleta1
        if athletes:
            participations = ChallengeParticipation.objects.filter(
                challenge=challenges[0], user=athletes[0]
            )
            for p in participations:
                p.progress = 12
                p.save()
        self.stdout.write(f"[OK] Participaciones en retos creadas")

        # ============================================================
        # 17. PUNTOS Y BADGES
        # ============================================================
        for i, athlete in enumerate(athletes):
            # Dar badges a los primeros atletas
            if i < len(badges):
                UserBadge.objects.get_or_create(user=athlete, badge=badges[i])

        self.stdout.write(f"[OK] Puntos y badges asignados a atletas")

        # ============================================================
        # 18. NOTIFICACIONES DE EJEMPLO
        # ============================================================
        for athlete in athletes[:2]:
            Notification.objects.get_or_create(
                recipient=athlete,
                actor=coach or admin_user,
                gym=gym,
                notification_type="workout",
                defaults={
                    "title": "¡Nueva rutina asignada!",
                    "message": "Tu coach te ha asignado una nueva rutina. Revísala en tu panel.",
                    "is_read": False,
                },
            )

        Notification.objects.get_or_create(
            recipient=coach,
            actor=admin_user,
            gym=gym,
            notification_type="system",
            defaults={
                "title": "Bienvenido al equipo PrimeGym",
                "message": "Has sido registrado como Coach en PrimeGym. Bienvenido al equipo.",
                "is_read": False,
            },
        )
        self.stdout.write(f"[OK] Notificaciones de ejemplo creadas")

        # ============================================================
        # 19. LOGS DE COMIDA (MealLogs)
        # ============================================================
        if athletes and plans_created:
            for athlete in athletes[:2]:
                meals = MealTemplate.objects.filter(plan=plans_created[0], day_number=1)
                for meal in meals[:3]:
                    UserMealLog.objects.get_or_create(
                        user=athlete,
                        meal_template=meal,
                        date=today,
                        defaults={"completed": True},
                    )
        self.stdout.write(f"[OK] MealLogs de ejemplo creados")

        # ============================================================
        # RESUMEN FINAL
        # ============================================================
        self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
        self.stdout.write(self.style.SUCCESS("*** DATOS DE PRUEBA CREADOS EXITOSAMENTE"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(f"\n  Gimnasio: {gym.name}")
        self.stdout.write(f"  Admin: {admin_user.email} (sin contraseña - acceso via impersonación desde Super Admin)")
        self.stdout.write(f"  Plan SaaS: {pro_plan.name}")
        self.stdout.write(f"  Usuarios creados: {User.objects.filter(gym=gym).count()}")
        self.stdout.write(f"  Ejercicios: {Exercise.objects.filter(gym=gym).count()}")
        self.stdout.write(f"  Rutinas: {WorkoutRoutine.objects.filter(gym=gym).count()}")
        self.stdout.write(f"  Planes Nutricionales: {NutritionPlan.objects.filter(gym=gym).count()}")
        self.stdout.write(f"  Retos: {Challenge.objects.filter(gym=gym).count()}")
        self.stdout.write(f"  Badges: {Badge.objects.filter(gym=gym).count()}")
        self.stdout.write(f"  Sesiones: {WorkoutSession.objects.filter(gym=gym).count()}")
        self.stdout.write(f"  Check-ins: {CheckIn.objects.filter(gym=gym).count()}")
        self.stdout.write(f"\n  NOTA: Todos los usuarios (excepto Super Admin) usan set_unusable_password() - se accede SOLO via impersonación.")
