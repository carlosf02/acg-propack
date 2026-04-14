from rest_framework import serializers, status, viewsets, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from clients.models import Client
from core.mixins import CompanyScopedViewSetMixin
from receiving.models import WarehouseReceipt, RepackOperation
from warehouse.models import StorageLocation
from .services_repack import consolidate_wrs

class OutputLineSerializer(serializers.Serializer):
    date = serializers.DateField(required=False, allow_null=True)
    carrier = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    package_type = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    tracking_number = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    declared_value = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    length = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    width = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    height = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    weight = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    pieces = serializers.IntegerField(required=False, min_value=1)
    volume_cf = serializers.DecimalField(max_digits=12, decimal_places=4, required=False, allow_null=True)


class OutputWRSerializer(serializers.Serializer):
    # wr_number is intentionally omitted: repack outputs always get a server-generated
    # REPACK-<company>-<seq> number. A client-provided value would be ignored anyway.
    tracking_number = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    carrier = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    location_note = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    lines = OutputLineSerializer(many=True, required=False)

class ConsolidateRequestSerializer(serializers.Serializer):
    client = serializers.PrimaryKeyRelatedField(queryset=Client.objects.all())
    input_wrs = serializers.PrimaryKeyRelatedField(queryset=WarehouseReceipt.objects.all(), many=True)
    to_location = serializers.PrimaryKeyRelatedField(queryset=StorageLocation.objects.all(), required=False, allow_null=True)
    output = OutputWRSerializer(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

class ConsolidateWRAPIView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = ConsolidateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        input_wrs = serializer.validated_data['input_wrs']
        client = serializer.validated_data['client']
        to_location = serializer.validated_data.get('to_location')
        output_data = serializer.validated_data.get('output', {})
        notes = serializer.validated_data.get('notes', '')

        result = consolidate_wrs(
            client=client,
            input_wrs=input_wrs,
            to_location=to_location,
            output_data=output_data,
            performed_by=request.user,
            notes=notes
        )

        return Response({
            "status": "consolidated",
            "repack_operation_id": result['repack_operation'].id,
            "output_wr_id": result['output_wr'].id,
            "output_wr_number": result['output_wr'].wr_number,
            "input_wr_ids": [wr.id for wr in input_wrs],
            "consume_transaction_id": result['consume_txn'].id,
            "produce_transaction_id": result['produce_txn'].id,
            "to_location": to_location.id if to_location else None
        }, status=status.HTTP_201_CREATED)


class RepackOperationListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_code = serializers.CharField(source='client.client_code', read_only=True)
    operation_type_display = serializers.CharField(source='get_operation_type_display', read_only=True)
    input_wr_count = serializers.SerializerMethodField()
    input_wr_numbers = serializers.SerializerMethodField()
    output_wr_id = serializers.SerializerMethodField()
    output_wr_number = serializers.SerializerMethodField()
    output_tracking_number = serializers.SerializerMethodField()

    class Meta:
        model = RepackOperation
        fields = [
            'id',
            'performed_at',
            'created_at',
            'operation_type',
            'operation_type_display',
            'notes',
            'client',
            'client_name',
            'client_code',
            'input_wr_count',
            'input_wr_numbers',
            'output_wr_id',
            'output_wr_number',
            'output_tracking_number',
        ]

    def _first_link(self, obj):
        return next(iter(obj.links.all()), None)

    def get_input_wr_count(self, obj):
        return len(obj.links.all())

    def get_input_wr_numbers(self, obj):
        return [link.input_wr.wr_number for link in obj.links.all()]

    def get_output_wr_id(self, obj):
        link = self._first_link(obj)
        return link.output_wr_id if link else None

    def get_output_wr_number(self, obj):
        link = self._first_link(obj)
        return link.output_wr.wr_number if link else None

    def get_output_tracking_number(self, obj):
        link = self._first_link(obj)
        return link.output_wr.tracking_number if link else None


class RepackOperationViewSet(CompanyScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """
    Read-only list/retrieve for RepackOperations.

    Scoped by company. Creation is handled by ConsolidateWRAPIView at
    POST /api/v1/repack/consolidate/.
    """
    queryset = RepackOperation.objects.select_related('client').prefetch_related(
        'links__input_wr',
        'links__output_wr',
    ).all()
    serializer_class = RepackOperationListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['operation_type', 'client']
    search_fields = ['notes', 'client__name', 'client__client_code']
    ordering_fields = ['created_at', 'performed_at']
    ordering = ['-created_at']
