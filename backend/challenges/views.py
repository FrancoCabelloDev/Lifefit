from django.contrib.auth import get_user_model
from rest_framework import filters, permissions, status, viewsets
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from core.filters import global_or_user_gym_filter
from .models import Badge, Challenge, ChallengeParticipation, UserBadge
from .serializers import (
    BadgeSerializer,
    ChallengeParticipationSerializer,
    ChallengeSerializer,
    UserBadgeSerializer,
)
from .services import (
    approve_participation,
    declare_challenge_winner,
    notify_gym_athletes_new_challenge,
    reject_participation,
    submit_evidence,
    sync_all_active_participations,
    sync_participation_progress,
)

User = get_user_model()

# Roles que pueden gestionar retos y verificar participaciones
STAFF_ROLES = {User.Role.GYM_ADMIN, User.Role.COACH, User.Role.NUTRITIONIST}


class ChallengeViewSet(viewsets.ModelViewSet):
    serializer_class = ChallengeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "description", "type", "status"]

    def get_queryset(self):
        from django.db.models import Prefetch
        user = self.request.user
        # Prefetch participaciones activas para que get_current_participants
        # y get_is_full en el serializer no generen N+1 queries.
        active_participations = ChallengeParticipation.objects.filter(
            status__in=[
                ChallengeParticipation.ParticipationStatus.JOINED,
                ChallengeParticipation.ParticipationStatus.PENDING_REVIEW,
                ChallengeParticipation.ParticipationStatus.COMPLETED,
            ]
        )
        queryset = Challenge.objects.select_related("gym", "responsible").prefetch_related(
            Prefetch("participants", queryset=active_participations, to_attr="_active_participants")
        )
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in STAFF_ROLES:
            # Staff ve todos los retos de su gym (para gestión), sin filtro de target_role
            if user.gym_id:
                return queryset.filter(global_or_user_gym_filter(user))
            return queryset.filter(gym__isnull=True)
        if user.role == User.Role.ATHLETE:
            from datetime import date as date_type
            from django.db.models import Q

            # Atletas ven retos activos dirigidos a todos o específicamente a atletas.
            # Se excluyen retos ya vencidos (end_date pasado), salvo que el atleta ya
            # esté participando (para no perder visibilidad de su evidencia/estado),
            # ya que el status no se sincroniza automáticamente con la fecha de fin.
            return queryset.filter(
                global_or_user_gym_filter(user),
                status=Challenge.Status.ACTIVE,
                target_role__in=[Challenge.TargetRole.ALL, Challenge.TargetRole.ATHLETE],
            ).filter(
                Q(end_date__gte=date_type.today()) | Q(participants__user=user)
            ).distinct()
        return queryset.filter(gym__isnull=True, status=Challenge.Status.ACTIVE)

    def perform_create(self, serializer):
        # Save primero (lógica original)
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            responsible = serializer.validated_data.get("responsible") or user
            instance = serializer.save(responsible=responsible)
        elif user.role in STAFF_ROLES and user.gym_id:
            responsible = serializer.validated_data.get("responsible") or user
            if hasattr(responsible, "gym_id") and responsible.gym_id != user.gym_id:
                responsible = user
            vtype = serializer.validated_data.get("verification_type")
            if not vtype:
                reto_type = serializer.validated_data.get("type", "")
                vtype = (
                    Challenge.VerificationType.AUTOMATIC
                    if reto_type in Challenge.AUTO_VERIFIABLE_TYPES
                    else Challenge.VerificationType.MANUAL
                )
            instance = serializer.save(gym=user.gym, responsible=responsible, verification_type=vtype)
        else:
            raise PermissionDenied("No tienes permisos para crear retos.")

        # Notificar atletas solo cuando el reto se crea como activo
        if instance.status == Challenge.Status.ACTIVE:
            try:
                notify_gym_athletes_new_challenge(instance)
            except Exception:
                import logging
                logging.getLogger(__name__).warning(
                    "No se pudo notificar a atletas sobre reto %s", instance.pk, exc_info=True
                )

    def _is_manageable_by(self, user, instance):
        if user.role == User.Role.SUPER_ADMIN:
            return True
        if user.role in STAFF_ROLES:
            if instance.gym_id == user.gym_id:
                return True
            if instance.gym_id is None and self.get_queryset().filter(id=instance.id).exists():
                return True
        return False

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if not self._is_manageable_by(user, instance):
            raise PermissionDenied("No puedes modificar este reto.")
        responsible = serializer.validated_data.get("responsible") or instance.responsible
        if responsible and hasattr(responsible, "gym_id") and user.gym_id and responsible.gym_id != user.gym_id:
            responsible = user
        gym = instance.gym or (user.gym if user.role != User.Role.SUPER_ADMIN else None)
        prev_status = instance.status
        updated = serializer.save(gym=gym, responsible=responsible)
        # Notificar si el reto acaba de activarse (draft → active)
        if prev_status != Challenge.Status.ACTIVE and updated.status == Challenge.Status.ACTIVE:
            try:
                notify_gym_athletes_new_challenge(updated)
            except Exception:
                import logging
                logging.getLogger(__name__).warning(
                    "No se pudo notificar a atletas sobre reto activado %s", updated.pk, exc_info=True
                )

    def perform_destroy(self, instance):
        user = self.request.user
        if not self._is_manageable_by(user, instance):
            raise PermissionDenied("No puedes eliminar este reto.")
        instance.delete()

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def join(self, request, pk=None):
        from datetime import date as date_type
        from django.db import transaction as db_transaction

        challenge = self.get_object()
        user = request.user
        today = date_type.today()

        # ── Guard 1: reto activo ─────────────────────────────────────────────
        if challenge.status != Challenge.Status.ACTIVE:
            raise ValidationError({"detail": "No puedes inscribirte en un reto que no está activo."})

        # ── Guard 2: fechas válidas ──────────────────────────────────────────
        if challenge.end_date < today:
            raise ValidationError({"detail": "Este reto ya ha finalizado."})
        if challenge.start_date > today:
            raise ValidationError({
                "detail": f"Este reto aún no ha comenzado. Inicia el {challenge.start_date.strftime('%d/%m/%Y')}."
            })

        # ── Determinar usuario objetivo ──────────────────────────────────────
        if user.role == User.Role.SUPER_ADMIN:
            target_user_id = request.data.get("user") or user.id
            target_user = User.objects.get(pk=target_user_id)
        else:
            target_user = user
            if challenge.gym_id and target_user.gym_id != challenge.gym_id:
                raise PermissionDenied("No perteneces a este gimnasio.")

        # ── Guard 3: target_role ─────────────────────────────────────────────
        if (
            challenge.target_role != Challenge.TargetRole.ALL
            and target_user.role != challenge.target_role
            and target_user.role != User.Role.SUPER_ADMIN
        ):
            role_display = challenge.get_target_role_display()
            raise PermissionDenied(
                f"Este reto está dirigido exclusivamente a: {role_display}."
            )

        # ── Guard 4: max_participants (atómico para evitar race conditions) ──
        if challenge.max_participants is not None:
            with db_transaction.atomic():
                # Re-leer con lock para serializar inscripciones concurrentes
                locked_challenge = Challenge.objects.select_for_update().get(pk=challenge.pk)

                # Ya inscrito → permitir (idempotente)
                already_joined = ChallengeParticipation.objects.filter(
                    challenge=locked_challenge,
                    user=target_user,
                ).exists()

                if not already_joined:
                    # Contar solo inscripciones "activas" (no dropped/rejected)
                    ACTIVE_STATUSES = [
                        ChallengeParticipation.ParticipationStatus.JOINED,
                        ChallengeParticipation.ParticipationStatus.PENDING_REVIEW,
                        ChallengeParticipation.ParticipationStatus.COMPLETED,
                    ]
                    current_count = ChallengeParticipation.objects.filter(
                        challenge=locked_challenge,
                        status__in=ACTIVE_STATUSES,
                    ).count()

                    if current_count >= locked_challenge.max_participants:
                        raise ValidationError({
                            "detail": (
                                f"Este reto ya alcanzó el límite de "
                                f"{locked_challenge.max_participants} participantes."
                            )
                        })

                participation, created = ChallengeParticipation.objects.get_or_create(
                    challenge=locked_challenge,
                    user=target_user,
                    defaults={"progress": 0},
                )
        else:
            # Sin límite: inscripción directa
            participation, created = ChallengeParticipation.objects.get_or_create(
                challenge=challenge,
                user=target_user,
                defaults={"progress": 0},
            )

        serializer = ChallengeParticipationSerializer(participation, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def leaderboard(self, request, pk=None):
        """
        Ranking de participantes de un reto ordenado por progreso descendente.
        Accesible para staff y atletas del gym.
        """
        challenge = self.get_object()
        user = request.user

        if user.gym_id and challenge.gym_id and challenge.gym_id != user.gym_id:
            raise PermissionDenied("No tienes acceso a este reto.")

        participations = (
            ChallengeParticipation.objects
            .filter(
                challenge=challenge,
                status__in=[
                    ChallengeParticipation.ParticipationStatus.JOINED,
                    ChallengeParticipation.ParticipationStatus.PENDING_REVIEW,
                    ChallengeParticipation.ParticipationStatus.COMPLETED,
                ]
            )
            .select_related("user")
            .order_by("-is_winner", "-progress", "-points_earned")[:20]
        )

        data = [
            {
                "participation_id": str(p.pk),
                "user_id": str(p.user_id),
                "full_name": f"{p.user.first_name} {p.user.last_name}".strip() or p.user.email,
                "progress": p.progress,
                "progress_pct": min(100, round(p.progress * 100 / challenge.goal_value)) if challenge.goal_value else 0,
                "points_earned": p.points_earned,
                "status": p.status,
                "is_winner": p.is_winner,
            }
            for p in participations
        ]
        return Response(data)

    @action(detail=True, methods=["post"], url_path="declare-winner")
    def declare_winner(self, request, pk=None):
        """
        Staff declara al ganador del reto.
        Body: { "participation_id": "<uuid>", "bonus_points": 0 }

        - Marca is_winner = True en la participación.
        - Completa la participación si no estaba completada.
        - Otorga bonus_points adicionales.
        - Notifica al ganador y a todos los atletas del gym.
        """
        challenge = self.get_object()
        user = request.user

        if user.role not in STAFF_ROLES | {User.Role.SUPER_ADMIN}:
            raise PermissionDenied("Solo staff puede declarar ganadores.")

        if challenge.gym_id and user.gym_id and challenge.gym_id != user.gym_id:
            raise PermissionDenied("No tienes acceso a este reto.")

        participation_id = request.data.get("participation_id")
        bonus_points = int(request.data.get("bonus_points", 0))

        if not participation_id:
            raise ValidationError({"participation_id": "Este campo es requerido."})

        try:
            participation = ChallengeParticipation.objects.select_related(
                "user", "challenge"
            ).get(pk=participation_id, challenge=challenge)
        except ChallengeParticipation.DoesNotExist:
            raise ValidationError({"participation_id": "Participación no encontrada en este reto."})

        winner = declare_challenge_winner(
            participation,
            declared_by_id=user.id,
            bonus_points=max(0, bonus_points),
        )
        return Response(
            ChallengeParticipationSerializer(winner, context={"request": request}).data
        )


class ChallengeParticipationViewSet(viewsets.ModelViewSet):
    serializer_class = ChallengeParticipationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = ChallengeParticipation.objects.select_related(
            "challenge", "user", "challenge__gym", "verified_by"
        )
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in STAFF_ROLES and user.gym_id:
            return queryset.filter(challenge__gym_id=user.gym_id)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(user=user)
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role == User.Role.ATHLETE:
            challenge = serializer.validated_data["challenge"]
            if challenge.gym_id and challenge.gym_id != user.gym_id:
                raise PermissionDenied("No puedes unirte a retos de otro gym.")
            serializer.save(user=user)
            return
        raise PermissionDenied("No tienes permisos para crear participaciones manualmente.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in STAFF_ROLES and instance.challenge.gym_id == user.gym_id:
            serializer.save()
            return
        if user.role == User.Role.ATHLETE and instance.user_id == user.id:
            serializer.save(user=user)
            return
        raise PermissionDenied("No puedes modificar esta participación.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (
            user.role == User.Role.GYM_ADMIN and instance.challenge.gym_id == user.gym_id
        ):
            instance.delete()
            return
        if user.role == User.Role.ATHLETE and instance.user_id == user.id:
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta participación.")

    # ── Verificación manual ──────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="submit-evidence")
    def submit_evidence_action(self, request, pk=None):
        """
        El atleta envía evidencia textual para un reto de verificación manual.
        Cambia el estado a PENDING_REVIEW, notificando al responsable.

        Body: { "evidence_note": "Corrí 5km hoy, adjunto captura de Strava." }
        """
        participation = self.get_object()

        if request.user.role != User.Role.ATHLETE or participation.user_id != request.user.id:
            raise PermissionDenied("Solo el atleta participante puede enviar evidencia.")

        note = request.data.get("evidence_note", "").strip()
        if not note:
            raise ValidationError({"evidence_note": "La evidencia no puede estar vacía."})

        try:
            updated = submit_evidence(participation, note)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})

        return Response(
            ChallengeParticipationSerializer(updated, context={"request": request}).data
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """
        Coach o nutricionista aprueba una participación en revisión.
        Otorga los puntos al atleta automáticamente.

        Solo aplicable a retos con verification_type = manual.
        """
        participation = self.get_object()
        user = request.user

        if user.role not in STAFF_ROLES:
            raise PermissionDenied("Solo staff puede aprobar participaciones.")

        if participation.challenge.gym_id != user.gym_id:
            raise PermissionDenied("No puedes aprobar participaciones de otro gimnasio.")

        try:
            updated = approve_participation(participation, verified_by_id=user.id)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})

        return Response(
            ChallengeParticipationSerializer(updated, context={"request": request}).data
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """
        Coach o nutricionista rechaza la participación con un motivo.
        El atleta queda en estado REJECTED y puede reenviar evidencia.

        Body: { "rejection_note": "La imagen no corresponde al reto." }
        """
        participation = self.get_object()
        user = request.user

        if user.role not in STAFF_ROLES:
            raise PermissionDenied("Solo staff puede rechazar participaciones.")

        if participation.challenge.gym_id != user.gym_id:
            raise PermissionDenied("No puedes rechazar participaciones de otro gimnasio.")

        note = request.data.get("rejection_note", "").strip()
        if not note:
            raise ValidationError({"rejection_note": "Debes indicar el motivo del rechazo."})

        try:
            updated = reject_participation(participation, verified_by_id=user.id, rejection_note=note)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})

        return Response(
            ChallengeParticipationSerializer(updated, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], url_path="sync-progress")
    def sync_progress(self, request, pk=None):
        """
        Fuerza la resincronización del progreso de una participación automática.
        Útil para corregir datos en caso de que una señal fallara.

        Disponible para staff y super_admin.
        """
        participation = self.get_object()
        user = request.user

        if user.role not in STAFF_ROLES | {User.Role.SUPER_ADMIN}:
            raise PermissionDenied("Solo staff puede sincronizar el progreso.")

        updated = sync_participation_progress(participation)
        return Response(
            ChallengeParticipationSerializer(updated, context={"request": request}).data
        )

    @action(detail=False, methods=["post"], url_path="sync-all", permission_classes=[permissions.IsAuthenticated])
    def sync_all(self, request):
        """
        Resincroniza todas las participaciones automáticas activas del gimnasio.
        Solo gym_admin y super_admin.
        """
        user = request.user
        if user.role not in {User.Role.GYM_ADMIN, User.Role.SUPER_ADMIN}:
            raise PermissionDenied("Solo administradores pueden lanzar sincronización masiva.")

        result = sync_all_active_participations()
        return Response(result)

    @action(detail=False, methods=["get"], url_path="pending-review")
    def pending_review(self, request):
        """
        Lista participaciones pendientes de revisión manual para el gym del staff.
        Permite al coach/nutricionista ver qué retos esperan su aprobación.
        """
        user = request.user
        if user.role not in STAFF_ROLES:
            raise PermissionDenied("Solo staff puede ver la bandeja de revisión.")

        queryset = (
            self.get_queryset()
            .filter(status=ChallengeParticipation.ParticipationStatus.PENDING_REVIEW)
            .order_by("last_update")
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ChallengeParticipationSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = ChallengeParticipationSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)


class BadgeViewSet(viewsets.ModelViewSet):
    serializer_class = BadgeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Badge.objects.select_related("gym")
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
        raise PermissionDenied("No puedes crear insignias.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == User.Role.SUPER_ADMIN:
            serializer.save()
            return
        if user.role in {User.Role.GYM_ADMIN, User.Role.COACH} and instance.gym_id == user.gym_id:
            serializer.save()
            return
        raise PermissionDenied("No puedes modificar esta insignia.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN or (
            user.role == User.Role.GYM_ADMIN and instance.gym_id == user.gym_id
        ):
            instance.delete()
            return
        raise PermissionDenied("No puedes eliminar esta insignia.")


class UserBadgeViewSet(viewsets.ModelViewSet):
    serializer_class = UserBadgeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = UserBadge.objects.select_related("badge", "user")
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role in STAFF_ROLES and user.gym_id:
            return queryset.filter(badge__gym_id=user.gym_id)
        if user.role == User.Role.ATHLETE:
            return queryset.filter(user=user)
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.COACH}:
            serializer.save()
            return
        raise PermissionDenied("No puedes asignar insignias.")




class AthleteDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from datetime import date
        from workouts.models import WorkoutSession
        from nutrition.models import UserMealLog, UserNutritionPlan
        from gamification.models import UserPoints
        from django.db.models import Sum

        user = request.user

        total_points = (
            UserPoints.objects
            .filter(user=user, status=UserPoints.Status.APPROVED)
            .aggregate(total=Sum("points"))["total"] or 0
        )
        active_challenges = ChallengeParticipation.objects.filter(
            user=user,
            status=ChallengeParticipation.ParticipationStatus.JOINED,
        ).count()
        badges_count = UserBadge.objects.filter(user=user).count()
        sessions_today = WorkoutSession.objects.filter(
            user=user,
            status=WorkoutSession.Status.COMPLETED,
            performed_at__date=date.today(),
        ).count()
        meals_today = UserMealLog.objects.filter(
            user=user, date=date.today(), status="completed",
        ).count()
        has_active_plan = UserNutritionPlan.objects.filter(
            user=user, status="active",
        ).exists()

        return Response({
            "total_points":    total_points,
            "active_challenges": active_challenges,
            "badges_count":    badges_count,
            "sessions_today":  sessions_today,
            "meals_today":     meals_today,
            "has_active_plan": has_active_plan,
        })
