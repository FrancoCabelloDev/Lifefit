from datetime import date

from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.db import models
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import MealTemplate, NutritionItem, NutritionMeal, NutritionPlan, UserMealLog, UserNutritionPlan
from .serializers import (
    MealTemplateSerializer,
    NutritionItemSerializer,
    NutritionMealSerializer,
    NutritionPlanDetailSerializer,
    NutritionPlanSerializer,
    UserMealLogSerializer,
    UserNutritionPlanSerializer,
)

User = get_user_model()


def global_or_user_gym_filter(user, gym_field="gym"):
    filters = Q(**{f"{gym_field}__isnull": True})
    if user.gym_id:
        filters |= Q(**{f"{gym_field}_id": user.gym_id})
    return filters


class NutritionPlanViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return NutritionPlanDetailSerializer
        return NutritionPlanSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = NutritionPlan.objects.select_related("gym").prefetch_related("meal_templates")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH}:
            if user.gym_id:
                return queryset.filter(global_or_user_gym_filter(user))
            return queryset.filter(gym__isnull=True)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(global_or_user_gym_filter(user), status=NutritionPlan.Status.ACTIVE)
        return queryset.filter(gym__isnull=True, status=NutritionPlan.Status.ACTIVE)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            serializer.save(gym=user.gym)
            return
        raise PermissionDenied("No tienes permisos para crear planes.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN or (user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id):
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar este plan.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (user.role == User.Role.GYM_ADMIN and instance.gym_id == user.gym_id):
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar este plan.")

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
        """Asigna este plan a un usuario (solo para admins)"""
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
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH}:
            if user.gym_id:
                return queryset.filter(global_or_user_gym_filter(user, "plan__gym"))
            return queryset.filter(plan__gym__isnull=True)
        return queryset.filter(global_or_user_gym_filter(user, "plan__gym"))

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.COACH}:
            raise PermissionDenied("No tienes permisos para crear comidas.")
        serializer.save()


class UserMealLogViewSet(viewsets.ModelViewSet):
    serializer_class = UserMealLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = UserMealLog.objects.filter(user=self.request.user)
        date_param = self.request.query_params.get("date")
        if date_param:
            queryset = queryset.filter(date=date_param)
        return queryset.select_related("meal_template")

    @action(detail=False, methods=["post"])
    def toggle_complete(self, request):
        """Marca o desmarca una comida como completada"""
        meal_template_id = request.data.get("meal_template_id")
        date_str = request.data.get("date")

        if not meal_template_id or not date_str:
            return Response(
                {"detail": "Se requieren meal_template_id y date"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            meal_template = MealTemplate.objects.get(id=meal_template_id)
        except MealTemplate.DoesNotExist:
            return Response(
                {"detail": "Comida no encontrada"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Verificar si el plan está completado
        user_assignment = UserNutritionPlan.objects.filter(
            user=request.user,
            plan=meal_template.plan,
            status='completed'
        ).first()
        
        if user_assignment:
            return Response(
                {"detail": "No puedes modificar comidas de un plan completado"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Buscar o crear el log
        meal_log, created = UserMealLog.objects.get_or_create(
            user=request.user,
            meal_template=meal_template,
            date=date_str,
            defaults={"completed": True}
        )

        # Si ya existía, hacer toggle del estado
        if not created:
            meal_log.completed = not meal_log.completed
            meal_log.save()

        serializer = self.get_serializer(meal_log)
        return Response(serializer.data)


class NutritionMealViewSet(viewsets.ModelViewSet):
    serializer_class = NutritionMealSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = NutritionMeal.objects.select_related("plan", "plan__gym")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH}:
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
        if user.role == User.Role.SUPER_ADMIN or (user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and plan.gym_id == user.gym_id):
            serializer.save()
            return
        raise PermissionDenied("No puedes agregar comidas a este plan.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.plan.gym_id == user.gym_id
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
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH}:
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
            user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and meal.plan.gym_id == user.gym_id
        ):
            serializer.save()
            return
        raise PermissionDenied("No puedes agregar items a esta comida.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.meal.plan.gym_id == user.gym_id
        ):
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar este item.")


class UserNutritionPlanViewSet(viewsets.ModelViewSet):
    serializer_class = UserNutritionPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ["super_admin", "gym_admin", "coach"]:
            if user.gym:
                return UserNutritionPlan.objects.filter(
                    Q(user__gym=user.gym) | Q(user=user)
                )
            return UserNutritionPlan.objects.all()
        return UserNutritionPlan.objects.filter(user=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            serializer.save(assigned_by=user)
            return
        raise PermissionDenied("No puedes asignar planes de nutrición.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.plan.gym_id == user.gym_id
        ):
            serializer.save()
            return
        if user.role == User.Role.ATHLETE and instance.user_id == user.id:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar esta asignación.")

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
            completed=True
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
            
            # Log para debug
            print(f"✓ Puntos otorgados: {points_earned} pts a {assignment.user.email}")
        
        return Response({
            "detail": f"¡Felicitaciones! Has completado el plan exitosamente.",
            "points_earned": points_earned,
            "completion_percentage": round(completion_percentage, 1),
            "completed_meals": completed_logs,
            "total_meals": total_meals,
        })
