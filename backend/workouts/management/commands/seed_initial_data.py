from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from gyms.models import Branch, Gym
from workouts.models import Exercise, RoutineExercise, WorkoutRoutine, WorkoutSession


class Command(BaseCommand):
    help = "Seeds the database with a starter gym, exercises, routines, and demo sessions."

    def handle(self, *args, **options):
        gym, _ = Gym.objects.get_or_create(
            slug="lifefit-main",
            defaults={
                "name": "Lifefit Main Gym",
                "description": "Gimnasio demo para pruebas.",
                "location": "Lima, Perú",
                "brand_color": "#10b981",
                "website": "https://lifefit-demo.local",
                "contact_email": "info@lifefit.local",
            },
        )
        Branch.objects.get_or_create(
            gym=gym,
            slug="central",
            defaults={
                "name": "Sede Central",
                "address": "Av. Fitness 123",
                "city": "Lima",
                "country": "Perú",
                "status": Branch.Status.ACTIVE,
            },
        )

        exercises_data = [
            ("Sentadilla con barra", Exercise.Category.STRENGTH, "Barra", "Piernas"),
            ("Press banca", Exercise.Category.STRENGTH, "Barra", "Pecho"),
            ("Remo con mancuernas", Exercise.Category.STRENGTH, "Mancuernas", "Espalda"),
            ("Burpees", Exercise.Category.HIIT, "Peso corporal", "Full body"),
        ]
        exercises = []
        for name, category, equipment, muscle in exercises_data:
            exercise, _ = Exercise.objects.get_or_create(
                gym=gym,
                name=name,
                defaults={
                    "category": category,
                    "equipment": equipment,
                    "muscle_group": muscle,
                },
            )
            exercises.append(exercise)

        routine, _ = WorkoutRoutine.objects.get_or_create(
            gym=gym,
            name="Full Body Express",
            defaults={
                "objective": "Rutina rápida para todo el cuerpo",
                "level": WorkoutRoutine.Level.INTERMEDIATE,
                "duration_minutes": 45,
                "status": WorkoutRoutine.Status.PUBLISHED,
                "is_public": True,
            },
        )

        RoutineExercise.objects.get_or_create(
            routine=routine,
            exercise=exercises[0],
            order=1,
            defaults={"sets": 4, "reps": 8, "rest_seconds": 60},
        )
        RoutineExercise.objects.get_or_create(
            routine=routine,
            exercise=exercises[1],
            order=2,
            defaults={"sets": 4, "reps": 10, "rest_seconds": 90},
        )
        RoutineExercise.objects.get_or_create(
            routine=routine,
            exercise=exercises[2],
            order=3,
            defaults={"sets": 3, "reps": 10, "rest_seconds": 60},
        )

        athlete = User.objects.filter(role=User.Role.ATHLETE, gym=gym).first()
        if athlete:
            now = timezone.now()
            for days in range(1, 4):
                WorkoutSession.objects.get_or_create(
                    user=athlete,
                    gym=gym,
                    routine=routine,
                    performed_at=now - timedelta(days=days),
                    defaults={
                        "duration_minutes": 40 + days,
                        "perceived_exertion": 6 + days,
                        "completion_percentage": 80 + days,
                        "status": WorkoutSession.Status.COMPLETED,
                    },
                )

        self.stdout.write(self.style.SUCCESS("Seed de gimnasio y rutinas completado."))
