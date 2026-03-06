"""
Tests for Client auto-generated client_code.
"""
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from clients.models import Client
from company.models import Company, CompanyMember

User = get_user_model()


# ─── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def company():
    return Company.objects.create(name="Test Co")


@pytest.fixture
def user_and_member(company):
    user = User.objects.create_user(username="testuser_ac", password="password")
    CompanyMember.objects.create(company=company, user=user, is_active=True)
    return user


@pytest.fixture
def auth_client(user_and_member):
    client = APIClient()
    client.force_authenticate(user=user_and_member)
    return client


# ─── Unit tests ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_client_autocode_generated(company):
    """Creating a Client without client_code → auto-generates one after save."""
    c = Client.objects.create(company=company, name="Auto Code Test")
    assert c.client_code, "client_code should be set after save"
    expected = f"CL-{company.id}-{c.pk:06d}"
    assert c.client_code == expected, f"Expected {expected!r}, got {c.client_code!r}"


@pytest.mark.django_db
def test_client_code_preserved(company):
    """Creating a Client with an explicit client_code leaves it unchanged."""
    c = Client.objects.create(company=company, name="Explicit Code", client_code="MYCODE")
    c.refresh_from_db()
    assert c.client_code == "MYCODE"


@pytest.mark.django_db
def test_client_code_preserved_on_save(company):
    """Calling save() again on a client with a code does not regenerate it."""
    c = Client.objects.create(company=company, name="Stable Code", client_code="STABLE-001")
    c.name = "Updated Name"
    c.save()
    c.refresh_from_db()
    assert c.client_code == "STABLE-001"


# ─── API tests ─────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_api_create_client_without_code(auth_client, company):
    """POST /api/v1/clients/ without client_code → 201 with auto-generated client_code."""
    resp = auth_client.post('/api/v1/clients/', {
        'name': 'Jane',
        'last_name': 'Doe',
        'client_type': 'person',
        'email': 'jane@example.com',
    }, format='json')
    assert resp.status_code == 201, resp.data
    data = resp.data
    assert data['client_code'], "Response must include a client_code"
    assert data['client_code'].startswith('CL-'), f"Unexpected format: {data['client_code']}"


@pytest.mark.django_db
def test_api_client_new_fields_roundtrip(auth_client):
    """POST then GET confirms all new fields are persisted and returned."""
    resp = auth_client.post('/api/v1/clients/', {
        'name': 'Maria',
        'last_name': 'Garcia',
        'client_type': 'person',
        'email': 'maria@example.com',
        'cellphone': '+1 305 555 0001',
        'home_phone': '+1 305 555 0002',
        'address': '123 Main St',
        'city': 'Miami',
        'postal_code': '33166',
    }, format='json')
    assert resp.status_code == 201, resp.data
    cid = resp.data['id']

    get_resp = auth_client.get(f'/api/v1/clients/{cid}/')
    assert get_resp.status_code == 200
    d = get_resp.data
    assert d['last_name'] == 'Garcia'
    assert d['client_type'] == 'person'
    assert d['cellphone'] == '+1 305 555 0001'
    assert d['home_phone'] == '+1 305 555 0002'
    assert d['address'] == '123 Main St'
    assert d['city'] == 'Miami'
    assert d['postal_code'] == '33166'
