from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0005_userprofile_must_change_password"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="profile_completed",
            field=models.BooleanField(
                default=False,
                help_text="Set to True after the client completes the onboarding profile/address step.",
            ),
        ),
    ]
