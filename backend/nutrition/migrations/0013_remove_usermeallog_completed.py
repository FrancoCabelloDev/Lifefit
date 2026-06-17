from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("nutrition", "0012_usermeallog_status_field"),
    ]

    operations = [
        # Sync status from completed before dropping (safety net for old rows)
        migrations.RunSQL(
            sql="""
                UPDATE nutrition_usermeallog
                SET status = CASE
                    WHEN completed = TRUE AND (status IS NULL OR status = '') THEN 'completed'
                    ELSE status
                END
                WHERE status IS NULL OR status = '';
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RemoveField(
            model_name="usermeallog",
            name="completed",
        ),
    ]
