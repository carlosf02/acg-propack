from rest_framework import serializers, viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import InventoryBalance

class InvClientMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        from clients.models import Client
        model = Client
        fields = ['id', 'client_code', 'name']

class InvWarehouseMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        from warehouse.models import Warehouse
        model = Warehouse
        fields = ['id', 'code', 'name']

class InvLocationMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        from warehouse.models import StorageLocation
        model = StorageLocation
        fields = ['id', 'code', 'location_type']

class InvWRMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        from receiving.models import WarehouseReceipt
        model = WarehouseReceipt
        fields = ['id', 'wr_number', 'tracking_number', 'status']

class InventoryBalanceSerializer(serializers.ModelSerializer):
    client_details = InvClientMinimalSerializer(source='client', read_only=True)
    warehouse_details = InvWarehouseMinimalSerializer(source='warehouse', read_only=True)
    location_details = InvLocationMinimalSerializer(source='location', read_only=True)
    wr_details = InvWRMinimalSerializer(source='wr', read_only=True)

    class Meta:
        model = InventoryBalance
        fields = [
            'id', 'client', 'warehouse', 'location', 'wr',
            'on_hand_qty', 'reserved_qty', 'created_at', 'updated_at',
            'client_details', 'warehouse_details', 'location_details', 'wr_details'
        ]

class InventoryBalanceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryBalance.objects.select_related(
        'client', 'warehouse', 'location', 'wr'
    ).all()
    serializer_class = InventoryBalanceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['client', 'warehouse', 'location', 'wr']
    search_fields = [
        'wr__wr_number', 
        'wr__tracking_number', 
        'location__code', 
        'warehouse__code'
    ]
    ordering_fields = [
        'updated_at', 'created_at', 
        'location__code', 'wr__wr_number'
    ]
    ordering = ['location__code', 'wr__wr_number']
