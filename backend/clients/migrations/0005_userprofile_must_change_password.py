from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0004_add_client_type_and_extra_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="must_change_password",
            field=models.BooleanField(
                default=False,
                help_text="Set to True when a temporary password has been issued. Cleared after first-login password change.",
            ),
        ),
    ]
