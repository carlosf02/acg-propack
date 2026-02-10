from django.db import models
from core.models import TimeStampedModel

class Warehouse(TimeStampedModel):
    code = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    # Address
    address_line1 = models.CharField(max_length=255, blank=True, null=True)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    zip_code = models.CharField(max_length=20, blank=True, null=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

class LocationType(models.TextChoices):
    RECEIVING = "RECEIVING", "Receiving"
    STORAGE = "STORAGE", "Storage"
    PACKING = "PACKING", "Packing"
    SHIPPING = "SHIPPING", "Shipping"
    STAGING = "STAGING", "Staging"

class StorageLocation(TimeStampedModel):
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name="locations")
    code = models.CharField(max_length=50, db_index=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    location_type = models.CharField(
        max_length=20, 
        choices=LocationType.choices, 
        default=LocationType.STORAGE
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["warehouse", "code"], name="unique_warehouse_location_code")
        ]
        indexes = [
            models.Index(fields=["warehouse", "code"]),
        ]

    def __str__(self):
        return f"{self.warehouse.code} / {self.code}"
