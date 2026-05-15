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
