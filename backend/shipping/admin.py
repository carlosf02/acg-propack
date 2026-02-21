from django.contrib import admin
from .models import Shipment, ShipmentItem

@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = (
        'shipment_number',
        'client',
        'status',
        'from_warehouse',
        'carrier',
        'tracking_number',
        'shipped_at',
    )
    list_filter = ('status', 'client', 'from_warehouse')
    search_fields = (
        'shipment_number',
        'tracking_number',
        'client__name',
        'client__client_code',
    )
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(ShipmentItem)
class ShipmentItemAdmin(admin.ModelAdmin):
    list_display = (
        'shipment',
        'wr',
    )
    list_filter = (
        'shipment__status',
        'shipment__client',
    )
    search_fields = (
        'shipment__shipment_number',
        'wr__wr_number',
        'wr__tracking_number',
    )
    readonly_fields = ('created_at', 'updated_at')
