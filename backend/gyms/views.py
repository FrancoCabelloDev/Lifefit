from django.contrib.auth import get_user_model
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Branch, Gym
from .serializers import BranchSerializer, GymSerializer, PublicGymSerializer

User = get_user_model()


class GymViewSet(viewsets.ModelViewSet):
    queryset = Gym.objects.all().order_by("name")
    serializer_class = GymSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Gym.objects.none()

        qs = Gym.objects.prefetch_related("branches")

        if user.role == User.Role.SUPER_ADMIN:
            return qs

        if user.gym_id:
            return Gym.objects.filter(id=user.gym_id).prefetch_related("branches")

        slug = self.request.query_params.get('slug')
        if slug:
            return Gym.objects.filter(slug=slug).prefetch_related("branches")

        return Gym.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("Solo los super administradores pueden crear gimnasios.")
        
        admin_email = self.request.data.get('admin_email')
        print("\n" + "="*50)
        print(f"DEBUG: Intentando crear gimnasio. admin_email: '{admin_email}'")
        print("="*50 + "\n")
        
        if admin_email and User.objects.filter(email=admin_email).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"admin_email": "Ya existe un usuario con este correo electrónico."})

        from django.db import transaction
        with transaction.atomic():
            gym = serializer.save()

            admin_first_name = self.request.data.get('admin_first_name', '')
            admin_last_name = self.request.data.get('admin_last_name', '')

            if admin_email:
                from django.contrib.auth.tokens import default_token_generator
                from django.utils.http import urlsafe_base64_encode
                from django.utils.encoding import force_bytes
                from django.conf import settings

                user = User.objects.create(
                    email=admin_email,
                    first_name=admin_first_name,
                    last_name=admin_last_name,
                    role=User.Role.GYM_ADMIN,
                    gym=gym,
                    is_active=True
                )
                user.set_unusable_password()
                user.save()

                # Generar token y link
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
                
                from urllib.parse import urlencode
                params = urlencode({
                    'uid': uid,
                    'token': token,
                    'gymSlug': gym.slug,
                    'gymName': gym.name
                })
                invite_link = f"{frontend_url}/unirse?{params}"

                # Lógica de Suscripción (SaaS)
                saas_plan_name = self.request.data.get('saas_plan', 'Pro')
                billing_cycle = self.request.data.get('billing_cycle', 'monthly')
                
                from subscriptions.models import SubscriptionPlan, Subscription
                from django.utils import timezone
                from datetime import timedelta
                import calendar
                
                # Obtener o crear el Plan de Suscripción si no existe
                # (Idealmente los planes ya deben existir, pero para evitar errores en desarrollo lo creamos)
                plan, created = SubscriptionPlan.objects.get_or_create(
                    name=saas_plan_name,
                    billing_cycle=billing_cycle,
                    defaults={
                        'currency': 'PEN',
                        'price': 249 if saas_plan_name == 'Pro' else 99,
                        'description': f'Plan {saas_plan_name} creado automáticamente'
                    }
                )
                
                # Calcular fechas de la suscripción
                start_date = timezone.now().date()
                if billing_cycle == 'monthly':
                    # Sumar un mes (aproximado, usando timedelta o calendar)
                    days_in_month = calendar.monthrange(start_date.year, start_date.month)[1]
                    end_date = start_date + timedelta(days=days_in_month)
                else:
                    # Anual
                    try:
                        end_date = start_date.replace(year=start_date.year + 1)
                    except ValueError:
                        # Si es 29 de febrero en bisiesto, pasar al 28 de febrero
                        end_date = start_date.replace(year=start_date.year + 1, month=2, day=28)
                
                # Crear la Suscripción vinculada al Gimnasio
                Subscription.objects.create(
                    owner_gym=gym,
                    plan=plan,
                    status=Subscription.Status.ACTIVE,
                    start_date=start_date,
                    end_date=end_date,
                    next_billing_date=end_date
                )
                print(f"✅ Suscripción '{plan.name}' ({billing_cycle}) creada para {gym.name}")

                # Simular envío de correo por consola (hasta configurar Resend)
                print("="*50)
                print(f"📧 EMAIL DE INVITACIÓN PARA: {admin_email}")
                print(f"¡Bienvenido a LifeFit, {admin_first_name}! Tu gimnasio '{gym.name}' ha sido registrado con el plan {saas_plan_name}.")
                print(f"Por favor, haz clic en el siguiente enlace para crear tu contraseña y acceder a tu panel:")
                print(f"👉 {invite_link}")
                print("="*50)

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role == User.Role.GYM_ADMIN and user.gym_id == instance.id:
            serializer.save()
            return
        raise PermissionDenied("No tienes permisos para modificar este gimnasio.")

    def perform_destroy(self, instance):
        if self.request.user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("Solo los super administradores pueden eliminar gimnasios.")
        instance.delete()


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.select_related("gym").all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Branch.objects.select_related("gym")

        if user.role == User.Role.SUPER_ADMIN:
            return queryset

        if user.gym_id:
            return queryset.filter(gym_id=user.gym_id)

        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return

        if user.role == User.Role.GYM_ADMIN and user.gym_id:
            serializer.save(gym=user.gym)
            return

        raise PermissionDenied("No tienes permisos para crear sucursales.")

    def perform_update(self, serializer):
        user = self.request.user
        branch = self.get_object()

        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return

        if user.role == User.Role.GYM_ADMIN and branch.gym_id == user.gym_id:
            serializer.save()
            return

        raise PermissionDenied("No tienes permisos para modificar esta sucursal.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            instance.delete()
            return

        if user.role == User.Role.GYM_ADMIN and instance.gym_id == user.gym_id:
            instance.delete()
            return

        raise PermissionDenied("No tienes permisos para eliminar esta sucursal.")


class PublicGymViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoint público para listar gimnasios activos.
    Usado en las vistas de /tugimnasio y /unirse del frontend.
    """
    queryset = Gym.objects.filter(status=Gym.Status.ACTIVE).order_by("name")
    serializer_class = PublicGymSerializer
    permission_classes = [AllowAny]

