from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import login_view, logout_view, signup_view
from clients.api import ClientViewSet
from clients.client_api import ClientPortalSummaryView, ClientPortalPackagesView, ClientSetPasswordView, ClientProfileView, ClientNotificationsView
from warehouse.api import WarehouseViewSet, StorageLocationViewSet
from receiving.api import WarehouseReceiptViewSet
from shipping.api import ShipmentViewSet
from company.viewsets import AssociateCompanyViewSet, OfficeViewSet
from consolidation.api import ConsolidationViewSet

router = DefaultRouter()
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'warehouses', WarehouseViewSet, basename='warehouse')
router.register(r'locations', StorageLocationViewSet, basename='location')
router.register(r'wrs', WarehouseReceiptViewSet, basename='wr')
router.register(r'shipments', ShipmentViewSet, basename='shipment')
router.register(r'associate-companies', AssociateCompanyViewSet, basename='associate-company')
router.register(r'offices', OfficeViewSet, basename='office')
router.register(r'consolidations', ConsolidationViewSet, basename='consolidation')

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('auth-check/', views.auth_check, name='auth_check'),
    path('csrf/', views.csrf, name='csrf'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('signup/', signup_view, name='signup'),
    path('', include('company.urls')),
    path('inventory/', include('inventory.urls')),
    path('repack/', include('receiving.urls')),
    path('billing/', include('billing.urls')),
    path('client/summary/', ClientPortalSummaryView.as_view(), name='client-portal-summary'),
    path('client/packages/', ClientPortalPackagesView.as_view(), name='client-portal-packages'),
    path('client/set-password/', ClientSetPasswordView.as_view(), name='client-set-password'),
    path('client/profile/', ClientProfileView.as_view(), name='client-profile'),
    path('client/notifications/', ClientNotificationsView.as_view(), name='client-notifications'),
    path('', include(router.urls)),
]
