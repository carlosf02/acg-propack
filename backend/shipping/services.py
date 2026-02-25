from django.utils import timezone
from django.db import transaction
from rest_framework.exceptions import ValidationError as DRFValidationError
from shipping.models import Shipment, ShipmentItem
from receiving.models import WRStatus
from core.models import ShipmentStatus
from inventory.models import InventoryBalance, InventoryTransaction, InventoryTransactionLine, TxnType

def add_items_to_shipment(shipment, wr_ids, performed_by=None):
    if not performed_by:
        raise DRFValidationError("User tracking is missing. performed_by is required.")

    if shipment.status not in [ShipmentStatus.PLANNED, ShipmentStatus.PACKED]:
        raise DRFValidationError("Cannot add items unless shipment is PLANNED or PACKED.")

    items_to_create = []
    
    with transaction.atomic():
        # Prevent adding duplicates that already exist on this shipment
        existing_wr_ids = set(ShipmentItem.objects.filter(shipment=shipment).values_list('wr_id', flat=True))
        
        # We need to lock the balances to ensure they are available
        balances = list(InventoryBalance.objects.select_for_update().filter(wr_id__in=wr_ids))
        balance_wr_ids = {b.wr_id for b in balances}

        for wr_id in set(wr_ids):
            if wr_id in existing_wr_ids:
                continue # Safely ignore duplicates
                
            if wr_id not in balance_wr_ids:
                 raise DRFValidationError(f"WR {wr_id} does not have an active inventory balance.")
                 
            balance = next(b for b in balances if b.wr_id == wr_id)
            
            if balance.wr.status != WRStatus.ACTIVE:
                raise DRFValidationError(f"WR {wr_id} is not ACTIVE.")
                
            if balance.wr.client_id != shipment.client_id:
                raise DRFValidationError(f"WR {wr_id} does not belong to the shipment's client.")
            if shipment.from_warehouse_id and balance.warehouse_id != shipment.from_warehouse_id:
                raise DRFValidationError(f"WR {wr_id} is in warehouse {balance.warehouse_id} but shipment is from {shipment.from_warehouse_id}.")

            items_to_create.append(ShipmentItem(shipment=shipment, wr_id=wr_id))

        if items_to_create:
            ShipmentItem.objects.bulk_create(items_to_create)
            
    return len(items_to_create)


def ship_shipment(shipment, performed_by=None, carrier=None, tracking_number=None, shipped_at=None, notes=None):
    if not performed_by:
        raise DRFValidationError("User tracking is missing. performed_by is required.")

    if shipment.status not in [ShipmentStatus.PLANNED, ShipmentStatus.PACKED]:
        raise DRFValidationError("Shipment must be in PLANNED or PACKED status to ship.")

    with transaction.atomic():
        shipment = Shipment.objects.select_for_update().get(id=shipment.id)
        
        items = list(shipment.items.select_related('wr').all())
        if not items:
            raise DRFValidationError("Cannot ship an empty shipment.")

        wr_ids = [item.wr_id for item in items]
        
        # Lock balances for all items
        balances = list(InventoryBalance.objects.select_for_update().filter(wr_id__in=wr_ids))
        balance_map = {b.wr_id: b for b in balances}

        # 1) Validation
        for item in items:
            wr = item.wr
            if wr.status != WRStatus.ACTIVE:
                raise DRFValidationError(f"WR {wr.wr_number} is not ACTIVE.")
            if wr.client_id != shipment.client_id:
                 raise DRFValidationError(f"WR {wr.wr_number} client mismatch.")
            if wr.id not in balance_map:
                raise DRFValidationError(f"WR {wr.wr_number} is missing from inventory.")

        # 2) Create Transaction
        txn = InventoryTransaction.objects.create(
            client=shipment.client,
            txn_type=TxnType.SHIP,
            reference_type="SHIPMENT",
            reference_id=str(shipment.id),
            performed_by=performed_by,
            notes=notes if notes else f"Shipped via {shipment.shipment_number}"
        )

        txn_lines = []
        wrs_to_update = []
        
        # 3) Process each WR
        for item in items:
            wr = item.wr
            balance = balance_map[wr.id]
            
            txn_lines.append(
                InventoryTransactionLine(
                    transaction=txn,
                    wr=wr,
                    from_location=balance.location,
                    to_location=None,
                    qty=1
                )
            )
            
            wr.status = WRStatus.SHIPPED
            wrs_to_update.append(wr)

        # 4) Bulk updates
        InventoryTransactionLine.objects.bulk_create(txn_lines)
        from receiving.models import WarehouseReceipt
        WarehouseReceipt.objects.bulk_update(wrs_to_update, ['status'])
        
        # Delete balances - they left the warehouse
        InventoryBalance.objects.filter(id__in=[b.id for b in balances]).delete()

        # 5) Update Shipment record
        shipment.status = ShipmentStatus.SHIPPED
        shipment.shipped_at = shipped_at or timezone.now()
        if carrier is not None:
             shipment.carrier = carrier
        if tracking_number is not None:
             shipment.tracking_number = tracking_number
        if notes:
             shipment.notes = f"{shipment.notes}\n{notes}" if shipment.notes else notes
             
        shipment.save()
        
    return shipment
