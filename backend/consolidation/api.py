from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from core.mixins import CompanyScopedViewSetMixin
from .models import Consolidation
from .serializers import ConsolidationSerializer


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
