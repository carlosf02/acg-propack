"""
Client-portal API views.

These views are accessible to CLIENT-role users only (not company staff/admin).
They return data scoped to the logged-in client's own records.
"""
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers, status
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import update_session_auth_hash
from django.core.exceptions import ValidationError as DjangoValidationError


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


class ClientProfileView(APIView):
    """
    PATCH /api/v1/client/profile/

    Lets the authenticated client update their own profile fields and marks
    profile_completed = True on the UserProfile.
    Only updates the fields that are sent; omitted fields are left unchanged.
    """
    permission_classes = [IsAuthenticated, IsClientUser]

    # Fields that map directly from the request body to Client model fields
    ALLOWED_FIELDS = [
        'name', 'last_name', 'cellphone', 'home_phone',
        'address', 'city', 'postal_code',
        'default_address_line1', 'default_address_line2',
        'default_city', 'default_state', 'default_zip',
    ]

    def patch(self, request):
        client = _get_client(request)
        data = request.data

        # name is the only required field — must remain non-empty if provided
        if 'name' in data and not (data['name'] or '').strip():
            return Response(
                {"detail": "Name cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Apply whitelisted fields
        changed = []
        for field in self.ALLOWED_FIELDS:
            if field in data:
                setattr(client, field, (data[field] or '').strip() or None
                        if data[field] is not None else None)
                changed.append(field)

        if changed:
            client.save(update_fields=changed + ['updated_at'])

        # Mark profile step as complete
        profile = request.user.profile
        if not profile.profile_completed:
            profile.profile_completed = True
            profile.save(update_fields=['profile_completed'])

        return Response({"ok": True})


class ClientSetPasswordView(APIView):
    """
    POST /api/v1/client/set-password/

    Allows an authenticated client user to set a new password.
    Clears must_change_password on success.
    Accessible to any authenticated CLIENT (not just those with must_change_password=True,
    so it can also serve as a self-service password change later).
    """
    permission_classes = [IsAuthenticated, IsClientUser]

    def post(self, request):
        new_password = request.data.get('new_password', '').strip()
        confirm_password = request.data.get('confirm_password', '').strip()

        if not new_password:
            return Response(
                {"detail": "new_password is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new_password != confirm_password:
            return Response(
                {"detail": "Passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=request.user)
        except DjangoValidationError as exc:
            return Response(
                {"detail": " ".join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        update_session_auth_hash(request, request.user)  # keep session alive after password change

        # Clear the first-login flag
        try:
            profile = request.user.profile
            if profile.must_change_password:
                profile.must_change_password = False
                profile.save(update_fields=['must_change_password'])
        except Exception:
            pass

        return Response({"ok": True})


# ── Step 3: Notification preferences ─────────────────────────────────────────

_NOTIF_FIELDS = [
    'notify_warehouse_receipt',
    'notify_repack',
    'notify_consolidation',
    'notify_arrived',
]


class ClientNotificationsView(APIView):
    """
    GET  /api/v1/client/notifications/ — return current preferences (defaults if not yet set).
    PATCH /api/v1/client/notifications/ — save preferences, set notifications_configured=True.
    """
    permission_classes = [IsAuthenticated, IsClientUser]

    def get(self, request):
        from clients.models import ClientNotificationPreferences
        client = _get_client(request)
        try:
            prefs = client.notification_prefs
            data = {f: getattr(prefs, f) for f in _NOTIF_FIELDS}
        except ClientNotificationPreferences.DoesNotExist:
            data = {f: True for f in _NOTIF_FIELDS}
        return Response(data)

    def patch(self, request):
        from clients.models import ClientNotificationPreferences
        client = _get_client(request)

        prefs, _ = ClientNotificationPreferences.objects.get_or_create(client=client)
        for field in _NOTIF_FIELDS:
            if field in request.data:
                value = request.data[field]
                if not isinstance(value, bool):
                    return Response(
                        {"detail": f"'{field}' must be a boolean."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                setattr(prefs, field, value)
        prefs.save()

        # Mark onboarding Step 3 complete
        try:
            profile = request.user.profile
            if not profile.notifications_configured:
                profile.notifications_configured = True
                profile.save(update_fields=['notifications_configured'])
        except Exception:
            pass

        return Response({"ok": True})
