import logging
from datetime import date

from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
from django.core.exceptions import PermissionDenied
from django.db.models import Prefetch, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.filters import global_or_user_gym_filter
from .models import Food, MealFoodItem, MealTemplate, NutritionItem, NutritionMeal, NutritionPlan, UserMealLog, UserNutritionPlan
from .serializers import (
    FoodSerializer,
    MealFoodItemSerializer,
    MealTemplateSerializer,
    NutritionItemSerializer,
    NutritionMealSerializer,
    NutritionPlanDetailSerializer,
    NutritionPlanSerializer,
    UserMealLogSerializer,
    UserNutritionPlanSerializer,
)

User = get_user_model()


class NutritionPlanViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return NutritionPlanDetailSerializer
        return NutritionPlanSerializer

    def get_queryset(self):
        user = self.request.user
        user_assignments = Prefetch(
            "assignments",
            queryset=UserNutritionPlan.objects.filter(user=user).order_by("-created_at"),
            to_attr="_user_assignments",
        )
        queryset = NutritionPlan.objects.select_related("gym").prefetch_related("meal_templates", user_assignments)
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST}:
            base = queryset.filter(global_or_user_gym_filter(user)) if user.gym_id else queryset.filter(gym__isnull=True)
            # Library actions show only template plans; write actions (update/destroy) also see personal plans
            if self.action in ('update', 'partial_update', 'destroy', 'retrieve'):
                return base
            return base.filter(created_for__isnull=True)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(global_or_user_gym_filter(user), status=NutritionPlan.Status.ACTIVE)
        return queryset.filter(gym__isnull=True, status=NutritionPlan.Status.ACTIVE)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST} and user.gym_id:
            # created_for_id may be passed when creating a personal plan from athlete profile
            created_for_id = self.request.data.get("created_for")
            extra = {"gym": user.gym}
            if created_for_id:
                try:
                    athlete = User.objects.get(id=created_for_id)
                    extra["created_for"] = athlete
                except User.DoesNotExist:
                    pass
            serializer.save(**extra)
            return
        raise PermissionDenied("No tienes permisos para crear planes.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN or (user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST} and instance.gym_id == user.gym_id):
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar este plan.")

    def perform_destroy(self, instance):
        user = self.request.user
        can = (
            user.role == User.Role.SUPER_ADMIN
            or (user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST} and instance.gym_id == user.gym_id)
        )
        if can:
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar este plan.")

    @action(detail=True, methods=["post"])
    def clone(self, request, pk=None):
        """
        Clona un plan de biblioteca como plan personal para un atleta específico.
        POST /api/nutrition/plans/{id}/clone/   body: { "athlete_id": "..." }
        """
        user = request.user
        if user.role not in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.NUTRITIONIST}:
            raise PermissionDenied("No tienes permisos para clonar planes.")

        source_plan = self.get_object()
        athlete_id = request.data.get("athlete_id")
        if not athlete_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"athlete_id": "Se requiere el athlete_id."})

        try:
            athlete = User.objects.get(id=athlete_id)
        except User.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"athlete_id": "Atleta no encontrado."})

        # Clonar el plan
        cloned = NutritionPlan.objects.create(
            gym=source_plan.gym,
            name=f"{source_plan.name} — {athlete.first_name or athlete.email}",
            description=source_plan.description,
            calories_per_day=source_plan.calories_per_day,
            protein_g=source_plan.protein_g,
            carbs_g=source_plan.carbs_g,
            fats_g=source_plan.fats_g,
            duration_days=source_plan.duration_days,
            status=NutritionPlan.Status.ACTIVE,
            points_reward=source_plan.points_reward,
            created_for=athlete,
        )

        # Clonar MealTemplates y sus MealFoodItems
        for template in source_plan.meal_templates.prefetch_related("food_items").all():
            new_template = MealTemplate.objects.create(
                plan=cloned,
                day_number=template.day_number,
                weekday=template.weekday,
                meal_type=template.meal_type,
                name=template.name,
                description=template.description,
                calories=template.calories,
                protein_g=template.protein_g,
                carbs_g=template.carbs_g,
                fats_g=template.fats_g,
                ingredients=template.ingredients,
                instructions=template.instructions,
                order=template.order,
            )
            for item in template.food_items.all():
                MealFoodItem.objects.create(
                    meal=new_template,
                    food=item.food,
                    quantity_g=item.quantity_g,
                    order=item.order,
                )

        from .serializers import NutritionPlanDetailSerializer
        return Response(
            NutritionPlanDetailSerializer(cloned, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def add_day(self, request, pk=None):
        """Crea los 6 MealTemplates (uno por tipo) para un día de la semana."""
        plan = self.get_object()
        weekday = request.data.get("weekday", "").lower()
        valid_weekdays = dict(MealTemplate.Weekday.choices)
        if weekday not in valid_weekdays:
            return Response({"detail": "weekday inválido"}, status=status.HTTP_400_BAD_REQUEST)
        if MealTemplate.objects.filter(plan=plan, weekday=weekday).exists():
            return Response({"detail": "Este día ya fue agregado"}, status=status.HTTP_400_BAD_REQUEST)
        MEAL_DEFAULTS = [
            (MealTemplate.MealType.BREAKFAST,       "Desayuno",     1),
            (MealTemplate.MealType.MID_MORNING,     "Media mañana", 2),
            (MealTemplate.MealType.LUNCH,           "Almuerzo",     3),
            (MealTemplate.MealType.AFTERNOON_SNACK, "Merienda",     4),
            (MealTemplate.MealType.DINNER,          "Cena",         5),
            (MealTemplate.MealType.LATE_SNACK,      "Recena",       6),
        ]
        created = [
            MealTemplate.objects.create(plan=plan, weekday=weekday, meal_type=mt, name=name, order=order)
            for mt, name, order in MEAL_DEFAULTS
        ]
        from .serializers import MealTemplateSerializer as MTS
        return Response(MTS(created, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def remove_day(self, request, pk=None):
        """Elimina todos los MealTemplates de un día de la semana."""
        plan = self.get_object()
        weekday = request.data.get("weekday", "").lower()
        deleted, _ = MealTemplate.objects.filter(plan=plan, weekday=weekday).delete()
        return Response({"deleted": deleted}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def start_plan(self, request, pk=None):
        """Inicia un plan de nutrición para el usuario actual (auto-asignación)"""
        plan = self.get_object()
        user = request.user
        
        # Verificar si ya tiene una asignación activa de este plan
        existing = UserNutritionPlan.objects.filter(
            user=user,
            plan=plan,
            status__in=['active', 'completed']
        ).first()
        
        if existing:
            if existing.status == 'completed':
                return Response(
                    {"detail": "Ya completaste este plan anteriormente"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {"detail": "Ya tienes este plan activo", "assignment_id": str(existing.id)},
                status=status.HTTP_200_OK
            )
        
        # Crear asignación automática
        from datetime import date, timedelta
        assignment = UserNutritionPlan.objects.create(
            user=user,
            plan=plan,
            assigned_by=user,  # Auto-asignado
            start_date=date.today(),
            end_date=date.today() + timedelta(days=plan.duration_days),
            status='active'
        )
        
        return Response({
            "detail": f"Plan iniciado exitosamente",
            "assignment_id": str(assignment.id),
            "start_date": assignment.start_date.isoformat(),
            "end_date": assignment.end_date.isoformat() if assignment.end_date else None,
        })

    @action(detail=True, methods=["post"])
    def assign_to_user(self, request, pk=None):
        """Asigna este plan a un usuario (solo para admins/nutricionistas)"""
        if request.user.role not in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.NUTRITIONIST}:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No tienes permisos para asignar planes.")

        plan = self.get_object()
        user_id = request.data.get("user_id")
        
        if not user_id:
            return Response(
                {"detail": "Se requiere user_id"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "Usuario no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar si ya tiene una asignación activa
        existing = UserNutritionPlan.objects.filter(
            user=target_user,
            plan=plan,
            status='active'
        ).exists()
        
        if existing:
            return Response(
                {"detail": "El usuario ya tiene este plan asignado"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear asignación
        from datetime import timedelta
        assignment = UserNutritionPlan.objects.create(
            user=target_user,
            plan=plan,
            assigned_by=request.user,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=plan.duration_days),
            status='active'
        )
        
        return Response({
            "detail": f"Plan asignado exitosamente a {target_user.email}",
            "assignment_id": str(assignment.id)
        })


class MealTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = MealTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = MealTemplate.objects.select_related("plan", "plan__gym")
        
        # Filter by plan_id if provided
        plan_id = self.request.query_params.get('plan')
        if plan_id:
            queryset = queryset.filter(plan_id=plan_id)
        
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST}:
            if user.gym_id:
                return queryset.filter(global_or_user_gym_filter(user, "plan__gym"))
            return queryset.filter(plan__gym__isnull=True)
        return queryset.filter(global_or_user_gym_filter(user, "plan__gym"))

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.NUTRITIONIST}:
            raise PermissionDenied("No tienes permisos para crear comidas.")
        serializer.save()


class UserMealLogViewSet(viewsets.ModelViewSet):
    serializer_class = UserMealLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Nutricionista puede ver logs de sus atletas pasando ?athlete_id=
        athlete_id = self.request.query_params.get("athlete_id")
        if user.role == "nutritionist" and athlete_id:
            from gyms.models import NutritionistAssignment
            assigned = NutritionistAssignment.objects.filter(
                nutritionist=user, athlete_id=athlete_id, is_active=True
            ).exists()
            if not assigned:
                return UserMealLog.objects.none()
            queryset = UserMealLog.objects.filter(user_id=athlete_id)
        else:
            queryset = UserMealLog.objects.filter(user=user)

        date_param = self.request.query_params.get("date")
        if date_param:
            queryset = queryset.filter(date=date_param)

        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        return queryset.select_related("meal_template")

    @action(detail=False, methods=["post"])
    def update_status(self, request):
        """Actualiza el estado de una comida: completed | skipped | alternative"""
        meal_template_id = request.data.get("meal_template_id")
        date_str = request.data.get("date")
        new_status = request.data.get("status", UserMealLog.MealLogStatus.COMPLETED)
        alt_text = request.data.get("alternative_food_text", "")

        if not meal_template_id or not date_str:
            return Response(
                {"detail": "Se requieren meal_template_id y date"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_statuses = [s[0] for s in UserMealLog.MealLogStatus.choices]
        if new_status not in valid_statuses:
            return Response(
                {"detail": f"status debe ser uno de: {valid_statuses}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            meal_template = MealTemplate.objects.get(id=meal_template_id)
        except MealTemplate.DoesNotExist:
            return Response({"detail": "Comida no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        user_assignment = UserNutritionPlan.objects.filter(
            user=request.user, plan=meal_template.plan, status="completed"
        ).first()
        if user_assignment:
            return Response(
                {"detail": "No puedes modificar comidas de un plan completado"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        meal_log, _ = UserMealLog.objects.get_or_create(
            user=request.user,
            meal_template=meal_template,
            date=date_str,
        )
        meal_log.status = new_status
        meal_log.alternative_food_text = alt_text if new_status == UserMealLog.MealLogStatus.ALTERNATIVE else ""
        meal_log.save()

        serializer = self.get_serializer(meal_log)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def weekly_compliance(self, request):
        """
        GET /api/nutrition/meal-logs/weekly_compliance/
        Atleta: su propio cumplimiento.
        Nutricionista: pasa ?athlete_id= para ver el de su atleta.
        """
        from .services import calc_weekly_compliance
        user = request.user
        athlete_id = request.query_params.get("athlete_id")

        if user.role == "nutritionist" and athlete_id:
            from gyms.models import NutritionistAssignment
            from django.contrib.auth import get_user_model
            User = get_user_model()
            assigned = NutritionistAssignment.objects.filter(
                nutritionist=user, athlete_id=athlete_id, is_active=True
            ).exists()
            if not assigned:
                return Response({"detail": "Atleta no asignado."}, status=403)
            try:
                athlete = User.objects.get(pk=athlete_id)
            except User.DoesNotExist:
                return Response({"detail": "Atleta no encontrado."}, status=404)
            result = calc_weekly_compliance(athlete)
        else:
            result = calc_weekly_compliance(user)

        return Response(result)

    @action(detail=False, methods=["post"])
    def award_daily(self, request):
        """
        Calcula y otorga puntos por cumplimiento nutricional diario.
        Body: { date? }  — si no se pasa, usa ayer.
        Idempotente: si ya se otorgaron puntos para esa fecha, responde con awarded=false.
        """
        from datetime import date as date_cls
        from .services import award_daily_points, calc_daily_compliance

        date_str = request.data.get("date")
        if date_str:
            try:
                target_date = date_cls.fromisoformat(date_str)
            except ValueError:
                return Response({"detail": "Formato de fecha inválido. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            from datetime import timedelta
            target_date = date_cls.today() - timedelta(days=1)

        result = award_daily_points(request.user, target_date)

        if result is None:
            # Already awarded or no active plan
            compliance = calc_daily_compliance(request.user, target_date)
            return Response({
                "awarded": False,
                "date": target_date.isoformat(),
                "compliance_pct": compliance["compliance_pct"] if compliance else 0,
            })

        return Response({
            "awarded":        result["points_awarded"] > 0,
            "date":           target_date.isoformat(),
            "points_awarded": result["points_awarded"],
            "compliance_pct": result["compliance_pct"],
            "streak":         result["streak"],
            "multiplier":     result["multiplier"],
        })

    @action(detail=True, methods=["post"], url_path="upload-photo")
    def upload_photo(self, request, pk=None):
        """Atleta sube foto como evidencia de una comida completada."""
        meal_log = self.get_object()

        if meal_log.user != request.user:
            return Response({"detail": "No tienes permiso."}, status=403)

        if meal_log.status != UserMealLog.MealLogStatus.COMPLETED:
            return Response(
                {"detail": "Solo puedes subir evidencia de comidas marcadas como completadas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        photo = request.FILES.get("photo")
        if not photo:
            return Response({"detail": "Se requiere el archivo 'photo'."}, status=status.HTTP_400_BAD_REQUEST)

        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if photo.content_type not in allowed_types:
            return Response({"detail": "Solo se permiten imágenes JPG, PNG o WebP."}, status=status.HTTP_400_BAD_REQUEST)

        if photo.size > 10 * 1024 * 1024:
            return Response({"detail": "La imagen no puede superar 10 MB."}, status=status.HTTP_400_BAD_REQUEST)

        if meal_log.photo:
            meal_log.photo.delete(save=False)

        meal_log.photo = photo
        meal_log.nutritionist_approved = None  # Vuelve a pendiente si se reemplaza la foto
        meal_log.xp_awarded = False
        meal_log.save(update_fields=["photo", "nutritionist_approved", "xp_awarded", "updated_at"])

        return Response({
            "detail": "Foto subida. Pendiente de revisión por el nutricionista.",
            "photo_url": request.build_absolute_uri(meal_log.photo.url),
            "log_id": str(meal_log.id),
        })

    @action(detail=False, methods=["get"], url_path="pending-approvals")
    def pending_approvals(self, request):
        """Nutricionista ve los logs con foto pendiente de revisión de sus atletas."""
        user = request.user
        if user.role not in {"nutritionist", "gym_admin", "super_admin"}:
            return Response({"detail": "Solo para nutricionistas."}, status=403)

        from gyms.models import NutritionistAssignment
        athlete_ids = NutritionistAssignment.objects.filter(
            nutritionist=user, is_active=True
        ).values_list("athlete_id", flat=True)

        logs = (
            UserMealLog.objects
            .filter(
                user_id__in=athlete_ids,
                status=UserMealLog.MealLogStatus.COMPLETED,
                nutritionist_approved__isnull=True,
            )
            .exclude(photo="")
            .exclude(photo__isnull=True)
            .select_related("user", "meal_template", "meal_template__plan")
            .order_by("-date")
        )

        data = [
            {
                "id": str(log.id),
                "athlete_id": str(log.user_id),
                "athlete_name": log.user.get_full_name() or log.user.email,
                "meal_name": log.meal_template.name,
                "meal_type": log.meal_template.meal_type,
                "plan_name": log.meal_template.plan.name,
                "date": log.date.isoformat(),
                "photo_url": request.build_absolute_uri(log.photo.url),
                "notes": log.notes,
            }
            for log in logs
        ]

        return Response({"count": len(data), "results": data})

    @action(detail=True, methods=["post"], url_path="review")
    def review(self, request, pk=None):
        """Nutricionista aprueba o rechaza la evidencia fotográfica de una comida."""
        from django.utils import timezone
        from django.db import transaction

        user = request.user
        if user.role not in {"nutritionist", "gym_admin", "super_admin"}:
            return Response({"detail": "Solo para nutricionistas."}, status=403)

        meal_log = self.get_object()

        if not meal_log.photo:
            return Response({"detail": "Este log no tiene foto."}, status=status.HTTP_400_BAD_REQUEST)

        approved = request.data.get("approved")
        if approved is None:
            return Response({"detail": "Se requiere 'approved' (true/false)."}, status=status.HTTP_400_BAD_REQUEST)

        nutritionist_notes = request.data.get("notes", "")

        with transaction.atomic():
            meal_log.nutritionist_approved = bool(approved)
            meal_log.nutritionist_notes = nutritionist_notes
            meal_log.reviewed_by = user
            meal_log.reviewed_at = timezone.now()
            meal_log.save(update_fields=[
                "nutritionist_approved", "nutritionist_notes",
                "reviewed_by", "reviewed_at", "updated_at",
            ])

        return Response({
            "detail": "Aprobado." if bool(approved) else "Rechazado.",
            "log_id": str(meal_log.id),
        })

    @action(detail=False, methods=["post"])
    def toggle_complete(self, request):
        """Alias legacy — redirige a update_status."""
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        if "status" not in data:
            data["status"] = UserMealLog.MealLogStatus.COMPLETED
        request._full_data = data
        return self.update_status(request)


class NutritionMealViewSet(viewsets.ModelViewSet):
    serializer_class = NutritionMealSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = NutritionMeal.objects.select_related("plan", "plan__gym")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST}:
            if user.gym_id:
                return queryset.filter(global_or_user_gym_filter(user, "plan__gym"))
            return queryset.filter(plan__gym__isnull=True)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(
                global_or_user_gym_filter(user, "plan__gym"),
                plan__status=NutritionPlan.Status.ACTIVE,
            )
        return queryset.filter(plan__gym__isnull=True, plan__status=NutritionPlan.Status.ACTIVE)

    def perform_create(self, serializer):
        user = self.request.user
        plan = serializer.validated_data["plan"]
        if user.role == User.Role.SUPER_ADMIN or (user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST} and plan.gym_id == user.gym_id):
            serializer.save()
            return
        raise PermissionDenied("No puedes agregar comidas a este plan.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST} and instance.plan.gym_id == user.gym_id
        ):
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar esta comida.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (
            user.role == User.Role.GYM_ADMIN and instance.plan.gym_id == user.gym_id
        ):
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta comida.")


class NutritionItemViewSet(viewsets.ModelViewSet):
    serializer_class = NutritionItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = NutritionItem.objects.select_related("meal", "meal__plan", "meal__plan__gym")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST}:
            if user.gym_id:
                return queryset.filter(global_or_user_gym_filter(user, "meal__plan__gym"))
            return queryset.filter(meal__plan__gym__isnull=True)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(
                global_or_user_gym_filter(user, "meal__plan__gym"),
                meal__plan__status=NutritionPlan.Status.ACTIVE,
            )
        return queryset.filter(meal__plan__gym__isnull=True, meal__plan__status=NutritionPlan.Status.ACTIVE)

    def perform_create(self, serializer):
        user = self.request.user
        meal = serializer.validated_data["meal"]
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST} and meal.plan.gym_id == user.gym_id
        ):
            serializer.save()
            return
        raise PermissionDenied("No puedes agregar items a esta comida.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST} and instance.meal.plan.gym_id == user.gym_id
        ):
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar este item.")


class UserNutritionPlanViewSet(viewsets.ModelViewSet):
    serializer_class = UserNutritionPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base = UserNutritionPlan.objects.select_related("plan", "user", "assigned_by")
        if user.role in ["super_admin", "gym_admin", "nutritionist"]:
            if user.gym:
                return base.filter(
                    Q(user__gym=user.gym) | Q(user=user)
                )
            return base.all()
        return base.filter(user=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.NUTRITIONIST}:
            raise PermissionDenied("No puedes asignar planes de nutrición.")

        # Validar que no se asigne un plan de biblioteca directamente
        plan = serializer.validated_data.get("plan")
        if plan and plan.created_for is None and user.role != User.Role.SUPER_ADMIN:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                "plan": "Este es un plan de biblioteca (plantilla). Crea un plan personalizado para el atleta usando 'Usar como base'."
            })

        start_date = serializer.validated_data.get("start_date", date.today())
        target_status = (
            UserNutritionPlan.AssignmentStatus.SCHEDULED
            if start_date > date.today()
            else UserNutritionPlan.AssignmentStatus.ACTIVE
        )

        kwargs = {"status": target_status}
        if user.role != User.Role.SUPER_ADMIN:
            kwargs["assigned_by"] = user
        serializer.save(**kwargs)

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST} and instance.plan.gym_id == user.gym_id
        ):
            serializer.save()
            return
        if user.role == User.Role.ATHLETE and instance.user_id == user.id:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar esta asignación.")

    def perform_destroy(self, instance):
        user = self.request.user
        # Plan personal (gym_id=None): verificar por gym del atleta o del assigned_by
        same_gym = (
            (instance.plan.gym_id and instance.plan.gym_id == user.gym_id)
            or (instance.user.gym_id and instance.user.gym_id == user.gym_id)
            or (instance.assigned_by_id and instance.assigned_by.gym_id == user.gym_id)
        )
        can = user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST} and same_gym
        )
        if not can:
            raise PermissionDenied("No puedes eliminar esta asignación.")
        instance.delete()

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def my_active(self, request):
        user = request.user

        # Auto-activate any scheduled plan whose start_date has arrived,
        # completing any currently active plan first to avoid duplicate actives.
        today = date.today()
        scheduled_due = UserNutritionPlan.objects.filter(
            user=user,
            status=UserNutritionPlan.AssignmentStatus.SCHEDULED,
            start_date__lte=today,
        )
        if scheduled_due.exists():
            # Complete currently active plans before promoting the scheduled one
            UserNutritionPlan.objects.filter(
                user=user,
                status=UserNutritionPlan.AssignmentStatus.ACTIVE,
            ).update(status=UserNutritionPlan.AssignmentStatus.COMPLETED, end_date=today)
            scheduled_due.update(status=UserNutritionPlan.AssignmentStatus.ACTIVE)

        assignment = UserNutritionPlan.objects.filter(
            user=user,
            status=UserNutritionPlan.AssignmentStatus.ACTIVE,
        ).select_related('plan', 'plan__gym', 'assigned_by').first()

        from datetime import timedelta
        from .serializers import NutritionPlanDetailSerializer

        # ── Chain: todas las asignaciones del atleta, ordenadas por start_date
        chain_qs = UserNutritionPlan.objects.filter(
            user=user,
        ).select_related("plan").order_by("start_date")

        chain_list = list(chain_qs)

        # Si no hay plan activo y el chain está vacío, devolver 404 clásico
        if not assignment and not chain_list:
            return Response({"detail": "No tienes un plan activo."}, status=status.HTTP_404_NOT_FOUND)

        total_weeks = len(chain_list)

        # Posición del plan activo en el chain (1-indexed)
        week_number = next(
            (i + 1 for i, a in enumerate(chain_list) if assignment and a.id == assignment.id),
            1,
        )

        # Semanas completadas dentro de este chain (no del historial global)
        completed_weeks = sum(1 for a in chain_list if a.status == UserNutritionPlan.AssignmentStatus.COMPLETED)

        chain_data = []
        for i, a in enumerate(chain_list):
            chain_data.append({
                "week_number": i + 1,
                "assignment_id": str(a.id),
                "status": a.status,
                "plan_name": a.plan.name,
                "plan_id": str(a.plan.id),
                "start_date": a.start_date.isoformat(),
                "compliance": float(a.compliance_percentage or 0),
            })

        # ── Próxima semana programada (primera SCHEDULED del chain)
        scheduled = next(
            (a for a in chain_list if a.status == UserNutritionPlan.AssignmentStatus.SCHEDULED),
            None,
        )

        scheduled_plan_data = None
        scheduled_plan_detail = None
        if scheduled:
            scheduled_plan_data = {
                "id": str(scheduled.id),
                "plan_name": scheduled.plan.name,
                "start_date": scheduled.start_date.isoformat(),
                "plan_id": str(scheduled.plan.id),
            }
            scheduled_plan_detail = NutritionPlanDetailSerializer(
                scheduled.plan, context={"request": self.request}
            ).data

        # Si no hay plan activo pero hay historial, devolver respuesta con chain
        if not assignment:
            return Response({
                "active_plan": None,
                "chain": chain_data,
                "week_number": week_number,
                "total_weeks": total_weeks,
                "completed_weeks": completed_weeks,
                "scheduled_plan": scheduled_plan_data,
                "scheduled_plan_detail": scheduled_plan_detail,
                "is_overdue": False,
                "week_deadline": None,
            })

        # ── is_overdue usa duration_days real del plan
        duration = assignment.plan.duration_days or 7
        week_deadline = assignment.start_date + timedelta(days=duration)

        data = self.get_serializer(assignment).data
        data['week_number'] = week_number
        data['total_weeks'] = total_weeks
        data['completed_weeks'] = completed_weeks
        data['chain'] = chain_data
        data['scheduled_plan'] = scheduled_plan_data
        data['scheduled_plan_detail'] = scheduled_plan_detail
        data['is_overdue'] = date.today() > week_deadline
        data['week_deadline'] = week_deadline.isoformat()
        return Response(data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Marca el plan como completado y otorga puntos al usuario"""
        assignment = self.get_object()
        
        if assignment.status == "completed":
            return Response(
                {"detail": "Este plan ya fue completado anteriormente"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calcular progreso real
        total_meals = assignment.plan.meal_templates.count()
        
        if total_meals == 0:
            return Response(
                {"detail": "Este plan no tiene comidas configuradas"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Contar comidas completadas (únicas por meal_template)
        completed_logs = UserMealLog.objects.filter(
            user=assignment.user,
            meal_template__plan=assignment.plan,
            status=UserMealLog.MealLogStatus.COMPLETED
        ).values('meal_template').distinct().count()
        
        completion_percentage = (completed_logs / total_meals * 100)
        
        if completion_percentage < 80:
            return Response(
                {
                    "detail": f"Debes completar al menos 80% de las comidas del plan.\n\nProgreso actual: {completion_percentage:.1f}%\nComidas completadas: {completed_logs}/{total_meals}",
                    "completion_percentage": round(completion_percentage, 1),
                    "completed_meals": completed_logs,
                    "total_meals": total_meals,
                    "required_meals": int(total_meals * 0.8),
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Marcar como completado
        assignment.status = "completed"
        assignment.compliance_percentage = completion_percentage
        assignment.end_date = date.today()
        assignment.save()
        
        # Otorgar puntos si el plan tiene recompensa
        points_earned = 0
        if assignment.plan.points_reward > 0:
            from gamification.models import UserPoints
            
            # Crear registro de puntos
            user_points = UserPoints.objects.create(
                user=assignment.user,
                points=assignment.plan.points_reward,
                source="nutrition_plan_completed",
                description=f"Completaste el plan de nutrición: {assignment.plan.name}",
                related_nutrition_plan=assignment.plan,
            )
            points_earned = assignment.plan.points_reward
            
            logger.debug("Puntos otorgados: %s pts a %s", points_earned, assignment.user.email)
        
        return Response({
            "detail": f"¡Felicitaciones! Has completado el plan exitosamente.",
            "points_earned": points_earned,
            "completion_percentage": round(completion_percentage, 1),
            "completed_meals": completed_logs,
            "total_meals": total_meals,
        })

    @action(detail=False, methods=["get"], url_path="week-logs")
    def week_logs(self, request):
        """
        Nutricionista ve todos los logs de la semana actual del atleta (para el plan activo),
        con fotos y estado de aprobación.
        GET /api/nutrition/assignments/week-logs/?athlete_id=
        """
        user = request.user
        if user.role not in {User.Role.NUTRITIONIST, User.Role.GYM_ADMIN, User.Role.SUPER_ADMIN}:
            return Response({"detail": "No tienes permisos."}, status=403)

        athlete_id = request.query_params.get("athlete_id")
        if not athlete_id:
            return Response({"detail": "Se requiere athlete_id."}, status=400)

        assignment_id = request.query_params.get("assignment_id")

        from datetime import timedelta
        today = date.today()

        if assignment_id:
            # Specific assignment (completed or any week)
            try:
                active = UserNutritionPlan.objects.select_related("plan").get(
                    id=assignment_id, user_id=athlete_id
                )
            except UserNutritionPlan.DoesNotExist:
                return Response({"detail": "Asignación no encontrada.", "logs": []}, status=404)
            week_start = active.start_date
        else:
            active = UserNutritionPlan.objects.filter(
                user_id=athlete_id, status="active"
            ).select_related("plan").first()

            if not active:
                return Response({"detail": "El atleta no tiene plan activo.", "logs": []})

            week_start = today - timedelta(days=today.weekday())  # lunes de esta semana

        logs = (
            UserMealLog.objects
            .filter(
                user_id=athlete_id,
                meal_template__plan=active.plan,
                date__gte=week_start,
            )
            .select_related("meal_template")
            .order_by("date", "meal_template__order")
        )

        # Total de comidas esperadas esta semana (días que ya pasaron * comidas por día)
        days_elapsed = (today - week_start).days + 1
        days_in_plan = set()
        for mt in active.plan.meal_templates.all():
            if mt.weekday:
                days_in_plan.add(mt.weekday)

        data = [
            {
                "id": str(l.id),
                "date": l.date.isoformat(),
                "meal_id": str(l.meal_template_id),
                "meal_name": l.meal_template.name,
                "meal_type": l.meal_template.meal_type,
                "status": l.status,
                "photo_url": request.build_absolute_uri(l.photo.url) if l.photo else None,
                "nutritionist_approved": l.nutritionist_approved,
                "nutritionist_notes": l.nutritionist_notes,
                "notes": l.notes,
            }
            for l in logs
        ]

        completed = sum(1 for l in logs if l.status == UserMealLog.MealLogStatus.COMPLETED)
        with_photo = sum(1 for l in logs if l.photo)
        approved = sum(1 for l in logs if l.nutritionist_approved is True)

        return Response({
            "assignment_id": str(active.id),
            "plan_name": active.plan.name,
            "plan_points": active.plan.points_reward,
            "week_start": week_start.isoformat(),
            "logs": data,
            "summary": {
                "completed": completed,
                "with_photo": with_photo,
                "approved": approved,
                "total_logged": len(data),
            },
        })

    @action(detail=True, methods=["post"], url_path="approve-week")
    def approve_week(self, request, pk=None):
        """
        Nutricionista aprueba la semana completa del atleta:
        - Marca el assignment como completado
        - Otorga los points_reward del plan al atleta
        - Aprueba todos los meal logs con foto pendientes de esa semana
        POST /api/nutrition/assignments/{id}/approve-week/
        """
        from django.db import transaction
        from django.utils import timezone
        from gamification.models import UserPoints

        user = request.user
        if user.role not in {User.Role.NUTRITIONIST, User.Role.GYM_ADMIN, User.Role.SUPER_ADMIN}:
            return Response({"detail": "No tienes permisos."}, status=403)

        assignment = self.get_object()

        if assignment.status == "completed":
            return Response({"detail": "Esta semana ya fue aprobada."}, status=400)

        with transaction.atomic():
            # Aprobar todos los logs pendientes con foto
            from datetime import timedelta
            today = date.today()
            week_start = today - timedelta(days=today.weekday())

            pending_logs = UserMealLog.objects.filter(
                user=assignment.user,
                meal_template__plan=assignment.plan,
                date__gte=week_start,
                nutritionist_approved__isnull=True,
            ).exclude(photo="").exclude(photo__isnull=True)

            pending_logs.update(
                nutritionist_approved=True,
                reviewed_by=user,
                reviewed_at=timezone.now(),
            )

            # Calcular compliance de la semana
            total_templates = assignment.plan.meal_templates.count()
            completed_count = UserMealLog.objects.filter(
                user=assignment.user,
                meal_template__plan=assignment.plan,
                date__gte=week_start,
                status=UserMealLog.MealLogStatus.COMPLETED,
            ).count()

            compliance_pct = round((completed_count / total_templates * 100), 1) if total_templates else 0

            # Marcar semana como completada
            assignment.status = "completed"
            assignment.compliance_percentage = compliance_pct
            assignment.end_date = today
            assignment.save(update_fields=["status", "compliance_percentage", "end_date", "updated_at"])

            # Otorgar puntos según configuración del gym (fallback: points_reward del plan)
            from gamification.models import GymPointsConfig
            points_awarded = 0
            gym = assignment.plan.gym
            if gym:
                cfg, _ = GymPointsConfig.objects.get_or_create(gym=gym)
                pts = cfg.nutrition_week_points
            else:
                pts = assignment.plan.points_reward

            if pts > 0:
                UserPoints.objects.create(
                    user=assignment.user,
                    points=pts,
                    source="weekly_plan_approved",
                    description=f"Semana aprobada: {assignment.plan.name} ({week_start.isoformat()})",
                    related_nutrition_plan=assignment.plan,
                )
                points_awarded = pts

        # Si existe un plan programado cuyo start_date ya llegó, activarlo ahora
        from datetime import timedelta
        next_scheduled = UserNutritionPlan.objects.filter(
            user=assignment.user,
            status=UserNutritionPlan.AssignmentStatus.SCHEDULED,
            start_date__lte=today + timedelta(days=7),
        ).order_by("start_date").first()

        activated_plan_name = None
        if next_scheduled:
            next_scheduled.status = UserNutritionPlan.AssignmentStatus.ACTIVE
            next_scheduled.save(update_fields=["status", "updated_at"])
            activated_plan_name = next_scheduled.plan.name

        # Notificar al atleta
        try:
            from gyms.views import create_notification
            from gyms.models import Notification
            import logging as _log
            gym = assignment.plan.gym
            next_msg = f" Tu siguiente plan '{activated_plan_name}' ya está activo." if activated_plan_name else ""
            create_notification(
                recipient=assignment.user,
                notification_type=Notification.Type.PLAN_UPDATED,
                title="¡Semana aprobada!",
                message=f"Tu nutricionista aprobó tu semana del plan '{assignment.plan.name}'. Se te otorgaron {points_awarded} puntos." + next_msg,
                actor=user,
                gym=gym,
                link=f"/{gym.slug}/panel/mi-nutricion" if gym else None,
            )
        except Exception:
            _log.getLogger(__name__).warning("approve_week: notificación fallida", exc_info=True)

        return Response({
            "detail": f"Semana aprobada. Se otorgaron {points_awarded} puntos a {assignment.user.get_full_name() or assignment.user.email}.",
            "points_awarded": points_awarded,
            "compliance_pct": compliance_pct,
            "next_plan_activated": activated_plan_name,
        })

    @action(detail=True, methods=["post"], url_path="reject-week")
    def reject_week(self, request, pk=None):
        """
        Nutricionista rechaza la semana del atleta:
        - Limpia review_requested_at para que el atleta pueda volver a enviar
        - Notifica al atleta con el motivo
        POST /api/nutrition/assignments/{id}/reject-week/
        """
        user = request.user
        if user.role not in {User.Role.NUTRITIONIST, User.Role.GYM_ADMIN, User.Role.SUPER_ADMIN}:
            return Response({"detail": "No tienes permisos."}, status=403)

        assignment = self.get_object()

        if assignment.status != UserNutritionPlan.AssignmentStatus.ACTIVE:
            return Response({"detail": "Solo se puede rechazar una semana activa."}, status=400)

        if not assignment.review_requested_at:
            return Response({"detail": "Este atleta no ha solicitado revisión."}, status=400)

        reason = request.data.get("reason", "").strip()

        assignment.review_requested_at = None
        assignment.save(update_fields=["review_requested_at", "updated_at"])

        try:
            from gyms.views import create_notification
            from gyms.models import Notification
            import logging as _log
            gym = assignment.plan.gym
            msg = f"Tu nutricionista necesita que corrijas algunos registros del plan '{assignment.plan.name}'."
            if reason:
                msg += f" Motivo: {reason}"
            create_notification(
                recipient=assignment.user,
                notification_type=Notification.Type.PLAN_UPDATED,
                title="Revisión de semana rechazada",
                message=msg,
                actor=user,
                gym=gym,
                link=f"/{gym.slug}/panel/mi-nutricion" if gym else None,
            )
        except Exception:
            _log.getLogger(__name__).warning("reject_week: notificación fallida", exc_info=True)

        return Response({"detail": "Semana rechazada. El atleta puede volver a enviar su solicitud."})

    @action(detail=True, methods=["post"], url_path="request-review")
    def request_review(self, request, pk=None):
        """
        El atleta solicita al nutricionista que revise su semana.
        Solo habilitado si completó todos los logs de los días transcurridos.
        POST /api/nutrition/assignments/{id}/request-review/
        """
        from django.utils import timezone as tz
        from datetime import timedelta
        from gyms.views import create_notification
        from gyms.models import Notification

        assignment = self.get_object()

        if assignment.user_id != request.user.id:
            return Response({"detail": "No puedes solicitar revisión de otro atleta."}, status=403)

        if assignment.status != UserNutritionPlan.AssignmentStatus.ACTIVE:
            return Response({"detail": "Solo puedes solicitar revisión de un plan activo."}, status=400)

        if assignment.review_requested_at:
            return Response({
                "detail": "Ya enviaste la solicitud de revisión.",
                "review_requested_at": assignment.review_requested_at,
            }, status=400)

        # ── Validar que todos los días transcurridos esta semana estén completos ──
        today = date.today()
        week_start = today - timedelta(days=today.weekday())  # lunes

        # Días de la semana ya transcurridos (lunes=0 … hoy)
        WEEKDAY_ORDER = {
            "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
            "friday": 4, "saturday": 5, "sunday": 6,
        }
        today_order = today.weekday()  # 0=lunes

        # Comidas del plan para días ya transcurridos
        due_meals = assignment.plan.meal_templates.filter(
            weekday__isnull=False,
        ).values_list("id", "weekday")

        due_meal_ids = [
            meal_id for meal_id, weekday in due_meals
            if WEEKDAY_ORDER.get(weekday, 7) <= today_order
        ]

        if not due_meal_ids:
            return Response({"detail": "No hay comidas asignadas para revisar aún."}, status=400)

        # Logs existentes esta semana para esas comidas (cualquier status cuenta)
        logged_ids = set(
            UserMealLog.objects.filter(
                user=request.user,
                meal_template_id__in=due_meal_ids,
                date__gte=week_start,
                date__lte=today,
            ).values_list("meal_template_id", flat=True)
        )

        missing = [mid for mid in due_meal_ids if mid not in logged_ids]
        if missing:
            return Response({
                "detail": f"Te faltan {len(missing)} comida(s) sin registrar. Registra todas antes de enviar.",
                "missing_count": len(missing),
            }, status=400)

        # ── Guardar y notificar ──
        assignment.review_requested_at = tz.now()
        assignment.save(update_fields=["review_requested_at", "updated_at"])

        # Notificar al nutricionista asignado (si existe) o al gym_admin
        recipient = assignment.assigned_by
        if not recipient and assignment.plan.gym:
            from accounts.models import User as UserModel
            recipient = UserModel.objects.filter(
                gym=assignment.plan.gym,
                role__in=[UserModel.Role.NUTRITIONIST, UserModel.Role.GYM_ADMIN],
            ).first()

        if recipient:
            athlete_name = request.user.get_full_name() or request.user.email
            gym_slug = assignment.plan.gym.slug if assignment.plan.gym else ""
            create_notification(
                recipient=recipient,
                notification_type=Notification.Type.PLAN_UPDATED,
                title=f"{athlete_name} completó su semana",
                message=f"{athlete_name} registro todas sus comidas y solicita que revises su semana del plan '{assignment.plan.name}'.",
                actor=request.user,
                gym=assignment.plan.gym,
                link=f"/{gym_slug}/panel/gestion/atletas/{request.user.id}",
            )

        return Response({
            "detail": "Solicitud enviada. Tu nutricionista recibirá una notificación.",
            "review_requested_at": assignment.review_requested_at,
        })

    @action(detail=False, methods=["get"])
    def athlete_nutrition(self, request):
        """Devuelve el estado nutricional de un atleta específico (para nutricionistas)"""
        user = request.user
        if user.role not in {User.Role.NUTRITIONIST, User.Role.GYM_ADMIN, User.Role.SUPER_ADMIN}:
            return Response({"detail": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)

        athlete_id = request.query_params.get("athlete_id")
        if not athlete_id:
            return Response({"detail": "Se requiere athlete_id."}, status=status.HTTP_400_BAD_REQUEST)

        today = date.today()

        # Auto-activate scheduled plans that have started,
        # completing any currently active plan first to avoid duplicate actives.
        scheduled_due = UserNutritionPlan.objects.filter(
            user_id=athlete_id,
            status=UserNutritionPlan.AssignmentStatus.SCHEDULED,
            start_date__lte=today,
        )
        if scheduled_due.exists():
            UserNutritionPlan.objects.filter(
                user_id=athlete_id,
                status=UserNutritionPlan.AssignmentStatus.ACTIVE,
            ).update(status=UserNutritionPlan.AssignmentStatus.COMPLETED, end_date=today)
            scheduled_due.update(status=UserNutritionPlan.AssignmentStatus.ACTIVE)

        active_plan = UserNutritionPlan.objects.filter(
            user_id=athlete_id, status="active"
        ).select_related("plan", "plan__gym", "assigned_by").prefetch_related(
            "plan__meal_templates", "plan__meal_templates__food_items__food"
        ).first()

        scheduled_plan = UserNutritionPlan.objects.filter(
            user_id=athlete_id, status="scheduled"
        ).select_related("plan").first()

        from datetime import timedelta
        from .serializers import NutritionPlanDetailSerializer

        # ── Chain del programa: todas las asignaciones del atleta, ordenadas por start_date
        chain_qs = UserNutritionPlan.objects.filter(
            user_id=athlete_id,
        ).select_related("plan").order_by("start_date")

        chain_list = list(chain_qs)
        total_weeks = len(chain_list)
        week_number = next(
            (i + 1 for i, a in enumerate(chain_list) if active_plan and a.id == active_plan.id),
            1,
        )
        completed_weeks = sum(
            1 for a in chain_list if a.status == UserNutritionPlan.AssignmentStatus.COMPLETED
        )

        # ── Detalle por semana para el nutricionista
        # Contar logs de cada asignación
        all_logs = UserMealLog.objects.filter(
            user_id=athlete_id,
        ).values("meal_template__plan_id", "status", "nutritionist_approved", "date")

        logs_by_plan = {}
        for log in all_logs:
            pid = str(log["meal_template__plan_id"])
            if pid not in logs_by_plan:
                logs_by_plan[pid] = {"completed": 0, "total": 0, "photos_pending": 0}
            logs_by_plan[pid]["total"] += 1
            if log["status"] == UserMealLog.MealLogStatus.COMPLETED:
                logs_by_plan[pid]["completed"] += 1
            if log["nutritionist_approved"] is None and log.get("date"):
                logs_by_plan[pid]["photos_pending"] += 1

        chain_data = []
        for i, a in enumerate(chain_list):
            pid = str(a.plan.id)
            log_stats = logs_by_plan.get(pid, {"completed": 0, "total": 0, "photos_pending": 0})
            meals_total = a.plan.meal_templates.count() if hasattr(a.plan, 'meal_templates') else 0

            day_in_week = None
            if a.status == UserNutritionPlan.AssignmentStatus.ACTIVE:
                day_in_week = min((today - a.start_date).days + 1, a.plan.duration_days or 7)

            chain_data.append({
                "week_number": i + 1,
                "assignment_id": str(a.id),
                "status": a.status,
                "plan_name": a.plan.name,
                "plan_id": pid,
                "start_date": a.start_date.isoformat(),
                "end_date": a.end_date.isoformat() if a.end_date else None,
                "compliance": float(a.compliance_percentage or 0),
                "meals_logged": log_stats["completed"],
                "meals_total": meals_total,
                "photos_pending": log_stats["photos_pending"],
                "day_in_week": day_in_week,
                "review_requested_at": a.review_requested_at.isoformat() if a.review_requested_at else None,
            })

        # ── Próxima semana programada
        scheduled_plan = next(
            (a for a in chain_list if a.status == UserNutritionPlan.AssignmentStatus.SCHEDULED),
            None,
        )
        scheduled_data = (
            {
                "id": str(scheduled_plan.id),
                "plan_name": scheduled_plan.plan.name,
                "start_date": scheduled_plan.start_date.isoformat(),
                "plan_id": str(scheduled_plan.plan.id),
            }
            if scheduled_plan else None
        )

        # ── Logs de la semana actual para cumplimiento
        week_meals = UserMealLog.objects.filter(
            user_id=athlete_id,
            date__gte=(today - timedelta(days=7)).isoformat(),
            status=UserMealLog.MealLogStatus.COMPLETED,
        ).select_related("meal_template").order_by("-date")

        meal_data = {}
        for log in week_meals:
            day = log.date.isoformat()
            if day not in meal_data:
                meal_data[day] = []
            meal_data[day].append({
                "meal_name": log.meal_template.name,
                "meal_type": log.meal_template.meal_type,
                "completed": True,
            })

        plan_serializer = UserNutritionPlanSerializer(active_plan, context={"request": request}) if active_plan else None
        completed_plans_qs = UserNutritionPlan.objects.filter(
            user_id=athlete_id, status="completed"
        ).select_related("plan").order_by("-end_date")
        completed_serializer = UserNutritionPlanSerializer(completed_plans_qs, many=True, context={"request": request})

        # ── is_overdue usa duration_days real
        overdue_data = None
        if active_plan:
            duration = active_plan.plan.duration_days or 7
            deadline = active_plan.start_date + timedelta(days=duration)
            overdue_data = {
                "is_overdue": today > deadline,
                "week_deadline": deadline.isoformat(),
                "days_overdue": max(0, (today - deadline).days),
            }

        return Response({
            "active_plan": plan_serializer.data if plan_serializer else None,
            "scheduled_plan": scheduled_data,
            "completed_plans": completed_serializer.data,
            "overdue": overdue_data,
            "week_number": week_number,
            "total_weeks": total_weeks,
            "completed_weeks": completed_weeks,
            "chain": chain_data,
            "week_meal_compliance": {
                "dates": sorted(meal_data.keys(), reverse=True),
                "meals_by_date": meal_data,
            },
            "total_meals_logged_week": len(week_meals),
        })


class MealFoodItemViewSet(viewsets.ModelViewSet):
    serializer_class = MealFoodItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = MealFoodItem.objects.select_related("food", "meal", "meal__plan", "meal__plan__gym")
        meal_id = self.request.query_params.get("meal")
        if meal_id:
            queryset = queryset.filter(meal_id=meal_id)
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        return queryset.filter(meal__plan__gym=user.gym)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.NUTRITIONIST}:
            raise PermissionDenied("No tienes permisos para agregar alimentos a comidas.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN or instance.meal.plan.gym_id == user.gym_id:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar este alimento.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or instance.meal.plan.gym_id == user.gym_id:
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar este alimento.")


class FoodViewSet(viewsets.ModelViewSet):
    serializer_class = FoodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        from django.db.models import Q
        queryset = Food.objects.select_related("gym", "created_by")

        # Filtro por grupo si se provee
        group = self.request.query_params.get("group")
        if group:
            queryset = queryset.filter(food_group=group)

        # Búsqueda por nombre
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(name__icontains=search)

        if user.role == User.Role.SUPER_ADMIN:
            return queryset

        # Nutricionista y gym_admin ven alimentos de su gym + globales (CENAN)
        if user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST}:
            return queryset.filter(Q(gym=user.gym) | Q(gym__isnull=True))

        # Atletas solo ven alimentos globales y de su gym
        return queryset.filter(Q(gym=user.gym) | Q(gym__isnull=True))

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.NUTRITIONIST}:
            raise PermissionDenied("No tienes permisos para crear alimentos.")
        gym = None if user.role == User.Role.SUPER_ADMIN else user.gym
        serializer.save(gym=gym, created_by=user)

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST} and instance.gym_id == user.gym_id:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar este alimento.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            instance.delete()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.NUTRITIONIST} and instance.gym_id == user.gym_id:
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar este alimento.")
