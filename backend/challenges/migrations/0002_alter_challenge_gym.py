from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("gyms", "0001_initial"),
        ("challenges", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="challenge",
            name="gym",
            field=models.ForeignKey(
                related_name="challenges",
                on_delete=models.CASCADE,
                to="gyms.gym",
                null=True,
                blank=True,
            ),
        ),
    ]
