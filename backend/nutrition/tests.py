from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from gyms.models import Gym, Notification
from .models import NutritionPlan, UserNutritionPlan

User = get_user_model()


class PlanAssignmentNotificationTests(TestCase):
    """El atleta debe recibir una notificación cuando se le asigna un plan nutricional."""

    def setUp(self):
        self.client = APIClient()
        self.gym = Gym.objects.create(name="Test Gym", slug="nutri-notif-gym")

        self.nutritionist = User.objects.create_user(
            email="nutri@notif.com", password="pass123",
            first_name="Nutri", last_name="Test",
            role=User.Role.NUTRITIONIST, gym=self.gym,
        )
        self.athlete = User.objects.create_user(
            email="athlete@notif.com", password="pass123",
            first_name="Atleta", last_name="Test",
            role=User.Role.ATHLETE, gym=self.gym,
        )
        self.plan = NutritionPlan.objects.create(
            gym=self.gym, name="Plan personalizado", created_for=self.athlete,
        )

    def test_notification_sent_when_nutritionist_assigns_plan(self):
        self.client.force_authenticate(user=self.nutritionist)
        res = self.client.post("/api/nutrition/assignments/", {
            "user": str(self.athlete.id),
            "plan": str(self.plan.id),
            "start_date": "2026-07-01",
        }, format="json")

        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.athlete,
                notification_type=Notification.Type.PLAN_ASSIGNED,
            ).exists()
        )

    def test_no_self_notification_on_start_plan(self):
        """Auto-asignación (start_plan) no debe generar una notificación del atleta a sí mismo."""
        library_plan = NutritionPlan.objects.create(
            gym=self.gym, name="Plan biblioteca", status=NutritionPlan.Status.ACTIVE,
        )
        self.client.force_authenticate(user=self.athlete)
        res = self.client.post(f"/api/nutrition/plans/{library_plan.id}/start_plan/")

        self.assertEqual(res.status_code, 200, res.data)
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.athlete,
                notification_type=Notification.Type.PLAN_ASSIGNED,
            ).exists()
        )

    def test_notification_sent_via_assign_to_user_endpoint(self):
        self.client.force_authenticate(user=self.nutritionist)
        res = self.client.post(f"/api/nutrition/plans/{self.plan.id}/assign_to_user/", {
            "user_id": str(self.athlete.id),
        }, format="json")

        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.athlete,
                notification_type=Notification.Type.PLAN_ASSIGNED,
            ).exists()
        )
