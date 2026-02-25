from rest_framework import serializers, viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Client

class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = '__all__'

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['client_code', 'name', 'email']
    ordering_fields = ['client_code', 'name', 'created_at']
    ordering = ['client_code']
