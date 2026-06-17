from django.urls import path
from . import views

urlpatterns = [
    path("my-stats/", views.my_stats),
    path("ranking/", views.ranking),
]
