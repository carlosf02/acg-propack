from rest_framework import serializers, viewsets, filters, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import Client
from core.mixins import CompanyScopedViewSetMixin


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = '__all__'
        read_only_fields = ['company']


class ClientViewSet(CompanyScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    # permission_classes inherited from CompanyScopedViewSetMixin → CompanyObjectPermission
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['client_code', 'name', 'email']
    ordering_fields = ['client_code', 'name', 'created_at']
    ordering = ['client_code']
