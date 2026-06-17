"""
Comando de gestión: sync_challenge_progress
────────────────────────────────────────────
Recalcula el progreso de todas las participaciones automáticas activas.

Uso:
    python manage.py sync_challenge_progress
    python manage.py sync_challenge_progress --gym-id <uuid>
    python manage.py sync_challenge_progress --dry-run

Casos de uso:
  - Ejecutar como cron job nocturno para mantener el progreso actualizado.
  - Reparar progreso después de una migración de datos.
  - Onboarding de un gimnasio nuevo con historial de check-ins previos.
"""

import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Resincroniza el progreso automático de participaciones activas en retos."

    def add_arguments(self, parser):
        parser.add_argument(
            "--gym-id",
            type=str,
            default=None,
            help="Limitar la sincronización a un gimnasio específico (UUID).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Calcular sin guardar cambios. Útil para auditoría.",
        )

    def handle(self, *args, **options):
        from challenges.models import Challenge, ChallengeParticipation
        from challenges.services import sync_participation_progress, compute_auto_progress

        gym_id = options["gym_id"]
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING("Modo DRY-RUN activado. No se guardarán cambios.\n"))

        queryset = (
            ChallengeParticipation.objects
            .select_related("challenge", "user")
            .filter(
                challenge__status=Challenge.Status.ACTIVE,
                challenge__verification_type=Challenge.VerificationType.AUTOMATIC,
                status=ChallengeParticipation.ParticipationStatus.JOINED,
            )
        )

        if gym_id:
            queryset = queryset.filter(challenge__gym_id=gym_id)
            self.stdout.write(f"Filtrando por gym_id: {gym_id}\n")

        total = queryset.count()
        self.stdout.write(f"Participaciones a procesar: {total}\n")

        updated = 0
        completed = 0
        errors = 0

        for participation in queryset.iterator(chunk_size=100):
            try:
                if dry_run:
                    new_progress = compute_auto_progress(participation)
                    will_complete = new_progress >= participation.challenge.goal_value
                    self.stdout.write(
                        f"  [DRY] {participation.user.email} / {participation.challenge.name}: "
                        f"progreso {participation.progress} → {new_progress}"
                        f"{' ✓ COMPLETARÍA' if will_complete else ''}"
                    )
                    updated += 1
                    if will_complete:
                        completed += 1
                else:
                    before_status = participation.status
                    sync_participation_progress(participation)
                    participation.refresh_from_db()
                    updated += 1
                    if (
                        participation.status == ChallengeParticipation.ParticipationStatus.COMPLETED
                        and before_status != participation.status
                    ):
                        completed += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"  ✓ Completado: {participation.user.email} / {participation.challenge.name}"
                            )
                        )
            except Exception as exc:
                errors += 1
                logger.error("Error en participación %s: %s", participation.pk, exc)
                self.stdout.write(
                    self.style.ERROR(f"  ✗ Error en {participation.pk}: {exc}")
                )

        self.stdout.write("\n── Resumen ──────────────────────────")
        self.stdout.write(f"  Procesadas : {updated}")
        self.stdout.write(self.style.SUCCESS(f"  Completadas: {completed}"))
        if errors:
            self.stdout.write(self.style.ERROR(f"  Errores    : {errors}"))
        self.stdout.write("─────────────────────────────────────\n")
