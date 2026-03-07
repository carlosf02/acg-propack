from django.contrib import admin
from .models import Consolidation, ConsolidationReceipt


class ConsolidationReceiptInline(admin.TabularInline):
    model = ConsolidationReceipt
    extra = 1
    raw_id_fields = ('warehouse_receipt',)

@admin.register(Consolidation)
class ConsolidationAdmin(admin.ModelAdmin):
    inlines = [ConsolidationReceiptInline]
    list_display = (
        'reference_code', 'company', 'associate_company',
        'ship_type', 'status', 'sending_office', 'receiving_office', 'created_at',
    )
    list_filter = ('company', 'status', 'ship_type')
    search_fields = ('reference_code', 'alt_name', 'associate_company__name', 'company__name')
    readonly_fields = ('reference_code', 'created_at', 'updated_at')
    raw_id_fields = ('associate_company', 'sending_office', 'receiving_office')
    ordering = ('-created_at',)

@admin.register(ConsolidationReceipt)
class ConsolidationReceiptAdmin(admin.ModelAdmin):
    list_display = ('consolidation', 'warehouse_receipt', 'company', 'created_at')
    list_filter = ('company',)
    raw_id_fields = ('consolidation', 'warehouse_receipt')
