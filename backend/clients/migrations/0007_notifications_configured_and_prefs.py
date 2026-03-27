from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0006_userprofile_profile_completed'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='notifications_configured',
            field=models.BooleanField(
                default=False,
                help_text='Set to True after the client completes the onboarding notification preferences step.',
            ),
        ),
        migrations.CreateModel(
            name='ClientNotificationPreferences',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('notify_warehouse_receipt', models.BooleanField(default=True, help_text='Notify when a warehouse receipt is created.')),
                ('notify_repack', models.BooleanField(default=True, help_text='Notify when a repack is created.')),
                ('notify_consolidation', models.BooleanField(default=True, help_text='Notify when a consolidation is created.')),
                ('notify_arrived', models.BooleanField(default=True, help_text='Notify when a package arrives / is ready for pickup.')),
                ('notify_shipment_dispatched', models.BooleanField(default=True, help_text='Notify when a shipment is dispatched.')),
                ('client', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notification_prefs',
                    to='clients.client',
                )),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
