from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
def send_welcome_gym_email(admin_email: str, gym_name: str, invite_link: str) -> None:
    context = {
        'gym_name': gym_name,
        'set_password_url': invite_link,
    }
    html_message = render_to_string('emails/welcome_gym.html', context)
    plain_message = strip_tags(html_message)
    send_mail(
        subject='¡Bienvenido a LifeFit! Crea tu contraseña',
        message=plain_message,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'onboarding@resend.dev'),
        recipient_list=[admin_email],
        html_message=html_message,
        fail_silently=False,
    )


def send_welcome_athlete_email(athlete_email: str, athlete_name: str, gym_name: str, invite_link: str) -> None:
    context = {
        'athlete_name': athlete_name,
        'gym_name': gym_name,
        'set_password_url': invite_link,
    }
    html_message = render_to_string('emails/welcome_athlete.html', context)
    plain_message = strip_tags(html_message)
    send_mail(
        subject=f'¡Te damos la bienvenida a {gym_name} en LifeFit!',
        message=plain_message,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'onboarding@resend.dev'),
        recipient_list=[athlete_email],
        html_message=html_message,
        fail_silently=False,
    )


def send_welcome_staff_email(staff_email: str, staff_name: str, gym_name: str, role_name: str, invite_link: str) -> None:
    context = {
        'staff_name': staff_name,
        'gym_name': gym_name,
        'role_name': role_name,
        'set_password_url': invite_link,
    }
    html_message = render_to_string('emails/welcome_staff.html', context)
    plain_message = strip_tags(html_message)
    send_mail(
        subject=f'¡Te has unido al staff de {gym_name} en LifeFit!',
        message=plain_message,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'onboarding@resend.dev'),
        recipient_list=[staff_email],
        html_message=html_message,
        fail_silently=False,
    )


def send_welcome_gym_async(admin_email: str, gym_name: str, invite_link: str) -> None:
    send_welcome_gym_email(admin_email, gym_name, invite_link)


def send_welcome_athlete_async(athlete_email: str, athlete_name: str, gym_name: str, invite_link: str) -> None:
    send_welcome_athlete_email(athlete_email, athlete_name, gym_name, invite_link)


def send_welcome_staff_async(staff_email: str, staff_name: str, gym_name: str, role_name: str, invite_link: str) -> None:
    send_welcome_staff_email(staff_email, staff_name, gym_name, role_name, invite_link)
