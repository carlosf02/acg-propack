from rest_framework import serializers, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from core.mixins import CompanyScopedViewSetMixin
from .models import Consolidation
from .serializers import ConsolidationSerializer
from .services import (
    add_item_to_consolidation,
    remove_item_from_consolidation,
    close_consolidation,
)


class _ItemPayloadSerializer(serializers.Serializer):
    warehouse_receipt_id = serializers.IntegerField()


class ConsolidationViewSet(CompanyScopedViewSetMixin, viewsets.ModelViewSet):
    """
    CRUD for Consolidations.

    Scoping: automatically filtered to the active company via CompanyScopedViewSetMixin.
    Permissions: CompanyObjectPermission (inherited from mixin)
      - GET: any active member
      - POST/PATCH/PUT: any active member (staff + admin)
      - DELETE: admin only
    """
    queryset = Consolidation.objects.select_related(
        'company',
        'associate_company',
        'sending_office',
        'receiving_office',
    ).all()
    serializer_class = ConsolidationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'ship_type']
    search_fields = ['reference_code', 'alt_name', 'associate_company__name', 'note']
    ordering_fields = ['created_at', 'status', 'ship_type', 'reference_code']
    ordering = ['-created_at']

    def _serialize(self, consolidation, request):
        return ConsolidationSerializer(consolidation, context={'request': request}).data

    @action(detail=True, methods=['post'], url_path='add_item')
    def add_item(self, request, pk=None):
        payload = _ItemPayloadSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        updated = add_item_to_consolidation(
            consolidation_id=pk,
            warehouse_receipt_id=payload.validated_data['warehouse_receipt_id'],
            company=self.get_company(),
        )
        return Response(self._serialize(updated, request))

    @action(detail=True, methods=['post'], url_path='remove_item')
    def remove_item(self, request, pk=None):
        payload = _ItemPayloadSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        updated = remove_item_from_consolidation(
            consolidation_id=pk,
            warehouse_receipt_id=payload.validated_data['warehouse_receipt_id'],
            company=self.get_company(),
        )
        return Response(self._serialize(updated, request))

    @action(detail=True, methods=['post'], url_path='close')
    def close(self, request, pk=None):
        updated = close_consolidation(
            consolidation_id=pk,
            company=self.get_company(),
        )
        return Response(self._serialize(updated, request))
