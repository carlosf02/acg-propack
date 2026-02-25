from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from clients.models import Client
from receiving.models import WarehouseReceipt
from warehouse.models import StorageLocation
from .services_repack import consolidate_wrs

class OutputWRSerializer(serializers.Serializer):
    wr_number = serializers.CharField(max_length=50)
    tracking_number = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    carrier = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

class ConsolidateRequestSerializer(serializers.Serializer):
    client = serializers.PrimaryKeyRelatedField(queryset=Client.objects.all())
    input_wrs = serializers.PrimaryKeyRelatedField(queryset=WarehouseReceipt.objects.all(), many=True)
    to_location = serializers.PrimaryKeyRelatedField(queryset=StorageLocation.objects.all())
    output = OutputWRSerializer()
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

class ConsolidateWRAPIView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = ConsolidateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        input_wrs = serializer.validated_data['input_wrs']
        client = serializer.validated_data['client']
        to_location = serializer.validated_data['to_location']
        output_data = serializer.validated_data['output']
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
            "to_location": to_location.id
        }, status=status.HTTP_201_CREATED)
