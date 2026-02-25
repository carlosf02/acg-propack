from rest_framework import serializers

class TraceLocationSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    code = serializers.CharField()
    location_type = serializers.CharField()

class TraceWarehouseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    code = serializers.CharField()
    name = serializers.CharField()

class TraceBalanceSerializer(serializers.Serializer):
    warehouse_details = TraceWarehouseSerializer(source='warehouse')
    location_details = TraceLocationSerializer(source='location')
    on_hand_qty = serializers.IntegerField()
    reserved_qty = serializers.IntegerField()
    updated_at = serializers.DateTimeField()

class TraceInventoryTransactionLineSerializer(serializers.Serializer):
    transaction_id = serializers.IntegerField(source='transaction.id')
    txn_type = serializers.CharField(source='transaction.txn_type')
    performed_at = serializers.DateTimeField(source='transaction.performed_at')
    performed_by = serializers.CharField(source='transaction.performed_by.username', allow_null=True)
    from_location_code = serializers.CharField(source='from_location.code', allow_null=True)
    to_location_code = serializers.CharField(source='to_location.code', allow_null=True)
    qty = serializers.IntegerField()
    reference_type = serializers.CharField(source='transaction.reference_type', allow_null=True)
    reference_id = serializers.CharField(source='transaction.reference_id', allow_null=True)

class TraceWRMinimalSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    wr_number = serializers.CharField()
    tracking_number = serializers.CharField(allow_null=True)
    status = serializers.CharField()

class TraceRepackSummarySerializer(serializers.Serializer):
    repack_operation_id = serializers.IntegerField(source='repack_operation.id')
    operation_type = serializers.CharField(source='repack_operation.operation_type')
    performed_at = serializers.DateTimeField(source='repack_operation.performed_at')

class TraceShipmentSummarySerializer(serializers.Serializer):
    shipment_id = serializers.IntegerField(source='id')
    shipment_number = serializers.CharField()
    status = serializers.CharField()
    shipped_at = serializers.DateTimeField(allow_null=True)
    carrier = serializers.CharField(allow_null=True)
    tracking_number = serializers.CharField(allow_null=True)
