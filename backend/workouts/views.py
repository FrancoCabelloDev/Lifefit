from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, F, Max, Prefetch, Q
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from core.constants import XP_PER_LEVEL
from core.filters import global_or_user_gym_filter
from .models import Exercise, RoutineExercise, UserRoutineAssignment, WorkoutRoutine, WorkoutSession, WeeklyRoutinePlan
from .serializers import (
    ExerciseSerializer,
    RoutineExerciseSerializer,
    UserRoutineAssignmentSerializer,
    WeeklyRoutinePlanSerializer,
    WorkoutRoutineSerializer,
    WorkoutSessionSerializer,
)

User = get_user_model()


class ExerciseViewSet(viewsets.ModelViewSet):
    serializer_class = ExerciseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "muscle_group", "equipment"]

    def get_queryset(self):
        user = self.request.user
        queryset = Exercise.objects.all()
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
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            serializer.save(gym=user.gym)
            return
        raise PermissionDenied("No tienes permisos para crear ejercicios.")

    def perform_update(self, serializer):
        user = self.request.user
        exercise = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and exercise.gym_id == user.gym_id:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar este ejercicio.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id):
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar este ejercicio.")


class WorkoutRoutineViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutRoutineSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "objective", "level"]

    def get_queryset(self):
        user = self.request.user
        today_sessions = Prefetch(
            "sessions",
            queryset=WorkoutSession.objects.filter(
                user=user,
                status=WorkoutSession.Status.COMPLETED,
                performed_at__date=date.today(),
            ),
            to_attr="_today_sessions",
        )
        queryset = (
            WorkoutRoutine.objects.select_related("gym", "created_by")
            .prefetch_related("routine_exercises__exercise", today_sessions)
            .annotate(
                completed_count=Count(
                    "sessions",
                    filter=Q(sessions__user=user, sessions__status=WorkoutSession.Status.COMPLETED),
                )
            )
        )
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH}:
            if user.gym_id:
                return queryset.filter(global_or_user_gym_filter(user))
            return queryset.filter(gym__isnull=True)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(global_or_user_gym_filter(user), status=WorkoutRoutine.Status.PUBLISHED)
        return queryset.filter(gym__isnull=True, status=WorkoutRoutine.Status.PUBLISHED)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            serializer.save(gym=user.gym, created_by=user)
            return
        raise PermissionDenied("No tienes permisos para crear rutinas.")

    def perform_update(self, serializer):
        user = self.request.user
        routine = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and routine.gym_id == user.gym_id:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar esta rutina.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (user.role in {User.Role.GYM_ADMIN} and instance.gym_id == user.gym_id):
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta rutina.")

    @action(detail=True, methods=["post"])
    def assign_to_user(self, request, pk=None):
        routine = self.get_object()
        user = request.user
        if user.role not in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.COACH}:
            return Response({"detail": "No tienes permisos para asignar rutinas."}, status=status.HTTP_403_FORBIDDEN)
        if user.role != User.Role.SUPER_ADMIN and routine.gym_id is not None and routine.gym_id != user.gym_id:
            return Response({"detail": "Esta rutina no pertenece a tu gimnasio."}, status=status.HTTP_403_FORBIDDEN)

        athlete_id = request.data.get("user_id")
        if not athlete_id:
            return Response({"detail": "Debes especificar user_id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            athlete = User.objects.get(id=athlete_id, gym_id=user.gym_id, role=User.Role.ATHLETE)
        except User.DoesNotExist:
            return Response({"detail": "Atleta no encontrado en tu gimnasio."}, status=status.HTTP_404_NOT_FOUND)

        from datetime import date
        assignment, created = UserRoutineAssignment.objects.get_or_create(
            user=athlete,
            routine=routine,
            status=UserRoutineAssignment.AssignmentStatus.ACTIVE,
            defaults={"assigned_by": user, "start_date": date.today()},
        )
        if not created:
            return Response({"detail": "El atleta ya tiene esta rutina asignada."}, status=status.HTTP_409_CONFLICT)

        serializer = UserRoutineAssignmentSerializer(assignment, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def my_assigned(self, request):
        user = request.user
        if user.role == User.Role.ATHLETE:
            assignments = UserRoutineAssignment.objects.filter(
                user=user,
                status=UserRoutineAssignment.AssignmentStatus.ACTIVE
            ).select_related('routine', 'routine__gym', 'routine__created_by', 'assigned_by')
        elif user.role in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.COACH}:
            if not user.gym_id:
                return Response({"detail": "No perteneces a un gimnasio."}, status=status.HTTP_400_BAD_REQUEST)
            assignments = UserRoutineAssignment.objects.filter(
                routine__gym_id=user.gym_id,
                status=UserRoutineAssignment.AssignmentStatus.ACTIVE
            ).select_related('routine', 'routine__gym', 'user', 'assigned_by')
        else:
            return Response({"detail": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)
        serializer = UserRoutineAssignmentSerializer(assignments, many=True, context={"request": request})
        return Response(serializer.data)


class RoutineExerciseViewSet(viewsets.ModelViewSet):
    serializer_class = RoutineExerciseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = RoutineExercise.objects.select_related("routine", "exercise")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.gym_id:
            return queryset.filter(routine__gym_id=user.gym_id)
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        routine = serializer.validated_data["routine"]
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and routine.gym_id == user.gym_id
        ):
            serializer.save()
            return
        raise PermissionDenied("No tienes permisos para agregar ejercicios a esta rutina.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.routine.gym_id == user.gym_id
        ):
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar este bloque de rutina.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.routine.gym_id == user.gym_id
        ):
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar este bloque de rutina.")


def _sync_user_progress(user_id, delta_points: int):
    """Update UserProgress.total_points/current_xp/level by delta_points."""
    if not delta_points:
        return
    from challenges.models import UserProgress
    progress, _ = UserProgress.objects.get_or_create(user_id=user_id)
    progress.total_points = max(0, progress.total_points + delta_points)
    progress.current_xp = max(0, progress.current_xp + delta_points)
    while progress.current_xp >= XP_PER_LEVEL:
        progress.current_xp -= XP_PER_LEVEL
        progress.level += 1
        progress.next_level_xp = XP_PER_LEVEL
    progress.save(update_fields=["total_points", "current_xp", "level", "next_level_xp"])


class WorkoutSessionViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _sync_session_points(self, session):
        if not session.user_id:
            return

        reward = 0
        if (
            session.status == WorkoutSession.Status.COMPLETED
            and session.routine
            and session.routine.points_reward
        ):
            # Solo otorgar puntos a atletas con plan Premium
            from core.permissions import get_athlete_tier
            athlete = session.user if hasattr(session, 'user') and session.user_id else \
                User.objects.filter(pk=session.user_id).first()
            if get_athlete_tier(athlete) != 'premium':
                reward = 0
            else:
                # Solo otorgar puntos si es la primera sesión completada del día para esta rutina
                already_rewarded = WorkoutSession.objects.filter(
                    user_id=session.user_id,
                    routine=session.routine,
                    status=WorkoutSession.Status.COMPLETED,
                    performed_at__date=timezone.localtime(session.performed_at).date(),
                    points_awarded__gt=0,
                ).exclude(pk=session.pk).exists()

                if not already_rewarded:
                    reward = session.routine.points_reward

        delta = reward - (session.points_awarded or 0)
        if delta:
            User.objects.filter(pk=session.user_id).update(puntos=F("puntos") + delta)
            _sync_user_progress(session.user_id, delta)
        if reward != session.points_awarded:
            session.points_awarded = reward
            session.save(update_fields=["points_awarded"])

    def get_queryset(self):
        user = self.request.user
        queryset = WorkoutSession.objects.select_related("user", "gym", "routine")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            return queryset.filter(gym_id=user.gym_id)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(user=user)
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.ATHLETE:
            routine = serializer.validated_data.get("routine")
            session_gym = user.gym or (routine.gym if routine else None)
            session = serializer.save(user=user, gym=session_gym)
        else:
            session = serializer.save()
        self._sync_session_points(session)

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            session = serializer.save()
            self._sync_session_points(session)
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id:
            session = serializer.save()
            self._sync_session_points(session)
            return
        if user.role == User.Role.ATHLETE and instance.user_id == user.id:
            routine = serializer.validated_data.get("routine") or instance.routine
            session_gym = user.gym or (routine.gym if routine else None)
            session = serializer.save(user=user, gym=session_gym)
            self._sync_session_points(session)
            return
        raise PermissionDenied("No puedes modificar esta sesión.")

    def perform_destroy(self, instance):
        user = self.request.user

        def _deduct_points():
            if instance.points_awarded and instance.user_id:
                User.objects.filter(pk=instance.user_id).update(puntos=F("puntos") - instance.points_awarded)

        if user.role == User.Role.SUPER_ADMIN or (
            user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id
        ):
            _deduct_points()
            instance.delete()
            return
        if user.role == User.Role.ATHLETE and instance.user_id == user.id:
            _deduct_points()
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta sesión.")


from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from gyms.models import CoachAssignment

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def coach_adherence(request):
    user = request.user
    today = timezone.localdate()
    if user.role not in {User.Role.COACH, User.Role.GYM_ADMIN}:
        return Response({"detail": "Sin permisos."}, status=403)

    # Atletas asignados al coach (o todos del gym si es admin)
    if user.role == User.Role.COACH:
        athlete_ids = list(
            CoachAssignment.objects.filter(coach=user, is_active=True)
            .values_list("athlete_id", flat=True)
        )
    else:
        athlete_ids = list(
            User.objects.filter(gym_id=user.gym_id, role=User.Role.ATHLETE)
            .values_list("id", flat=True)
        )

    athletes = User.objects.filter(id__in=athlete_ids).only("id", "first_name", "last_name", "email")

    since = today - timedelta(days=30)
    result = []

    for athlete in athletes:
        assignments = UserRoutineAssignment.objects.filter(
            user=athlete,
            status=UserRoutineAssignment.AssignmentStatus.ACTIVE,
        ).select_related("routine")

        routines_data = []
        for assignment in assignments:
            sessions = WorkoutSession.objects.filter(
                user=athlete,
                routine=assignment.routine,
                status=WorkoutSession.Status.COMPLETED,
                performed_at__date__gte=since,
            ).order_by("-performed_at")

            last_session = sessions.first()
            session_count = sessions.count()

            # Días desde asignación para calcular adherencia esperada (1 vez por semana)
            days_active = max((today - assignment.start_date).days, 1)
            expected = max(days_active // 7, 1)
            adherence_pct = min(round((session_count / expected) * 100), 100)

            days_since_last = None
            if last_session:
                days_since_last = (today - timezone.localtime(last_session.performed_at).date()).days

            routines_data.append({
                "routine_id": str(assignment.routine.id),
                "routine_name": assignment.routine.name,
                "assigned_since": assignment.start_date.isoformat(),
                "sessions_last_30d": session_count,
                "adherence_pct": adherence_pct,
                "last_completed": last_session.performed_at.date().isoformat() if last_session else None,
                "days_since_last": days_since_last,
                "avg_completion": float(
                    sessions.aggregate(avg=Count("completion_percentage"))["avg"] or 0
                ),
            })

        total_sessions = sum(r["sessions_last_30d"] for r in routines_data)
        avg_adherence = (
            round(sum(r["adherence_pct"] for r in routines_data) / len(routines_data))
            if routines_data else 0
        )

        # Última actividad (cualquier sesión)
        last_any = WorkoutSession.objects.filter(
            user=athlete,
            status=WorkoutSession.Status.COMPLETED,
        ).aggregate(last=Max("performed_at"))["last"]

        days_inactive = None
        if last_any:
            days_inactive = (today - timezone.localtime(last_any).date()).days

        result.append({
            "athlete_id": str(athlete.id),
            "athlete_name": f"{athlete.first_name} {athlete.last_name}".strip() or athlete.email,
            "athlete_email": athlete.email,
            "routines": routines_data,
            "total_sessions_30d": total_sessions,
            "avg_adherence_pct": avg_adherence,
            "days_inactive": days_inactive,
            "alert": days_inactive is None or days_inactive >= 7,
        })

    result.sort(key=lambda x: (not x["alert"], -x["avg_adherence_pct"]))
    return Response(result)


class WeeklyRoutinePlanViewSet(viewsets.ModelViewSet):
    serializer_class = WeeklyRoutinePlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = WeeklyRoutinePlan.objects.select_related("routine", "coach", "athlete")
        if user.role == User.Role.ATHLETE:
            return qs.filter(athlete=user)
        if user.role in {User.Role.COACH, User.Role.GYM_ADMIN}:
            athlete_id = self.request.query_params.get("athlete")
            if athlete_id:
                return qs.filter(athlete_id=athlete_id, athlete__gym_id=user.gym_id)
            return qs.filter(athlete__gym_id=user.gym_id)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.ATHLETE:
            # Atleta solo puede crear slots para sí mismo
            serializer.save(athlete=user, coach=None)
        else:
            serializer.save(coach=user)

    def perform_update(self, serializer):
        user = self.request.user
        if user.role != User.Role.ATHLETE:
            serializer.save(coach=user)
        else:
            serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        # Atleta solo puede eliminar sus propios slots sin coach
        if user.role == User.Role.ATHLETE:
            if instance.athlete_id != user.id:
                raise PermissionDenied("No puedes eliminar este slot.")
            if instance.coach_id is not None:
                raise PermissionDenied("Tu coach administra este plan.")
        instance.delete()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_coach_status(request):
    """Devuelve si el atleta tiene coach activo asignado."""
    from gyms.models import CoachAssignment
    user = request.user
    if user.role != User.Role.ATHLETE:
        return Response({"has_coach": False})
    has_coach = CoachAssignment.objects.filter(athlete=user, is_active=True).exists()
    return Response({"has_coach": has_coach})
