from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from clients.api import ClientViewSet
from warehouse.api import WarehouseViewSet, StorageLocationViewSet
from receiving.api import WarehouseReceiptViewSet
from shipping.api import ShipmentViewSet

router = DefaultRouter()
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'warehouses', WarehouseViewSet, basename='warehouse')
router.register(r'locations', StorageLocationViewSet, basename='location')
router.register(r'wrs', WarehouseReceiptViewSet, basename='wr')
router.register(r'shipments', ShipmentViewSet, basename='shipment')

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('auth-check/', views.auth_check, name='auth_check'),
    path('inventory/', include('inventory.urls')),
    path('repack/', include('receiving.urls')),
    path('', include(router.urls)),
]
