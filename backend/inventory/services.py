from django.db import transaction
from rest_framework.exceptions import ValidationError as DRFValidationError
from receiving.models import WRStatus
from inventory.models import InventoryBalance, InventoryTransaction, InventoryTransactionLine, TxnType

def move_wr(wr, to_location, from_location=None, performed_by=None, notes=""):
    if not performed_by:
        raise DRFValidationError("User tracking is missing. performed_by is required.")
        
    # 1) Validate WR status
    if wr.status != WRStatus.ACTIVE:
        raise DRFValidationError("Warehouse receipt must be ACTIVE to move.")
        
    with transaction.atomic():
        # Get existing balance if any
        # select_for_update to prevent race conditions
        existing_balances = list(InventoryBalance.objects.select_for_update().filter(wr=wr))
        
        if len(existing_balances) > 1:
            raise DRFValidationError("Data integrity error: WR has multiple active balances.")
            
        current_balance = existing_balances[0] if existing_balances else None
        
        if current_balance:
            if from_location and current_balance.location_id != from_location.id:
                raise DRFValidationError("Provided from_location does not match current WR location.")
            actual_from_location = current_balance.location
        else:
            actual_from_location = None
            if from_location:
                 raise DRFValidationError("from_location provided but WR has no current balance.")

        if actual_from_location and actual_from_location.id == to_location.id:
             raise DRFValidationError("WR is already at the destination location.")

        # Client / warehouse integrity for new balance
        if current_balance:
             # Just moving location
             pass
        else:
             pass # Will be set on create

        # Create Transaction
        txn = InventoryTransaction.objects.create(
            client=wr.client,
            txn_type=TxnType.MOVE,
            reference_type="WR_MOVE",
            reference_id=str(wr.id),
            performed_by=performed_by,
            notes=notes
        )
        
        # Create TransactionLine
        line = InventoryTransactionLine.objects.create(
            transaction=txn,
            wr=wr,
            from_location=actual_from_location,
            to_location=to_location,
            qty=1
        )
        
        # Update or Create Balance
        if current_balance:
            # Check if moving into a location that somehow has a duplicate row 
            # (although our UniqueConstraint on wr, location prevents this, we just update the location)
            
            # Note: what if they try to move WR 1 to Location B, but there's a row for WR 1 at Location B?
            # Our select_for_update().filter(wr=wr) returned only the single row (since it's max 1 active balance)
            # So we can just update current_balance
            current_balance.location = to_location
            current_balance.warehouse = to_location.warehouse
            current_balance.save()
            balance = current_balance
        else:
            balance = InventoryBalance.objects.create(
                client=wr.client,
                warehouse=to_location.warehouse,
                location=to_location,
                wr=wr,
                on_hand_qty=1,
                reserved_qty=0
            )

        return txn, balance, actual_from_location
