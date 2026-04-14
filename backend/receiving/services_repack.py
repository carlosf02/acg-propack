from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.db import transaction
from rest_framework.exceptions import ValidationError as DRFValidationError
from receiving.models import (
    WarehouseReceipt,
    WarehouseReceiptLine,
    WRStatus,
    RepackOperation,
    OperationType,
    RepackLink,
)
from inventory.models import InventoryBalance, InventoryTransaction, InventoryTransactionLine, TxnType


def _to_decimal(value):
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _compute_volume_cf(length, width, height):
    if length is None or width is None or height is None:
        return None
    try:
        cf = (length * width * height) / Decimal('1728')
        return cf.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
    except (InvalidOperation, TypeError):
        return None


def consolidate_wrs(client, input_wrs, to_location, output_data, performed_by=None, notes="", company=None):
    if not performed_by:
        raise DRFValidationError("User tracking is missing. performed_by is required.")

    if len(input_wrs) < 2:
        raise DRFValidationError("Consolidation requires at least 2 input warehouse receipts.")

    # Derive company from client if not provided
    if company is None:
        company = client.company

    # 1. Input Validation
    # Ensure all are ACTIVE, belong to same client, and not already consumed by a repack or shipment
    for wr in input_wrs:
        if wr.status != WRStatus.ACTIVE:
            raise DRFValidationError(f"Input WR {wr.wr_number} is not available (status: {wr.status}).")
        if wr.client_id != client.id:
            raise DRFValidationError(f"Input WR {wr.wr_number} does not belong to the specified client.")
        if wr.repack_as_input.exists():
            raise DRFValidationError(f"Input WR {wr.wr_number} is already part of another repack.")
        if wr.shipment_items.exists():
            raise DRFValidationError(f"Input WR {wr.wr_number} is already in a shipment.")

    with transaction.atomic():
        wr_ids = [wr.id for wr in input_wrs]

        # Balances may or may not exist — putaway is optional. Lock whatever is there.
        existing_balances = list(InventoryBalance.objects.select_for_update().filter(wr_id__in=wr_ids))
        balance_by_wr = {b.wr_id: b for b in existing_balances}

        def wr_warehouse_id(wr):
            b = balance_by_wr.get(wr.id)
            return b.warehouse_id if b else wr.received_warehouse_id

        def wr_warehouse(wr):
            b = balance_by_wr.get(wr.id)
            return b.warehouse if b else wr.received_warehouse

        # Destination warehouse: use to_location.warehouse if provided,
        # otherwise derive from the inputs (which must all share one warehouse).
        if to_location is not None:
            destination_warehouse = to_location.warehouse
            destination_warehouse_id = to_location.warehouse_id
            for wr in input_wrs:
                wh_id = wr_warehouse_id(wr)
                if wh_id is None:
                    raise DRFValidationError(f"WR {wr.wr_number} has no warehouse assigned.")
                if wh_id != destination_warehouse_id:
                    raise DRFValidationError(f"WR {wr.wr_number} is in warehouse {wh_id} but destination is {destination_warehouse_id}.")
        else:
            input_warehouse_ids = {wr_warehouse_id(wr) for wr in input_wrs}
            if None in input_warehouse_ids:
                raise DRFValidationError("All input WRs must have a warehouse assigned.")
            if len(input_warehouse_ids) != 1:
                raise DRFValidationError("All input WRs must be in the same warehouse when no destination location is specified.")
            destination_warehouse = wr_warehouse(input_wrs[0])
            destination_warehouse_id = destination_warehouse.id

        # 2. Create RepackOperation
        operation = RepackOperation.objects.create(
            company=company,
            client=client,
            performed_by=performed_by,
            operation_type=OperationType.CONSOLIDATE,
            notes=notes
        )

        # 3. Create the Output WR. Repack outputs always get server-generated
        # REPACK-<company>-<seq> numbering; any client-provided wr_number is ignored.
        output_wr = WarehouseReceipt.objects.create(
            company=company,
            client=client,
            is_repack=True,
            received_warehouse=destination_warehouse,
            tracking_number=output_data.get('tracking_number'),
            carrier=output_data.get('carrier'),
            description=output_data.get('description'),
            location_note=output_data.get('location_note'),
            notes=output_data.get('notes'),
            status=WRStatus.ACTIVE
        )

        # 3b. Persist any package lines the user entered on the repack form.
        output_lines = output_data.get('lines') or []
        for raw in output_lines:
            length = _to_decimal(raw.get('length'))
            width = _to_decimal(raw.get('width'))
            height = _to_decimal(raw.get('height'))
            volume_cf = _to_decimal(raw.get('volume_cf'))
            if volume_cf is None:
                volume_cf = _compute_volume_cf(length, width, height)
            WarehouseReceiptLine.objects.create(
                receipt=output_wr,
                company=company,
                date=raw.get('date') or None,
                carrier=raw.get('carrier') or None,
                package_type=raw.get('package_type') or None,
                tracking_number=raw.get('tracking_number') or None,
                description=raw.get('description') or None,
                declared_value=_to_decimal(raw.get('declared_value')),
                length=length,
                width=width,
                height=height,
                weight=_to_decimal(raw.get('weight')),
                pieces=raw.get('pieces') or 1,
                volume_cf=volume_cf,
            )

        # 4. Create RepackLinks and Update Input WRs
        links_to_create = []
        for wr in input_wrs:
            links_to_create.append(
                RepackLink(company=company, repack_operation=operation, input_wr=wr, output_wr=output_wr)
            )
            wr.status = WRStatus.INACTIVE
            wr.parent_wr = output_wr

        RepackLink.objects.bulk_create(links_to_create)
        WarehouseReceipt.objects.bulk_update(input_wrs, ['status', 'parent_wr'])

        # 5. Inventory Transactions
        # CONSUME transaction for all inputs
        consume_txn = InventoryTransaction.objects.create(
            company=company,
            client=client,
            txn_type=TxnType.REPACK_CONSUME,
            reference_type="REPACK_OP",
            reference_id=str(operation.id),
            performed_by=performed_by,
            notes=f"Consumed for consolidation {operation.id}"
        )

        consume_lines = []
        for wr in input_wrs:
            balance = balance_by_wr.get(wr.id)
            consume_lines.append(
                InventoryTransactionLine(
                    company=company,
                    transaction=consume_txn,
                    wr=wr,
                    from_location=balance.location if balance else None,
                    to_location=None,
                    qty=1
                )
            )
        InventoryTransactionLine.objects.bulk_create(consume_lines)

        # Execute consume (delete any existing balances for the inputs)
        if existing_balances:
            InventoryBalance.objects.filter(id__in=[b.id for b in existing_balances]).delete()

        # PRODUCE transaction for output
        produce_txn = InventoryTransaction.objects.create(
            company=company,
            client=client,
            txn_type=TxnType.REPACK_PRODUCE,
            reference_type="REPACK_OP",
            reference_id=str(operation.id),
            performed_by=performed_by,
            notes=f"Produced from consolidation {operation.id}"
        )

        InventoryTransactionLine.objects.create(
            company=company,
            transaction=produce_txn,
            wr=output_wr,
            from_location=None,
            to_location=to_location,
            qty=1
        )

        # 6. Create Output Balance (location may be null if none was specified)
        InventoryBalance.objects.create(
            company=company,
            client=client,
            warehouse=destination_warehouse,
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
