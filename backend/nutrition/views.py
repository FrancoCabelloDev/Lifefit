from datetime import date

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
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
        user = self.request.user
        queryset = UserMealLog.objects.select_related("user", "meal_template", "meal_template__plan")
        
        # Filter by date if provided
        date_param = self.request.query_params.get('date')
        if date_param:
            queryset = queryset.filter(date=date_param)
        
        # Admins can see all, users only their own
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH}:
            if user.gym_id:
                return queryset.filter(Q(user_id=user.id) | Q(user__gym_id=user.gym_id))
            return queryset.filter(user_id=user.id)
        return queryset.filter(user_id=user.id)

    def perform_create(self, serializer):
        # Always set the current user
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's meal logs for the current user"""
        today = date.today()
        logs = self.get_queryset().filter(date=today, user=request.user)
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def toggle_complete(self, request):
        """Toggle completion status of a meal log"""
        meal_template_id = request.data.get('meal_template_id')
        log_date = request.data.get('date', date.today())
        
        if not meal_template_id:
            return Response(
                {"error": "meal_template_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create the log
        log, created = UserMealLog.objects.get_or_create(
            user=request.user,
            meal_template_id=meal_template_id,
            date=log_date,
            defaults={'completed': True}
        )
        
        if not created:
            log.completed = not log.completed
            log.save()
        
        serializer = self.get_serializer(log)
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
        queryset = UserNutritionPlan.objects.select_related("plan", "user", "plan__gym")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            return queryset.filter(plan__gym_id=user.gym_id)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(user=user)
        return queryset.none()

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
