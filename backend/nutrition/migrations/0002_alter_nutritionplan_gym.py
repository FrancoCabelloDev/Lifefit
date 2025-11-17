from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("gyms", "0001_initial"),
        ("nutrition", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="nutritionplan",
            name="gym",
            field=models.ForeignKey(
                related_name="nutrition_plans",
                on_delete=models.CASCADE,
                to="gyms.gym",
                null=True,
                blank=True,
            ),
        ),
    ]
