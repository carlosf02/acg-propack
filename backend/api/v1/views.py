from datetime import timedelta

from django.contrib.auth import authenticate, login, logout, get_user_model
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

User = get_user_model()


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def auth_check(request):
    return Response({"status": "authenticated"})


@ensure_csrf_cookie
@api_view(["GET"])
@permission_classes([AllowAny])
def csrf(request):
    """Bootstrap endpoint: sets the csrftoken cookie so the SPA can read it."""
    return Response({"csrf": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """
    Accepts { "identifier": "<username_or_email>", "password": "<password>" }.
    Supports login by username or email.
    On success sets a session cookie and returns { "ok": true }.
    """
    identifier = request.data.get("identifier", "").strip()
    password = request.data.get("password", "")

    if not identifier or not password:
        return Response(
            {"detail": "identifier and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Resolve email → username so authenticate() can verify the password.
    username = identifier
    if "@" in identifier:
        try:
            user_obj = User.objects.get(email__iexact=identifier)
            username = user_obj.username
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response(
            {"detail": "Invalid credentials."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    login(request, user)
    return Response({"ok": True})


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    """Clears the current session."""
    logout(request)
    return Response({"ok": True})


@api_view(["POST"])
@permission_classes([AllowAny])
def signup_view(request):
    """
    Accepts { "username": "...", "email": "...", "password": "..." }.
    Creates a new user, logs them in, returns { "ok": true }.
    Does NOT create a company.
    """
    username = request.data.get("username", "").strip()
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "")

    if not username or not email or not password:
        return Response(
            {"detail": "username, email, and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username__iexact=username).exists():
        return Response(
            {"detail": "A user with that username already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {"detail": "A user with that email already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.create_user(username=username, email=email, password=password)
    login(request, user)
    return Response({"ok": True}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Aggregated counts + latest WRs for the dashboard home.
    Scoped to the requesting user's active company.
    """
    from company.utils import get_active_company
    from receiving.models import WarehouseReceipt, RepackOperation
    from consolidation.models import Consolidation, ConsolidationStatus, ShipType
    from clients.models import Client
    from core.models import WRStatus

    company = get_active_company(request.user)

    active_wr_count = (
        WarehouseReceipt.objects
        .filter(company=company, status=WRStatus.ACTIVE, is_repack=False)
        .filter(shipment_items__isnull=True)
        .count()
    )

    consol_qs = Consolidation.objects.filter(company=company)
    consolidations = {
        "draft": consol_qs.filter(status=ConsolidationStatus.DRAFT).count(),
        "open": consol_qs.filter(status=ConsolidationStatus.OPEN).count(),
        "closed": consol_qs.filter(status=ConsolidationStatus.CLOSED).count(),
    }

    active_clients = Client.objects.filter(company=company, is_active=True).count()

    now = timezone.now()
    repacks_this_month = RepackOperation.objects.filter(
        company=company,
        performed_at__year=now.year,
        performed_at__month=now.month,
    ).count()

    recent_qs = (
        WarehouseReceipt.objects
        .filter(company=company, is_repack=False)
        .select_related("client", "associate_company")
        .order_by("-received_at")[:5]
    )
    company_name = company.name
    recent_wrs = []
    for wr in recent_qs:
        total = wr.lines.aggregate(s=Sum("weight"))["s"] or 0
        agency = wr.associate_company.name if wr.associate_company else company_name
        recent_wrs.append({
            "wr_number": wr.wr_number,
            "client_name": wr.client.name if wr.client else "",
            "agency_name": agency,
            "total_weight": float(total),
            "received_at": wr.received_at.isoformat() if wr.received_at else None,
        })

    # ── Charts ────────────────────────────────────────────────────────────
    # WRs per day, last 30 calendar days (inclusive of today). Fill zeros.
    today = timezone.localdate()
    start_date = today - timedelta(days=29)
    per_day_rows = (
        WarehouseReceipt.objects
        .filter(company=company, is_repack=False, received_at__date__gte=start_date)
        .annotate(day=TruncDate("received_at"))
        .values("day")
        .annotate(count=Count("id"))
    )
    counts_by_day = {row["day"]: row["count"] for row in per_day_rows}
    wrs_per_day = []
    for i in range(30):
        day = start_date + timedelta(days=i)
        wrs_per_day.append({
            "date": day.isoformat(),
            "count": counts_by_day.get(day, 0),
        })

    ship_type_rows = (
        Consolidation.objects
        .filter(company=company)
        .values("ship_type")
        .annotate(count=Count("id"))
    )
    by_ship_type = {row["ship_type"]: row["count"] for row in ship_type_rows}
    consolidations_by_ship_type = {
        "air": by_ship_type.get(ShipType.AIR, 0),
        "sea": by_ship_type.get(ShipType.SEA, 0),
        "ground": by_ship_type.get(ShipType.GROUND, 0),
    }

    return Response({
        "active_wr_count": active_wr_count,
        "consolidations": consolidations,
        "active_clients": active_clients,
        "repacks_this_month": repacks_this_month,
        "recent_wrs": recent_wrs,
        "wrs_per_day": wrs_per_day,
        "consolidations_by_ship_type": consolidations_by_ship_type,
    })
