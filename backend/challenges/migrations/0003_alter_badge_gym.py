from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("gyms", "0002_gym_contact_email_gym_website_branch"),
        ("challenges", "0002_alter_challenge_gym"),
    ]

    operations = [
        migrations.AlterField(
            model_name="badge",
            name="gym",
            field=models.ForeignKey(
                related_name="badges",
                on_delete=models.CASCADE,
                to="gyms.gym",
                null=True,
                blank=True,
            ),
        ),
    ]
