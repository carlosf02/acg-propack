from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import TimeStampedModel, TxnType
from clients.models import Client
from warehouse.models import Warehouse, StorageLocation
from receiving.models import WarehouseReceipt


class InventoryBalance(TimeStampedModel):
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="inventory_balances")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name="inventory_balances")
    location = models.ForeignKey(StorageLocation, on_delete=models.PROTECT, related_name="inventory_balances")
    wr = models.ForeignKey(WarehouseReceipt, on_delete=models.PROTECT, related_name="inventory_balances")
    
    on_hand_qty = models.PositiveIntegerField(default=1)
    reserved_qty = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['location', 'wr'],
                name='uniq_location_wr_balance'
            )
        ]
        indexes = [
            models.Index(fields=['client']),
            models.Index(fields=['warehouse', 'location']),
            models.Index(fields=['wr']),
        ]

    def __str__(self):
        return f"{self.wr.wr_number} @ {self.location.code} (Qty: {self.on_hand_qty})"


class InventoryTransaction(TimeStampedModel):
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="inventory_transactions")
    txn_type = models.CharField(max_length=20, choices=TxnType.choices)
    reference_type = models.CharField(max_length=50, blank=True, null=True)
    reference_id = models.CharField(max_length=50, blank=True, null=True)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="inventory_transactions")
    performed_at = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['client', 'performed_at']),
            models.Index(fields=['txn_type']),
        ]

    def __str__(self):
        return f"Txn {self.id} ({self.txn_type})"


class InventoryTransactionLine(TimeStampedModel):
    transaction = models.ForeignKey(InventoryTransaction, on_delete=models.CASCADE, related_name="lines")
    wr = models.ForeignKey(WarehouseReceipt, on_delete=models.PROTECT, related_name="inventory_transaction_lines")
    from_location = models.ForeignKey(StorageLocation, on_delete=models.PROTECT, null=True, blank=True, related_name="txn_lines_from")
    to_location = models.ForeignKey(StorageLocation, on_delete=models.PROTECT, null=True, blank=True, related_name="txn_lines_to")
    qty = models.PositiveIntegerField(default=1)

    class Meta:
        indexes = [
            models.Index(fields=['transaction']),
            models.Index(fields=['wr']),
        ]

    def __str__(self):
        return f"Line {self.id} (Txn {self.transaction.id}): {self.qty} of {self.wr.wr_number}"
