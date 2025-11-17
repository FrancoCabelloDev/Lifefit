from django.db import migrations


def remove_pollito_plan(apps, schema_editor):
    NutritionPlan = apps.get_model("nutrition", "NutritionPlan")
    NutritionPlan.objects.filter(name__iexact="Pollito a la brasa").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("nutrition", "0002_alter_nutritionplan_gym"),
    ]

    operations = [
        migrations.RunPython(remove_pollito_plan, reverse_code=migrations.RunPython.noop),
    ]
