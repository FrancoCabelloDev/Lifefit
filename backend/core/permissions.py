from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated

User = get_user_model()


class IsSuperAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.Role.SUPER_ADMIN


class IsGymAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.Role.GYM_ADMIN


class IsCoachOrBetter(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.role in {User.Role.SUPER_ADMIN, User.Role.GYM_ADMIN, User.Role.COACH}


class IsNutritionist(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.Role.NUTRITIONIST


class IsReceptionist(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.Role.RECEPTIONIST


class IsGymAdminOrReceptionist(IsAuthenticated):
    """Permite dar de baja atletas: solo gym_admin y receptionist."""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role in {
            User.Role.GYM_ADMIN,
            User.Role.RECEPTIONIST,
        }


class IsAthlete(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.Role.ATHLETE


def get_athlete_tier(user) -> str | None:
    """Return the active subscription tier ('basic'|'premium') for an athlete, or None."""
    if user.role != User.Role.ATHLETE:
        return None
    from gyms.models import GymSubscription
    sub = (
        GymSubscription.objects
        .filter(athlete=user, status="active")
        .select_related("plan")
        .first()
    )
    if sub and sub.plan:
        return sub.plan.tier
    return None
