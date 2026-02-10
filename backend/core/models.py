from django.db import models

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class WRStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    SHIPPED = "SHIPPED", "Shipped"
    CANCELLED = "CANCELLED", "Cancelled"

class ShipmentStatus(models.TextChoices):
    PLANNED = "PLANNED", "Planned"
    PACKED = "PACKED", "Packed"
    SHIPPED = "SHIPPED", "Shipped"
    DELIVERED = "DELIVERED", "Delivered"
    CANCELLED = "CANCELLED", "Cancelled"

class TxnType(models.TextChoices):
    RECEIVE = "RECEIVE", "Receive"
    PUTAWAY = "PUTAWAY", "Putaway"
    MOVE = "MOVE", "Move"
    REPACK_CONSUME = "REPACK_CONSUME", "Repack Consume"
    REPACK_PRODUCE = "REPACK_PRODUCE", "Repack Produce"
    SHIP = "SHIP", "Ship"
    ADJUST = "ADJUST", "Adjust"

