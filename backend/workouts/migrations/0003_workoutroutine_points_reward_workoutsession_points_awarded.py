from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("workouts", "0002_alter_workoutroutine_gym"),
    ]

    operations = [
        migrations.AddField(
            model_name="workoutroutine",
            name="points_reward",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="workoutsession",
            name="points_awarded",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
