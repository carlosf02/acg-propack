"""
Client-portal API views.

These views are accessible to CLIENT-role users only (not company staff/admin).
They return data scoped to the logged-in client's own records.
"""
from decimal import Decimal
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import update_session_auth_hash
from django.core.exceptions import ValidationError as DjangoValidationError
from clients.utils import get_client_from_request


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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _aggregate_wr_lines(wr):
    """
    Roll up per-line data into a single header-shaped summary for the client portal.

    Tracking numbers come from the WarehouseReceiptLineTracking table (source of
    truth). Carrier/description are de-duplicated and joined. Weight is summed.
    Caller should prefetch ``lines`` and ``lines__tracking_numbers``.
    """
    trackings = []
    carriers = []
    descriptions = []
    total_weight = Decimal('0')
    has_weight = False

    for line in wr.lines.all():
        for t in line.tracking_numbers.all():
            if t.tracking_number:
                trackings.append(t.tracking_number)
        if line.carrier and line.carrier not in carriers:
            carriers.append(line.carrier)
        if line.description and line.description not in descriptions:
            descriptions.append(line.description)
        if line.weight is not None:
            total_weight += line.weight
            has_weight = True

    return {
        "tracking_number": ', '.join(trackings) if trackings else None,
        "carrier": ', '.join(carriers) if carriers else None,
        "description": ' | '.join(descriptions) if descriptions else None,
        "weight": str(total_weight) if has_weight else None,
    }


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

        client = get_client_from_request(request)
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
                .prefetch_related('lines', 'lines__tracking_numbers')
            )
            if from_date:
                wr_qs = wr_qs.filter(received_at__date__gte=from_date)
            if until_date:
                wr_qs = wr_qs.filter(received_at__date__lte=until_date)

            for wr in wr_qs:
                rolled = _aggregate_wr_lines(wr)
                date_str = wr.received_at.isoformat() if wr.received_at else None
                item = {
                    "id": wr.id,
                    "kind": "WR",
                    "reference": wr.wr_number,
                    "tracking_number": rolled["tracking_number"],
                    "carrier": rolled["carrier"],
                    "status": wr.status,
                    "date": date_str,
                    "date_sort": wr.received_at,
                    "description": rolled["description"],
                    "weight": rolled["weight"],
                    "weight_unit": "LB",
                    "shipping_method": wr.shipping_method,
                }
                if search:
                    haystack = ' '.join(filter(None, [
                        wr.wr_number, rolled["tracking_number"], rolled["description"],
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

        client = get_client_from_request(request)

        wrs = list(
            WarehouseReceipt.objects
            .filter(client=client)
            .order_by('-received_at')
            .prefetch_related('lines', 'lines__tracking_numbers')
        )

        repacks = (
            RepackOperation.objects
            .filter(client=client)
            .order_by('-performed_at')
            .values('id', 'operation_type', 'notes', 'performed_at')
        )

        wr_list = []
        for wr in wrs:
            rolled = _aggregate_wr_lines(wr)
            wr_list.append({
                "id": wr.id,
                "kind": "WR",
                "reference": wr.wr_number,
                "status": wr.status,
                "date": wr.received_at.isoformat() if wr.received_at else None,
                "description": rolled["description"],
                "weight": rolled["weight"],
            })

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
        latest_wr = wrs[0] if wrs else None
        latest_progress = None
        if latest_wr:
            wr_status = latest_wr.status
            latest_progress = {
                "reference": latest_wr.wr_number,
                "status": wr_status,
                "stage_received": True,
                "stage_consolidated": wr_status in ("INACTIVE", "SHIPPED", "CANCELLED"),
                "stage_arrived": wr_status == "SHIPPED",
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
        client = get_client_from_request(request)
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
        client = get_client_from_request(request)
        try:
            prefs = client.notification_prefs
            data = {f: getattr(prefs, f) for f in _NOTIF_FIELDS}
        except ClientNotificationPreferences.DoesNotExist:
            data = {f: True for f in _NOTIF_FIELDS}
        return Response(data)

    def patch(self, request):
        from clients.models import ClientNotificationPreferences
        client = get_client_from_request(request)

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
