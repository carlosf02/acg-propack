from django.urls import path
from rest_framework.routers import DefaultRouter
from .api import InventoryBalanceViewSet
from .move_api import MoveWRAPIView

router = DefaultRouter()
router.register(r'balances', InventoryBalanceViewSet, basename='inventory-balance')

urlpatterns = [
    path('move/', MoveWRAPIView.as_view(), name='inventory-move'),
] + router.urls
