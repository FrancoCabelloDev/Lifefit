import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
import json

User = get_user_model()
athlete = User.objects.filter(role="athlete").select_related("gym").first()
if athlete:
    refresh = RefreshToken.for_user(athlete)
    gym_slug = athlete.gym.slug if athlete.gym else ""
    print(json.dumps({
        "email": athlete.email,
        "gym_slug": gym_slug,
        "access": str(refresh.access_token),
        "id": str(athlete.id),
        "first_name": athlete.first_name,
        "last_name": athlete.last_name,
        "role": athlete.role,
        "gym_id": str(athlete.gym_id) if athlete.gym_id else ""
    }))
else:
    print("NO ATHLETES FOUND")
