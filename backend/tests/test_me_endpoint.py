"""
Tests for the real /api/v1/me/ endpoint (CurrentUserView using UserMeSerializer).

Covers:
  - Unauthenticated user → 401
  - Admin/staff user → auth_role is STAFF/ADMIN, company key present
  - Client user → auth_role is CLIENT, client key present
"""
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from company.models import Company, CompanyMember
from clients.models import Client, UserProfile, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def company(db):
    return Company.objects.create(name="Test Co")


@pytest.fixture
def staff_user(company):
    user = User.objects.create_user(username="staff", password="password")
    CompanyMember.objects.create(company=company, user=user, role="staff", is_active=True)
    return user


@pytest.fixture
def client_user(company):
    user = User.objects.create_user(username="client@test.com", email="client@test.com", password="password")
    client_obj = Client.objects.create(company=company, name="Client User", email="client@test.com")
    UserProfile.objects.create(user=user, role=UserRole.CLIENT, client=client_obj, is_active=True)
    return user


@pytest.mark.django_db
def test_me_unauthenticated(api_client):
    """Unauthenticated request to /api/v1/me/ should return 403."""
    resp = api_client.get("/api/v1/me/")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_me_staff_user(api_client, staff_user, company):
    """Staff user should have auth_role='STAFF' and include company info."""
    api_client.force_authenticate(user=staff_user)
    resp = api_client.get("/api/v1/me/")
    
    assert resp.status_code == 200
    data = resp.data
    
    assert data["username"] == "staff"
    assert data["auth_role"] == "STAFF"
    assert data["role"] == "staff"  # Backward compatibility
    
    assert data["company"] is not None
    assert data["company"]["id"] == company.pk
    assert data["company"]["name"] == "Test Co"
    
    assert data["client"] is None


@pytest.mark.django_db
def test_me_client_user(api_client, client_user):
    """Client user should have auth_role='CLIENT' and include client info (but no company)."""
    api_client.force_authenticate(user=client_user)
    resp = api_client.get("/api/v1/me/")
    
    assert resp.status_code == 200
    data = resp.data
    
    assert data["username"] == "client@test.com"
    assert data["auth_role"] == "CLIENT"
    assert data["role"] is None  # No CompanyMember role
    
    assert data["company"] is None
    
    assert data["client"] is not None
    assert data["client"]["name"] == "Client User"
    assert "client_code" in data["client"]
