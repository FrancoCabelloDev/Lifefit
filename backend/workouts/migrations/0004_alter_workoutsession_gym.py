from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("gyms", "0001_initial"),
        ("workouts", "0003_workoutroutine_points_reward_workoutsession_points_awarded"),
    ]

    operations = [
        migrations.AlterField(
            model_name="workoutsession",
            name="gym",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.CASCADE,
                related_name="sessions",
                to="gyms.gym",
            ),
        ),
    ]
