from datetime import date, time as dt_time
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from .models import (
    AvailabilityOverride, CoachAssignment, Gym, Notification,
    NutritionistAppointment, NutritionistAssignment, NutritionistAvailability,
)

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


# ─────────────────────────────────────────────────────────────────────────────
# Appointment creation tests
# ─────────────────────────────────────────────────────────────────────────────

class AppointmentCreationTests(TestCase):
    """Tests for NutritionistAppointmentViewSet.perform_create validations."""

    def setUp(self):
        self.client = APIClient()
        self.gym = Gym.objects.create(name="Test Gym", slug="appt-test-gym")

        self.nutritionist = get_user_model().objects.create_user(
            email="nutri@appt.com", password="pass123",
            first_name="Nutri", last_name="Test",
            role=get_user_model().Role.NUTRITIONIST, gym=self.gym,
        )
        self.athlete = get_user_model().objects.create_user(
            email="athlete@appt.com", password="pass123",
            first_name="Atleta", last_name="Test",
            role=get_user_model().Role.ATHLETE, gym=self.gym,
        )
        NutritionistAssignment.objects.create(
            nutritionist=self.nutritionist, athlete=self.athlete, gym=self.gym,
        )
        # Monday availability block 09:00–12:00, 30-min slots
        self.monday = self._next_weekday(0)
        NutritionistAvailability.objects.create(
            nutritionist=self.nutritionist, gym=self.gym,
            day_of_week=self.monday.weekday(),
            start_time=dt_time(9, 0),
            end_time=dt_time(12, 0),
            slot_duration_minutes=30,
        )
        self.url = "/api/gyms/appointments/"

    def _next_weekday(self, weekday: int):
        """Return the next date that falls on the given weekday (0=Mon)."""
        today = timezone.now().date()
        days_ahead = weekday - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return today + timedelta(days=days_ahead)

    def _slot(self, d, hour=9, minute=0):
        return timezone.make_aware(
            timezone.datetime(d.year, d.month, d.day, hour, minute)
        ).isoformat()

    def _post(self, user, payload):
        self.client.force_authenticate(user=user)
        return self.client.post(self.url, payload, format="json")

    # ── Happy path ────────────────────────────────────────────────────────────

    def test_athlete_can_book_valid_slot(self):
        res = self._post(self.athlete, {
            "scheduled_at": self._slot(self.monday, 9, 0),
            "duration_minutes": 30,
            "appointment_type": "followup",
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(NutritionistAppointment.objects.count(), 1)

    def test_nutritionist_can_book_valid_slot(self):
        res = self._post(self.nutritionist, {
            "athlete": str(self.athlete.id),
            "scheduled_at": self._slot(self.monday, 9, 0),
            "duration_minutes": 30,
            "appointment_type": "first",
        })
        self.assertEqual(res.status_code, 201)

    # ── Past date ─────────────────────────────────────────────────────────────

    def test_cannot_book_past_date(self):
        past = (timezone.now() - timedelta(hours=1)).isoformat()
        res = self._post(self.athlete, {
            "scheduled_at": past,
            "duration_minutes": 30,
            "appointment_type": "followup",
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("scheduled_at", res.data)

    # ── Advance limit ─────────────────────────────────────────────────────────

    def test_cannot_book_beyond_21_days(self):
        future = (timezone.now() + timedelta(days=22)).isoformat()
        res = self._post(self.athlete, {
            "scheduled_at": future,
            "duration_minutes": 30,
            "appointment_type": "followup",
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("scheduled_at", res.data)

    # ── Outside availability ───────────────────────────────────────────────────

    def test_cannot_book_outside_availability_hours(self):
        res = self._post(self.athlete, {
            "scheduled_at": self._slot(self.monday, 14, 0),  # 14:00 outside 09-12
            "duration_minutes": 30,
            "appointment_type": "followup",
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("scheduled_at", res.data)

    # ── Exact duplicate ───────────────────────────────────────────────────────

    def test_cannot_book_exact_duplicate(self):
        slot = self._slot(self.monday, 9, 0)
        NutritionistAppointment.objects.create(
            nutritionist=self.nutritionist, athlete=self.athlete, gym=self.gym,
            scheduled_at=slot, duration_minutes=30, appointment_type="followup",
        )
        res = self._post(self.athlete, {
            "scheduled_at": slot,
            "duration_minutes": 30,
            "appointment_type": "followup",
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("scheduled_at", res.data)

    # ── Overlap detection ─────────────────────────────────────────────────────

    def test_cannot_book_overlapping_slot(self):
        """09:00-09:30 already booked; 09:15-09:45 must be rejected."""
        NutritionistAppointment.objects.create(
            nutritionist=self.nutritionist, athlete=self.athlete, gym=self.gym,
            scheduled_at=self._slot(self.monday, 9, 0),
            duration_minutes=30, appointment_type="followup",
        )
        res = self._post(self.athlete, {
            "scheduled_at": self._slot(self.monday, 9, 15),
            "duration_minutes": 30,
            "appointment_type": "followup",
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("scheduled_at", res.data)

    def test_adjacent_slots_do_not_conflict(self):
        """09:00-09:30 booked; 09:30-10:00 must be allowed."""
        NutritionistAppointment.objects.create(
            nutritionist=self.nutritionist, athlete=self.athlete, gym=self.gym,
            scheduled_at=self._slot(self.monday, 9, 0),
            duration_minutes=30, appointment_type="followup",
        )
        res = self._post(self.athlete, {
            "scheduled_at": self._slot(self.monday, 9, 30),
            "duration_minutes": 30,
            "appointment_type": "followup",
        })
        self.assertEqual(res.status_code, 201)

    # ── Cancelled appointments don't block ────────────────────────────────────

    def test_cancelled_does_not_block_slot(self):
        NutritionistAppointment.objects.create(
            nutritionist=self.nutritionist, athlete=self.athlete, gym=self.gym,
            scheduled_at=self._slot(self.monday, 9, 0),
            duration_minutes=30, appointment_type="followup",
            status=NutritionistAppointment.Status.CANCELLED,
        )
        res = self._post(self.athlete, {
            "scheduled_at": self._slot(self.monday, 9, 0),
            "duration_minutes": 30,
            "appointment_type": "followup",
        })
        self.assertEqual(res.status_code, 201)

    # ── AvailabilityOverride ──────────────────────────────────────────────────

    def test_override_blocks_booking(self):
        AvailabilityOverride.objects.create(
            nutritionist=self.nutritionist, gym=self.gym, date=self.monday,
            reason="Vacaciones",
        )
        res = self._post(self.athlete, {
            "scheduled_at": self._slot(self.monday, 9, 0),
            "duration_minutes": 30,
            "appointment_type": "followup",
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("scheduled_at", res.data)

    # ── Notifications ─────────────────────────────────────────────────────────

    def test_notification_sent_to_athlete_when_nutritionist_books(self):
        self._post(self.nutritionist, {
            "athlete": str(self.athlete.id),
            "scheduled_at": self._slot(self.monday, 9, 0),
            "duration_minutes": 30,
            "appointment_type": "first",
        })
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.athlete,
                notification_type=Notification.Type.APPOINTMENT_SCHEDULED,
            ).exists()
        )

    def test_notification_sent_to_nutritionist_when_athlete_books(self):
        self._post(self.athlete, {
            "scheduled_at": self._slot(self.monday, 9, 0),
            "duration_minutes": 30,
            "appointment_type": "followup",
        })
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.nutritionist,
                notification_type=Notification.Type.APPOINTMENT_SCHEDULED,
            ).exists()
        )
