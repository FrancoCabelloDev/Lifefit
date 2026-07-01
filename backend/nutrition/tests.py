import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from gyms.models import Gym, Notification
from .models import MealTemplate, NutritionPlan, UserMealLog, UserNutritionPlan

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


class MealLogFutureDayTests(TestCase):
    """El atleta no debe poder registrar (completar/saltar/evidencia) una comida de un día futuro."""

    def setUp(self):
        self.client = APIClient()
        self.gym = Gym.objects.create(name="Test Gym", slug="mealday-gym")
        self.athlete = User.objects.create_user(
            email="athlete@mealday.com", password="pass123",
            first_name="Atleta", last_name="Test",
            role=User.Role.ATHLETE, gym=self.gym,
        )
        self.plan = NutritionPlan.objects.create(
            gym=self.gym, name="Plan semanal", created_for=self.athlete,
            status=NutritionPlan.Status.ACTIVE,
        )

        weekdays = list(MealTemplate.Weekday)
        today_order = datetime.date.today().weekday()  # Monday=0 ... Sunday=6
        self.today_meal = MealTemplate.objects.create(
            plan=self.plan, weekday=weekdays[today_order].value,
            meal_type=MealTemplate.MealType.BREAKFAST, name="Desayuno de hoy",
        )
        self.future_meal = MealTemplate.objects.create(
            plan=self.plan, weekday=weekdays[(today_order + 1) % 7].value,
            meal_type=MealTemplate.MealType.BREAKFAST, name="Desayuno de mañana",
        )
        self.client.force_authenticate(user=self.athlete)

    def _post(self, meal_template_id):
        return self.client.post("/api/nutrition/meal-logs/update_status/", {
            "meal_template_id": str(meal_template_id),
            "date": datetime.date.today().isoformat(),
            "status": "completed",
        }, format="json")

    def test_cannot_log_future_day_meal(self):
        res = self._post(self.future_meal.id)
        self.assertEqual(res.status_code, 400, res.data)
        self.assertFalse(UserMealLog.objects.filter(meal_template=self.future_meal).exists())

    def test_can_log_todays_meal(self):
        res = self._post(self.today_meal.id)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(UserMealLog.objects.filter(meal_template=self.today_meal).exists())
