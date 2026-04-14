from django.db import migrations
from collections import defaultdict


def backfill_repack_outputs(apps, schema_editor):
    WarehouseReceipt = apps.get_model('receiving', 'WarehouseReceipt')
    RepackLink = apps.get_model('receiving', 'RepackLink')

    output_wr_ids = set(RepackLink.objects.values_list('output_wr_id', flat=True))
    if not output_wr_ids:
        return

    outputs = list(
        WarehouseReceipt.objects
        .filter(id__in=output_wr_ids)
        .order_by('company_id', 'id')
    )

    seq_by_company = defaultdict(int)
    for wr in outputs:
        seq_by_company[wr.company_id] += 1
        wr.is_repack = True
        wr.wr_number = f"REPACK-{wr.company_id}-{seq_by_company[wr.company_id]:06d}"
        wr.save(update_fields=['is_repack', 'wr_number'])


def revert_repack_outputs(apps, schema_editor):
    WarehouseReceipt = apps.get_model('receiving', 'WarehouseReceipt')
    for wr in WarehouseReceipt.objects.filter(is_repack=True):
        wr.is_repack = False
        wr.wr_number = f"WR-{wr.company_id}-{wr.pk:06d}"
        wr.save(update_fields=['is_repack', 'wr_number'])


class Migration(migrations.Migration):

    dependencies = [
        ('receiving', '0008_warehousereceipt_is_repack'),
    ]

    operations = [
        migrations.RunPython(backfill_repack_outputs, revert_repack_outputs),
    ]
