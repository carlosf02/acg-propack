from django.db import transaction
from rest_framework.exceptions import ValidationError as DRFValidationError

from core.models import WRStatus
from receiving.models import WarehouseReceipt
from .models import Consolidation, ConsolidationReceipt, ConsolidationStatus


def _err(message):
    # Wrap as {"detail": "..."} so the frontend ApiError surfaces a clean string
    # via the existing `detail` unwrap in api/client.ts.
    return DRFValidationError({"detail": message})


def add_item_to_consolidation(consolidation_id, warehouse_receipt_id, company):
    with transaction.atomic():
        try:
            consolidation = (
                Consolidation.objects
                .select_for_update()
                .get(pk=consolidation_id, company=company)
            )
        except Consolidation.DoesNotExist:
            raise _err("Consolidation not found.")

        if consolidation.status == ConsolidationStatus.CLOSED:
            raise _err("Cannot modify a closed consolidation.")

        try:
            wr = (
                WarehouseReceipt.objects
                .select_for_update()
                .get(pk=warehouse_receipt_id, company=company)
            )
        except WarehouseReceipt.DoesNotExist:
            raise _err("Warehouse receipt not found.")

        # Mirror the eligibility rules in WarehouseReceiptViewSet.get_queryset
        # for eligible_for=consolidation. Keep these in sync.
        if wr.status != WRStatus.ACTIVE:
            raise _err("Warehouse receipt is not active.")
        if wr.associate_company_id != consolidation.associate_company_id:
            raise _err("Warehouse receipt agency does not match the consolidation.")
        if (wr.shipping_method or "").lower() != consolidation.ship_type.lower():
            raise _err("Warehouse receipt shipping method does not match the consolidation.")
        if (wr.receipt_type or "") != (consolidation.consolidation_type or ""):
            raise _err("Warehouse receipt type does not match the consolidation.")
        if wr.repack_as_input.exists():
            raise _err("Warehouse receipt has already been repacked.")
        if wr.shipment_items.exists():
            raise _err("Warehouse receipt has already been shipped.")

        other_link = (
            ConsolidationReceipt.objects
            .filter(warehouse_receipt_id=warehouse_receipt_id, company=company)
            .exclude(consolidation_id=consolidation.id)
            .select_related('consolidation')
            .first()
        )
        if other_link:
            raise _err(
                f"Warehouse receipt is already linked to consolidation "
                f"{other_link.consolidation.reference_code}."
            )

        if ConsolidationReceipt.objects.filter(
            consolidation=consolidation, warehouse_receipt_id=warehouse_receipt_id
        ).exists():
            raise _err("Warehouse receipt is already in this consolidation.")

        ConsolidationReceipt.objects.create(
            company=company,
            consolidation=consolidation,
            warehouse_receipt_id=warehouse_receipt_id,
        )

        if consolidation.status == ConsolidationStatus.DRAFT:
            consolidation.status = ConsolidationStatus.OPEN
            consolidation.save(update_fields=['status', 'updated_at'])

        return consolidation


def remove_item_from_consolidation(consolidation_id, warehouse_receipt_id, company):
    with transaction.atomic():
        try:
            consolidation = (
                Consolidation.objects
                .select_for_update()
                .get(pk=consolidation_id, company=company)
            )
        except Consolidation.DoesNotExist:
            raise _err("Consolidation not found.")

        if consolidation.status == ConsolidationStatus.CLOSED:
            raise _err("Cannot modify a closed consolidation.")

        link = ConsolidationReceipt.objects.filter(
            consolidation=consolidation,
            warehouse_receipt_id=warehouse_receipt_id,
        ).first()
        if not link:
            raise _err("Warehouse receipt is not in this consolidation.")

        link.delete()

        if (
            consolidation.status == ConsolidationStatus.OPEN
            and not ConsolidationReceipt.objects.filter(consolidation=consolidation).exists()
        ):
            consolidation.status = ConsolidationStatus.DRAFT
            consolidation.save(update_fields=['status', 'updated_at'])

        return consolidation


def close_consolidation(consolidation_id, company):
    with transaction.atomic():
        try:
            consolidation = (
                Consolidation.objects
                .select_for_update()
                .get(pk=consolidation_id, company=company)
            )
        except Consolidation.DoesNotExist:
            raise _err("Consolidation not found.")

        if consolidation.status == ConsolidationStatus.CLOSED:
            raise _err("Consolidation is already closed.")
        if consolidation.status != ConsolidationStatus.OPEN:
            raise _err("Only open consolidations can be closed.")

        consolidation.status = ConsolidationStatus.CLOSED
        consolidation.save(update_fields=['status', 'updated_at'])

        return consolidation
