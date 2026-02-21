from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import TimeStampedModel, WRStatus
from clients.models import Client
from warehouse.models import Warehouse

class WeightUnit(models.TextChoices):
    LB = "LB", "Pounds"
    KG = "KG", "Kilograms"

class DimensionUnit(models.TextChoices):
    IN = "IN", "Inches"
    CM = "CM", "Centimeters"

class WarehouseReceipt(TimeStampedModel):
    id = models.BigAutoField(primary_key=True)
    wr_number = models.CharField(max_length=50, unique=True, db_index=True)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="warehouse_receipts")
    received_warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, null=True, blank=True)
    tracking_number = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    carrier = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=20, choices=WRStatus.choices, default=WRStatus.ACTIVE)
    received_at = models.DateTimeField(default=timezone.now)

    # Measurements
    weight_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    weight_unit = models.CharField(max_length=5, choices=WeightUnit.choices, default=WeightUnit.LB)
    
    length = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    width = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dimension_unit = models.CharField(max_length=5, choices=DimensionUnit.choices, default=DimensionUnit.IN)

    # Traceability
    parent_wr = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="child_wrs")
    
    # Optional fields
    description = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['received_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['client', 'tracking_number'],
                name='unique_client_tracking_number',
                condition=models.Q(tracking_number__isnull=False)
            )
        ]
        
    def __str__(self):
        return f"{self.wr_number} ({self.client.client_code})"


class OperationType(models.TextChoices):
    CONSOLIDATE = "CONSOLIDATE", "Consolidate"
    REPACK = "REPACK", "Repack"

class RepackOperation(TimeStampedModel):
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="repack_operations")
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="repack_operations")
    performed_at = models.DateTimeField(default=timezone.now)
    operation_type = models.CharField(max_length=20, choices=OperationType.choices)
    notes = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['performed_at']),
        ]

    def __str__(self):
        return f"Repack {self.id} ({self.operation_type}) - {self.client.client_code}"

class RepackLink(TimeStampedModel):
    repack_operation = models.ForeignKey(RepackOperation, on_delete=models.CASCADE, related_name="links")
    input_wr = models.ForeignKey(WarehouseReceipt, on_delete=models.PROTECT, related_name="repack_as_input")
    output_wr = models.ForeignKey(WarehouseReceipt, on_delete=models.PROTECT, related_name="repack_as_output")

    class Meta:
        indexes = [
            models.Index(fields=['repack_operation']),
            models.Index(fields=['input_wr']),
            models.Index(fields=['output_wr']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['repack_operation', 'input_wr'],
                name='uniq_repackop_inputwr'
            ),
            models.CheckConstraint(
                condition=~models.Q(input_wr=models.F('output_wr')),
                name='check_input_not_equal_output'
            )
        ]

    def __str__(self):
        return f"Link {self.id}: {self.input_wr.wr_number} -> {self.output_wr.wr_number}"
