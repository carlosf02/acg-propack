from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from shipping.models import Shipment, ShipmentItem
from clients.api import ClientSerializer
from warehouse.api import WarehouseMinimalSerializer
from receiving.trace_serializers import TraceWRMinimalSerializer
from inventory.models import InventoryTransaction
from .services import add_items_to_shipment, ship_shipment

class ShipmentSerializer(serializers.ModelSerializer):
    client_details = ClientSerializer(source='client', read_only=True)
    from_warehouse_details = WarehouseMinimalSerializer(source='from_warehouse', read_only=True)

    class Meta:
        model = Shipment
        fields = '__all__'

class AddItemsSerializer(serializers.Serializer):
    wr_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )

class ShipRequestSerializer(serializers.Serializer):
    carrier = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    tracking_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    shipped_at = serializers.DateTimeField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.select_related('client', 'from_warehouse').all()
    serializer_class = ShipmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['client', 'status', 'from_warehouse']
    search_fields = ['shipment_number', 'tracking_number', 'client__client_code', 'client__name']
    ordering_fields = ['created_at', 'shipped_at', 'shipment_number']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'], url_path='items')
    def add_items(self, request, pk=None):
        shipment = self.get_object()
        serializer = AddItemsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        wr_ids = serializer.validated_data['wr_ids']
        
        added_count = add_items_to_shipment(
            shipment=shipment,
            wr_ids=wr_ids,
            performed_by=request.user
        )
        
        return Response({"status": "items_added", "count": added_count}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='ship')
    def ship(self, request, pk=None):
        shipment = self.get_object()
        serializer = ShipRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ship_shipment(
            shipment=shipment,
            performed_by=request.user,
            carrier=serializer.validated_data.get('carrier'),
            tracking_number=serializer.validated_data.get('tracking_number'),
            shipped_at=serializer.validated_data.get('shipped_at'),
            notes=serializer.validated_data.get('notes')
        )
        
        # Return updated shipment
        shipment.refresh_from_db()
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_200_OK)
    @action(detail=True, methods=['get'], url_path='trace')
    def trace(self, request, pk=None):
        shipment = self.get_object()
        
        core_data = {
            "id": shipment.id,
            "shipment_number": shipment.shipment_number,
            "status": shipment.status,
            "client_details": ClientSerializer(shipment.client).data,
            "from_warehouse_details": WarehouseMinimalSerializer(shipment.from_warehouse).data if shipment.from_warehouse else None,
            "carrier": shipment.carrier,
            "tracking_number": shipment.tracking_number,
            "shipped_at": shipment.shipped_at,
            "notes": shipment.notes
        }

        # Items
        items = shipment.items.select_related('wr').all()
        core_data["items"] = [TraceWRMinimalSerializer(item.wr).data for item in items]
        
        # Transaction Linkage
        txn = InventoryTransaction.objects.select_related('performed_by').prefetch_related('lines').filter(reference_type="SHIPMENT", reference_id=str(shipment.id)).first()
        if txn:
            core_data["transaction_linkage"] = {
                "transaction_id": txn.id,
                "performed_at": txn.performed_at,
                "performed_by": txn.performed_by.username if txn.performed_by else None,
                "line_count": txn.lines.count()
            }
        else:
            core_data["transaction_linkage"] = None
            
        return Response(core_data)
