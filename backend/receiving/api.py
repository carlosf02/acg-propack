from rest_framework import serializers, viewsets, filters
from core.mixins import CompanyScopedViewSetMixin
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from core.models import WRStatus
from .models import WarehouseReceipt, WarehouseReceiptLine, WarehouseReceiptLineTracking
from clients.api import ClientSerializer, ClientMinimalSerializer
from company.models import AssociateCompany
from warehouse.api import WarehouseMinimalSerializer
from inventory.models import InventoryBalance, InventoryTransactionLine
from shipping.models import ShipmentItem
from .trace_serializers import (
    TraceBalanceSerializer, TraceInventoryTransactionLineSerializer,
    TraceWRMinimalSerializer, TraceRepackSummarySerializer, TraceShipmentSummarySerializer
)
from receiving.models import RepackLink

class AssociateCompanyMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssociateCompany
        fields = ['id', 'name']


class WRParentMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = WarehouseReceipt
        fields = ['id', 'wr_number', 'tracking_number']


class WarehouseReceiptLineTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = WarehouseReceiptLineTracking
        fields = ['id', 'tracking_number', 'order']
        read_only_fields = ['id']


class WarehouseReceiptLineSerializer(serializers.ModelSerializer):
    tracking_numbers = WarehouseReceiptLineTrackingSerializer(many=True, read_only=True)

    def to_internal_value(self, data):
        # Extract tracking_numbers from the raw input before DRF processes the rest.
        # DRF does not reliably pass writable nested data for reverse FK relations
        # through validated_data, so we handle it manually here.
        raw_tracking = data.get('tracking_numbers', [])
        ret = super().to_internal_value(data)
        ret['tracking_numbers'] = [
            t for t in raw_tracking
            if isinstance(t, dict) and str(t.get('tracking_number', '')).strip()
        ]
        return ret

    def validate_volume_cf(self, value):
        if value is not None:
            from decimal import Decimal, ROUND_HALF_UP
            value = value.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
        return value

    class Meta:
        model = WarehouseReceiptLine
        fields = [
            'id',
            'date',
            'carrier',
            'package_type',
            'tracking_number',
            'tracking_numbers',
            'description',
            'declared_value',
            'length',
            'width',
            'height',
            'weight',
            'pieces',
            'volume_cf',
            'repackable',
            'bill_invoice',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WarehouseReceiptSerializer(serializers.ModelSerializer):
    client_details = ClientMinimalSerializer(source='client', read_only=True)
    warehouse_details = WarehouseMinimalSerializer(source='received_warehouse', read_only=True)
    parent_wr_details = WRParentMinimalSerializer(source='parent_wr', read_only=True)
    associate_company_details = AssociateCompanyMinimalSerializer(source='associate_company', read_only=True)
    wr_status_display = serializers.SerializerMethodField()

    def get_wr_status_display(self, obj):
        # Check if this WR is part of a shipment
        shipment_item = obj.shipment_items.first()
        if shipment_item:
            return {'type': 'processed', 'reference': shipment_item.shipment.shipment_number}
        # Check if this WR was used as input in a repack
        repack_link = obj.repack_as_input.first()
        if repack_link:
            return {'type': 'repacked', 'reference': repack_link.output_wr.wr_number}
        return {'type': 'not_processed', 'reference': None}

    # Nested package lines — readable and writable
    lines = WarehouseReceiptLineSerializer(many=True, required=False)

    class Meta:
        model = WarehouseReceipt
        fields = [
            'id',
            'wr_number',
            'company',
            'client',
            'client_details',
            'received_warehouse',
            'warehouse_details',
            'tracking_number',
            'carrier',
            'status',
            'received_at',
            # Legacy measurement fields
            'weight_value',
            'weight_unit',
            'length',
            'width',
            'height',
            'dimension_unit',
            'parent_wr',
            'parent_wr_details',
            'description',
            'notes',
            # New header fields
            'associate_company',
            'associate_company_details',
            'shipping_method',
            'receipt_type',
            'location_note',
            'recipient_name',
            'recipient_address',
            'allow_repacking',
            'is_repack',
            # Nested lines
            'lines',
            'wr_status_display',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'wr_number', 'company', 'is_repack', 'created_at', 'updated_at']

    def validate(self, data):
        # Validate dimensions and weights (legacy single-WR fields)
        for field in ['weight_value', 'length', 'width', 'height']:
            if field in data and data[field] is not None:
                if data[field] < 0:
                    raise serializers.ValidationError({field: f"{field} cannot be negative."})
        return data

    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        if not validated_data.get('received_warehouse'):
            company = validated_data.get('company')
            if company is not None:
                from warehouse.models import Warehouse
                active_warehouses = list(Warehouse.objects.filter(company=company, is_active=True)[:2])
                if len(active_warehouses) == 1:
                    validated_data['received_warehouse'] = active_warehouses[0]
        receipt = WarehouseReceipt.objects.create(**validated_data)
        for line_data in lines_data:
            tracking_data = line_data.pop('tracking_numbers', [])
            line = WarehouseReceiptLine.objects.create(
                receipt=receipt,
                company=receipt.company,
                **line_data,
            )
            for t in tracking_data:
                WarehouseReceiptLineTracking.objects.create(
                    line=line,
                    company=receipt.company,
                    **t,
                )
            if tracking_data:
                line.tracking_number = ", ".join(t['tracking_number'] for t in tracking_data)
                line.save(update_fields=['tracking_number'])
        return receipt

    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)
        # Update receipt scalar fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        # If lines were provided, replace them (delete + recreate)
        if lines_data is not None:
            instance.lines.all().delete()
            for line_data in lines_data:
                tracking_data = line_data.pop('tracking_numbers', [])
                line = WarehouseReceiptLine.objects.create(
                    receipt=instance,
                    company=instance.company,
                    **line_data,
                )
                for t in tracking_data:
                    WarehouseReceiptLineTracking.objects.create(
                        line=line,
                        company=instance.company,
                        **t,
                    )
                if tracking_data:
                    line.tracking_number = ", ".join(t['tracking_number'] for t in tracking_data)
                    line.save(update_fields=['tracking_number'])
        return instance


class WarehouseReceiptViewSet(CompanyScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = WarehouseReceipt.objects.prefetch_related(
        'lines',
        'lines__tracking_numbers',
        'shipment_items__shipment',
        'repack_as_input__output_wr',
    ).all()
    serializer_class = WarehouseReceiptSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['client', 'status', 'received_warehouse', 'is_repack']
    search_fields = ['wr_number', 'tracking_number']
    ordering_fields = ['received_at', 'wr_number', 'created_at']
    ordering = ['-received_at']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        # Repack picker: active, un-consumed, repack-allowed, non-repack WRs only.
        if params.get('eligible_for') == 'repack':
            return (
                qs.filter(
                    status=WRStatus.ACTIVE,
                    is_repack=False,
                    allow_repacking=True,
                )
                .exclude(repack_as_input__isnull=False)
                .exclude(shipment_items__isnull=False)
                .exclude(consolidation_links__isnull=False)
                .distinct()
            )

        # Default list views hide repack outputs unless the caller asks for them
        # explicitly via ?is_repack=true.
        if 'is_repack' not in params:
            qs = qs.filter(is_repack=False)
        return qs

    @action(detail=True, methods=['get'], url_path='trace')
    def trace(self, request, pk=None):
        wr = self.get_object()

        # Aggregate tracking numbers from the line tracking table (source of truth).
        wr_trackings = []
        for line in wr.lines.all():
            for t in line.tracking_numbers.all():
                if t.tracking_number:
                    wr_trackings.append(t.tracking_number)
        tracking_str = ', '.join(wr_trackings) if wr_trackings else None

        core_data = {
            "id": wr.id,
            "wr_number": wr.wr_number,
            "tracking_number": tracking_str,
            "status": wr.status,
            "client_details": ClientSerializer(wr.client).data,
            "received_warehouse_details": WarehouseMinimalSerializer(wr.received_warehouse).data if wr.received_warehouse else None,
            "received_at": wr.received_at
        }

        # 2) Current Balance
        balance = InventoryBalance.objects.select_related('warehouse', 'location').filter(wr=wr).first()
        core_data["current_balance"] = TraceBalanceSerializer(balance).data if balance else None

        # 3) Repack Lineage
        repack_lineage = {}

        # Is it an OUTPUT? (Find inputs pointing to this wr)
        input_links = (
            RepackLink.objects
            .filter(output_wr=wr)
            .select_related('input_wr')
            .prefetch_related('input_wr__lines', 'input_wr__lines__tracking_numbers')
        )
        if input_links.exists():
            repack_lineage["consolidated_from"] = [TraceWRMinimalSerializer(link.input_wr).data for link in input_links]

        # Is it an INPUT? (Find output it flows to)
        output_links = (
            RepackLink.objects
            .filter(input_wr=wr)
            .select_related('output_wr', 'repack_operation')
            .prefetch_related('output_wr__lines', 'output_wr__lines__tracking_numbers')
        )
        if output_links.exists():
            link = output_links.first()
            repack_lineage["consolidated_into"] = TraceWRMinimalSerializer(link.output_wr).data
            repack_lineage["operation"] = TraceRepackSummarySerializer(link).data

        core_data["repack_lineage"] = repack_lineage if repack_lineage else None

        # 4) Shipment Linkage
        shipment_item = ShipmentItem.objects.select_related('shipment').filter(wr=wr).order_by('-created_at').first()
        core_data["shipment_linkage"] = TraceShipmentSummarySerializer(shipment_item.shipment).data if shipment_item else None

        # 5) Inventory History
        lines = InventoryTransactionLine.objects.select_related(
            'transaction', 'transaction__performed_by', 'from_location', 'to_location'
        ).filter(wr=wr).order_by('-transaction__performed_at')

        core_data["inventory_history"] = [TraceInventoryTransactionLineSerializer(line).data for line in lines]

        return Response(core_data)
