from django.contrib import admin
from .models import InventoryBalance, InventoryTransaction, InventoryTransactionLine

@admin.register(InventoryBalance)
class InventoryBalanceAdmin(admin.ModelAdmin):
    list_display = (
        'client',
        'warehouse',
        'location',
        'wr',
        'on_hand_qty',
        'reserved_qty',
        'updated_at',
    )
    list_filter = ('client', 'warehouse', 'location')
    search_fields = (
        'wr__wr_number',
        'wr__tracking_number',
        'location__code',
        'warehouse__code',
        'client__client_code',
        'client__name',
    )
    ordering = ('-updated_at',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'client',
        'txn_type',
        'performed_by',
        'performed_at',
    )
    list_filter = ('txn_type', 'client')
    search_fields = (
        'id',
        'reference_type',
        'reference_id',
        'performed_by__username',
        'client__client_code',
        'client__name',
    )
    ordering = ('-performed_at',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(InventoryTransactionLine)
class InventoryTransactionLineAdmin(admin.ModelAdmin):
    list_display = (
        'transaction',
        'wr',
        'from_location',
        'to_location',
        'qty',
    )
    list_filter = (
        'transaction__txn_type',
        'transaction__client',
    )
    search_fields = (
        'wr__wr_number',
        'wr__tracking_number',
        'from_location__code',
        'to_location__code',
        'transaction__id',
    )
    readonly_fields = ('created_at', 'updated_at')
