from django.contrib import admin
from .models import Consolidation


@admin.register(Consolidation)
class ConsolidationAdmin(admin.ModelAdmin):
    list_display = (
        'reference_code', 'company', 'associate_company',
        'ship_type', 'status', 'sending_office', 'receiving_office', 'created_at',
    )
    list_filter = ('company', 'status', 'ship_type')
    search_fields = ('reference_code', 'alt_name', 'associate_company__name', 'company__name')
    readonly_fields = ('reference_code', 'created_at', 'updated_at')
    raw_id_fields = ('associate_company', 'sending_office', 'receiving_office')
    ordering = ('-created_at',)
