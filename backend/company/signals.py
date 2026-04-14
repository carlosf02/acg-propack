from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Company


@receiver(post_save, sender=Company)
def ensure_default_warehouse(sender, instance, created, **kwargs):
    if not created:
        return
    from warehouse.models import Warehouse
    if instance.warehouses.exists():
        return
    Warehouse.objects.create(
        company=instance,
        code=f"MAIN-{instance.id}",
        name="Main Warehouse",
    )
