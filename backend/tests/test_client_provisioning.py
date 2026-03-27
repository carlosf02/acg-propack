"""
Tests for automatic client login-credential provisioning.

Covers:
  - No email → no User created
  - New email → User + UserProfile (role=CLIENT) created and linked
  - Duplicate email (from another account) → no crash, no duplicate User
  - Idempotent re-provisioning (same client, same email) → no-op
"""
import pytest
from django.contrib.auth import get_user_model
from clients.models import Client, UserProfile, UserRole
from clients.utils import provision_client_user
from company.models import Company, CompanyMember

User = get_user_model()


# ─── Fixtures ──────────────────────────────────────────────────────────────

@pytest.fixture
def company(db):
    return Company.objects.create(name="Test Co")


@pytest.fixture
def user_and_member(company):
    user = User.objects.create_user(username="admin_prov", password="password")
    CompanyMember.objects.create(company=company, user=user, is_active=True)
    return user


@pytest.fixture
def auth_client(user_and_member):
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=user_and_member)
    return client


# ─── Unit-level tests (direct call to provision_client_user) ───────────────

@pytest.mark.django_db
def test_no_email_skips_provisioning(company):
    """A client without an email should not create any User."""
    client = Client.objects.create(company=company, name="No Email Client")
    assert not client.email

    provision_client_user(client)

    assert User.objects.count() == 0


@pytest.mark.django_db
def test_new_email_creates_user_and_profile(company):
    """A client with a fresh email should get a User + UserProfile(role=CLIENT)."""
    client = Client.objects.create(
        company=company, name="Alice", email="alice@example.com"
    )

    provision_client_user(client)

    user = User.objects.get(email__iexact="alice@example.com")
    assert user.username == "alice@example.com"

    profile = UserProfile.objects.get(user=user)
    assert profile.role == UserRole.CLIENT
    assert profile.client == client
    assert profile.is_active is True


@pytest.mark.django_db
def test_existing_email_does_not_create_duplicate(company):
    """
    If a Django User with the same email already exists (but is NOT linked to
    this client), provision_client_user should log a warning and do nothing.
    """
    # Pre-existing unrelated user with the same email
    existing = User.objects.create_user(
        username="existing@example.com",
        email="existing@example.com",
        password="password",
    )

    client = Client.objects.create(
        company=company, name="Bob", email="existing@example.com"
    )

    provision_client_user(client)

    # Still only one User with that email
    assert User.objects.filter(email__iexact="existing@example.com").count() == 1
    # No profile linking existing user to this client
    assert not UserProfile.objects.filter(user=existing, client=client).exists()


@pytest.mark.django_db
def test_provision_is_idempotent(company):
    """Calling provision_client_user twice on the same client is a no-op the second time."""
    client = Client.objects.create(
        company=company, name="Carol", email="carol@example.com"
    )

    provision_client_user(client)
    provision_client_user(client)  # second call should not raise or duplicate

    assert User.objects.filter(email__iexact="carol@example.com").count() == 1
    assert UserProfile.objects.filter(client=client).count() == 1


# ─── API-level test ────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_api_create_client_with_email_provisions_user(auth_client, company):
    """
    POST /api/v1/clients/ with an email should return 201 and also create a
    User + UserProfile as a side-effect.
    """
    payload = {
        "name": "Dave",
        "last_name": "Smith",
        "client_type": "person",
        "email": "dave@example.com",
    }
    resp = auth_client.post("/api/v1/clients/", payload, format="json")
    assert resp.status_code == 201, resp.data

    user = User.objects.filter(email__iexact="dave@example.com").first()
    assert user is not None, "A Django User should have been created for the client."

    profile = UserProfile.objects.filter(user=user).first()
    assert profile is not None
    assert profile.role == UserRole.CLIENT


@pytest.mark.django_db
def test_api_create_client_without_email_no_user(auth_client, company):
    """POST /api/v1/clients/ without an email should return 201 and NOT create a User."""
    payload = {
        "name": "Eve",
        "client_type": "person",
    }
    resp = auth_client.post("/api/v1/clients/", payload, format="json")
    assert resp.status_code == 201, resp.data

    assert User.objects.filter(username="Eve").count() == 0
