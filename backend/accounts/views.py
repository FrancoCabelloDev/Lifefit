import base64
import json
import logging
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import redirect
from django.utils.crypto import get_random_string
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.permissions import IsGymAdmin, IsGymAdminOrReceptionist, IsSuperAdmin
from .serializers import PasswordChangeSerializer, RegisterSerializer, UserSerializer, UserUpdateSerializer


def _decode_state_token(token: str) -> dict:
    padding = "=" * (-len(token) % 4)
    return json.loads(base64.urlsafe_b64decode(token + padding).decode())

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        data = {
            "user": UserSerializer(user).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
        return Response(data, status=status.HTTP_201_CREATED)


class UserMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)

    def delete(self, request, *args, **kwargs):
        """Permite al atleta eliminar su propia cuenta."""
        from gyms.models import GymSubscription
        user = request.user
        # Cancelar membresías activas
        GymSubscription.objects.filter(athlete=user, status="active").update(status="canceled")
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = User.objects.all().select_related("gym")
    serializer_class = UserSerializer
    permission_classes = [IsSuperAdmin]


class GymMemberViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer

    STAFF_READ_ROLES = {'gym_admin', 'coach', 'nutritionist', 'receptionist'}

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [IsAuthenticated()]
        if self.request.method == 'DELETE':
            return [IsGymAdminOrReceptionist()]
        return [IsGymAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.role not in self.STAFF_READ_ROLES:
            return User.objects.none()
        queryset = User.objects.filter(gym=user.gym, gym__deleted_at__isnull=True).exclude(id=user.id).select_related("gym").prefetch_related("gym_subscriptions__plan")
        
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
            
        return queryset.order_by('first_name', 'last_name')

    def perform_create(self, serializer):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.conf import settings
        from django.utils.html import strip_tags
        from django.utils import timezone
        from urllib.parse import urlencode
        from rest_framework.exceptions import ValidationError

        gym = self.request.user.gym
        role = serializer.validated_data.get("role", "athlete")
        if role == "athlete" and User.objects.filter(gym=gym, role="athlete").count() >= gym.max_athletes:
            raise ValidationError("El gimnasio ha alcanzado el límite máximo de atletas.")
        if role == "coach" and User.objects.filter(gym=gym, role="coach").count() >= gym.max_coaches:
            raise ValidationError("El gimnasio ha alcanzado el límite máximo de coaches.")
        if role == "nutritionist" and User.objects.filter(gym=gym, role="nutritionist").count() >= gym.max_nutritionists:
            raise ValidationError("El gimnasio ha alcanzado el límite máximo de nutricionistas.")

        from django.db import transaction
        from datetime import date, timedelta

        with transaction.atomic():
            user = serializer.save(gym=gym, is_active=True)
            user.set_unusable_password()
            user.save()

            # Crear suscripción si se proporcionó un plan
            membership_plan_id = self.request.data.get('membership_plan_id')
            start_date_str = self.request.data.get('start_date') or date.today().isoformat()

            if membership_plan_id and user.role == 'athlete':
                from gyms.models import GymMembershipPlan, GymSubscription, GymPayment
                try:
                    plan = GymMembershipPlan.objects.get(id=membership_plan_id, gym=gym)
                    try:
                        start_date = date.fromisoformat(start_date_str)
                    except ValueError:
                        start_date = date.today()
                    end_date = start_date + timedelta(days=plan.duration_days)
                    subscription = GymSubscription.objects.create(
                        athlete=user,
                        gym=gym,
                        plan=plan,
                        status='active',
                        start_date=start_date,
                        end_date=end_date,
                    )
                    from django.utils import timezone as tz
                    GymPayment.objects.create(
                        gym=gym,
                        athlete=user,
                        subscription=subscription,
                        plan=plan,
                        amount=plan.price,
                        status='success',
                        payment_method='cash',
                        paid_at=tz.now(),
                    )
                except GymMembershipPlan.DoesNotExist:
                    pass  # Plan inválido — atleta creado sin suscripción

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')

        params = urlencode({
            'uid': uid,
            'token': token,
            'gymSlug': gym.slug,
            'gymName': gym.name
        })
        invite_link = f"{frontend_url}/unirse?{params}"

        try:
            from core.tasks import send_welcome_athlete_async, send_welcome_staff_async
            if user.role == 'athlete':
                send_welcome_athlete_async(user.email, user.first_name, gym.name, invite_link)
            else:
                roles_dict = {
                    'coach': 'Entrenador (Coach)',
                    'nutritionist': 'Nutricionista',
                    'receptionist': 'Personal de Recepción / Soporte',
                    'gym_admin': 'Administrador del Gimnasio',
                }
                role_name = roles_dict.get(user.role, user.role.capitalize())
                send_welcome_staff_async(user.email, user.first_name, gym.name, role_name, invite_link)
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                f"No se pudo enviar email de bienvenida a {user.email}"
            )


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        next_path = request.query_params.get("next", "/resumen")
        state_payload = {
            "next": next_path,
            "nonce": get_random_string(12),
            "gym_slug": request.query_params.get("gym_slug", ""),
            "plan_id": request.query_params.get("plan_id", ""),
        }
        state = base64.urlsafe_b64encode(json.dumps(state_payload).encode()).decode()
        params = {
            "client_id": settings.SOCIAL_AUTH_GOOGLE_OAUTH2_KEY,
            "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(settings.SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
        return Response({"authorization_url": auth_url, "state": state})


class GoogleCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        code = request.query_params.get("code")
        state = request.query_params.get("state")

        if not code:
            return Response({"detail": "Missing authorization code."}, status=status.HTTP_400_BAD_REQUEST)

        next_path = "/resumen"
        gym_slug = ""
        plan_id = ""
        if state:
            try:
                payload = _decode_state_token(state)
                next_path = payload.get("next", next_path)
                gym_slug = payload.get("gym_slug", "")
                plan_id = payload.get("plan_id", "")
            except (ValueError, json.JSONDecodeError):
                pass
        else:
            next_path = request.query_params.get("next", next_path)
            gym_slug = request.query_params.get("gym_slug", "")
            plan_id = request.query_params.get("plan_id", "")

        token_response = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.SOCIAL_AUTH_GOOGLE_OAUTH2_KEY,
                "client_secret": settings.SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET,
                "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=15,
        )

        if token_response.status_code >= 400:
            return Response(token_response.json(), status=token_response.status_code)

        tokens = token_response.json()
        user_info_response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {tokens.get('access_token')}"},
            timeout=15,
        )
        if user_info_response.status_code >= 400:
            return Response(user_info_response.json(), status=user_info_response.status_code)

        user_data = user_info_response.json()
        email = user_data.get("email")
        if not email:
            return Response({"detail": "Google account does not provide an email."}, status=status.HTTP_400_BAD_REQUEST)

        first_name = user_data.get("given_name") or user_data.get("name") or ""
        last_name = user_data.get("family_name") or ""
        picture = user_data.get("picture")
        google_id = user_data.get("sub")

        # ── Flujo /unirse: NO crear cuenta aún, redirigir a confirmación + pago ──
        if gym_slug and plan_id:
            pending_payload = {
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "picture": picture or "",
                "google_id": google_id,
                "gym_slug": gym_slug,
                "plan_id": plan_id,
                "nonce": get_random_string(8),
            }
            pending_token = base64.urlsafe_b64encode(json.dumps(pending_payload).encode()).decode()
            frontend_confirm = f"{settings.FRONTEND_URL.rstrip('/')}/unirse/confirmar"
            return redirect(f"{frontend_confirm}?token={pending_token}")

        # ── Flujo login normal: crear/actualizar usuario y emitir tokens ──
        user = User.objects.filter(email=email).first()
        if not user:
            user = User.objects.create_user(
                email=email,
                password=None,
                first_name=first_name or "",
                last_name=last_name or "",
                role=User.Role.ATHLETE,
                is_active=True,
                is_google_account=True,
            )

        if not user.first_name:
            user.first_name = first_name
        if not user.last_name:
            user.last_name = last_name

        user.google_id = google_id
        user.google_picture = picture
        user.is_google_account = True
        user.save(update_fields=["first_name", "last_name", "google_id", "google_picture", "is_google_account", "updated_at"])

        refresh = RefreshToken.for_user(user)
        frontend_callback = f"{settings.FRONTEND_URL.rstrip('/')}/ingresar/google/callback"
        query = urlencode(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "next": next_path,
            }
        )
        return redirect(f"{frontend_callback}?{query}")


class CreateIziPayOrderView(APIView):
    """
    Crea una orden de pago en IziPay para el flujo /unirse.
    Recibe el pending_token (con datos del usuario y plan) y devuelve el formToken de IziPay.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        import hmac, hashlib
        token = request.data.get("token")
        if not token:
            return Response({"detail": "Token requerido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = _decode_state_token(token)
        except Exception:
            return Response({"detail": "Token inválido."}, status=status.HTTP_400_BAD_REQUEST)

        from gyms.models import Gym, GymMembershipPlan
        gym_slug = payload.get("gym_slug", "")
        plan_id = payload.get("plan_id", "")
        email = payload.get("email", "")

        gym = Gym.objects.filter(slug=gym_slug, deleted_at__isnull=True).first()
        if not gym:
            return Response({"detail": "Gimnasio no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        plan = GymMembershipPlan.objects.filter(id=plan_id, gym=gym, is_active=True).first()
        if not plan:
            return Response({"detail": "Plan no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        username = settings.IZIPAY_USERNAME
        password = settings.IZIPAY_PASSWORD

        if not username or not password:
            return Response({"detail": "Pasarela de pago no configurada."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        amount_cents = int(float(plan.price) * 100)

        order_payload = {
            "amount": amount_cents,
            "currency": "PEN",
            "orderId": f"LIFEFIT-{gym_slug}-{plan_id}-{get_random_string(8)}",
            "customer": {
                "email": email,
            },
            "metadata": {
                "pending_token": token,
            },
        }

        response = requests.post(
            f"{settings.IZIPAY_API_URL}/Charge/CreatePayment",
            json=order_payload,
            auth=(username, password),
            timeout=15,
        )

        if response.status_code >= 400:
            return Response({"detail": "Error al crear la orden de pago.", "raw": response.json()}, status=status.HTTP_502_BAD_GATEWAY)

        data = response.json()
        form_token = data.get("answer", {}).get("formToken")
        if not form_token:
            return Response({"detail": "No se obtuvo formToken de IziPay.", "raw": data}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            "form_token": form_token,
            "public_key": settings.IZIPAY_PUBLIC_KEY,
            "amount": float(plan.price),
            "plan_name": plan.name,
            "gym_name": gym.name,
        })


class IziPayWebhookView(APIView):
    """
    Webhook de IziPay — se llama cuando el pago es confirmado.
    Valida la firma HMAC, extrae el pending_token del metadata y completa el registro.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        import hmac, hashlib

        raw_body = request.body.decode("utf-8")
        received_signature = request.headers.get("kr-hash", "")
        hmac_key = settings.IZIPAY_HMAC_SHA256

        if hmac_key:
            expected = hmac.new(hmac_key.encode(), raw_body.encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(expected, received_signature):
                return Response({"detail": "Firma inválida."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        order_status = data.get("orderStatus")
        if order_status != "PAID":
            return Response({"detail": "Pago no completado."}, status=status.HTTP_200_OK)

        pending_token = data.get("metadata", {}).get("pending_token", "")
        if not pending_token:
            return Response({"detail": "Sin pending_token en metadata."}, status=status.HTTP_400_BAD_REQUEST)

        # Reutilizar la lógica de CompleteGoogleRegistrationView
        _complete_registration(pending_token)
        return Response({"detail": "OK"})


def _complete_registration(token: str):
    """Lógica compartida para crear usuario + membresía tras pago confirmado."""
    from gyms.models import Gym, GymSubscription, GymMembershipPlan
    from datetime import date, timedelta

    payload = _decode_state_token(token)
    email = payload.get("email")
    first_name = payload.get("first_name", "")
    last_name = payload.get("last_name", "")
    picture = payload.get("picture", "")
    google_id = payload.get("google_id", "")
    gym_slug = payload.get("gym_slug", "")
    plan_id = payload.get("plan_id", "")

    gym = Gym.objects.filter(slug=gym_slug, deleted_at__isnull=True).first()
    plan = GymMembershipPlan.objects.filter(id=plan_id, gym=gym, is_active=True).first() if gym else None

    user = User.objects.filter(email=email).first()
    if not user:
        user = User.objects.create_user(
            email=email, password=None,
            first_name=first_name, last_name=last_name,
            role=User.Role.ATHLETE, is_active=True,
            is_google_account=True, gym=gym,
        )
    else:
        if not user.gym_id and gym:
            user.gym = gym

    if google_id:
        user.google_id = google_id
    if picture:
        user.google_picture = picture
    user.is_google_account = True
    user.save(update_fields=["gym", "google_id", "google_picture", "is_google_account", "updated_at"])

    if gym and plan:
        GymSubscription.objects.filter(athlete=user, gym=gym, status="active").update(status="canceled")
        GymSubscription.objects.create(
            athlete=user, gym=gym, plan=plan, status="active",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=plan.duration_days),
        )
    return user, gym_slug


class CompleteGoogleRegistrationView(APIView):
    """
    Completa el registro de un atleta que viene del flujo /unirse con Google.
    Se llama DESPUÉS de confirmar el pago con IziPay.
    Recibe el token pendiente, crea la cuenta y activa la membresía.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        token = request.data.get("token")
        if not token:
            return Response({"detail": "Token requerido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user, gym_slug = _complete_registration(token)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "gym_slug": gym_slug,
            "user": {
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        }, status=status.HTTP_201_CREATED)


class GoogleDisconnectView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        request.user.google_id = None
        request.user.google_picture = None
        request.user.is_google_account = False
        request.user.save(update_fields=["google_id", "google_picture", "is_google_account", "updated_at"])
        return Response({"detail": "Google account disconnected."})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["old_password"]):
            return Response({"detail": "La contraseña actual no es correcta."}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"detail": "Contraseña actualizada correctamente."})


class SetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        from .serializers import SetPasswordSerializer
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode

        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid_b64 = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        try:
            uid = urlsafe_base64_decode(uid_b64).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Enlace inválido o usuario no encontrado."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "El enlace ha expirado o es inválido."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=["password"])

        gym_slug = user.gym.slug if hasattr(user, 'gym') and user.gym else None

        return Response({
            "detail": "Contraseña configurada exitosamente. Ya puedes iniciar sesión.",
            "gym_slug": gym_slug
        })

class ImpersonateView(APIView):
    """
    Permite a un SuperAdmin iniciar sesión temporalmente como el administrador de un gimnasio.
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request, *args, **kwargs):
        gym_id = request.data.get("gym_id")
        if not gym_id:
            return Response({"detail": "Se requiere gym_id."}, status=status.HTTP_400_BAD_REQUEST)
        
        gym_admin = User.objects.filter(gym_id=gym_id, role=User.Role.GYM_ADMIN).first()
        
        if not gym_admin:
            return Response(
                {"detail": "No se encontró un administrador para este gimnasio."}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        from core.models import AuditLog
        
        # Guardar en base de datos la auditoría
        AuditLog.objects.create(
            user=request.user,
            action="IMPERSONATE",
            target_object_id=str(gym_admin.id),
            target_object_repr=f"GymAdmin: {gym_admin.email} (Gym: {gym_admin.gym.name if gym_admin.gym else 'N/A'})",
            details={
                "gym_id": gym_id,
                "reason": "Soporte Técnico"
            },
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        logger.info("AUDITORIA: SuperAdmin %s inicio sesion como %s (Gimnasio ID: %s)", request.user.email, gym_admin.email, gym_id)
        
        refresh = RefreshToken.for_user(gym_admin)
        refresh['is_impersonating'] = True
        refresh['impersonated_by_id'] = str(request.user.id)
        refresh['impersonated_by_email'] = request.user.email

        from .serializers import UserSerializer
        data = {
            "user": UserSerializer(gym_admin).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "gym_slug": gym_admin.gym.slug if hasattr(gym_admin, 'gym') and gym_admin.gym else None,
            "impersonated_by": {
                "id": str(request.user.id),
                "email": request.user.email,
                "role": request.user.role,
            },
        }
        return Response(data)


class RoleRedirectView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == User.Role.SUPER_ADMIN:
            return Response({"redirect": "/panel-saas"})
        if user.gym_id and hasattr(user, 'gym') and user.gym:
            slug = user.gym.slug if hasattr(user.gym, 'slug') else str(user.gym_id)
            return Response({"redirect": f"/{slug}/panel"})
        return Response({"redirect": "/tugimnasio"})


class ImpersonateStaffView(APIView):
    """
    Permite a un GymAdmin ver la perspectiva de cualquier miembro de su equipo (coach, nutricionista, etc.)
    sin necesitar su contraseña. Requiere que el usuario objetivo sea del mismo gimnasio.
    """
    permission_classes = [IsGymAdmin]

    def post(self, request, *args, **kwargs):
        staff_id = request.data.get("staff_id")
        if not staff_id:
            return Response({"detail": "Se requiere staff_id."}, status=status.HTTP_400_BAD_REQUEST)

        # Solo puede impersonar a miembros de su mismo gimnasio
        staff_member = User.objects.filter(
            id=staff_id,
            gym=request.user.gym
        ).exclude(role=User.Role.GYM_ADMIN).first()

        if not staff_member:
            return Response(
                {"detail": "No se encontró este miembro de staff en tu gimnasio."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Auditoría del acceso
        from core.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action="IMPERSONATE_STAFF",
            target_object_id=str(staff_member.id),
            target_object_repr=f"{staff_member.role.upper()}: {staff_member.email} (Gym: {request.user.gym.name})",
            details={"reason": "Vista de perspectiva del admin"},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        logger.info("AUDITORIA: GymAdmin %s viendo perspectiva de %s (%s)", request.user.email, staff_member.email, staff_member.role)

        refresh = RefreshToken.for_user(staff_member)
        refresh['is_impersonating'] = True
        refresh['impersonated_by_id'] = str(request.user.id)
        refresh['impersonated_by_email'] = request.user.email

        from .serializers import UserSerializer
        return Response({
            "user": UserSerializer(staff_member).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "gym_slug": staff_member.gym.slug if staff_member.gym else None,
            "impersonated_by": {
                "id": str(request.user.id),
                "email": request.user.email,
                "role": request.user.role,
            },
        })
