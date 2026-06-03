from django.urls import path
from . import views

urlpatterns = [
    path("my-streak/", views.my_streak),
    path("my-stats/", views.my_stats),
]
