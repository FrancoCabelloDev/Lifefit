import csv
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from core.permissions import IsGymAdmin
from gamification.models import AthleteStreak
from .models import (
    BodyMeasurement, Branch, CheckIn, CoachAssignment, Gym, GymMembershipPlan,
    GymFeatureFlag, GymPayment, GymSubscription, Notification, NutritionistAssignment,
    NutritionistAppointment, NutritionistMessage,
)
from .serializers import (
    BodyMeasurementSerializer,
    BranchSerializer,
    CheckInCreateSerializer,
    CheckInSerializer,
    CoachAssignmentSerializer,
    GymSerializer,
    PublicGymSerializer,
    GymMembershipPlanSerializer,
    GymFeatureFlagSerializer,
    GymPaymentSerializer,
    GymSubscriptionSerializer,
    NotificationSerializer,
    NutritionistAssignmentSerializer,
    NutritionistAppointmentSerializer,
    NutritionistMessageSerializer,
)

User = get_user_model()

CACHE_TTL = 300  # 5 minutos


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
            return Gym.objects.filter(id=user.gym_id, deleted_at__isnull=True).prefetch_related("branches")

        slug = self.request.query_params.get('slug')
        if slug:
            return Gym.objects.filter(slug=slug, deleted_at__isnull=True).prefetch_related("branches")

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
            
            # Extract metrics and handle enabled_modules manually to create FeatureFlags
            metrics = serializer.validated_data.get('metrics', {})
            enabled_modules = metrics.pop('enabled_modules', [])
            serializer.validated_data['metrics'] = metrics
            
            gym = serializer.save()

            if enabled_modules:
                from core.models import FeatureFlag
                from gyms.models import GymFeatureFlag
                flags = FeatureFlag.objects.filter(code__in=enabled_modules)
                for flag in flags:
                    GymFeatureFlag.objects.create(gym=gym, feature_flag=flag, is_active=True)

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
                saas_plan_id = self.request.data.get('saas_plan_id')
                
                from subscriptions.models import SubscriptionPlan, Subscription
                from django.utils import timezone
                from datetime import timedelta
                import calendar
                from rest_framework.exceptions import ValidationError
                
                if not saas_plan_id:
                    raise ValidationError({"saas_plan_id": "Debe seleccionar un plan de suscripción SaaS."})
                    
                try:
                    plan = SubscriptionPlan.objects.get(id=saas_plan_id)
                except SubscriptionPlan.DoesNotExist:
                    raise ValidationError({"saas_plan_id": "El plan seleccionado no existe."})
                
                billing_cycle = plan.billing_cycle
                
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
                subscription = Subscription.objects.create(
                    owner_gym=gym,
                    plan=plan,
                    status=Subscription.Status.ACTIVE,
                    start_date=start_date,
                    end_date=end_date,
                    next_billing_date=end_date
                )
                print(f"✅ Suscripción '{plan.name}' creada para {gym.name}")

                # Crear pago correspondiente para que se proyecte en Facturación
                from subscriptions.models import Payment
                Payment.objects.create(
                    subscription=subscription,
                    amount=plan.price,
                    currency=plan.currency,
                    status=Payment.PaymentStatus.SUCCESS,
                    paid_at=timezone.now(),
                    provider="manual"
                )
                print(f"✅ Pago inicial de {plan.currency} {plan.price} creado para {gym.name} en Facturación")

                # Envío de correo asíncrono
                from core.tasks import send_welcome_gym_async
                send_welcome_gym_async(admin_email, gym.name, invite_link)

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
        instance.soft_delete()

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        gym = self.get_object()
        if request.user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("Solo los super administradores pueden desactivar gimnasios.")
        gym.soft_delete()
        return Response({"status": "gimnasio desactivado"})

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        gym = self.get_object()
        if request.user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("Solo los super administradores pueden reactivar gimnasios.")
        gym.restore()
        return Response({"status": "gimnasio reactivado"})


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.select_related("gym").all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Branch.objects.select_related("gym").filter(gym__deleted_at__isnull=True)

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
    Usado en /unirse del frontend — no requiere autenticación.
    """
    queryset = (
        Gym.objects
        .filter(status=Gym.Status.ACTIVE, deleted_at__isnull=True)
        .prefetch_related("membership_plans", "gym_subscriptions")
        .order_by("name")
    )
    serializer_class = PublicGymSerializer
    permission_classes = [AllowAny]


class GymMembershipPlanViewSet(viewsets.ModelViewSet):
    serializer_class = GymMembershipPlanSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user = self.request.user
        queryset = GymMembershipPlan.objects.select_related("gym")
        
        gym_slug = self.request.query_params.get("gym_slug")
        if gym_slug:
            queryset = queryset.filter(gym__slug=gym_slug, is_active=True)

        if not user.is_authenticated:
            return queryset.filter(is_active=True)

        if user.role == User.Role.SUPER_ADMIN:
            return queryset

        if user.role == User.Role.GYM_ADMIN and user.gym_id:
            return queryset.filter(gym_id=user.gym_id)
            
        return queryset.filter(is_active=True)

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_authenticated:
            raise PermissionDenied("Debe autenticarse.")
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role == User.Role.GYM_ADMIN and user.gym_id:
            serializer.save(gym=user.gym)
            return
        raise PermissionDenied("No tienes permisos para crear planes de membresía.")

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_authenticated:
            raise PermissionDenied("Debe autenticarse.")
        plan = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role == User.Role.GYM_ADMIN and plan.gym_id == user.gym_id:
            serializer.save()
            return
        raise PermissionDenied("No tienes permisos para modificar este plan.")

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_authenticated:
            raise PermissionDenied("Debe autenticarse.")
        if user.role == User.Role.SUPER_ADMIN:
            instance.delete()
            return
        if user.role == User.Role.GYM_ADMIN and instance.gym_id == user.gym_id:
            instance.delete()
            return
        raise PermissionDenied("No tienes permisos para eliminar este plan.")


class GymFeatureFlagViewSet(viewsets.ModelViewSet):
    serializer_class = GymFeatureFlagSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = GymFeatureFlag.objects.select_related("gym", "feature_flag")

        gym_id = self.request.query_params.get("gym_id")
        if gym_id:
            queryset = queryset.filter(gym_id=gym_id)

        if user.role == User.Role.SUPER_ADMIN:
            return queryset

        if user.role == User.Role.GYM_ADMIN and user.gym_id:
            return queryset.filter(gym_id=user.gym_id)

        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            return serializer.save()
        if user.role == User.Role.GYM_ADMIN and user.gym_id:
            gym = serializer.validated_data.get("gym")
            if gym and gym.pk == user.gym_id:
                return serializer.save()
        raise PermissionDenied("No tienes permiso para asignar módulos a este gimnasio.")

    def perform_update(self, serializer):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            return serializer.save()
        if user.role == User.Role.GYM_ADMIN and user.gym_id:
            instance = serializer.instance
            if instance.gym_id == user.gym_id:
                return serializer.save()
        raise PermissionDenied("No tienes permiso para modificar módulos de este gimnasio.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            return instance.delete()
        if user.role == User.Role.GYM_ADMIN and user.gym_id:
            if instance.gym_id == user.gym_id:
                return instance.delete()
        raise PermissionDenied("No tienes permiso para eliminar módulos de este gimnasio.")


class CheckInViewSet(viewsets.ModelViewSet):
    serializer_class = CheckInSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = CheckIn.objects.select_related("user", "gym", "branch").filter(gym__deleted_at__isnull=True)

        if user.role == User.Role.SUPER_ADMIN:
            return qs

        if user.gym_id:
            qs = qs.filter(gym_id=user.gym_id)

            if user.role == User.Role.ATHLETE:
                qs = qs.filter(user=user)
            else:
                # Staff ve todo el historial
                date_param = self.request.query_params.get("date")
                if date_param:
                    qs = qs.filter(timestamp__date=date_param)

            return qs

        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user.gym_id:
            raise PermissionDenied("No estás asignado a un gimnasio.")
        serializer.save(gym_id=user.gym_id)

    @action(detail=False, methods=["post"])
    def register(self, request):
        user = request.user
        staff_roles = {User.Role.GYM_ADMIN, User.Role.RECEPTIONIST, User.Role.COACH, User.Role.NUTRITIONIST}
        if user.role not in staff_roles:
            return Response(
                {"detail": "No tienes permisos para registrar check-ins."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CheckInCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        gym_id = user.gym_id
        if not gym_id:
            return Response(
                {"detail": "No estás asignado a un gimnasio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user = None
        if serializer.validated_data.get("user_id"):
            try:
                target_user = User.objects.get(
                    id=serializer.validated_data["user_id"],
                    gym_id=gym_id,
                )
            except User.DoesNotExist:
                return Response(
                    {"detail": "Usuario no encontrado en este gimnasio."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif serializer.validated_data.get("email"):
            try:
                target_user = User.objects.get(
                    email=serializer.validated_data["email"],
                    gym_id=gym_id,
                )
            except User.DoesNotExist:
                return Response(
                    {"detail": "Usuario no encontrado en este gimnasio."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif serializer.validated_data.get("dni"):
            try:
                target_user = User.objects.get(
                    dni=serializer.validated_data["dni"],
                    gym_id=gym_id,
                )
            except User.DoesNotExist:
                return Response(
                    {"detail": "Usuario no encontrado en este gimnasio."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            return Response(
                {"detail": "Debes proporcionar user_id, email o dni."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        checkin = CheckIn.objects.create(
            user=target_user,
            gym_id=gym_id,
            branch_id=serializer.validated_data.get("branch_id"),
            method=serializer.validated_data.get("method", CheckIn.Method.MANUAL),
        )

        if target_user.role == User.Role.ATHLETE:
            streak, _ = AthleteStreak.objects.get_or_create(user=target_user, gym_id=gym_id)
            streak.register_activity()

        return Response(
            CheckInSerializer(checkin).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def self_checkin(self, request):
        user = request.user
        if user.role == User.Role.SUPER_ADMIN:
            return Response(
                {"detail": "Los super administradores no pueden hacer check-in."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.gym_id:
            return Response(
                {"detail": "No estás asignado a un gimnasio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        today_checkins = CheckIn.objects.filter(
            user=user,
            timestamp__date=date.today(),
        ).count()

        limit = 2 if user.role == User.Role.ATHLETE else 1
        if today_checkins >= limit:
            return Response(
                {"detail": "Ya registraste tu ingreso hoy."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        checkin = CheckIn.objects.create(
            user=user,
            gym_id=user.gym_id,
            method=CheckIn.Method.SELF,
        )

        if user.role == User.Role.ATHLETE:
            streak, _ = AthleteStreak.objects.get_or_create(user=user, gym_id=user.gym_id)
            streak.register_activity()

        return Response(
            CheckInSerializer(checkin).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"])
    def today_stats(self, request):
        user = self.request.user
        if not user.gym_id:
            return Response({"detail": "No gym assigned"}, status=400)

        today = date.today()
        staff_roles = {User.Role.GYM_ADMIN, User.Role.RECEPTIONIST, User.Role.COACH, User.Role.NUTRITIONIST}
        checkins_filter = {"gym_id": user.gym_id, "timestamp__date": today}

        if user.role in staff_roles:
            checkins_today = CheckIn.objects.filter(**checkins_filter).count()
        elif user.role == User.Role.ATHLETE:
            checkins_today = CheckIn.objects.filter(user=user, **checkins_filter).count()
        else:
            checkins_today = 0

        return Response({
            "today": checkins_today,
            "date": today.isoformat(),
        })


class CoachAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = CoachAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = CoachAssignment.objects.select_related("coach", "athlete", "gym").filter(gym__deleted_at__isnull=True)

        if user.role == User.Role.SUPER_ADMIN:
            return qs

        if user.gym_id:
            qs = qs.filter(gym_id=user.gym_id)

            if user.role == User.Role.COACH:
                qs = qs.filter(coach=user)

            if user.role == User.Role.ATHLETE:
                qs = qs.filter(athlete=user)

            return qs

        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN]:
            raise PermissionDenied("No tienes permisos para asignar coaches.")

        coach = serializer.validated_data.get("coach")
        athlete = serializer.validated_data.get("athlete")

        if coach.gym_id != user.gym_id or athlete.gym_id != user.gym_id:
            raise PermissionDenied("Coach y atleta deben pertenecer al mismo gimnasio.")

        serializer.save(gym_id=user.gym_id)

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role in [User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN] and instance.gym_id == user.gym_id:
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta asignación.")

    @action(detail=False, methods=["get"])
    def my_athletes(self, request):
        """Devuelve los atletas asignados al coach autenticado con su progreso, paginado"""
        user = request.user
        if user.role not in {User.Role.COACH, User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN}:
            return Response({"detail": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)

        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        search_q = request.query_params.get("search", "").strip().lower()

        assignments = self.get_queryset().filter(is_active=True)
        if user.role == User.Role.COACH:
            assignments = assignments.filter(coach=user)

        athlete_ids = list(assignments.values_list("athlete_id", flat=True))
        athletes_qs = User.objects.filter(id__in=athlete_ids)

        if search_q:
            athletes_qs = athletes_qs.filter(
                Q(first_name__icontains=search_q) |
                Q(last_name__icontains=search_q) |
                Q(email__icontains=search_q)
            )

        total = athletes_qs.count()
        athletes_qs = athletes_qs.order_by("first_name", "last_name")
        offset = (page - 1) * page_size
        athletes_page = athletes_qs[offset:offset + page_size]

        athlete_ids_page = [str(a.id) for a in athletes_page]
        athletes_values = athletes_qs.filter(id__in=[a.id for a in athletes_page]).values(
            "id", "first_name", "last_name", "email", "nivel", "puntos", "is_active", "date_joined"
        )
        athlete_map = {str(a["id"]): a for a in athletes_values}
        assignment_map = {}
        for a in assignments:
            aid = str(a.athlete_id)
            if aid in athlete_ids_page:
                assignment_map[aid] = a

        from workouts.models import UserRoutineAssignment, WorkoutSession
        from nutrition.models import UserNutritionPlan
        from django.db.models import Count
        from datetime import date, timedelta

        today = date.today()
        week_ago = today - timedelta(days=7)

        athlete_ids_filter = [a.id for a in athletes_page]

        routine_assignments = UserRoutineAssignment.objects.filter(
            user_id__in=athlete_ids_filter, status="active"
        ).select_related("routine")

        active_plans = UserNutritionPlan.objects.filter(
            user_id__in=athlete_ids_filter, status="active"
        ).select_related("plan")

        sessions_week = WorkoutSession.objects.filter(
            user_id__in=athlete_ids_filter,
            performed_at__date__gte=week_ago,
            status="completed",
        ).values("user_id").annotate(count=Count("id"))

        sessions_count_map = {str(s["user_id"]): s["count"] for s in sessions_week}

        athlete_list = []
        for a_obj in athletes_page:
            aid_str = str(a_obj.id)
            athlete_info = athlete_map.get(aid_str, {})
            assignment = assignment_map.get(aid_str)
            routine = next((r for r in routine_assignments if str(r.user_id) == aid_str), None)
            plan = next((p for p in active_plans if str(p.user_id) == aid_str), None)

            sessions_7d = sessions_count_map.get(aid_str, 0)
            athlete_list.append({
                "id": aid_str,
                "first_name": athlete_info.get("first_name", ""),
                "last_name": athlete_info.get("last_name", ""),
                "email": athlete_info.get("email", ""),
                "nivel": athlete_info.get("nivel", 0),
                "puntos": athlete_info.get("puntos", 0),
                "date_joined": athlete_info.get("date_joined"),
                "has_active_routine": routine is not None,
                "routine_name": routine.routine.name if routine else None,
                "routine_id": str(routine.routine_id) if routine else None,
                "has_active_plan": plan is not None,
                "plan_name": plan.plan.name if plan else None,
                "sessions_last_7_days": sessions_7d,
                "is_at_risk": sessions_7d == 0,
                "assigned_at": assignment.assigned_at.isoformat() if assignment else None,
            })

        return Response({
            "results": athlete_list,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        })

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        """Dashboard stats para el coach"""
        user = request.user
        if user.role not in {User.Role.COACH, User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN}:
            return Response({"detail": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)

        assignments = self.get_queryset().filter(is_active=True)
        if user.role == User.Role.COACH:
            assignments = assignments.filter(coach=user)

        athlete_ids = list(assignments.values_list("athlete_id", flat=True))

        from workouts.models import UserRoutineAssignment, WorkoutSession
        from nutrition.models import UserNutritionPlan
        from challenges.models import ChallengeParticipation
        from django.db.models import Count
        from datetime import date, timedelta

        today = date.today()
        week_ago = today - timedelta(days=7)

        total_athletes = len(athlete_ids)
        with_routine = UserRoutineAssignment.objects.filter(
            user_id__in=athlete_ids, status="active"
        ).count()
        with_plan = UserNutritionPlan.objects.filter(
            user_id__in=athlete_ids, status="active"
        ).count()
        sessions_today = WorkoutSession.objects.filter(
            user_id__in=athlete_ids, performed_at__date=today, status="completed"
        ).count()
        sessions_week = WorkoutSession.objects.filter(
            user_id__in=athlete_ids, performed_at__date__gte=week_ago, status="completed"
        ).count()
        active_challenges = ChallengeParticipation.objects.filter(
            user_id__in=athlete_ids, status="active"
        ).values("challenge").distinct().count()

        # At-risk: athletes with 0 sessions in the last 7 days
        athletes_with_sessions = set(
            WorkoutSession.objects.filter(
                user_id__in=athlete_ids, performed_at__date__gte=week_ago, status="completed"
            ).values_list("user_id", flat=True).distinct()
        )
        at_risk_ids = [i for i in athlete_ids if i not in athletes_with_sessions]
        at_risk_count = len(at_risk_ids)

        at_risk_athletes = []
        for u in User.objects.filter(id__in=at_risk_ids[:5]).values("id", "first_name", "last_name", "email", "nivel", "puntos"):
            last_session = WorkoutSession.objects.filter(
                user_id=u["id"], status="completed"
            ).order_by("-performed_at").first()
            at_risk_athletes.append({
                "id": str(u["id"]),
                "first_name": u["first_name"],
                "last_name": u["last_name"],
                "email": u["email"],
                "nivel": u["nivel"],
                "puntos": u["puntos"],
                "last_session": last_session.performed_at.isoformat() if last_session else None,
            })

        top_athletes = list(
            User.objects.filter(id__in=athlete_ids).order_by("-puntos").values(
                "id", "first_name", "last_name", "puntos", "nivel"
            )[:5]
        )
        for a in top_athletes:
            a["id"] = str(a["id"])

        return Response({
            "total_athletes": total_athletes,
            "with_active_routine": with_routine,
            "with_active_plan": with_plan,
            "sessions_today": sessions_today,
            "sessions_week": sessions_week,
            "active_challenges": active_challenges,
            "at_risk_count": at_risk_count,
            "at_risk_athletes": at_risk_athletes,
            "top_athletes": top_athletes,
        })

    @action(detail=False, methods=["get"])
    def export_athletes(self, request):
        """Exporta atletas asignados como CSV"""
        user = request.user
        if user.role not in {User.Role.COACH, User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN}:
            return Response({"detail": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)

        assignments = self.get_queryset().filter(is_active=True)
        if user.role == User.Role.COACH:
            assignments = assignments.filter(coach=user)

        athlete_ids = list(assignments.values_list("athlete_id", flat=True))
        athletes = User.objects.filter(id__in=athlete_ids).order_by("first_name", "last_name")

        from workouts.models import UserRoutineAssignment, WorkoutSession, UserRoutineAssignment as Routines
        from nutrition.models import UserNutritionPlan, UserMealLog

        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="atletas_{date.today().isoformat()}.csv"'
        response.write("\ufeff")

        writer = csv.writer(response)
        writer.writerow(["Nombre", "Email", "Nivel", "Puntos", "Rutina Activa", "Plan Nutricional", "Sesiones (7d)", "Activo"])

        for a in athletes:
            routine = UserRoutineAssignment.objects.filter(user=a, status="active").first()
            plan = UserNutritionPlan.objects.filter(user=a, status="active").first()
            sessions = WorkoutSession.objects.filter(
                user=a, performed_at__date__gte=date.today() - timedelta(days=7), status="completed"
            ).count()
            writer.writerow([
                f"{a.first_name} {a.last_name}", a.email, a.nivel, a.puntos,
                routine.routine.name if routine else "",
                plan.plan.name if plan else "",
                sessions,
                "Sí" if a.is_active else "No",
            ])

        return response

    @action(detail=False, methods=["post"])
    def self_assign(self, request):
        """El atleta se autoasigna a un coach."""
        user = request.user
        if user.role != User.Role.ATHLETE:
            return Response({"detail": "Solo los atletas pueden autoasignarse."}, status=status.HTTP_403_FORBIDDEN)

        coach_id = request.data.get("coach_id")
        if not coach_id:
            return Response({"detail": "coach_id es requerido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            coach = User.objects.get(id=coach_id, role=User.Role.COACH, gym_id=user.gym_id, is_active=True)
        except User.DoesNotExist:
            return Response({"detail": "Coach no encontrado en tu gimnasio."}, status=status.HTTP_404_NOT_FOUND)

        current_clients = CoachAssignment.objects.filter(coach=coach, is_active=True).count()
        if current_clients >= coach.max_clients:
            return Response(
                {"detail": f"{coach.first_name} ha alcanzado su límite de {coach.max_clients} clientes."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Desactivar asignación anterior del atleta
        CoachAssignment.objects.filter(athlete=user, is_active=True).update(is_active=False)

        # Crear o reactivar asignación
        assignment, _ = CoachAssignment.objects.get_or_create(
            coach=coach, athlete=user,
            defaults={"gym_id": user.gym_id, "is_active": True},
        )
        if not assignment.is_active:
            assignment.is_active = True
            assignment.gym_id = user.gym_id
            assignment.save(update_fields=["is_active", "gym_id"])

        pic_url = None
        if coach.profile_picture:
            pic_url = request.build_absolute_uri(coach.profile_picture.url)
        elif coach.google_picture:
            pic_url = coach.google_picture

        return Response({
            "detail": f"Ahora {coach.first_name} {coach.last_name} es tu coach.",
            "coach": {
                "id": str(coach.id),
                "first_name": coach.first_name,
                "last_name": coach.last_name,
                "profile_picture": pic_url,
                "specialty": coach.specialty,
            },
        }, status=status.HTTP_200_OK)


class NutritionistAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = NutritionistAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = NutritionistAssignment.objects.select_related("nutritionist", "athlete", "gym").filter(gym__deleted_at__isnull=True)

        if user.role == User.Role.SUPER_ADMIN:
            return qs

        if user.gym_id:
            qs = qs.filter(gym_id=user.gym_id)

            if user.role == User.Role.NUTRITIONIST:
                qs = qs.filter(nutritionist=user)

            if user.role == User.Role.ATHLETE:
                qs = qs.filter(athlete=user)

            return qs

        return qs.none()

    def create(self, request, *args, **kwargs):
        """Upsert: reactivar si ya existe, crear si no. Valida Premium antes."""
        from rest_framework.exceptions import ValidationError
        from core.permissions import get_athlete_tier

        user = request.user
        if user.role not in [User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN]:
            raise PermissionDenied("No tienes permisos para asignar nutricionistas.")

        nutritionist_id = request.data.get("nutritionist")
        athlete_id = request.data.get("athlete")

        try:
            nutritionist = User.objects.get(id=nutritionist_id)
            athlete = User.objects.get(id=athlete_id)
        except User.DoesNotExist:
            raise ValidationError({"detail": "Nutricionista o atleta no encontrado."})

        if nutritionist.gym_id != user.gym_id or athlete.gym_id != user.gym_id:
            raise PermissionDenied("Nutricionista y atleta deben pertenecer al mismo gimnasio.")

        # Validar Plan Premium
        tier = get_athlete_tier(athlete)
        if tier != "premium":
            raise ValidationError(
                {"detail": "El atleta debe tener un Plan Premium activo para ser atendido por un nutricionista."}
            )

        # Upsert: reactivar si existe, crear si no
        assignment, created = NutritionistAssignment.objects.get_or_create(
            nutritionist=nutritionist,
            athlete=athlete,
            defaults={"gym_id": user.gym_id, "is_active": True},
        )
        if not created and not assignment.is_active:
            assignment.is_active = True
            assignment.gym_id = user.gym_id
            assignment.save(update_fields=["is_active", "gym_id", "updated_at"])

        from .serializers import NutritionistAssignmentSerializer
        return Response(
            NutritionistAssignmentSerializer(assignment).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def perform_create(self, serializer):
        # No se usa — sobreescrito por create()
        pass

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role in [User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN] and instance.gym_id == user.gym_id:
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta asignación.")

    @action(detail=False, methods=["get"])
    def my_athletes(self, request):
        """Devuelve los atletas asignados al nutritionista con su progreso nutricional, paginado"""
        user = request.user
        if user.role not in {User.Role.NUTRITIONIST, User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN}:
            return Response({"detail": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)

        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        search_q = request.query_params.get("search", "").strip().lower()

        assignments = self.get_queryset().filter(is_active=True)
        if user.role == User.Role.NUTRITIONIST:
            assignments = assignments.filter(nutritionist=user)

        athlete_ids = list(assignments.values_list("athlete_id", flat=True))
        athletes_qs = User.objects.filter(id__in=athlete_ids)

        if search_q:
            athletes_qs = athletes_qs.filter(
                Q(first_name__icontains=search_q) |
                Q(last_name__icontains=search_q) |
                Q(email__icontains=search_q)
            )

        total = athletes_qs.count()
        athletes_qs = athletes_qs.order_by("first_name", "last_name")
        offset = (page - 1) * page_size
        athletes_page = athletes_qs[offset:offset + page_size]

        athlete_ids_filter = [a.id for a in athletes_page]
        athletes_values = athletes_qs.filter(id__in=athlete_ids_filter).values(
            "id", "first_name", "last_name", "email", "nivel", "puntos", "is_active", "date_joined"
        )
        athlete_map = {str(a["id"]): a for a in athletes_values}

        from nutrition.models import UserNutritionPlan, UserMealLog
        from django.db.models import Count
        from datetime import date, timedelta

        today = date.today()
        active_plans = UserNutritionPlan.objects.filter(
            user_id__in=athlete_ids_filter, status="active"
        ).select_related("plan")

        today_meal_logs = UserMealLog.objects.filter(
            user_id__in=athlete_ids_filter, date=today.isoformat(), completed=True
        ).values("user_id").annotate(count=Count("id"))
        meal_counts = {str(m["user_id"]): m["count"] for m in today_meal_logs}

        athlete_list = []
        for a_obj in athletes_page:
            aid_str = str(a_obj.id)
            athlete_info = athlete_map.get(aid_str, {})
            plan = next((p for p in active_plans if str(p.user_id) == aid_str), None)

            athlete_list.append({
                "id": aid_str,
                "first_name": athlete_info.get("first_name", ""),
                "last_name": athlete_info.get("last_name", ""),
                "email": athlete_info.get("email", ""),
                "nivel": athlete_info.get("nivel", 0),
                "puntos": athlete_info.get("puntos", 0),
                "date_joined": athlete_info.get("date_joined"),
                "has_active_plan": plan is not None,
                "plan_name": plan.plan.name if plan else None,
                "plan_id": str(plan.plan_id) if plan else None,
                "meals_completed_today": meal_counts.get(aid_str, 0),
                "compliance_percentage": round(plan.compliance_percentage or 0, 1) if plan else 0,
            })

        return Response({
            "results": athlete_list,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        })

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        """Dashboard stats para el nutricionista"""
        user = request.user
        if user.role not in {User.Role.NUTRITIONIST, User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN}:
            return Response({"detail": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)

        assignments = self.get_queryset().filter(is_active=True)
        if user.role == User.Role.NUTRITIONIST:
            assignments = assignments.filter(nutritionist=user)

        athlete_ids = list(assignments.values_list("athlete_id", flat=True))
        total_athletes = len(athlete_ids)

        from nutrition.models import UserNutritionPlan, UserMealLog
        from django.db.models import Count, Avg
        from datetime import date, timedelta

        today = date.today()
        week_ago = today - timedelta(days=7)

        with_plan = UserNutritionPlan.objects.filter(
            user_id__in=athlete_ids, status="active"
        ).count()

        completed_plans = UserNutritionPlan.objects.filter(
            user_id__in=athlete_ids, status="completed"
        ).count()

        avg_compliance = UserNutritionPlan.objects.filter(
            user_id__in=athlete_ids
        ).exclude(compliance_percentage__isnull=True).aggregate(
            avg=Avg("compliance_percentage")
        )["avg"] or 0

        meals_week = UserMealLog.objects.filter(
            user_id__in=athlete_ids, date__gte=week_ago.isoformat(), completed=True
        ).count()

        athletes_with_plan = UserNutritionPlan.objects.filter(
            user_id__in=athlete_ids, status="active"
        ).values_list("user_id", flat=True).distinct()
        low_compliance = UserNutritionPlan.objects.filter(
            user_id__in=athlete_ids, status="active", compliance_percentage__lt=50
        ).count()

        return Response({
            "total_athletes": total_athletes,
            "with_active_plan": with_plan,
            "completed_plans": completed_plans,
            "avg_compliance_percentage": round(avg_compliance, 1),
            "meals_logged_week": meals_week,
            "low_compliance_athletes": low_compliance,
        })

    @action(detail=False, methods=["get"])
    def export_athletes(self, request):
        """Exporta atletas asignados como CSV"""
        user = request.user
        if user.role not in {User.Role.NUTRITIONIST, User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN}:
            return Response({"detail": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)

        assignments = self.get_queryset().filter(is_active=True)
        if user.role == User.Role.NUTRITIONIST:
            assignments = assignments.filter(nutritionist=user)

        athlete_ids = list(assignments.values_list("athlete_id", flat=True))
        athletes = User.objects.filter(id__in=athlete_ids).order_by("first_name", "last_name")

        from nutrition.models import UserNutritionPlan, UserMealLog
        from datetime import date

        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="atletas_nutricion_{date.today().isoformat()}.csv"'
        response.write("\ufeff")

        writer = csv.writer(response)
        writer.writerow(["Nombre", "Email", "Nivel", "Puntos", "Plan Activo", "Cumplimiento %", "Comidas Hoy", "Completadas / Total"])

        for a in athletes:
            plan = UserNutritionPlan.objects.filter(user=a, status="active").first()
            compliance = plan.compliance_percentage if plan else 0
            today_meals = UserMealLog.objects.filter(user=a, date=date.today().isoformat(), completed=True).count()
            writer.writerow([
                f"{a.first_name} {a.last_name}", a.email, a.nivel, a.puntos,
                plan.plan.name if plan else "",
                compliance,
                today_meals,
            ])

        return response

    @action(detail=False, methods=["get"])
    def compliance_chart(self, request):
        """Devuelve datos de cumplimiento diario para los últimos N días"""
        user = request.user
        if user.role not in {User.Role.NUTRITIONIST, User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN}:
            return Response({"detail": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)

        days = int(request.query_params.get("days", 7))
        assignments = self.get_queryset().filter(is_active=True)
        if user.role == User.Role.NUTRITIONIST:
            assignments = assignments.filter(nutritionist=user)

        athlete_ids = list(assignments.values_list("athlete_id", flat=True))

        from nutrition.models import UserMealLog, MealTemplate
        from django.db.models import Count

        today = date.today()
        start_date = today - timedelta(days=days - 1)

        daily_data = []
        for i in range(days):
            day = start_date + timedelta(days=i)
            day_str = day.isoformat()

            total_expected = MealTemplate.objects.filter(
                plan__assignments__user_id__in=athlete_ids,
                plan__assignments__status="active",
            ).count()

            completed = UserMealLog.objects.filter(
                user_id__in=athlete_ids,
                date=day_str,
                completed=True,
            ).count()

            pct = round((completed / total_expected * 100), 1) if total_expected > 0 else 0
            daily_data.append({"date": day_str, "compliance": pct, "completed": completed, "total": total_expected})

        return Response({"daily": daily_data, "days": days})

    @action(detail=False, methods=["post"])
    def self_assign(self, request):
        """El atleta se autoasigna a un nutricionista."""
        user = request.user
        if user.role != User.Role.ATHLETE:
            return Response({"detail": "Solo los atletas pueden autoasignarse."}, status=status.HTTP_403_FORBIDDEN)

        nutritionist_id = request.data.get("nutritionist_id")
        if not nutritionist_id:
            return Response({"detail": "nutritionist_id es requerido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            nutritionist = User.objects.get(
                id=nutritionist_id, role=User.Role.NUTRITIONIST, gym_id=user.gym_id, is_active=True
            )
        except User.DoesNotExist:
            return Response({"detail": "Nutricionista no encontrado en tu gimnasio."}, status=status.HTTP_404_NOT_FOUND)

        current_clients = NutritionistAssignment.objects.filter(nutritionist=nutritionist, is_active=True).count()
        if current_clients >= nutritionist.max_clients:
            return Response(
                {"detail": f"{nutritionist.first_name} ha alcanzado su límite de {nutritionist.max_clients} clientes."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Desactivar asignación anterior del atleta
        NutritionistAssignment.objects.filter(athlete=user, is_active=True).update(is_active=False)

        # Crear o reactivar asignación
        assignment, _ = NutritionistAssignment.objects.get_or_create(
            nutritionist=nutritionist, athlete=user,
            defaults={"gym_id": user.gym_id, "is_active": True},
        )
        if not assignment.is_active:
            assignment.is_active = True
            assignment.gym_id = user.gym_id
            assignment.save(update_fields=["is_active", "gym_id"])

        pic_url = None
        if nutritionist.profile_picture:
            pic_url = request.build_absolute_uri(nutritionist.profile_picture.url)
        elif nutritionist.google_picture:
            pic_url = nutritionist.google_picture

        return Response({
            "detail": f"Ahora {nutritionist.first_name} {nutritionist.last_name} es tu nutricionista.",
            "nutritionist": {
                "id": str(nutritionist.id),
                "first_name": nutritionist.first_name,
                "last_name": nutritionist.last_name,
                "profile_picture": pic_url,
                "specialty": nutritionist.specialty,
            },
        }, status=status.HTTP_200_OK)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Notification.objects.select_related("recipient", "actor", "gym")
        return qs.filter(recipient=user)

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=["post"])
    def mark_read(self, request):
        """Marca notificaciones como leídas"""
        ids = request.data.get("ids", [])
        if ids:
            Notification.objects.filter(id__in=ids, recipient=request.user).update(is_read=True)
        else:
            Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "Notificaciones marcadas como leídas."})

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread_count": count})


class GymSubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = GymSubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = GymSubscription.objects.select_related("athlete", "gym", "plan").filter(
            gym__deleted_at__isnull=True
        )

        if user.role == User.Role.SUPER_ADMIN:
            return qs

        if user.gym_id:
            qs = qs.filter(gym_id=user.gym_id)

            if user.role == User.Role.ATHLETE:
                qs = qs.filter(athlete=user)

            return qs

        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN]:
            raise PermissionDenied("No tienes permisos para crear suscripciones.")

        if user.role == User.Role.GYM_ADMIN and user.gym_id:
            subscription = serializer.save(gym=user.gym)
        else:
            subscription = serializer.save()

        plan = subscription.plan
        if plan and not subscription.end_date:
            subscription.end_date = subscription.start_date + timedelta(days=plan.duration_days)
            subscription.save(update_fields=["end_date"])

        if plan:
            try:
                GymPayment.objects.create(
                    gym=subscription.gym,
                    athlete=subscription.athlete,
                    subscription=subscription,
                    amount=plan.price,
                    status="success",
                    payment_method="cash",
                    paid_at=timezone.now(),
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to create GymPayment for subscription {subscription.id}: {e}")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role == User.Role.GYM_ADMIN and instance.gym_id == user.gym_id:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar esta suscripción.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role in [User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN] and instance.gym_id == user.gym_id:
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta suscripción.")


class GymPaymentViewSet(viewsets.ModelViewSet):
    serializer_class = GymPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = GymPayment.objects.select_related("athlete", "gym", "plan", "subscription").filter(
            gym__deleted_at__isnull=True
        )

        if user.role == User.Role.SUPER_ADMIN:
            return qs

        if user.gym_id:
            qs = qs.filter(gym_id=user.gym_id)
            return qs

        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN]:
            raise PermissionDenied("No tienes permisos para registrar pagos.")
        if user.role == User.Role.GYM_ADMIN and user.gym_id:
            serializer.save(gym=user.gym)
            return
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role == User.Role.GYM_ADMIN and instance.gym_id == user.gym_id:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar este pago.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role in [User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN] and instance.gym_id == user.gym_id:
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar este pago.")

    @action(detail=False, methods=["get"])
    def metrics(self, request):
        user = self.request.user
        if not user.gym_id:
            return Response({"detail": "No gym assigned"}, status=400)

        qs = self.get_queryset()
        today = date.today()

        total_collected = qs.filter(status=GymPayment.PaymentStatus.SUCCESS).aggregate(
            total=Sum("amount")
        )["total"] or 0

        pending_count = qs.filter(status=GymPayment.PaymentStatus.PENDING).count()
        failed_count = qs.filter(status=GymPayment.PaymentStatus.FAILED).count()

        this_month = qs.filter(
            status=GymPayment.PaymentStatus.SUCCESS,
            paid_at__date__year=today.year,
            paid_at__date__month=today.month,
        ).aggregate(total=Sum("amount"))["total"] or 0

        return Response({
            "total_collected": float(total_collected),
            "this_month": float(this_month),
            "pending_count": pending_count,
            "failed_count": failed_count,
        })

    @action(detail=False, methods=["get"])
    def revenue_history(self, request):
        user = self.request.user
        if not user.gym_id:
            return Response({"detail": "No gym assigned"}, status=400)

        qs = self.get_queryset().filter(status=GymPayment.PaymentStatus.SUCCESS)
        today = date.today()

        from django.db.models.functions import TruncMonth
        monthly = (
            qs.filter(paid_at__date__gte=today - timedelta(days=180))
            .annotate(month=TruncMonth("paid_at"))
            .values("month")
            .annotate(total=Sum("amount"))
            .order_by("month")
        )

        return Response([
            {
                "month": m["month"].strftime("%Y-%m"),
                "total": float(m["total"]),
            }
            for m in monthly
        ])


class NutritionistAppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = NutritionistAppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.gym_id:
            return NutritionistAppointment.objects.none()
        if user.role == "nutritionist":
            return NutritionistAppointment.objects.filter(
                nutritionist=user, gym_id=user.gym_id
            ).select_related("athlete", "nutritionist")
        if user.role in {"gym_admin", "super_admin"}:
            return NutritionistAppointment.objects.filter(
                gym_id=user.gym_id
            ).select_related("athlete", "nutritionist")
        if user.role == "athlete":
            return NutritionistAppointment.objects.filter(
                athlete=user, gym_id=user.gym_id
            ).select_related("athlete", "nutritionist")
        return NutritionistAppointment.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != "nutritionist":
            raise PermissionDenied("Solo nutricionistas pueden crear citas.")
        try:
            gym = Gym.objects.get(id=user.gym_id)
        except Gym.DoesNotExist:
            raise PermissionDenied("Gimnasio no encontrado.")
        serializer.save(nutritionist=user, gym=gym)

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        now = timezone.now()
        qs = self.get_queryset().filter(
            scheduled_at__gte=now,
            status=NutritionistAppointment.Status.SCHEDULED,
        ).order_by("scheduled_at")[:10]
        return Response(NutritionistAppointmentSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def next(self, request):
        now = timezone.now()
        appt = self.get_queryset().filter(
            scheduled_at__gte=now,
            status=NutritionistAppointment.Status.SCHEDULED,
        ).order_by("scheduled_at").first()
        if not appt:
            return Response(None)
        return Response(NutritionistAppointmentSerializer(appt).data)

    @action(detail=False, methods=["get"])
    def dashboard_stats(self, request):
        user = request.user
        if user.role != "nutritionist" or not user.gym_id:
            return Response({})
        now = timezone.now()
        today = now.date()
        month_ago = today - timedelta(days=30)
        prev_month_start = month_ago - timedelta(days=30)

        qs = NutritionistAppointment.objects.filter(nutritionist=user, gym_id=user.gym_id)

        new_clients_this_month = NutritionistAssignment.objects.filter(
            nutritionist=user, gym_id=user.gym_id,
            assigned_at__date__gte=month_ago,
        ).count()
        new_clients_prev = NutritionistAssignment.objects.filter(
            nutritionist=user, gym_id=user.gym_id,
            assigned_at__date__gte=prev_month_start,
            assigned_at__date__lt=month_ago,
        ).count()

        first_consultations = qs.filter(
            appointment_type=NutritionistAppointment.AppointmentType.FIRST,
            scheduled_at__date__gte=month_ago,
            status=NutritionistAppointment.Status.COMPLETED,
        ).count()

        followup_consultations = qs.filter(
            appointment_type=NutritionistAppointment.AppointmentType.FOLLOWUP,
            scheduled_at__date__gte=month_ago,
            status=NutritionistAppointment.Status.COMPLETED,
        ).count()

        messages_sent = NutritionistMessage.objects.filter(
            nutritionist=user, gym_id=user.gym_id,
            sender_is_nutritionist=True,
            created_at__date__gte=month_ago,
        ).count()

        cancelled = qs.filter(
            status=NutritionistAppointment.Status.CANCELLED,
            scheduled_at__date__gte=month_ago,
        ).order_by("-scheduled_at")[:5]

        return Response({
            "new_clients": new_clients_this_month,
            "new_clients_delta": new_clients_this_month - new_clients_prev,
            "first_consultations": first_consultations,
            "followup_consultations": followup_consultations,
            "messages_sent": messages_sent,
            "cancelled_appointments": NutritionistAppointmentSerializer(cancelled, many=True).data,
        })


class NutritionistMessageViewSet(viewsets.ModelViewSet):
    serializer_class = NutritionistMessageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        user = self.request.user
        if not user.gym_id:
            return NutritionistMessage.objects.none()
        if user.role == "nutritionist":
            return NutritionistMessage.objects.filter(
                nutritionist=user, gym_id=user.gym_id
            ).select_related("athlete", "nutritionist")
        if user.role == "athlete":
            return NutritionistMessage.objects.filter(
                athlete=user, gym_id=user.gym_id
            ).select_related("athlete", "nutritionist")
        return NutritionistMessage.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user.gym_id:
            raise PermissionDenied("Sin gimnasio asignado.")
        try:
            gym = Gym.objects.get(id=user.gym_id)
        except Gym.DoesNotExist:
            raise PermissionDenied("Gimnasio no encontrado.")
        if user.role == "nutritionist":
            serializer.save(nutritionist=user, gym=gym, sender_is_nutritionist=True)
        elif user.role == "athlete":
            nutri_assign = NutritionistAssignment.objects.filter(
                athlete=user, gym=gym, is_active=True
            ).first()
            if not nutri_assign:
                raise PermissionDenied("No tienes nutricionista asignado.")
            serializer.save(nutritionist=nutri_assign.nutritionist, athlete=user, gym=gym, sender_is_nutritionist=False)
        else:
            raise PermissionDenied("Sin permisos para enviar mensajes.")

    @action(detail=False, methods=["get"])
    def threads(self, request):
        """Lista de conversaciones agrupadas por atleta."""
        user = request.user
        if user.role != "nutritionist":
            return Response({"detail": "Solo para nutricionistas."}, status=403)
        qs = self.get_queryset()
        from django.db.models import Max, Count
        athletes = (
            qs.values("athlete")
            .annotate(last_message=Max("created_at"), total=Count("id"), unread=Count("id", filter=Q(is_read=False, sender_is_nutritionist=False)))
            .order_by("-last_message")
        )
        result = []
        for a in athletes:
            try:
                athlete_obj = User.objects.get(id=a["athlete"])
                last_msg = qs.filter(athlete=athlete_obj).order_by("-created_at").first()
                result.append({
                    "athlete_id": str(athlete_obj.id),
                    "athlete_name": f"{athlete_obj.first_name} {athlete_obj.last_name}".strip(),
                    "athlete_email": athlete_obj.email,
                    "last_message": last_msg.body[:80] if last_msg else "",
                    "last_message_at": last_msg.created_at.isoformat() if last_msg else None,
                    "unread": a["unread"],
                    "total": a["total"],
                })
            except User.DoesNotExist:
                pass
        return Response(result)

    @action(detail=False, methods=["get"])
    def with_athlete(self, request):
        athlete_id = request.query_params.get("athlete_id")
        if not athlete_id:
            return Response({"detail": "athlete_id requerido."}, status=400)
        qs = self.get_queryset().filter(athlete_id=athlete_id).order_by("created_at")
        qs.filter(sender_is_nutritionist=False, is_read=False).update(is_read=True)
        return Response(NutritionistMessageSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def recent(self, request):
        """Últimos mensajes recibidos (sin leer) para el nutritionist."""
        user = request.user
        if user.role != "nutritionist":
            return Response([])
        qs = self.get_queryset().filter(
            sender_is_nutritionist=False, is_read=False
        ).order_by("-created_at")[:5]
        return Response(NutritionistMessageSerializer(qs, many=True).data)


class BodyMeasurementViewSet(viewsets.ModelViewSet):
    serializer_class = BodyMeasurementSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        user = self.request.user
        if not user.gym_id:
            return BodyMeasurement.objects.none()
        qs = BodyMeasurement.objects.filter(gym_id=user.gym_id).select_related("athlete", "nutritionist")
        if user.role == "nutritionist":
            return qs.filter(nutritionist=user)
        if user.role == "athlete":
            return qs.filter(athlete=user)
        if user.role in {"gym_admin", "super_admin", "coach"}:
            return qs
        return BodyMeasurement.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in {"nutritionist", "gym_admin", "super_admin"}:
            raise PermissionDenied("Solo nutricionistas pueden registrar medidas.")
        try:
            gym = Gym.objects.get(id=user.gym_id)
        except Gym.DoesNotExist:
            raise PermissionDenied("Gimnasio no encontrado.")
        serializer.save(nutritionist=user, gym=gym)

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role in {"super_admin", "gym_admin"}:
            serializer.save()
            return
        if instance.nutritionist == user:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar esta medida.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role in {"super_admin", "gym_admin"} or instance.nutritionist == user:
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta medida.")

    @action(detail=False, methods=["get"])
    def athlete_history(self, request):
        """Historial de medidas de un atleta específico"""
        athlete_id = request.query_params.get("athlete_id")
        if not athlete_id:
            return Response({"detail": "athlete_id requerido."}, status=400)
        user = request.user
        if user.role not in {"nutritionist", "gym_admin", "super_admin", "coach"}:
            return Response({"detail": "Sin permisos."}, status=403)
        qs = self.get_queryset().filter(athlete_id=athlete_id).order_by("measured_at")
        return Response(BodyMeasurementSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def my_history(self, request):
        """El atleta ve su propio historial"""
        user = request.user
        if user.role != "athlete":
            return Response({"detail": "Solo para atletas."}, status=403)
        qs = BodyMeasurement.objects.filter(athlete=user, gym_id=user.gym_id).order_by("measured_at")
        return Response(BodyMeasurementSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def latest_per_athlete(self, request):
        """Última medida de cada atleta asignado al nutricionista"""
        user = request.user
        if user.role not in {"nutritionist", "gym_admin", "super_admin"}:
            return Response({"detail": "Sin permisos."}, status=403)

        from django.db.models import Max
        athlete_ids = list(
            NutritionistAssignment.objects.filter(
                nutritionist=user, gym_id=user.gym_id, is_active=True
            ).values_list("athlete_id", flat=True)
        ) if user.role == "nutritionist" else list(
            BodyMeasurement.objects.filter(gym_id=user.gym_id).values_list("athlete_id", flat=True).distinct()
        )

        latest_ids = (
            BodyMeasurement.objects.filter(athlete_id__in=athlete_ids, gym_id=user.gym_id)
            .values("athlete")
            .annotate(latest_id=Max("id"))
            .values_list("latest_id", flat=True)
        )
        qs = BodyMeasurement.objects.filter(id__in=latest_ids).select_related("athlete", "nutritionist")
        return Response(BodyMeasurementSerializer(qs, many=True).data)


def create_notification(recipient, notification_type, title, message="", actor=None, gym=None, link=""):
    """Función helper para crear notificaciones desde cualquier parte del código"""
    Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        title=title,
        message=message,
        gym=gym,
        link=link,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_subscription_tier(request):
    """Devuelve el tier de la suscripción activa del atleta autenticado."""
    from core.permissions import get_athlete_tier
    tier = get_athlete_tier(request.user)
    return Response({"tier": tier})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def athlete_profile(request, athlete_id):
    """Perfil detallado de un atleta con datos de progreso completo"""
    user = request.user
    if user.role not in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.COACH, User.Role.NUTRITIONIST}:
        return Response({"detail": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)

    try:
        athlete = User.objects.get(id=athlete_id, role=User.Role.ATHLETE)
    except User.DoesNotExist:
        return Response({"detail": "Atleta no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    if user.role != User.Role.SUPER_ADMIN and user.gym_id != athlete.gym_id:
        return Response({"detail": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)

    from workouts.models import UserRoutineAssignment, WorkoutSession
    from nutrition.models import UserNutritionPlan, UserMealLog
    from challenges.models import ChallengeParticipation, UserBadge
    from gamification.models import UserPoints
    from datetime import date, timedelta
    from django.db.models import Sum, Count

    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    active_routine = UserRoutineAssignment.objects.filter(
        user=athlete, status="active"
    ).select_related("routine", "assigned_by").first()

    sessions_week = WorkoutSession.objects.filter(
        user=athlete, performed_at__date__gte=week_ago, status="completed"
    ).count()
    sessions_month = WorkoutSession.objects.filter(
        user=athlete, performed_at__date__gte=month_ago, status="completed"
    ).count()
    sessions_total = WorkoutSession.objects.filter(
        user=athlete, status="completed"
    ).count()

    active_plan = UserNutritionPlan.objects.filter(
        user=athlete, status="active"
    ).select_related("plan", "assigned_by").first()

    completed_plans = UserNutritionPlan.objects.filter(
        user=athlete, status="completed"
    ).count()

    week_meals = UserMealLog.objects.filter(
        user=athlete, date__gte=week_ago.isoformat(), completed=True
    ).count()
    today_meals = UserMealLog.objects.filter(
        user=athlete, date=today.isoformat(), completed=True
    ).select_related("meal_template").count()

    total_meal_templates = 0
    if active_plan:
        total_meal_templates = active_plan.plan.meal_templates.count()

    compliance_pct = 0
    if active_plan and total_meal_templates > 0:
        completed_logs = UserMealLog.objects.filter(
            user=athlete, meal_template__plan=active_plan.plan, completed=True
        ).values("meal_template").distinct().count()
        compliance_pct = round((completed_logs / total_meal_templates) * 100, 1)

    active_challenges = ChallengeParticipation.objects.filter(
        user=athlete, status="active"
    ).select_related("challenge").count()

    badges_earned = UserBadge.objects.filter(user=athlete).count()

    total_points_earned = UserPoints.objects.filter(user=athlete).aggregate(
        total=Sum("points")
    )["total"] or 0

    points_history = list(UserPoints.objects.filter(user=athlete).order_by("-created_at")[:20].values(
        "points", "source", "description", "created_at"
    ))

    checkins_month = athlete.checkins.filter(timestamp__date__gte=month_ago).count()
    checkins_total = athlete.checkins.count()

    from gyms.models import CoachAssignment, NutritionistAssignment, BodyMeasurement, NutritionistAppointment
    coach_assign = CoachAssignment.objects.filter(athlete=athlete, is_active=True).select_related("coach").first()
    nutri_assign = NutritionistAssignment.objects.filter(athlete=athlete, is_active=True).select_related("nutritionist").first()

    # Medidas antropométricas — últimas 10
    measurements = list(
        BodyMeasurement.objects.filter(athlete=athlete)
        .order_by("-measured_at")[:10]
        .values(
            "id", "measured_at", "weight_kg", "height_cm", "body_fat_pct",
            "muscle_mass_kg", "waist_cm", "hip_cm", "arm_cm", "visceral_fat",
            "bmi", "notes", "recorded_by",
        )
    )

    # Citas — próximas y recientes
    appointments = list(
        NutritionistAppointment.objects.filter(athlete=athlete)
        .order_by("-scheduled_at")[:10]
        .values(
            "id", "scheduled_at", "duration_minutes", "appointment_type",
            "appointment_type_display", "status", "status_display", "notes",
        )
    )

    # Tier de membresía del atleta
    from core.permissions import get_athlete_tier
    membership_tier = get_athlete_tier(athlete)

    return Response({
        "athlete": {
            "id": str(athlete.id),
            "first_name": athlete.first_name,
            "last_name": athlete.last_name,
            "email": athlete.email,
            "nivel": athlete.nivel,
            "puntos": athlete.puntos,
            "phone": athlete.phone,
            "dni": athlete.dni,
            "date_joined": athlete.date_joined.isoformat() if athlete.date_joined else None,
            "is_active": athlete.is_active,
        },
        "coach": {
            "id": str(coach_assign.coach.id),
            "name": f"{coach_assign.coach.first_name} {coach_assign.coach.last_name}",
            "profile_picture": request.build_absolute_uri(coach_assign.coach.profile_picture.url) if coach_assign.coach.profile_picture else None,
            "bio": coach_assign.coach.bio,
            "specialty": coach_assign.coach.specialty,
            "years_experience": coach_assign.coach.years_experience,
        } if coach_assign else None,
        "nutritionist": {
            "id": str(nutri_assign.nutritionist.id),
            "name": f"{nutri_assign.nutritionist.first_name} {nutri_assign.nutritionist.last_name}",
            "profile_picture": request.build_absolute_uri(nutri_assign.nutritionist.profile_picture.url) if nutri_assign.nutritionist.profile_picture else None,
            "bio": nutri_assign.nutritionist.bio,
            "specialty": nutri_assign.nutritionist.specialty,
            "years_experience": nutri_assign.nutritionist.years_experience,
        } if nutri_assign else None,
        "routine": {
            "id": str(active_routine.routine.id) if active_routine else None,
            "name": active_routine.routine.name if active_routine else None,
            "assigned_by": f"{active_routine.assigned_by.first_name} {active_routine.assigned_by.last_name}" if active_routine and active_routine.assigned_by else None,
            "start_date": active_routine.start_date.isoformat() if active_routine else None,
        } if active_routine else None,
        "nutrition_plan": {
            "id": str(active_plan.id) if active_plan else None,
            "name": active_plan.plan.name if active_plan else None,
            "assigned_by": f"{active_plan.assigned_by.first_name} {active_plan.assigned_by.last_name}" if active_plan and active_plan.assigned_by else None,
            "start_date": active_plan.start_date.isoformat() if active_plan else None,
            "compliance_percentage": compliance_pct,
        } if active_plan else None,
        "stats": {
            "sessions_week": sessions_week,
            "sessions_month": sessions_month,
            "sessions_total": sessions_total,
            "meals_week": week_meals,
            "meals_today": today_meals,
            "completed_plans": completed_plans,
            "active_challenges": active_challenges,
            "badges_earned": badges_earned,
            "total_points_earned": total_points_earned + athlete.puntos,
            "checkins_month": checkins_month,
            "checkins_total": checkins_total,
        },
        "points_history": points_history,
        "measurements": measurements,
        "appointments": appointments,
        "membership_tier": membership_tier,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def staff_directory(request):
    """
    Directorio de coaches y nutricionistas del gimnasio con su perfil y disponibilidad.
    Parámetro ?role=coach | nutritionist
    """
    user = request.user
    if not user.gym_id:
        return Response({"detail": "Sin gimnasio asignado."}, status=400)

    role_filter = request.query_params.get("role", "")
    allowed_roles = {User.Role.COACH, User.Role.NUTRITIONIST}
    if role_filter and role_filter not in allowed_roles:
        return Response({"detail": "Rol no válido. Usa 'coach' o 'nutritionist'."}, status=400)

    qs = User.objects.filter(
        gym_id=user.gym_id,
        is_active=True,
        role__in=[role_filter] if role_filter else list(allowed_roles),
    )

    result = []
    for staff in qs:
        if staff.role == User.Role.COACH:
            current_clients = CoachAssignment.objects.filter(coach=staff, is_active=True).count()
        else:
            current_clients = NutritionistAssignment.objects.filter(nutritionist=staff, is_active=True).count()

        pic_url = None
        if staff.profile_picture:
            pic_url = request.build_absolute_uri(staff.profile_picture.url)
        elif staff.google_picture:
            pic_url = staff.google_picture

        result.append({
            "id": str(staff.id),
            "first_name": staff.first_name,
            "last_name": staff.last_name,
            "role": staff.role,
            "profile_picture": pic_url,
            "bio": staff.bio,
            "specialty": staff.specialty,
            "years_experience": staff.years_experience,
            "current_clients": current_clients,
            "max_clients": staff.max_clients,
            "is_available": current_clients < staff.max_clients,
        })

    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gym_dashboard_stats(request):
    user = request.user
    gym_id = user.gym_id

    if not gym_id:
        return Response({"detail": "No gym assigned"}, status=400)

    try:
        gym = Gym.objects.get(id=gym_id, deleted_at__isnull=True)
    except Gym.DoesNotExist:
        return Response({"detail": "Gimnasio no disponible."}, status=400)

    cache_key = f"dashboard_stats_{gym_id}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data)

    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    athletes = User.objects.filter(gym_id=gym_id, role=User.Role.ATHLETE)
    total_athletes = athletes.count()
    active_athletes = athletes.filter(is_active=True).count()

    checkins_today = CheckIn.objects.filter(gym_id=gym_id, timestamp__date=today).count()
    checkins_week = CheckIn.objects.filter(gym_id=gym_id, timestamp__date__gte=week_ago).count()
    checkins_month = CheckIn.objects.filter(gym_id=gym_id, timestamp__date__gte=month_ago).count()

    athletes_joined_month = athletes.filter(date_joined__gte=month_ago).count()
    athletes_joined_prev = athletes.filter(
        date_joined__gte=month_ago - timedelta(days=30),
        date_joined__lt=month_ago,
    ).count()

    growth_rate = 0
    if athletes_joined_prev > 0:
        growth_rate = round(
            ((athletes_joined_month - athletes_joined_prev) / athletes_joined_prev) * 100
        )

    today_sessions_count = 0
    try:
        from workouts.models import WorkoutSession
        today_sessions_count = WorkoutSession.objects.filter(
            gym_id=gym_id,
            performed_at__date=today,
            status=WorkoutSession.Status.COMPLETED,
        ).count()
    except Exception:
        pass

    from .models import GymSubscription
    expiring_subscriptions = GymSubscription.objects.filter(
        gym_id=gym_id,
        status="active",
        end_date__gte=today,
    ).select_related("athlete", "plan")[:5]

    expiring_list = []
    for s in expiring_subscriptions:
        expiring_list.append({
            "id": str(s.athlete.id),
            "name": f"{s.athlete.first_name} {s.athlete.last_name}",
            "plan": s.plan.name if s.plan else "Sin plan",
            "end_date": s.end_date.isoformat() if s.end_date else None,
            "days_remaining": (s.end_date - today).days if s.end_date else None,
        })

    coaches_count = User.objects.filter(gym_id=gym_id, role=User.Role.COACH, is_active=True).count()
    nutritionists_count = User.objects.filter(gym_id=gym_id, role=User.Role.NUTRITIONIST, is_active=True).count()

    data = {
        "total_athletes": total_athletes,
        "active_athletes": active_athletes,
        "inactive_athletes": total_athletes - active_athletes,
        "checkins_today": checkins_today,
        "checkins_week": checkins_week,
        "checkins_month": checkins_month,
        "athletes_joined_month": athletes_joined_month,
        "growth_rate": growth_rate,
        "sessions_today": today_sessions_count,
        "active_coaches": coaches_count,
        "active_nutritionists": nutritionists_count,
        "expiring_memberships": expiring_list,
        "date": today.isoformat(),
    }

    cache.set(cache_key, data, CACHE_TTL)
    return Response(data)
