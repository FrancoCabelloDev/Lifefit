from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .serializers import CustomTokenObtainPairSerializer
from .views import (
    ChangePasswordView,
    GoogleCallbackView,
    GoogleDisconnectView,
    GoogleLoginView,
    RegisterView,
    UserMeView,
    UserViewSet,
)
from rest_framework_simplejwt.views import TokenObtainPairView


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


router = DefaultRouter()
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", UserMeView.as_view(), name="user_me"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("google/login/", GoogleLoginView.as_view(), name="google_login"),
    path("google/callback/", GoogleCallbackView.as_view(), name="google_callback"),
    path("google/disconnect/", GoogleDisconnectView.as_view(), name="google_disconnect"),
    path("", include(router.urls)),
]
