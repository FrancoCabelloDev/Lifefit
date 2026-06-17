"""
Comando de gestión: close_expired_challenges
─────────────────────────────────────────────
Cierra retos cuya fecha de fin ya pasó y descarta participaciones no completadas.

Uso:
    python manage.py close_expired_challenges
    python manage.py close_expired_challenges --gym-id <uuid>
    python manage.py close_expired_challenges --dry-run

Ideal para ejecutar como cron diario (ej. a medianoche).

Lógica:
  1. Busca retos con status=active y end_date < hoy.
  2. Marca esos retos como status=archived.
  3. Las participaciones en estado joined o pending_review se pasan a dropped.
  4. Las participaciones completed permanecen intactas.
  5. Notifica a los atletas afectados (dropped) que el reto expiró.
"""

import logging
from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Archiva retos vencidos y descarta participaciones activas no completadas."

    def add_arguments(self, parser):
        parser.add_argument(
            "--gym-id",
            type=str,
            default=None,
            help="Limitar la operación a un gimnasio específico (UUID).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Mostrar qué se modificaría sin guardar cambios.",
        )

    def handle(self, *args, **options):
        from challenges.models import Challenge, ChallengeParticipation
        from challenges.services import _notify

        gym_id = options["gym_id"]
        dry_run = options["dry_run"]
        today = date.today()

        if dry_run:
            self.stdout.write(self.style.WARNING("Modo DRY-RUN activado. No se guardarán cambios.\n"))

        # ── Retos vencidos ────────────────────────────────────────────────────
        expired_qs = Challenge.objects.filter(
            status=Challenge.Status.ACTIVE,
            end_date__lt=today,
        )
        if gym_id:
            expired_qs = expired_qs.filter(gym_id=gym_id)
            self.stdout.write(f"Filtrando por gym_id: {gym_id}\n")

        expired_challenges = list(expired_qs.select_related("gym"))
        self.stdout.write(f"Retos vencidos encontrados: {len(expired_challenges)}\n")

        archived_count = 0
        dropped_count = 0
        notified_count = 0

        DROPPABLE_STATUSES = [
            ChallengeParticipation.ParticipationStatus.JOINED,
            ChallengeParticipation.ParticipationStatus.PENDING_REVIEW,
        ]

        for challenge in expired_challenges:
            # Participaciones que quedarán descartadas
            participations_to_drop = ChallengeParticipation.objects.filter(
                challenge=challenge,
                status__in=DROPPABLE_STATUSES,
            ).select_related("user")

            drop_list = list(participations_to_drop)

            if dry_run:
                self.stdout.write(
                    f"  [DRY] Archivaría '{challenge.name}' "
                    f"(fin: {challenge.end_date}) — {len(drop_list)} participaciones caerían a dropped."
                )
                archived_count += 1
                dropped_count += len(drop_list)
                continue

            with transaction.atomic():
                # 1. Archivar el reto
                challenge.status = Challenge.Status.ARCHIVED
                challenge.save(update_fields=["status", "updated_at"])

                # 2. Descartar participaciones activas
                affected_ids = participations_to_drop.values_list("pk", flat=True)
                participations_to_drop.update(
                    status=ChallengeParticipation.ParticipationStatus.DROPPED
                )

            archived_count += 1
            dropped_count += len(drop_list)

            self.stdout.write(
                self.style.SUCCESS(
                    f"  ✓ Archivado: '{challenge.name}' — {len(drop_list)} participaciones descartadas."
                )
            )

            # 3. Notificar a cada atleta afectado (fuera de la transacción para no bloquear)
            for p in drop_list:
                try:
                    _notify(
                        recipient_id=p.user_id,
                        notification_type="challenge_rejected",
                        title=f'Reto expirado: {challenge.name}',
                        message=(
                            f'El reto "{challenge.name}" finalizó el {challenge.end_date} '
                            f'sin que se completara tu participación.'
                        ),
                    )
                    notified_count += 1
                except Exception as exc:
                    logger.warning("No se pudo notificar a user %s: %s", p.user_id, exc)

        # Resumen
        self.stdout.write("\n-- Resumen ----------------------------------")
        self.stdout.write(f"  Retos archivados       : {archived_count}")
        self.stdout.write(f"  Participaciones dropped: {dropped_count}")
        if not dry_run:
            self.stdout.write(f"  Notificaciones enviadas: {notified_count}")
        self.stdout.write("--------------------------------------------\n")
