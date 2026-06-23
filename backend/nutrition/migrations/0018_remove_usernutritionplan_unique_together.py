from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0017_add_review_requested_at'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='usernutritionplan',
            unique_together=set(),
        ),
    ]
