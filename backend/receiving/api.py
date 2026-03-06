from rest_framework import serializers, viewsets, filters
from core.mixins import CompanyScopedViewSetMixin
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import WarehouseReceipt, WarehouseReceiptLine
from clients.api import ClientSerializer
from warehouse.api import WarehouseMinimalSerializer
from inventory.models import InventoryBalance, InventoryTransactionLine
from shipping.models import ShipmentItem
from .trace_serializers import (
    TraceBalanceSerializer, TraceInventoryTransactionLineSerializer,
    TraceWRMinimalSerializer, TraceRepackSummarySerializer, TraceShipmentSummarySerializer
)
from receiving.models import RepackLink
from clients.models import Client


class WRClientMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'client_code', 'name']


class WRParentMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = WarehouseReceipt
        fields = ['id', 'wr_number', 'tracking_number']


class WarehouseReceiptLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = WarehouseReceiptLine
        fields = [
            'id',
            'date',
            'carrier',
            'package_type',
            'tracking_number',
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
    client_details = WRClientMinimalSerializer(source='client', read_only=True)
    warehouse_details = WarehouseMinimalSerializer(source='received_warehouse', read_only=True)
    parent_wr_details = WRParentMinimalSerializer(source='parent_wr', read_only=True)

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
            'shipping_method',
            'receipt_type',
            'location_note',
            'recipient_name',
            'recipient_address',
            'allow_repacking',
            # Nested lines
            'lines',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['company', 'created_at', 'updated_at']

    def validate(self, data):
        # Validate dimensions and weights (legacy single-WR fields)
        for field in ['weight_value', 'length', 'width', 'height']:
            if field in data and data[field] is not None:
                if data[field] < 0:
                    raise serializers.ValidationError({field: f"{field} cannot be negative."})
        return data

    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        # company is injected by CompanyScopedViewSetMixin.perform_create via serializer.save(company=...)
        # It will be in validated_data at this point since perform_create passes it as kwarg.
        # But because we need it for lines too, pull it from the instance after creation.
        receipt = WarehouseReceipt.objects.create(**validated_data)
        for line_data in lines_data:
            WarehouseReceiptLine.objects.create(
                receipt=receipt,
                company=receipt.company,
                **line_data,
            )
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
                WarehouseReceiptLine.objects.create(
                    receipt=instance,
                    company=instance.company,
                    **line_data,
                )
        return instance


class WarehouseReceiptViewSet(CompanyScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = WarehouseReceipt.objects.prefetch_related('lines').all()
    serializer_class = WarehouseReceiptSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['client', 'status', 'received_warehouse']
    search_fields = ['wr_number', 'tracking_number']
    ordering_fields = ['received_at', 'wr_number', 'created_at']
    ordering = ['-received_at']

    @action(detail=True, methods=['get'], url_path='trace')
    def trace(self, request, pk=None):
        wr = self.get_object()

        core_data = {
            "id": wr.id,
            "wr_number": wr.wr_number,
            "tracking_number": wr.tracking_number,
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
        input_links = RepackLink.objects.select_related('input_wr').filter(output_wr=wr)
        if input_links.exists():
            repack_lineage["consolidated_from"] = [TraceWRMinimalSerializer(link.input_wr).data for link in input_links]

        # Is it an INPUT? (Find output it flows to)
        output_links = RepackLink.objects.select_related('output_wr', 'repack_operation').filter(input_wr=wr)
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
