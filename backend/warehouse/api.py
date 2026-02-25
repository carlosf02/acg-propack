from rest_framework import serializers, viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Warehouse, StorageLocation

class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = '__all__'

class WarehouseMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ['id', 'code', 'name']

class StorageLocationSerializer(serializers.ModelSerializer):
    warehouse_details = WarehouseMinimalSerializer(source='warehouse', read_only=True)
    
    class Meta:
        model = StorageLocation
        fields = '__all__'

class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['code', 'name']
    ordering_fields = ['code', 'name', 'created_at']
    ordering = ['code']

class StorageLocationViewSet(viewsets.ModelViewSet):
    queryset = StorageLocation.objects.all()
    serializer_class = StorageLocationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['warehouse', 'is_active', 'location_type']
    search_fields = ['code', 'description', 'warehouse__code', 'warehouse__name']
    ordering_fields = ['code', 'location_type', 'created_at']
    ordering = ['warehouse__code', 'code']
