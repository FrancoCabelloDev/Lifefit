from django.db.models import Q


def global_or_user_gym_filter(user, gym_field="gym"):
    filters = Q(**{f"{gym_field}__isnull": True})
    if user.gym_id:
        filters |= Q(**{f"{gym_field}_id": user.gym_id})
    return filters
