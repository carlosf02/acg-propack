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


class ShippingMethod(models.TextChoices):
    AIR = "air", "Air"
    SEA = "sea", "Sea"
    GROUND = "ground", "Ground"


class WarehouseReceipt(TimeStampedModel):
    company = models.ForeignKey('company.Company', on_delete=models.PROTECT, related_name="warehouse_receipts")
    id = models.BigAutoField(primary_key=True)
    wr_number = models.CharField(max_length=50, unique=True, db_index=True, blank=True)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="warehouse_receipts")
    received_warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, null=True, blank=True)
    tracking_number = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    carrier = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=20, choices=WRStatus.choices, default=WRStatus.ACTIVE)
    received_at = models.DateTimeField(default=timezone.now)

    # Measurements (legacy single-item; new multi-item flow uses WarehouseReceiptLine)
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

    # ── New header fields matching the "Warehouse Info" card in the UI ──────────
    associate_company = models.ForeignKey(
        'company.AssociateCompany',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="warehouse_receipts",
    )
    shipping_method = models.CharField(
        max_length=20,
        choices=ShippingMethod.choices,
        null=True,
        blank=True,
    )
    receipt_type = models.CharField(max_length=50, null=True, blank=True)
    location_note = models.CharField(max_length=255, null=True, blank=True)
    recipient_name = models.CharField(max_length=255, null=True, blank=True)
    recipient_address = models.TextField(null=True, blank=True)
    allow_repacking = models.BooleanField(default=False)

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

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Auto-generate wr_number after first insert if not provided
        if not self.wr_number:
            company_id = self.company_id or 0
            self.wr_number = f"WR-{company_id}-{self.pk:06d}"
            WarehouseReceipt.objects.filter(pk=self.pk).update(wr_number=self.wr_number)

    def __str__(self):
        return f"{self.wr_number} ({self.client.client_code})"


class WarehouseReceiptLine(TimeStampedModel):
    """
    One row in the packages table per receiving session.
    Each line represents one physical package arriving with a receipt.
    Company is denormalized from receipt.company for fast filtering.
    """
    receipt = models.ForeignKey(
        WarehouseReceipt,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    company = models.ForeignKey(
        'company.Company',
        on_delete=models.PROTECT,
        related_name="receipt_lines",
    )

    date = models.DateField(null=True, blank=True)
    carrier = models.CharField(max_length=50, null=True, blank=True)
    package_type = models.CharField(max_length=50, null=True, blank=True)
    tracking_number = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    declared_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Dimensions in inches
    length = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    width = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    pieces = models.PositiveIntegerField(default=1)
    # Cubic feet: L*W*H / 1728. Stored so we don't recalculate on every read.
    volume_cf = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)

    repackable = models.BooleanField(default=False)
    bill_invoice = models.BooleanField(default=False)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['receipt']),
            models.Index(fields=['company']),
        ]
        ordering = ['id']

    def __str__(self):
        return f"Line {self.id} → {self.receipt.wr_number} ({self.package_type or 'pkg'})"


class WarehouseReceiptLineTracking(TimeStampedModel):
    line = models.ForeignKey(
        WarehouseReceiptLine,
        on_delete=models.CASCADE,
        related_name="tracking_numbers",
    )
    company = models.ForeignKey(
        'company.Company',
        on_delete=models.PROTECT,
        related_name="receipt_line_trackings",
    )
    tracking_number = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.tracking_number} → Line {self.line_id}"


class OperationType(models.TextChoices):
    CONSOLIDATE = "CONSOLIDATE", "Consolidate"
    REPACK = "REPACK", "Repack"


class RepackOperation(TimeStampedModel):
    company = models.ForeignKey('company.Company', on_delete=models.PROTECT, related_name="repack_operations")
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
    company = models.ForeignKey('company.Company', on_delete=models.PROTECT, related_name="repack_links")
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
