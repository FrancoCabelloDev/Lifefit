from __future__ import annotations

from datetime import date, timedelta

from django.contrib.auth import get_user_model

from .models import MealTemplate, UserMealLog, UserNutritionPlan

User = get_user_model()


def calc_daily_compliance(user, target_date: date) -> dict | None:
    """
    Returns compliance stats for a user on a given date.
    Only considers meals whose weekday matches target_date's weekday.
    Returns None if the user has no active plan.
    """
    assignment = UserNutritionPlan.objects.filter(
        user=user, status="active"
    ).select_related("plan").first()
    if not assignment:
        return None

    weekday = target_date.strftime("%A").lower()  # e.g. "monday"
    meals = MealTemplate.objects.filter(plan=assignment.plan, weekday=weekday)
    total = meals.count()
    if total == 0:
        return {"total": 0, "completed": 0, "skipped": 0, "alternatives": 0, "unlogged": 0, "compliance_pct": 0.0}

    logs = UserMealLog.objects.filter(
        user=user,
        meal_template__plan=assignment.plan,
        date=target_date,
    )
    log_map: dict = {str(l.meal_template_id): l for l in logs}

    completed    = sum(1 for m in meals if str(m.id) in log_map and log_map[str(m.id)].status == UserMealLog.MealLogStatus.COMPLETED)
    skipped      = sum(1 for m in meals if str(m.id) in log_map and log_map[str(m.id)].status == UserMealLog.MealLogStatus.SKIPPED)
    alternatives = sum(1 for m in meals if str(m.id) in log_map and log_map[str(m.id)].status == UserMealLog.MealLogStatus.ALTERNATIVE)
    unlogged     = total - len(log_map)

    # Alternative meals count 50% toward compliance
    weighted     = completed + (alternatives * 0.5)
    compliance   = round((weighted / total) * 100, 1)

    return {
        "total":        total,
        "completed":    completed,
        "skipped":      skipped,
        "alternatives": alternatives,
        "unlogged":     unlogged,
        "compliance_pct": compliance,
    }


def calc_weekly_compliance(user, end_date: date | None = None) -> dict:
    """
    Returns average compliance over the last 7 days (inclusive of end_date).
    """
    if not end_date:
        end_date = date.today()
    start = end_date - timedelta(days=6)

    daily = []
    for i in range(7):
        d = start + timedelta(days=i)
        daily.append(calc_daily_compliance(user, d))

    valid = [d for d in daily if d and d["total"] > 0]
    avg   = round(sum(d["compliance_pct"] for d in valid) / len(valid), 1) if valid else 0.0

    return {
        "daily":          daily,
        "avg_compliance": avg,
        "perfect_week":   all(d and d["compliance_pct"] >= 80 for d in valid) if valid else False,
    }


def award_daily_points(user, target_date: date) -> dict | None:
    """
    Awards gamification points for target_date's nutrition compliance.
    Idempotent — returns None if already awarded.
    Returns a dict with points_awarded and compliance_pct.
    """
    from gamification.models import UserPoints

    source_key = f"nutrition_daily_{target_date.isoformat()}"
    if UserPoints.objects.filter(user=user, source=source_key).exists():
        return None  # already processed

    result = calc_daily_compliance(user, target_date)
    if not result or result["total"] == 0:
        return None

    compliance_pct = result["compliance_pct"]

    if compliance_pct >= 100:
        base_pts = 15
    elif compliance_pct >= 80:
        base_pts = 8
    else:
        return {"points_awarded": 0, "compliance_pct": compliance_pct}

    UserPoints.objects.create(
        user=user,
        points=base_pts,
        pending_points=base_pts,
        status=UserPoints.Status.APPROVED,
        source=source_key,
        description=f"Nutrición {target_date.isoformat()}: {compliance_pct}%",
    )

    return {
        "points_awarded": base_pts,
        "compliance_pct": compliance_pct,
    }
