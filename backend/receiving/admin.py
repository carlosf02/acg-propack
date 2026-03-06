from django.contrib import admin
from .models import WarehouseReceipt, WarehouseReceiptLine, RepackOperation, RepackLink


class WarehouseReceiptLineInline(admin.TabularInline):
    model = WarehouseReceiptLine
    extra = 0
    readonly_fields = ('created_at', 'updated_at')
    fields = (
        'date', 'carrier', 'package_type', 'tracking_number',
        'description', 'declared_value',
        'length', 'width', 'height', 'weight', 'pieces', 'volume_cf',
        'repackable', 'bill_invoice', 'notes',
    )


@admin.register(WarehouseReceipt)
class WarehouseReceiptAdmin(admin.ModelAdmin):
    list_display = (
        'wr_number',
        'client',
        'tracking_number',
        'status',
        'received_at',
        'received_warehouse',
        'shipping_method',
    )
    list_filter = ('status', 'received_warehouse', 'client', 'shipping_method')
    search_fields = (
        'wr_number',
        'tracking_number',
        'client__name',
        'client__client_code',
        'recipient_name',
    )
    ordering = ('-received_at',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [WarehouseReceiptLineInline]


@admin.register(WarehouseReceiptLine)
class WarehouseReceiptLineAdmin(admin.ModelAdmin):
    list_display = ('id', 'receipt', 'carrier', 'package_type', 'tracking_number', 'weight', 'pieces')
    list_filter = ('carrier', 'package_type', 'repackable', 'bill_invoice')
    search_fields = ('tracking_number', 'description', 'receipt__wr_number')
    readonly_fields = ('created_at', 'updated_at')



@admin.register(RepackOperation)
class RepackOperationAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'client',
        'operation_type',
        'performed_by',
        'performed_at',
    )
    list_filter = ('operation_type', 'client')
    search_fields = (
        'id',
        'client__name',
        'client__client_code',
        'performed_by__username',
    )
    ordering = ('-performed_at',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(RepackLink)
class RepackLinkAdmin(admin.ModelAdmin):
    list_display = (
        'repack_operation',
        'input_wr',
        'output_wr',
    )
    list_filter = (
        'repack_operation__operation_type',
        'repack_operation__client',
    )
    search_fields = (
        'input_wr__wr_number',
        'input_wr__tracking_number',
        'output_wr__wr_number',
        'output_wr__tracking_number',
    )
    readonly_fields = ('created_at', 'updated_at')
