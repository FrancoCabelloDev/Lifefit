from datetime import date, timedelta

from django.core.management.base import BaseCommand

from accounts.models import User
from challenges.models import Challenge, ChallengeParticipation, UserProgress
from gyms.models import Gym


class Command(BaseCommand):
    help = "Seed demo challenges and participations for the first gym."

    def handle(self, *args, **options):
        gym = Gym.objects.first()
        if not gym:
            self.stdout.write(self.style.ERROR("No hay gimnasios creados."))
            return

        today = date.today()
        challenge, _ = Challenge.objects.get_or_create(
            gym=gym,
            name="Reto Asistencia Semanal",
            defaults={
                "description": "Asiste al gimnasio 5 veces en la semana para sumar puntos.",
                "type": Challenge.ChallengeType.ATTENDANCE,
                "start_date": today - timedelta(days=7),
                "end_date": today + timedelta(days=7),
                "reward_points": 200,
                "goal_value": 5,
                "status": Challenge.Status.ACTIVE,
            },
        )

        athlete = User.objects.filter(role=User.Role.ATHLETE, gym=gym).first()
        if athlete:
            participation, _ = ChallengeParticipation.objects.get_or_create(
                challenge=challenge,
                user=athlete,
                defaults={"progress": 60, "points_earned": 120},
            )
            UserProgress.objects.get_or_create(
                user=athlete,
                defaults={"level": 2, "total_points": 500, "current_xp": 200, "next_level_xp": 1000},
            )
        self.stdout.write(self.style.SUCCESS("Reto demo creado/actualizado."))
