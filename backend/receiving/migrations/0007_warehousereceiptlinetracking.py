import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("company", "0006_company_subscription_queued_plan"),
        ("receiving", "0006_volume_cf_max_digits"),
    ]

    operations = [
        migrations.CreateModel(
            name="WarehouseReceiptLineTracking",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("tracking_number", models.CharField(max_length=100)),
                ("order", models.PositiveIntegerField(default=0)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="receipt_line_trackings",
                        to="company.company",
                    ),
                ),
                (
                    "line",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tracking_numbers",
                        to="receiving.warehousereceiptline",
                    ),
                ),
            ],
            options={
                "ordering": ["order", "id"],
            },
        ),
    ]
