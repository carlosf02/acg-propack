from django.db import models
from django.core.exceptions import ValidationError
from core.models import TimeStampedModel


class ShipType(models.TextChoices):
    AIR = "AIR", "Air"
    SEA = "SEA", "Sea"
    GROUND = "GROUND", "Ground"


class ConsolidationStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    OPEN = "OPEN", "Open"
    CLOSED = "CLOSED", "Closed"


class Consolidation(TimeStampedModel):
    company = models.ForeignKey(
        'company.Company',
        on_delete=models.PROTECT,
        related_name="consolidations",
    )
    associate_company = models.ForeignKey(
        'company.AssociateCompany',
        on_delete=models.PROTECT,
        related_name="consolidations",
    )
    ship_type = models.CharField(max_length=10, choices=ShipType.choices)
    consolidation_type = models.CharField(max_length=100, blank=True, null=True)
    sending_office = models.ForeignKey(
        'company.Office',
        on_delete=models.PROTECT,
        related_name="sending_consolidations",
    )
    receiving_office = models.ForeignKey(
        'company.Office',
        on_delete=models.PROTECT,
        related_name="receiving_consolidations",
    )
    alt_name = models.CharField(max_length=255, blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=10,
        choices=ConsolidationStatus.choices,
        default=ConsolidationStatus.DRAFT,
    )
    # Human-friendly reference, set on first save from pk
    reference_code = models.CharField(max_length=20, unique=True, blank=True, editable=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'ship_type']),
        ]

    def __str__(self):
        return f"{self.reference_code or f'CON-{self.pk}'} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Generate reference_code from pk after first insert
        if not self.reference_code:
            self.reference_code = f"C-{self.pk:06d}"
            Consolidation.objects.filter(pk=self.pk).update(reference_code=self.reference_code)

    def clean(self):
        errors = {}

        # 1) associate_company must belong to the same tenant
        if self.associate_company_id and self.company_id:
            if self.associate_company.company_id != self.company_id:
                errors['associate_company'] = (
                    "The associate company does not belong to your company."
                )
            if not self.associate_company.is_active:
                errors['associate_company'] = (
                    "The associate company is inactive."
                )

        # 2) sending_office must be an own office of the tenant
        if self.sending_office_id and self.company_id:
            if self.sending_office.company_id != self.company_id:
                errors['sending_office'] = (
                    "Sending office must be an office belonging to your company."
                )
            if not self.sending_office.is_active:
                errors['sending_office'] = "Sending office is inactive."

        # 3) receiving_office: own OR belonging to the associate_company
        if self.receiving_office_id and self.company_id:
            own = (self.receiving_office.company_id == self.company_id)
            assoc = (
                self.associate_company_id and
                self.receiving_office.associate_company_id == self.associate_company_id
            )
            if not own and not assoc:
                errors['receiving_office'] = (
                    "Receiving office must be an office of your company or "
                    "of the selected associate company."
                )
            if not self.receiving_office.is_active:
                errors['receiving_office'] = "Receiving office is inactive."

        # 4) Sending and receiving cannot be the same
        if (
            self.sending_office_id and
            self.receiving_office_id and
            self.sending_office_id == self.receiving_office_id
        ):
            errors['receiving_office'] = (
                "Sending office and receiving office cannot be the same."
            )

        if errors:
            raise ValidationError(errors)

class ConsolidationReceipt(TimeStampedModel):
    company = models.ForeignKey(
        'company.Company',
        on_delete=models.PROTECT,
        related_name="consolidation_receipts"
    )
    consolidation = models.ForeignKey(
        'Consolidation',
        on_delete=models.CASCADE,
        related_name="receipt_links"
    )
    warehouse_receipt = models.ForeignKey(
        'receiving.WarehouseReceipt',
        on_delete=models.PROTECT,
        related_name="consolidation_links"
    )

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['consolidation', 'warehouse_receipt'],
                name='unique_consolidation_receipt'
            )
        ]

    def __str__(self):
        return f"{self.consolidation.reference_code} -> {self.warehouse_receipt.wr_number or self.warehouse_receipt.id}"
