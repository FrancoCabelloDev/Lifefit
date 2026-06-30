import logging
import resend
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _send(subject: str, html: str, to: str) -> None:
    resend.api_key = settings.RESEND_API_KEY
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'onboarding@resend.dev')
    resend.Emails.send({
        "from": from_email,
        "to": [to],
        "subject": subject,
        "html": html,
    })


def send_welcome_gym_email(admin_email: str, gym_name: str, invite_link: str) -> None:
    html = render_to_string('emails/welcome_gym.html', {
        'gym_name': gym_name,
        'set_password_url': invite_link,
    })
    _send('¡Bienvenido a LifeFit! Crea tu contraseña', html, admin_email)


def send_welcome_athlete_email(athlete_email: str, athlete_name: str, gym_name: str, invite_link: str) -> None:
    html = render_to_string('emails/welcome_athlete.html', {
        'athlete_name': athlete_name,
        'gym_name': gym_name,
        'set_password_url': invite_link,
    })
    _send(f'¡Te damos la bienvenida a {gym_name} en LifeFit!', html, athlete_email)


def send_welcome_staff_email(staff_email: str, staff_name: str, gym_name: str, role_name: str, invite_link: str) -> None:
    html = render_to_string('emails/welcome_staff.html', {
        'staff_name': staff_name,
        'gym_name': gym_name,
        'role_name': role_name,
        'set_password_url': invite_link,
    })
    _send(f'¡Te has unido al staff de {gym_name} en LifeFit!', html, staff_email)


def send_welcome_gym_async(admin_email: str, gym_name: str, invite_link: str) -> None:
    send_welcome_gym_email(admin_email, gym_name, invite_link)


def send_welcome_athlete_async(athlete_email: str, athlete_name: str, gym_name: str, invite_link: str) -> None:
    send_welcome_athlete_email(athlete_email, athlete_name, gym_name, invite_link)


def send_welcome_staff_async(staff_email: str, staff_name: str, gym_name: str, role_name: str, invite_link: str) -> None:
    send_welcome_staff_email(staff_email, staff_name, gym_name, role_name, invite_link)
