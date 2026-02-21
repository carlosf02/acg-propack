from django.db import models
from core.models import TimeStampedModel, ShipmentStatus
from clients.models import Client
from warehouse.models import Warehouse
from receiving.models import WarehouseReceipt


class Shipment(TimeStampedModel):
    shipment_number = models.CharField(max_length=50, unique=True, db_index=True)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="shipments")
    from_warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, null=True, blank=True, related_name="shipments")
    status = models.CharField(max_length=20, choices=ShipmentStatus.choices, default=ShipmentStatus.PLANNED)
    
    destination_name = models.CharField(max_length=255, blank=True)
    destination_address_line1 = models.CharField(max_length=255, blank=True)
    destination_address_line2 = models.CharField(max_length=255, blank=True)
    destination_city = models.CharField(max_length=100, blank=True)
    destination_state = models.CharField(max_length=100, blank=True)
    destination_zip = models.CharField(max_length=20, blank=True)
    
    carrier = models.CharField(max_length=100, blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['client']),
            models.Index(fields=['status']),
            models.Index(fields=['shipment_number']),
            models.Index(fields=['shipped_at']),
        ]

    def __str__(self):
        return f"{self.shipment_number} ({self.client.client_code})"


class ShipmentItem(TimeStampedModel):
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name="items")
    wr = models.ForeignKey(WarehouseReceipt, on_delete=models.PROTECT, related_name="shipment_items")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['shipment', 'wr'],
                name='uniq_shipment_wr'
            )
        ]

    def __str__(self):
        return f"Item {self.id}: {self.wr.wr_number} in {self.shipment.shipment_number}"
