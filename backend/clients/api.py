from rest_framework import serializers, viewsets, filters, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import Client
from core.mixins import CompanyScopedViewSetMixin


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = [
            'id',
            'client_code',
            'client_type',
            'name',
            'last_name',
            'email',
            'cellphone',
            'phone',
            'home_phone',
            'address',
            'city',
            'postal_code',
            'is_active',
            'company',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'client_code', 'company', 'created_at', 'updated_at']

    def validate(self, data):
        # Ensure name is provided
        if not data.get('name') and not (self.instance and self.instance.name):
            raise serializers.ValidationError({'name': 'This field is required.'})
        return data


class ClientMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'client_code', 'name', 'city']


class ClientViewSet(CompanyScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'client_type']
    search_fields = ['client_code', 'name', 'last_name', 'email', 'cellphone']
    ordering_fields = ['client_code', 'name', 'created_at']
    ordering = ['client_code']

    def perform_create(self, serializer):
        company = self.get_company()
        client = serializer.save(company=company)
        from clients.utils import provision_client_user
        provision_client_user(client)
