import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Creates a default super administrator to manage the Lifefit platform."

    def add_arguments(self, parser):
        parser.add_argument("--email", help="Email for the admin user")
        parser.add_argument("--password", help="Password for the admin user")
        parser.add_argument("--first-name", default="Lifefit", dest="first_name")
        parser.add_argument("--last-name", default="Admin", dest="last_name")

    def handle(self, *args, **options):
        User = get_user_model()
        email = options["email"] or os.getenv("DEFAULT_SUPERADMIN_EMAIL")
        password = options["password"] or os.getenv("DEFAULT_SUPERADMIN_PASSWORD")
        first_name = options["first_name"]
        last_name = options["last_name"]

        if not email or not password:
            raise CommandError(
                "Email y contraseña son obligatorios. Usa argumentos --email y --password "
                "o define DEFAULT_SUPERADMIN_EMAIL / DEFAULT_SUPERADMIN_PASSWORD en el entorno."
            )

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f"Ya existe un usuario con el correo {email}."))
            return

        User.objects.create_superuser(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        self.stdout.write(self.style.SUCCESS(f"Usuario administrador creado: {email}"))
