from django.db import transaction
from rest_framework.exceptions import ValidationError as DRFValidationError
from receiving.models import WarehouseReceipt, WRStatus, RepackOperation, OperationType, RepackLink
from inventory.models import InventoryBalance, InventoryTransaction, InventoryTransactionLine, TxnType

def consolidate_wrs(client, input_wrs, to_location, output_data, performed_by=None, notes=""):
    if not performed_by:
        raise DRFValidationError("User tracking is missing. performed_by is required.")

    if len(input_wrs) < 2:
        raise DRFValidationError("Consolidation requires at least 2 input warehouse receipts.")

    # 1. Input Validation
    # Ensure all are ACTIVE, belong to same client
    for wr in input_wrs:
        if wr.status != WRStatus.ACTIVE:
            raise DRFValidationError(f"Input WR {wr.wr_number} is not ACTIVE.")
        if wr.client_id != client.id:
            raise DRFValidationError(f"Input WR {wr.wr_number} does not belong to the specified client.")

    with transaction.atomic():
        # Lock Inventory Balances for the input WRs
        wr_ids = [wr.id for wr in input_wrs]
        
        # We must find exactly one active balance per input WR
        existing_balances = list(InventoryBalance.objects.select_for_update().filter(wr_id__in=wr_ids))
        
        if len(existing_balances) != len(input_wrs):
            found_wr_ids = set(b.wr_id for b in existing_balances)
            missing = set(wr_ids) - found_wr_ids
            raise DRFValidationError(f"Missing active inventory balance for WR IDs: {missing}")

        # Check all input balances belong to the same warehouse as the destination
        for balance in existing_balances:
            if balance.warehouse_id != to_location.warehouse_id:
                raise DRFValidationError(f"WR {balance.wr.wr_number} is in warehouse {balance.warehouse_id} but destination is {to_location.warehouse_id}.")

        # 2. Create RepackOperation
        operation = RepackOperation.objects.create(
            client=client,
            performed_by=performed_by,
            operation_type=OperationType.CONSOLIDATE,
            notes=notes
        )

        # 3. Create the Output WR
        output_wr = WarehouseReceipt.objects.create(
            client=client,
            wr_number=output_data['wr_number'],
            received_warehouse=to_location.warehouse,
            tracking_number=output_data.get('tracking_number'),
            carrier=output_data.get('carrier'),
            description=output_data.get('description'),
            notes=output_data.get('notes'),
            status=WRStatus.ACTIVE
        )

        # 4. Create RepackLinks and Update Input WRs
        links_to_create = []
        for wr in input_wrs:
            links_to_create.append(
                RepackLink(repack_operation=operation, input_wr=wr, output_wr=output_wr)
            )
            wr.status = WRStatus.INACTIVE
            wr.parent_wr = output_wr
        
        RepackLink.objects.bulk_create(links_to_create)
        WarehouseReceipt.objects.bulk_update(input_wrs, ['status', 'parent_wr'])

        # 5. Inventory Transactions
        # CONSUME transaction for all inputs
        consume_txn = InventoryTransaction.objects.create(
            client=client,
            txn_type=TxnType.REPACK_CONSUME,
            reference_type="REPACK_OP",
            reference_id=str(operation.id),
            performed_by=performed_by,
            notes=f"Consumed for consolidation {operation.id}"
        )
        
        consume_lines = []
        for balance in existing_balances:
            consume_lines.append(
                InventoryTransactionLine(
                    transaction=consume_txn,
                    wr=balance.wr,
                    from_location=balance.location,
                    to_location=None,
                    qty=1
                )
            )
        InventoryTransactionLine.objects.bulk_create(consume_lines)

        # Execute consume (delete old balances)
        InventoryBalance.objects.filter(id__in=[b.id for b in existing_balances]).delete()

        # PRODUCE transaction for output
        produce_txn = InventoryTransaction.objects.create(
            client=client,
            txn_type=TxnType.REPACK_PRODUCE,
            reference_type="REPACK_OP",
            reference_id=str(operation.id),
            performed_by=performed_by,
            notes=f"Produced from consolidation {operation.id}"
        )

        InventoryTransactionLine.objects.create(
            transaction=produce_txn,
            wr=output_wr,
            from_location=None,
            to_location=to_location,
            qty=1
        )

        # 6. Create Output Balance
        InventoryBalance.objects.create(
            client=client,
            warehouse=to_location.warehouse,
            location=to_location,
            wr=output_wr,
            on_hand_qty=1,
            reserved_qty=0
        )

        return {
            "repack_operation": operation,
            "output_wr": output_wr,
            "consume_txn": consume_txn,
            "produce_txn": produce_txn
        }
