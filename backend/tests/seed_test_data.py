"""
Idempotent seed script for test data.
Run with: .venv/bin/python3 tests/seed_test_data.py

Creates:
  - testuser  → Test Company  (admin)
    - Test Partner   (AssociateCompany)
    - Tenant HQ      (Office, own)
    - Partner Branch (Office, associate)
  - tenant1   → Tenant1 Corp  (admin) + Client: Acme Inc
  - tenant2   → Tenant2 Corp  (admin) + Client: Globex Corp
"""

import os
import sys
import django

# Add backend root to sys.path so manage.py apps resolve correctly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from company.models import Company, CompanyMember, AssociateCompany, Office
from clients.models import Client

User = get_user_model()


def get_or_create_user(username, password='testpass', email=None):
    email = email or f'{username}@test.local'
    user, created = User.objects.get_or_create(username=username, defaults={'email': email})
    user.set_password(password)
    user.save()
    if created:
        print(f"  [+] Created user: {username}")
    else:
        print(f"  [=] Found user:   {username}")
    return user


def ensure_member(user, company, role='admin'):
    member, created = CompanyMember.objects.get_or_create(
        user=user, company=company,
        defaults={'role': role, 'is_active': True}
    )
    if not created and member.role != role:
        member.role = role
        member.save()
    return member


# ── Block 1: testuser + Test Company ─────────────────────────────────────────
print("\n── Block 1: testuser / Test Company ──────────────────────────────────")
testuser = get_or_create_user('testuser', password='testpass')

company, created = Company.objects.get_or_create(name='Test Company')
print(f"  {'[+]' if created else '[=]'} Company: {company.name}")
ensure_member(testuser, company, 'admin')

# AssociateCompany
assoc, created = AssociateCompany.objects.get_or_create(
    company=company, name='Test Partner',
    defaults={'partner_type': 'agent', 'is_active': True}
)
print(f"  {'[+]' if created else '[=]'} AssociateCompany: {assoc.name}")

# Office — tenant-owned
off1, created = Office.objects.get_or_create(
    name='Tenant HQ', company=company,
    defaults={'code': 'THQ', 'is_active': True}
)
print(f"  {'[+]' if created else '[=]'} Office (own): {off1.name}")

# Office — associate-owned (cannot also have company set)
off2, created = Office.objects.get_or_create(
    name='Partner Branch',
    associate_company=assoc,
    defaults={'is_active': True, 'code': 'PB1', 'company': None}
)
print(f"  {'[+]' if created else '[=]'} Office (assoc): {off2.name}")


# ── Block 2: tenant1 / Tenant1 Corp / Client: Acme Inc ───────────────────────
print("\n── Block 2: tenant1 / Tenant1 Corp ───────────────────────────────────")
tenant1 = get_or_create_user('tenant1', password='pass1')

company1, created = Company.objects.get_or_create(name='Tenant1 Corp')
print(f"  {'[+]' if created else '[=]'} Company: {company1.name}")
ensure_member(tenant1, company1, 'admin')

acme, created = Client.objects.get_or_create(
    company=company1, name='Acme Inc',
    defaults={'client_type': 'company'}
)
if created:
    # Force client_code generation
    acme.refresh_from_db()
print(f"  {'[+]' if created else '[=]'} Client: {acme.name} ({acme.client_code})")


# ── Block 3: tenant2 / Tenant2 Corp / Client: Globex Corp ────────────────────
print("\n── Block 3: tenant2 / Tenant2 Corp ───────────────────────────────────")
tenant2 = get_or_create_user('tenant2', password='pass2')

company2, created = Company.objects.get_or_create(name='Tenant2 Corp')
print(f"  {'[+]' if created else '[=]'} Company: {company2.name}")
ensure_member(tenant2, company2, 'admin')

globex, created = Client.objects.get_or_create(
    company=company2, name='Globex Corp',
    defaults={'client_type': 'company'}
)
if created:
    globex.refresh_from_db()
print(f"  {'[+]' if created else '[=]'} Client: {globex.name} ({globex.client_code})")


print("\n✅ Seed data complete.\n")
