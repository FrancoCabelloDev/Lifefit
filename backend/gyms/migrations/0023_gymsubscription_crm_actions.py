from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("gyms", "0022_alter_gym_logo"),
    ]

    operations = [
        migrations.AddField(
            model_name="gymsubscription",
            name="cancel_reason",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="gymsubscription",
            name="pause_reason",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AlterField(
            model_name="gymsubscription",
            name="status",
            field=models.CharField(
                choices=[
                    ("active", "Activa"),
                    ("expired", "Vencida"),
                    ("canceled", "Cancelada"),
                    ("paused", "Pausada"),
                ],
                default="active",
                max_length=20,
            ),
        ),
    ]
