from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, F, Max, Prefetch, Q
from django.utils import timezone
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from core.constants import XP_PER_LEVEL
from core.filters import global_or_user_gym_filter
from .models import Exercise, RoutineExercise, SessionExerciseLog, UserRoutineAssignment, WorkoutRoutine, WorkoutSession, WeeklyRoutinePlan
from .serializers import (
    ExerciseSerializer,
    RoutineExerciseSerializer,
    SessionExerciseLogSerializer,
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

        # Notificar al atleta
        try:
            from gyms.views import create_notification
            from gyms.models import Notification
            gym = routine.gym
            create_notification(
                recipient=athlete,
                notification_type=Notification.Type.SYSTEM,
                title="Nueva rutina asignada",
                message=f"Tu coach te asignó la rutina '{routine.name}'. Ya puedes verla en tu plan semanal.",
                actor=user,
                gym=gym,
                link=f"/{gym.slug}/panel/mi-plan-semanal" if gym else None,
            )
        except Exception:
            import logging
            logging.getLogger(__name__).warning("assign_to_user: notificación fallida", exc_info=True)

        serializer = UserRoutineAssignmentSerializer(assignment, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def swap_routine(self, request, pk=None):
        """Reemplaza atómicamente la rutina activa de un atleta por esta."""
        new_routine = self.get_object()
        user = request.user
        if user.role not in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.COACH}:
            return Response({"detail": "No tienes permisos para cambiar rutinas."}, status=status.HTTP_403_FORBIDDEN)
        if user.role != User.Role.SUPER_ADMIN and new_routine.gym_id is not None and new_routine.gym_id != user.gym_id:
            return Response({"detail": "Esta rutina no pertenece a tu gimnasio."}, status=status.HTTP_403_FORBIDDEN)

        athlete_id = request.data.get("user_id")
        if not athlete_id:
            return Response({"detail": "Debes especificar user_id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            athlete = User.objects.get(id=athlete_id, gym_id=user.gym_id, role=User.Role.ATHLETE)
        except User.DoesNotExist:
            return Response({"detail": "Atleta no encontrado en tu gimnasio."}, status=status.HTTP_404_NOT_FOUND)

        today = date.today()
        with transaction.atomic():
            # Completar todas las asignaciones activas del atleta
            UserRoutineAssignment.objects.filter(
                user=athlete,
                status=UserRoutineAssignment.AssignmentStatus.ACTIVE,
            ).update(status=UserRoutineAssignment.AssignmentStatus.COMPLETED, end_date=today)

            # Si ya existe una asignación completada para esta misma rutina, crear una nueva activa
            assignment = UserRoutineAssignment.objects.create(
                user=athlete,
                routine=new_routine,
                assigned_by=user,
                start_date=today,
                status=UserRoutineAssignment.AssignmentStatus.ACTIVE,
            )

        try:
            from gyms.views import create_notification
            from gyms.models import Notification
            gym = new_routine.gym
            create_notification(
                recipient=athlete,
                notification_type=Notification.Type.SYSTEM,
                title="Rutina actualizada",
                message=f"Tu coach actualizó tu rutina a '{new_routine.name}'. Ya puedes verla en tu plan semanal.",
                actor=user,
                gym=gym,
                link=f"/{gym.slug}/panel/mi-plan-semanal" if gym else None,
            )
        except Exception:
            import logging
            logging.getLogger(__name__).warning("swap_routine: notificación fallida", exc_info=True)

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
            qs = UserRoutineAssignment.objects.filter(
                routine__gym_id=user.gym_id,
                status=UserRoutineAssignment.AssignmentStatus.ACTIVE,
            ).select_related('routine', 'routine__gym', 'user', 'assigned_by')
            athlete_id = request.query_params.get("user_id")
            if athlete_id:
                qs = qs.filter(user_id=athlete_id)
            assignments = qs
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


import logging
logger = logging.getLogger(__name__)


def _sync_user_progress(user_id, delta_points: int):
    """Actualiza UserProgress cuando se confirman puntos."""
    if not delta_points:
        return
    from challenges.models import UserProgress
    progress, _ = UserProgress.objects.get_or_create(user_id=user_id)
    progress.total_points = max(0, progress.total_points + delta_points)
    progress.current_xp   = max(0, progress.current_xp + delta_points)
    while progress.current_xp >= XP_PER_LEVEL:
        progress.current_xp  -= XP_PER_LEVEL
        progress.level       += 1
        progress.next_level_xp = XP_PER_LEVEL
    progress.save(update_fields=["total_points", "current_xp", "level", "next_level_xp"])


class WorkoutSessionViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    # ── helpers ───────────────────────────────────────────────────────────────

    def _assert_no_duplicate_session(self, user, routine):
        """Lanza PermissionDenied si el atleta ya registró esta rutina hoy."""
        if not routine:
            return
        today = timezone.localdate()
        duplicate = WorkoutSession.objects.filter(
            user=user,
            routine=routine,
            status=WorkoutSession.Status.COMPLETED,
            performed_at__date=today,
        ).exists()
        if duplicate:
            raise PermissionDenied("Ya registraste esta rutina hoy.")

    def get_queryset(self):
        user = self.request.user
        queryset = WorkoutSession.objects.select_related("user", "gym", "routine").prefetch_related(
            "exercise_logs__routine_exercise__exercise"
        )
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and user.gym_id:
            return queryset.filter(gym_id=user.gym_id)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(user=user)
        return queryset.none()

    @action(detail=False, methods=["get"])
    def my_history(self, request):
        """Historial de sesiones completadas del atleta con logs de ejercicios."""
        user = request.user
        if user.role != User.Role.ATHLETE:
            return Response({"detail": "Solo disponible para atletas."}, status=status.HTTP_403_FORBIDDEN)

        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (ValueError, TypeError):
            page = 1
        page_size = 10

        sessions = (
            WorkoutSession.objects
            .filter(user=user, status=WorkoutSession.Status.COMPLETED)
            .select_related("routine")
            .prefetch_related("exercise_logs__routine_exercise__exercise")
            .order_by("-performed_at")
        )

        total = sessions.count()
        offset = (page - 1) * page_size
        page_qs = sessions[offset: offset + page_size]

        results = []
        for s in page_qs:
            logs = s.exercise_logs.all()
            total_ex   = logs.count()
            done_ex    = logs.filter(completed=True).count()
            results.append({
                "id":                   str(s.id),
                "routine_name":         s.routine.name if s.routine else None,
                "performed_at":         s.performed_at,
                "duration_minutes":     s.duration_minutes,
                "perceived_exertion":   s.perceived_exertion,
                "completion_percentage": float(s.completion_percentage),
                "points_awarded":       s.points_awarded,
                "exercises_done":       done_ex,
                "exercises_total":      total_ex,
                "exercise_logs": [
                    {
                        "exercise_name":  log.routine_exercise.exercise.name,
                        "sets_prescribed": log.routine_exercise.sets,
                        "sets_completed":  log.sets_completed,
                        "completed":       log.completed,
                    }
                    for log in logs
                ],
            })

        return Response({
            "count":    total,
            "page":     page,
            "pages":    -(-total // page_size),
            "results":  results,
        })

    def perform_create(self, serializer):
        user    = self.request.user
        routine = serializer.validated_data.get("routine")

        if user.role == User.Role.ATHLETE:
            # Validar duplicado antes de persistir
            if serializer.validated_data.get("status") == WorkoutSession.Status.COMPLETED:
                self._assert_no_duplicate_session(user, routine)

            session_gym = user.gym or (routine.gym if routine else None)
            session = serializer.save(user=user, gym=session_gym)

            if session.status == WorkoutSession.Status.COMPLETED:
                self._notify_coach_session_completed(session)
        else:
            session = serializer.save()

    def _notify_coach_session_completed(self, session):
        try:
            from gyms.views import create_notification
            from gyms.models import Notification, CoachAssignment
            athlete = session.user
            assignment = (
                CoachAssignment.objects
                .filter(athlete=athlete, is_active=True)
                .select_related("coach", "gym")
                .first()
            )
            if not assignment:
                return
            coach   = assignment.coach
            gym     = assignment.gym or session.gym
            routine_name = session.routine.name if session.routine else "una sesión libre"
            logs         = session.exercise_logs.all()
            total_ex     = logs.count()
            done_ex      = logs.filter(completed=True).count()
            ex_label     = f"{done_ex}/{total_ex} ejercicios" if total_ex else "sesión libre"
            pct          = int(session.completion_percentage)
            create_notification(
                recipient=coach,
                notification_type=Notification.Type.SYSTEM,
                title="Atleta completó una sesión",
                message=(
                    f"{athlete.get_full_name() or athlete.email} completó '{routine_name}' "
                    f"— {ex_label} · {pct}% completado."
                ),
                actor=athlete,
                gym=gym,
                link=f"/{gym.slug}/panel/entrenamiento/adherencia" if gym else None,
            )
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                "_notify_coach_session_completed: notificación fallida", exc_info=True
            )

    def perform_update(self, serializer):
        user     = self.request.user
        instance = self.get_object()

        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id:
            serializer.save()
            return
        if user.role == User.Role.ATHLETE and instance.user_id == user.id:
            routine     = serializer.validated_data.get("routine") or instance.routine
            session_gym = user.gym or (routine.gym if routine else None)
            serializer.save(user=user, gym=session_gym)
            return
        raise PermissionDenied("No puedes modificar esta sesión.")

    def perform_destroy(self, instance):
        user = self.request.user

        can_delete = (
            user.role == User.Role.SUPER_ADMIN
            or (user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id)
            or (user.role == User.Role.ATHLETE and instance.user_id == user.id)
        )
        if not can_delete:
            raise PermissionDenied("No puedes eliminar esta sesión.")

        instance.delete()


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

        # Contar TODAS las sesiones completadas (no solo las de rutinas asignadas)
        total_sessions = WorkoutSession.objects.filter(
            user=athlete,
            status=WorkoutSession.Status.COMPLETED,
            performed_at__date__gte=since,
        ).count()

        # Adherencia: misma fórmula que el panel (plan semanal × 4 semanas)
        weekly_slots = WeeklyRoutinePlan.objects.filter(athlete=athlete).count()
        if weekly_slots:
            expected = max(weekly_slots * 4, 1)
            avg_adherence = min(round((total_sessions / expected) * 100), 100)
        elif routines_data:
            avg_adherence = round(sum(r["adherence_pct"] for r in routines_data) / len(routines_data))
        else:
            avg_adherence = 0

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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def approve_week(request, athlete_id):
    """
    POST /api/workouts/coach/athlete/{athlete_id}/approve-week/
    Body: { "week_start": "YYYY-MM-DD" }   ← debe ser lunes

    El coach cierra la semana del atleta y otorga los puntos configurados
    en GymPointsConfig.workout_week_points, siempre que el atleta haya
    completado TODAS las sesiones de su plan semanal esa semana.
    """
    coach = request.user
    if coach.role not in {User.Role.COACH, User.Role.GYM_ADMIN, User.Role.SUPER_ADMIN}:
        return Response({"detail": "Sin permisos."}, status=403)

    # ── 1. Validar existencia del atleta y asignación ─────────────────────────
    athlete_qs = User.objects.filter(id=athlete_id, role=User.Role.ATHLETE)
    if coach.role != User.Role.SUPER_ADMIN:
        athlete_qs = athlete_qs.filter(gym_id=coach.gym_id)
    athlete = athlete_qs.first()
    if not athlete:
        return Response({"detail": "Atleta no encontrado."}, status=404)

    if coach.role == User.Role.COACH:
        assigned = CoachAssignment.objects.filter(
            coach=coach, athlete=athlete, is_active=True
        ).exists()
        if not assigned:
            return Response({"detail": "Este atleta no está asignado a ti."}, status=403)

    # ── 2. Parsear y validar week_start ───────────────────────────────────────
    raw_week_start = request.data.get("week_start")
    if not raw_week_start:
        return Response({"detail": "El campo 'week_start' es obligatorio."}, status=400)

    try:
        from datetime import date
        week_start = date.fromisoformat(str(raw_week_start))
    except ValueError:
        return Response({"detail": "Formato inválido. Usa YYYY-MM-DD."}, status=400)

    if week_start.weekday() != 0:
        return Response({"detail": "week_start debe ser lunes (weekday=0)."}, status=400)

    week_end = week_start + timedelta(days=6)

    # ── 3. Verificar idempotencia: la semana no ha sido aprobada ya ───────────
    from gamification.models import UserPoints, GymPointsConfig
    already_approved = UserPoints.objects.filter(
        user=athlete,
        source="workout_week",
        week_start=week_start,
    ).exists()
    if already_approved:
        return Response({"detail": "Esta semana ya fue aprobada."}, status=400)

    # ── 4. Verificar que se completaron todos los slots del plan ──────────────
    total_slots = WeeklyRoutinePlan.objects.filter(athlete=athlete).count()
    if total_slots == 0:
        return Response(
            {"detail": "El atleta no tiene plan semanal configurado."},
            status=400,
        )

    sessions_completed = WorkoutSession.objects.filter(
        user=athlete,
        status=WorkoutSession.Status.COMPLETED,
        performed_at__date__gte=week_start,
        performed_at__date__lte=week_end,
    ).count()

    if sessions_completed < total_slots:
        return Response(
            {
                "detail": (
                    f"Semana incompleta: {sessions_completed}/{total_slots} sesiones. "
                    "El atleta debe completar todas las rutinas del plan."
                ),
                "sessions_completed": sessions_completed,
                "sessions_expected":  total_slots,
            },
            status=400,
        )

    # ── 5. Obtener puntos configurados para el gym ────────────────────────────
    gym = athlete.gym
    try:
        week_pts = GymPointsConfig.objects.get(gym=gym).workout_week_points
    except GymPointsConfig.DoesNotExist:
        week_pts = 100  # fallback razonable

    # ── 6. Crear entrada de puntos y acreditar al atleta ─────────────────────
    from gamification.views import _sync_user_progress

    with transaction.atomic():
        entry = UserPoints.objects.create(
            user=athlete,
            points=week_pts,
            pending_points=week_pts,
            status=UserPoints.Status.APPROVED,
            source="workout_week",
            week_start=week_start,
            reviewed_by=coach,
            reviewed_at=timezone.now(),
            description=(
                f"Semana completa {week_start.strftime('%d/%m')}–"
                f"{week_end.strftime('%d/%m/%Y')} "
                f"({sessions_completed}/{total_slots} sesiones)"
            ),
        )
    # Sincronizar nivel fuera de la transacción (no es crítico para la integridad)
    _sync_user_progress(athlete.pk, week_pts)

    # ── 7. Notificar al atleta ────────────────────────────────────────────────
    _notify_week_approved(entry, approved_by=coach, week_end=week_end)

    return Response(
        {
            "week_start":         week_start.isoformat(),
            "week_end":           week_end.isoformat(),
            "points_awarded":     week_pts,
            "sessions_completed": sessions_completed,
            "sessions_expected":  total_slots,
        },
        status=201,
    )


def _notify_week_approved(entry: "UserPoints", approved_by, week_end) -> None:
    """Notifica al atleta que su semana fue aprobada y sus puntos acreditados."""
    try:
        from gyms.views import create_notification
        from gyms.models import Notification

        athlete = entry.user
        gym     = athlete.gym
        create_notification(
            recipient=athlete,
            notification_type=Notification.Type.SYSTEM,
            title="¡Semana aprobada!",
            message=(
                f"{approved_by.get_full_name() or approved_by.email} aprobó tu semana "
                f"hasta el {week_end.strftime('%d/%m/%Y')}. "
                f"Se acreditaron {entry.points} pts a tu cuenta."
            ),
            actor=approved_by,
            gym=gym,
            link=f"/{gym.slug}/panel/puntos" if gym else None,
        )
    except Exception:
        logger.warning("_notify_week_approved: notificación fallida", exc_info=True)


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
            serializer.save(athlete=user, coach=None)
            return

        instance = serializer.save(coach=user)

        # Notificar al atleta cuando el coach configura su plan semanal
        try:
            from gyms.views import create_notification
            from gyms.models import Notification
            athlete = instance.athlete
            routine = instance.routine
            day_label = instance.get_day_of_week_display()
            gym = routine.gym if routine else None
            create_notification(
                recipient=athlete,
                notification_type=Notification.Type.SYSTEM,
                title="Plan semanal actualizado",
                message=f"Tu coach programó '{routine.name}' los {day_label}. Revisa tu plan semanal.",
                actor=user,
                gym=gym,
                link=f"/{gym.slug}/panel/mi-plan-semanal" if gym else None,
            )
        except Exception:
            import logging
            logging.getLogger(__name__).warning("weekly_plan perform_create: notificación fallida", exc_info=True)

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
def coach_athlete_detail(request, athlete_id):
    """
    Detalle completo de un atleta para su coach.
    GET /api/workouts/coach/athlete/{athlete_id}/

    Devuelve:
    - Rutinas activas con ejercicios
    - Plan semanal actual
    - Últimas 5 sesiones con logs de ejercicios
    - % adherencia últimos 30 días
    - Resumen de actividad
    """
    user = request.user
    if user.role not in {User.Role.COACH, User.Role.GYM_ADMIN, User.Role.SUPER_ADMIN}:
        return Response({"detail": "Sin permisos."}, status=403)

    # Verificar que el atleta pertenece al gym del coach
    athlete_qs = User.objects.filter(id=athlete_id, role=User.Role.ATHLETE)
    if user.role != User.Role.SUPER_ADMIN:
        athlete_qs = athlete_qs.filter(gym_id=user.gym_id)
    athlete = athlete_qs.first()
    if not athlete:
        return Response({"detail": "Atleta no encontrado."}, status=404)

    # Verificar asignación coach-atleta (solo coaches, admins ven a todos)
    if user.role == User.Role.COACH:
        assigned = CoachAssignment.objects.filter(
            coach=user, athlete=athlete, is_active=True
        ).exists()
        if not assigned:
            return Response({"detail": "Este atleta no está asignado a ti."}, status=403)

    today = timezone.localdate()
    since_30d = today - timedelta(days=30)

    # ── 1. Rutinas activas ────────────────────────────────────────────────────
    active_assignments = (
        UserRoutineAssignment.objects
        .filter(user=athlete, status=UserRoutineAssignment.AssignmentStatus.ACTIVE)
        .select_related("routine", "assigned_by")
        .prefetch_related("routine__routine_exercises__exercise")
    )
    routines_data = []
    for a in active_assignments:
        r = a.routine
        routines_data.append({
            "assignment_id":  str(a.id),
            "routine_id":     str(r.id),
            "routine_name":   r.name,
            "level":          r.level,
            "duration_minutes": r.duration_minutes,
            "points_reward":  r.points_reward,
            "assigned_since": a.start_date.isoformat(),
            "assigned_by":    a.assigned_by.get_full_name() if a.assigned_by else None,
            "exercises": [
                {
                    "id":           str(re.id),
                    "name":         re.exercise.name,
                    "sets":         re.sets,
                    "reps":         re.reps,
                    "weight_kg":    float(re.weight_kg) if re.weight_kg else None,
                    "rest_seconds": re.rest_seconds,
                    "order":        re.order,
                }
                for re in r.routine_exercises.all()
            ],
        })

    # ── 2. Plan semanal ───────────────────────────────────────────────────────
    weekly_slots = (
        WeeklyRoutinePlan.objects
        .filter(athlete=athlete)
        .select_related("routine", "coach")
        .order_by("day_of_week")
    )
    weekly_plan = [
        {
            "slot_id":      str(slot.id),
            "day_of_week":  slot.day_of_week,
            "day_label":    slot.get_day_of_week_display(),
            "routine_id":   str(slot.routine.id),
            "routine_name": slot.routine.name,
            "suggested_time": slot.suggested_time.strftime("%H:%M") if slot.suggested_time else None,
            "notes":        slot.notes,
            "set_by_coach": slot.coach_id is not None,
        }
        for slot in weekly_slots
    ]

    # ── 3. Semanas (últimas 4) con sesiones agrupadas ────────────────────────
    from collections import defaultdict
    from gamification.models import UserPoints

    _MONTHS_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]

    def _week_label(ws, we):
        m_end = _MONTHS_ES[we.month - 1]
        if ws.month == we.month:
            return f"{ws.day} – {we.day} {m_end}"
        return f"{ws.day} {_MONTHS_ES[ws.month - 1]} – {we.day} {m_end}"

    def _serialize_session(s):
        logs     = list(s.exercise_logs.all())
        done_ex  = sum(1 for log in logs if log.completed)
        return {
            "session_id":            str(s.id),
            "routine_name":          s.routine.name if s.routine else None,
            "performed_at":          s.performed_at.isoformat(),
            "duration_minutes":      s.duration_minutes,
            "perceived_exertion":    s.perceived_exertion,
            "completion_percentage": float(s.completion_percentage),
            "exercises_done":        done_ex,
            "exercises_total":       len(logs),
            "exercise_logs": [
                {
                    "exercise_name":   log.routine_exercise.exercise.name,
                    "sets_prescribed": log.routine_exercise.sets,
                    "sets_completed":  log.sets_completed,
                    "completed":       log.completed,
                }
                for log in logs
            ],
        }

    # Solo la semana actual (lunes → domingo)
    current_week_start = today - timedelta(days=today.weekday())
    week_starts = [current_week_start]
    current_week_end = current_week_start + timedelta(days=6)

    # Sesiones de la semana actual
    all_recent_sessions = (
        WorkoutSession.objects
        .filter(
            user=athlete,
            status=WorkoutSession.Status.COMPLETED,
            performed_at__date__gte=current_week_start,
            performed_at__date__lte=current_week_end,
        )
        .select_related("routine")
        .prefetch_related("exercise_logs__routine_exercise__exercise")
        .order_by("-performed_at")
    )

    # Agrupar sesiones por su semana (lunes de esa semana)
    sessions_by_week: dict = defaultdict(list)
    for s in all_recent_sessions:
        s_date = timezone.localtime(s.performed_at).date()
        s_week_start = s_date - timedelta(days=s_date.weekday())
        sessions_by_week[s_week_start].append(s)

    # Aprobación de la semana actual (si existe)
    approved_weeks = {
        p.week_start: p
        for p in UserPoints.objects.filter(
            user=athlete,
            source="workout_week",
            week_start=current_week_start,
        )
    }

    total_slots = len(weekly_plan)
    weeks_data = []
    for ws in week_starts:
        we = ws + timedelta(days=6)
        week_sessions = sessions_by_week.get(ws, [])
        sessions_count = len(week_sessions)
        approved_entry = approved_weeks.get(ws)
        weeks_data.append({
            "week_start":         ws.isoformat(),
            "week_end":           we.isoformat(),
            "week_label":         _week_label(ws, we),
            "sessions_completed": sessions_count,
            "sessions_expected":  total_slots,
            "all_completed":      total_slots > 0 and sessions_count >= total_slots,
            "approved":           approved_entry is not None,
            "points_awarded":     approved_entry.points if approved_entry else 0,
            "sessions":           [_serialize_session(s) for s in week_sessions],
        })

    # ── 4. Adherencia últimos 30 días ─────────────────────────────────────────
    sessions_30d = WorkoutSession.objects.filter(
        user=athlete,
        status=WorkoutSession.Status.COMPLETED,
        performed_at__date__gte=since_30d,
    )
    total_sessions_30d = sessions_30d.count()

    expected_sessions = max(len(weekly_plan) * 4, 1)
    adherence_pct = min(round((total_sessions_30d / expected_sessions) * 100), 100)

    last_session = (
        WorkoutSession.objects
        .filter(user=athlete, status=WorkoutSession.Status.COMPLETED)
        .order_by("-performed_at")
        .only("performed_at")
        .first()
    )
    days_inactive = None
    if last_session:
        days_inactive = (today - timezone.localtime(last_session.performed_at).date()).days

    # ── 5. Puntos configurados para el gym ───────────────────────────────────
    from gamification.models import GymPointsConfig as _GPC
    try:
        week_points = _GPC.objects.get(gym=athlete.gym).workout_week_points
    except _GPC.DoesNotExist:
        week_points = 100

    # ── 6. Resumen del atleta ─────────────────────────────────────────────────
    athlete_summary = {
        "id":           str(athlete.id),
        "full_name":    athlete.get_full_name() or athlete.email,
        "email":        athlete.email,
        "nivel":        athlete.nivel,
        "puntos":       athlete.puntos,
        "member_since": athlete.date_joined.date().isoformat(),
    }

    return Response({
        "athlete":         athlete_summary,
        "active_routines": routines_data,
        "weekly_plan":     weekly_plan,
        "weeks":           weeks_data,
        "week_points":     week_points,
        "adherence": {
            "sessions_last_30d": total_sessions_30d,
            "adherence_pct":     adherence_pct,
            "days_inactive":     days_inactive,
            "alert":             days_inactive is None or days_inactive >= 7,
        },
    })


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
