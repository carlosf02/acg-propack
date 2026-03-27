"""
Client-portal API views.

These views are accessible to CLIENT-role users only (not company staff/admin).
They return data scoped to the logged-in client's own records.
"""
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers


class IsClientUser(BasePermission):
    """Allow access only to authenticated users with auth_role == CLIENT."""
    message = "Only client users can access this resource."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.role == "CLIENT" and request.user.profile.client is not None
        except Exception:
            return False


def _get_client(request):
    return request.user.profile.client


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------

class WRSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    kind = serializers.SerializerMethodField()
    reference = serializers.CharField(source='wr_number')
    status = serializers.CharField()
    date = serializers.DateTimeField(source='received_at')
    description = serializers.CharField(allow_null=True)
    weight = serializers.DecimalField(source='weight_value', max_digits=10, decimal_places=2, allow_null=True)

    def get_kind(self, obj):
        return "WR"


class RepackSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    kind = serializers.SerializerMethodField()
    reference = serializers.SerializerMethodField()
    status = serializers.CharField(source='operation_type')
    date = serializers.DateTimeField(source='performed_at')
    description = serializers.CharField(source='notes', allow_null=True)
    weight = serializers.SerializerMethodField()

    def get_kind(self, obj):
        return "REPACK"

    def get_reference(self, obj):
        return f"RK-{obj.id:05d}"

    def get_weight(self, obj):
        return None


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

class ClientPortalPackagesView(APIView):
    """
    GET /api/v1/client/packages/

    Returns the combined package list (WRs + repacks) for the logged-in client.
    Supports query params: search, from_date, until_date, kind (WR|REPACK)
    """
    permission_classes = [IsAuthenticated, IsClientUser]

    def get(self, request):
        from receiving.models import WarehouseReceipt, RepackOperation

        client = _get_client(request)
        search = (request.query_params.get('search') or '').strip().lower()
        from_date = request.query_params.get('from_date') or ''
        until_date = request.query_params.get('until_date') or ''
        kind_filter = (request.query_params.get('kind') or '').upper()

        items = []

        # ── Warehouse Receipts ──────────────────────────────────────────────
        if kind_filter in ('', 'WR'):
            wr_qs = (
                WarehouseReceipt.objects
                .filter(client=client)
                .order_by('-received_at')
                .values(
                    'id', 'wr_number', 'tracking_number', 'carrier',
                    'status', 'received_at', 'description',
                    'weight_value', 'weight_unit', 'shipping_method',
                )
            )
            if from_date:
                wr_qs = wr_qs.filter(received_at__date__gte=from_date)
            if until_date:
                wr_qs = wr_qs.filter(received_at__date__lte=until_date)

            for r in wr_qs:
                date_str = r['received_at'].isoformat() if r['received_at'] else None
                item = {
                    "id": r['id'],
                    "kind": "WR",
                    "reference": r['wr_number'],
                    "tracking_number": r['tracking_number'],
                    "carrier": r['carrier'],
                    "status": r['status'],
                    "date": date_str,
                    "date_sort": r['received_at'],
                    "description": r['description'],
                    "weight": str(r['weight_value']) if r['weight_value'] is not None else None,
                    "weight_unit": r['weight_unit'] or 'LB',
                    "shipping_method": r['shipping_method'],
                }
                if search:
                    haystack = ' '.join(filter(None, [
                        r['wr_number'], r['tracking_number'], r['description'],
                    ])).lower()
                    if search not in haystack:
                        continue
                items.append(item)

        # ── Repack Operations ───────────────────────────────────────────────
        if kind_filter in ('', 'REPACK'):
            rp_qs = (
                RepackOperation.objects
                .filter(client=client)
                .order_by('-performed_at')
                .values('id', 'operation_type', 'notes', 'performed_at')
            )
            if from_date:
                rp_qs = rp_qs.filter(performed_at__date__gte=from_date)
            if until_date:
                rp_qs = rp_qs.filter(performed_at__date__lte=until_date)

            for r in rp_qs:
                ref = f"RK-{r['id']:05d}"
                date_str = r['performed_at'].isoformat() if r['performed_at'] else None
                item = {
                    "id": r['id'],
                    "kind": "REPACK",
                    "reference": ref,
                    "tracking_number": None,
                    "carrier": None,
                    "status": r['operation_type'],
                    "date": date_str,
                    "date_sort": r['performed_at'],
                    "description": r['notes'] or None,
                    "weight": None,
                    "weight_unit": None,
                    "shipping_method": None,
                }
                if search:
                    haystack = ' '.join(filter(None, [ref, r['notes']])).lower()
                    if search not in haystack:
                        continue
                items.append(item)

        # Sort combined list newest-first
        items.sort(key=lambda x: x['date_sort'] or '', reverse=True)
        for item in items:
            del item['date_sort']

        return Response({"results": items, "count": len(items)})


class ClientPortalSummaryView(APIView):
    """
    GET /api/v1/client/summary/

    Returns the warehouse receipts and repack operations belonging to the
    logged-in client user.
    """
    permission_classes = [IsAuthenticated, IsClientUser]

    def get(self, request):
        from receiving.models import WarehouseReceipt, RepackOperation

        client = _get_client(request)

        wrs = (
            WarehouseReceipt.objects
            .filter(client=client)
            .order_by('-received_at')
            .values(
                'id', 'wr_number', 'status', 'received_at',
                'description', 'weight_value',
            )
        )

        repacks = (
            RepackOperation.objects
            .filter(client=client)
            .order_by('-performed_at')
            .values('id', 'operation_type', 'notes', 'performed_at')
        )

        wr_list = [
            {
                "id": r['id'],
                "kind": "WR",
                "reference": r['wr_number'],
                "status": r['status'],
                "date": r['received_at'].isoformat() if r['received_at'] else None,
                "description": r['description'],
                "weight": str(r['weight_value']) if r['weight_value'] is not None else None,
            }
            for r in wrs
        ]

        repack_list = [
            {
                "id": r['id'],
                "kind": "REPACK",
                "reference": f"RK-{r['id']:05d}",
                "status": r['operation_type'],
                "date": r['performed_at'].isoformat() if r['performed_at'] else None,
                "description": r['notes'] or None,
                "weight": None,
            }
            for r in repacks
        ]

        # Latest WR progress (most recent by received_at)
        latest_wr = wrs.first()
        latest_progress = None
        if latest_wr:
            status = latest_wr['status']
            latest_progress = {
                "reference": latest_wr['wr_number'],
                "status": status,
                "stage_received": True,
                "stage_consolidated": status in ("INACTIVE", "SHIPPED", "CANCELLED"),
                "stage_arrived": status == "SHIPPED",
            }

        return Response({
            "warehouse_receipts": wr_list,
            "repacks": repack_list,
            "latest_progress": latest_progress,
        })
