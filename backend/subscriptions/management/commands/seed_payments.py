from datetime import date, datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand

from subscriptions.models import Payment, Subscription


class Command(BaseCommand):
    help = "Crea pagos de prueba para los últimos 6 meses"

    def handle(self, *args, **options):
        subscriptions = Subscription.objects.filter(status="active").select_related("plan", "owner_gym")
        created = 0
        today = date.today()

        if not subscriptions.exists():
            self.stdout.write(self.style.WARNING("No hay suscripciones activas. Ejecuta seed_plans y luego crea suscripciones manualmente."))
            return

        for sub in subscriptions:
            for months_ago in range(6):
                pay_date = today - timedelta(days=months_ago * 30 + 5)

                if pay_date > today:
                    continue

                existing = Payment.objects.filter(
                    subscription=sub,
                    paid_at__date__year=pay_date.year,
                    paid_at__date__month=pay_date.month,
                ).exists()

                if existing:
                    self.stdout.write(f"  \u23e9 {sub.owner_gym} - mes {pay_date.month} ya existe")
                    continue

                Payment.objects.create(
                    subscription=sub,
                    amount=sub.plan.price,
                    currency="PEN",
                    status=Payment.PaymentStatus.SUCCESS,
                    paid_at=datetime.combine(pay_date, datetime.min.time()),
                    provider="izipay",
                    external_id=f"SEED-{sub.owner_gym.slug}-{pay_date.year}{pay_date.month:02d}",
                )
                created += 1
                self.stdout.write(f"  ✅ {sub.owner_gym} - S/ {sub.plan.price} - {pay_date.isoformat()}")

        self.stdout.write(self.style.SUCCESS(f"\n{created} pagos creados."))
