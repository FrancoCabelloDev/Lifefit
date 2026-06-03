from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gyms', '0013_bodymeasurement'),
    ]

    operations = [
        migrations.AddField(
            model_name='gymmembershipplan',
            name='tier',
            field=models.CharField(
                choices=[('basic', 'Básico'), ('premium', 'Premium')],
                default='basic',
                max_length=10,
            ),
        ),
    ]
