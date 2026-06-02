from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import CoachAssignment, Gym, Notification, NutritionistAssignment

User = get_user_model()


class GymModelTests(TestCase):
    def setUp(self):
        self.gym = Gym.objects.create(name="Test Gym", slug="test-gym")
        self.coach = User.objects.create_user(
            email="coach@test.com", password="pass123",
            first_name="Coach", last_name="Test",
            role=User.Role.COACH, gym=self.gym,
        )
        self.athlete = User.objects.create_user(
            email="athlete@test.com", password="pass123",
            first_name="Athlete", last_name="Test",
            role=User.Role.ATHLETE, gym=self.gym,
        )
        self.nutritionist = User.objects.create_user(
            email="nutri@test.com", password="pass123",
            first_name="Nutri", last_name="Test",
            role=User.Role.NUTRITIONIST, gym=self.gym,
        )

    def test_coach_assignment_creation(self):
        assignment = CoachAssignment.objects.create(
            coach=self.coach, athlete=self.athlete, gym=self.gym,
        )
        self.assertEqual(str(assignment), "coach@test.com → athlete@test.com")
        self.assertTrue(assignment.is_active)
        self.assertIsNotNone(assignment.assigned_at)

    def test_coach_assignment_unique_together(self):
        CoachAssignment.objects.create(coach=self.coach, athlete=self.athlete, gym=self.gym)
        with self.assertRaises(Exception):
            CoachAssignment.objects.create(coach=self.coach, athlete=self.athlete, gym=self.gym)

    def test_nutritionist_assignment_creation(self):
        assignment = NutritionistAssignment.objects.create(
            nutritionist=self.nutritionist, athlete=self.athlete, gym=self.gym,
        )
        self.assertEqual(str(assignment), "nutri@test.com → athlete@test.com")
        self.assertTrue(assignment.is_active)

    def test_notification_creation(self):
        notif = Notification.objects.create(
            recipient=self.athlete,
            actor=self.coach,
            notification_type=Notification.Type.ROUTINE_ASSIGNED,
            title="Nueva rutina asignada",
            message="Tu coach te ha asignado una nueva rutina.",
            gym=self.gym,
        )
        self.assertEqual(str(notif), "[routine_assigned] athlete@test.com - Nueva rutina asignada")
        self.assertFalse(notif.is_read)

    def test_notification_unread_filter(self):
        Notification.objects.create(recipient=self.athlete, notification_type=Notification.Type.SYSTEM, title="Test")
        Notification.objects.create(recipient=self.athlete, notification_type=Notification.Type.SYSTEM, title="Test 2", is_read=True)
        unread = Notification.objects.filter(recipient=self.athlete, is_read=False).count()
        self.assertEqual(unread, 1)

    def test_gym_str(self):
        self.assertEqual(str(self.gym), "Test Gym")

    def test_coach_limit_default(self):
        self.assertEqual(self.gym.max_coaches, 2)
        self.assertEqual(self.gym.max_nutritionists, 2)


class NotificationHelperTests(TestCase):
    def setUp(self):
        self.gym = Gym.objects.create(name="Helper Gym", slug="helper-gym")
        self.user = User.objects.create_user(
            email="user@test.com", password="pass123", role=User.Role.ATHLETE, gym=self.gym,
        )

    def test_create_notification_helper(self):
        from .views import create_notification
        create_notification(
            recipient=self.user,
            notification_type="system",
            title="Notificación de prueba",
            message="Mensaje de prueba",
            gym=self.gym,
        )
        self.assertEqual(Notification.objects.count(), 1)
        n = Notification.objects.first()
        self.assertEqual(n.title, "Notificación de prueba")
        self.assertEqual(n.recipient, self.user)
