from django.contrib import admin
from .models import Warehouse, StorageLocation

@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "is_active", "created_at")
    search_fields = ("code", "name")
    list_filter = ("is_active",)
    ordering = ("code",)

@admin.register(StorageLocation)
class StorageLocationAdmin(admin.ModelAdmin):
    list_display = ("warehouse", "code", "location_type", "is_active")
    search_fields = ("code", "warehouse__code", "warehouse__name")
    list_filter = ("warehouse", "location_type", "is_active")
    ordering = ("warehouse", "code")
