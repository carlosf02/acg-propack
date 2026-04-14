from django.db import migrations


def backfill_default_warehouses(apps, schema_editor):
    Company = apps.get_model("company", "Company")
    Warehouse = apps.get_model("warehouse", "Warehouse")
    WarehouseReceipt = apps.get_model("receiving", "WarehouseReceipt")

    for company in Company.objects.all():
        if not Warehouse.objects.filter(company=company).exists():
            Warehouse.objects.create(
                company=company,
                code=f"MAIN-{company.id}",
                name="Main Warehouse",
            )

        warehouses = list(Warehouse.objects.filter(company=company, is_active=True))
        if len(warehouses) == 1:
            only_wh = warehouses[0]
            WarehouseReceipt.objects.filter(
                company=company,
                received_warehouse__isnull=True,
            ).update(received_warehouse=only_wh)


def reverse_noop(apps, schema_editor):
    # No reverse: backfilled rows are indistinguishable from user-created ones.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("warehouse", "0003_alter_storagelocation_company_and_more"),
        ("company", "0003_backfill_company_data"),
        ("receiving", "0007_warehousereceiptlinetracking"),
    ]

    operations = [
        migrations.RunPython(backfill_default_warehouses, reverse_noop),
    ]
