from django.core.management.base import BaseCommand

from core.models import FeatureFlag
from gyms.models import Gym, GymFeatureFlag


class Command(BaseCommand):
    help = "Crea los FeatureFlags del sistema y los asigna a todos los gimnasios activos"

    FLAGS = [
        ("Rutinas", "rutinas", "Módulo de rutinas y ejercicios"),
        ("Nutrición", "nutricion", "Módulo de planes nutricionales"),
        ("Check-in", "checkin", "Módulo de registro de asistencia"),
        ("Retos", "retos", "Módulo de retos y competencias"),
        ("Ranking", "ranking", "Módulo de ranking y leaderboard"),
    ]

    def handle(self, *args, **options):
        created = 0
        for name, code, desc in self.FLAGS:
            _, is_new = FeatureFlag.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "description": desc,
                    "is_active_globally": True,
                },
            )
            if is_new:
                created += 1
                self.stdout.write(f"  Creado: {name} ({code})")
            else:
                self.stdout.write(f"  Ya existe: {name} ({code})")

        if created > 0:
            self.stdout.write(self.style.SUCCESS(f"\n{created} FeatureFlags creados."))
        else:
            self.stdout.write("Todos los FeatureFlags ya existían.")

        flags = FeatureFlag.objects.filter(code__in=[f[1] for f in self.FLAGS])
        gyms = Gym.objects.filter(deleted_at__isnull=True)
        assigned = 0
        for gym in gyms:
            for flag in flags:
                _, was_created = GymFeatureFlag.objects.get_or_create(
                    gym=gym,
                    feature_flag=flag,
                    defaults={"is_active": True},
                )
                if was_created:
                    assigned += 1

        if assigned > 0:
            self.stdout.write(self.style.SUCCESS(f"{assigned} GymFeatureFlags asignados a {gyms.count()} gimnasios."))
