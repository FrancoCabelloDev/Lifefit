from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("gyms", "0001_initial"),
        ("workouts", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="workoutroutine",
            name="gym",
            field=models.ForeignKey(
                related_name="routines",
                on_delete=models.CASCADE,
                to="gyms.gym",
                null=True,
                blank=True,
            ),
        ),
    ]
