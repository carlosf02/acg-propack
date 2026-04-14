from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0003_alter_inventorybalance_company_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='inventorybalance',
            name='location',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='inventory_balances',
                to='warehouse.storagelocation',
            ),
        ),
    ]
