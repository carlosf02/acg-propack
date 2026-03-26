"""
test_phase_4.py — RBAC verification (admin vs staff).

Run with:
  cd backend/
  .venv/bin/python3 tests/test_phase_4.py
"""

import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from company.models import Company, CompanyMember

User = get_user_model()


def run_tests():
    print("=" * 60)
    print("Phase 4 RBAC Verification")
    print("=" * 60)

    # Setup: one company, one admin, one staff
    company, _ = Company.objects.get_or_create(name="RBAC Test Corp")
    admin_user, _ = User.objects.get_or_create(username='rbac_admin', email='rbac_admin@test.com')
    admin_user.set_password('pass123'); admin_user.save()
    staff_user, _ = User.objects.get_or_create(username='rbac_staff', email='rbac_staff@test.com')
    staff_user.set_password('pass123'); staff_user.save()

    CompanyMember.objects.get_or_create(user=admin_user, company=company, defaults={'role': 'admin', 'is_active': True})
    m, _ = CompanyMember.objects.get_or_create(user=staff_user, company=company, defaults={'role': 'staff', 'is_active': True})
    if m.role != 'staff':
        m.role = 'staff'; m.save()

    admin = APIClient(); admin.force_authenticate(user=admin_user)
    staff = APIClient(); staff.force_authenticate(user=staff_user)

    def check(label, client, method, url, data=None, expected=None):
        fn = getattr(client, method)
        r = fn(url, data=data, format='json') if data else fn(url)
        ok = r.status_code == expected
        icon = "✅" if ok else "❌"
        print(f"  {icon} [{r.status_code}] {method.upper()} {url} — {label}")
        if not ok:
            print(f"       Expected {expected}, got {r.status_code}: {r.data if hasattr(r, 'data') else ''}")

    print("\n1. GET (list) - both should see same data")
    check("admin can list clients", admin, 'get', '/api/v1/clients/', expected=200)
    check("staff can list clients", staff, 'get', '/api/v1/clients/', expected=200)

    print("\n2. POST operational record - both allowed")
    check("admin can create client", admin, 'post', '/api/v1/clients/', data={'client_code': 'RBAC-ADM', 'name': 'RBAC Admin Client'}, expected=201)
    check("staff can create client", staff, 'post', '/api/v1/clients/', data={'client_code': 'RBAC-STF', 'name': 'RBAC Staff Client'}, expected=201)

    print("\n3. DELETE - admin allowed, staff blocked")
    from clients.models import Client
    c = Client.objects.filter(company=company).first()
    if c:
        check("staff cannot delete client", staff, 'delete', f'/api/v1/clients/{c.id}/', expected=403)
        check("admin can delete client", admin, 'delete', f'/api/v1/clients/{c.id}/', expected=204)

    print("\n4. Associate Company writes - admin allowed, staff blocked")
    check("staff cannot create associate company", staff, 'post', '/api/v1/associate-companies/', data={'name': 'Staff Assoc'}, expected=403)
    from company.models import AssociateCompany as AC
    AC.objects.filter(company=company, name='Admin Assoc').delete()
    r = admin.post('/api/v1/associate-companies/', data={'name': 'Admin Assoc', 'partner_type': 'supplier'}, format='json')
    print(f"  {'✅' if r.status_code == 201 else '❌'} [{r.status_code}] POST /api/v1/associate-companies/ — admin can create associate company")

    print("\n5. Bootstrap - create new company")
    new_user, _ = User.objects.get_or_create(username='rbac_new', email='rbac_new@test.com')
    new_user.set_password('pass123'); new_user.save()
    new_client = APIClient(); new_client.force_authenticate(user=new_user)
    check("new user can create a company", new_client, 'post', '/api/v1/companies/', data={'name': 'Brand New Company'}, expected=201)

    print("\n6. Member management - admin only")
    check("staff cannot list members", staff, 'get', '/api/v1/company/members/', expected=403)
    check("admin can list members", admin, 'get', '/api/v1/company/members/', expected=200)
    check("admin can add member", admin, 'post', '/api/v1/company/members/', data={'username': 'rbac_new', 'role': 'staff'}, expected=201)

    print("\n7. Last-admin guard")
    member_list = admin.get('/api/v1/company/members/')
    admin_member = next((m for m in member_list.data if m['username'] == 'rbac_admin'), None)
    if admin_member:
        r = admin.patch(f'/api/v1/company/members/{admin_member["id"]}/', data={'is_active': False}, format='json')
        icon = "✅" if r.status_code == 400 else "❌"
        print(f"  {icon} [{r.status_code}] PATCH member — cannot deactivate last admin (expected 400)")

    print("\n" + "=" * 60)
    print("Done.")


run_tests()
