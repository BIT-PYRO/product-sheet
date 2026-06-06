from django.db import migrations, models


def add_stone_rows_column(apps, schema_editor):
    """Add stone_rows column idempotently — works on both SQLite and PostgreSQL."""
    conn = schema_editor.connection
    if conn.vendor == 'sqlite':
        with conn.cursor() as cursor:
            cursor.execute("PRAGMA table_info(jobs_job)")
            existing = [row[1] for row in cursor.fetchall()]
            if 'stone_rows' not in existing:
                cursor.execute(
                    "ALTER TABLE jobs_job ADD COLUMN stone_rows TEXT NOT NULL DEFAULT '[]'"
                )
    elif conn.vendor == 'postgresql':
        with conn.cursor() as cursor:
            cursor.execute(
                """
                ALTER TABLE jobs_job
                ADD COLUMN IF NOT EXISTS stone_rows JSONB NOT NULL DEFAULT '[]'::jsonb
                """
            )
    else:
        # For other databases fall back to standard AddField
        schema_editor.add_field(
            apps.get_model('jobs', 'Job'),
            models.JSONField(blank=True, default=list, name='stone_rows'),
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0010_job_die_rows'),
    ]

    operations = [
        # Idempotent DB-level column addition (won't fail if column already exists)
        migrations.RunPython(add_stone_rows_column, noop),
        # Tell Django's ORM about the new field without touching the DB again
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='job',
                    name='stone_rows',
                    field=models.JSONField(
                        blank=True,
                        default=list,
                        help_text='Stone issuance rows [{type, species, variety, color, cut, shape, length, width, height, qty, master_sku_breakdown}]',
                    ),
                ),
            ],
        ),
    ]
