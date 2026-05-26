import base64
import json
from urllib.parse import urlencode

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

from core.permissions import IsGymAdmin, IsSuperAdmin
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


class UserViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = User.objects.all().select_related("gym")
    serializer_class = UserSerializer
    permission_classes = [IsSuperAdmin]


class GymMemberViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsGymAdmin]

    def get_queryset(self):
        user = self.request.user
        queryset = User.objects.filter(gym=user.gym).exclude(id=user.id).select_related("gym")
        
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
            
        return queryset.order_by('first_name', 'last_name')

    def perform_create(self, serializer):
        # Forzamos que el nuevo miembro sea del mismo gimnasio que el admin
        # Si no se provee password, usamos uno por defecto o el email (mejora futura: enviar email de invitación)
        password = self.request.data.get('password', 'Lifefit2024*')
        user = serializer.save(gym=self.request.user.gym)
        user.set_password(password)
        user.save()


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        next_path = request.query_params.get("next", "/resumen")
        state_payload = {
            "next": next_path,
            "nonce": get_random_string(12),
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
        if state:
            try:
                payload = _decode_state_token(state)
                next_path = payload.get("next", next_path)
            except (ValueError, json.JSONDecodeError):
                pass
        else:
            next_path = request.query_params.get("next", next_path)

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

        user.google_id = user_data.get("sub")
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
        
        print(f"🔒 AUDITORÍA GUARDADA: SuperAdmin '{request.user.email}' inició sesión como '{gym_admin.email}' (Gimnasio ID: {gym_id})")
        
        refresh = RefreshToken.for_user(gym_admin)
        
        from .serializers import UserSerializer
        data = {
            "user": UserSerializer(gym_admin).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "gym_slug": gym_admin.gym.slug if hasattr(gym_admin, 'gym') and gym_admin.gym else None
        }
        return Response(data)
