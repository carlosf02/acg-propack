from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from receiving.models import WarehouseReceipt
from warehouse.models import StorageLocation
from .services import move_wr

class MoveRequestSerializer(serializers.Serializer):
    wr = serializers.PrimaryKeyRelatedField(queryset=WarehouseReceipt.objects.all())
    to_location = serializers.PrimaryKeyRelatedField(queryset=StorageLocation.objects.all())
    from_location = serializers.PrimaryKeyRelatedField(queryset=StorageLocation.objects.all(), required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

class MoveWRAPIView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = MoveRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        wr = serializer.validated_data['wr']
        to_location = serializer.validated_data['to_location']
        from_location = serializer.validated_data.get('from_location')
        notes = serializer.validated_data.get('notes', '')
        
        txn, balance, actual_from_location = move_wr(
            wr=wr,
            to_location=to_location,
            from_location=from_location,
            performed_by=request.user,
            notes=notes
        )
        
        return Response({
            "status": "moved",
            "transaction_id": txn.id,
            "wr": wr.id,
            "from_location": actual_from_location.id if actual_from_location else None,
            "to_location": to_location.id,
            "balance_id": balance.id
        }, status=status.HTTP_200_OK)
