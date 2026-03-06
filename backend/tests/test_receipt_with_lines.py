"""
Tests for WarehouseReceipt creation with nested WarehouseReceiptLine rows.
"""
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from clients.models import Client
from warehouse.models import Warehouse
from receiving.models import WarehouseReceipt, WarehouseReceiptLine
from company.models import Company, CompanyMember

User = get_user_model()


# ─── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def company():
    return Company.objects.create(name="Receipt Test Co")


@pytest.fixture
def user_and_member(company):
    user = User.objects.create_user(username="testuser_rl", password="password")
    CompanyMember.objects.create(company=company, user=user, is_active=True)
    return user


@pytest.fixture
def auth_client(user_and_member):
    api = APIClient()
    api.force_authenticate(user=user_and_member)
    return api


@pytest.fixture
def setup_data(company):
    client = Client.objects.create(company=company, name="Receiving Client", client_code="RC-001")
    warehouse = Warehouse.objects.create(company=company, code="WH-R1", name="Recv Warehouse")
    return {"client": client, "warehouse": warehouse}


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _receipt_payload(setup_data, lines=None, **overrides):
    base = {
        "wr_number": "WR-TEST-001",
        "client": setup_data["client"].id,
        "received_warehouse": setup_data["warehouse"].id,
        "shipping_method": "air",
        "receipt_type": "standard",
        "allow_repacking": False,
        "lines": lines if lines is not None else [],
    }
    base.update(overrides)
    return base


# ─── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_receipt_with_lines(auth_client, setup_data):
    """POST /api/v1/wrs/ with 2 package lines → 201 and both lines in DB."""
    payload = _receipt_payload(setup_data, lines=[
        {
            "date": "2026-03-06",
            "carrier": "ups",
            "package_type": "box",
            "tracking_number": "1Z999AA01",
            "weight": "5.50",
            "pieces": 1,
            "length": "12", "width": "10", "height": "8",
            "volume_cf": "0.5556",
            "declared_value": "99.00",
            "repackable": False,
            "bill_invoice": True,
        },
        {
            "date": "2026-03-06",
            "carrier": "fedex",
            "package_type": "envelope",
            "tracking_number": "FX-000002",
            "weight": "0.50",
            "pieces": 1,
        },
    ])

    resp = auth_client.post('/api/v1/wrs/', payload, format='json')
    assert resp.status_code == 201, resp.data

    receipt_id = resp.data['id']
    assert WarehouseReceipt.objects.filter(id=receipt_id).exists()
    assert WarehouseReceiptLine.objects.filter(receipt_id=receipt_id).count() == 2

    # Verify values on first line
    line = WarehouseReceiptLine.objects.filter(receipt_id=receipt_id, carrier='ups').first()
    assert line is not None
    assert line.bill_invoice is True
    assert float(line.declared_value) == 99.00


@pytest.mark.django_db
def test_receipt_get_includes_lines(auth_client, setup_data):
    """GET /api/v1/wrs/{id}/ returns lines array."""
    payload = _receipt_payload(setup_data, wr_number="WR-TEST-002", lines=[
        {"carrier": "usps", "package_type": "bag", "pieces": 2},
    ])
    post_resp = auth_client.post('/api/v1/wrs/', payload, format='json')
    assert post_resp.status_code == 201, post_resp.data

    receipt_id = post_resp.data['id']
    get_resp = auth_client.get(f'/api/v1/wrs/{receipt_id}/')
    assert get_resp.status_code == 200
    assert 'lines' in get_resp.data
    assert len(get_resp.data['lines']) == 1
    assert get_resp.data['lines'][0]['carrier'] == 'usps'


@pytest.mark.django_db
def test_lines_optional(auth_client, setup_data):
    """POST receipt without lines → 201 and empty lines list."""
    payload = _receipt_payload(setup_data, wr_number="WR-TEST-003")
    # No 'lines' key → defaults to empty
    payload.pop('lines')
    resp = auth_client.post('/api/v1/wrs/', payload, format='json')
    assert resp.status_code == 201, resp.data
    assert resp.data.get('lines', []) == []


@pytest.mark.django_db
def test_update_receipt_replaces_lines(auth_client, setup_data):
    """PUT with new lines replaces existing ones."""
    # Create with 1 line
    payload = _receipt_payload(setup_data, wr_number="WR-TEST-004", lines=[
        {"carrier": "ups", "package_type": "box", "pieces": 1},
    ])
    resp = auth_client.post('/api/v1/wrs/', payload, format='json')
    assert resp.status_code == 201
    receipt_id = resp.data['id']

    # Update with 2 new lines
    updated = payload.copy()
    updated['lines'] = [
        {"carrier": "fedex", "package_type": "pallet", "pieces": 3},
        {"carrier": "dhl", "package_type": "box", "pieces": 1},
    ]
    updated['wr_number'] = 'WR-TEST-004'
    put_resp = auth_client.put(f'/api/v1/wrs/{receipt_id}/', updated, format='json')
    assert put_resp.status_code == 200, put_resp.data
    assert WarehouseReceiptLine.objects.filter(receipt_id=receipt_id).count() == 2
    carriers = set(WarehouseReceiptLine.objects.filter(receipt_id=receipt_id).values_list('carrier', flat=True))
    assert carriers == {'fedex', 'dhl'}


@pytest.mark.django_db
def test_new_receipt_header_fields(auth_client, setup_data):
    """Receipt header fields (shipping_method, receipt_type, allow_repacking) round-trip."""
    payload = _receipt_payload(
        setup_data,
        wr_number="WR-TEST-005",
        shipping_method="sea",
        receipt_type="refrigerated",
        allow_repacking=True,
        location_note="BIN-A3",
        recipient_name="Carlos Test",
    )
    resp = auth_client.post('/api/v1/wrs/', payload, format='json')
    assert resp.status_code == 201, resp.data
    assert resp.data['shipping_method'] == 'sea'
    assert resp.data['receipt_type'] == 'refrigerated'
    assert resp.data['allow_repacking'] is True
    assert resp.data['location_note'] == 'BIN-A3'
    assert resp.data['recipient_name'] == 'Carlos Test'
