"""
test_phase_5.py — Consolidation CRUD, validation & RBAC.

Run with:
  cd backend/
  .venv/bin/python3 tests/test_phase_5.py
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
from company.models import Company, CompanyMember, AssociateCompany, Office
from consolidation.models import Consolidation

User = get_user_model()


def run_tests():
    print("=" * 60)
    print("Phase 5 — Consolidation Verification")
    print("=" * 60)

    # ── Setup ─────────────────────────────────────────────────────
    company, _ = Company.objects.get_or_create(name="Con Test Corp")
    other_company, _ = Company.objects.get_or_create(name="Con Outsider Corp")

    admin_user, _ = User.objects.get_or_create(username='con_admin')
    admin_user.set_password('pass'); admin_user.save()
    staff_user, _ = User.objects.get_or_create(username='con_staff')
    staff_user.set_password('pass'); staff_user.save()
    outsider_user, _ = User.objects.get_or_create(username='con_outside')
    outsider_user.set_password('pass'); outsider_user.save()

    CompanyMember.objects.get_or_create(user=admin_user, company=company, defaults={'role': 'admin', 'is_active': True})
    m, _ = CompanyMember.objects.get_or_create(user=staff_user, company=company, defaults={'role': 'staff', 'is_active': True})
    if m.role != 'staff': m.role = 'staff'; m.save()
    CompanyMember.objects.get_or_create(user=outsider_user, company=other_company, defaults={'role': 'admin', 'is_active': True})

    # Create an associate company
    assoc, _ = AssociateCompany.objects.get_or_create(
        company=company, name="Test Partner",
        defaults={'partner_type': 'agent', 'is_active': True}
    )
    other_assoc, _ = AssociateCompany.objects.get_or_create(
        company=other_company, name="Other Partner",
        defaults={'partner_type': 'agent', 'is_active': True}
    )

    # Own offices for our company
    own_send, _ = Office.objects.update_or_create(
        name="Send HQ", company=company,
        defaults={'code': 'SND', 'is_active': True, 'associate_company': None}
    )
    own_recv, _ = Office.objects.update_or_create(
        name="Recv HQ", company=company,
        defaults={'code': 'RCV', 'is_active': True, 'associate_company': None}
    )
    # Associate's office
    assoc_office, _ = Office.objects.update_or_create(
        name="Partner Warehouse",
        associate_company=assoc,
        defaults={'code': 'PWH', 'is_active': True, 'company': None}
    )
    # Wrong company's own office
    wrong_office, _ = Office.objects.update_or_create(
        name="Outsider Office", company=other_company,
        defaults={'code': 'OUTOFF', 'is_active': True, 'associate_company': None}
    )

    admin = APIClient(); admin.force_authenticate(user=admin_user)
    staff = APIClient(); staff.force_authenticate(user=staff_user)
    outsider = APIClient(); outsider.force_authenticate(user=outsider_user)

    def check(label, r, expected):
        ok = r.status_code == expected
        icon = "✅" if ok else "❌"
        print(f"  {icon} [{r.status_code}] {label}")
        if not ok:
            print(f"       Expected {expected}. Response: {r.data}")

    valid_payload = {
        'associate_company': assoc.id,
        'ship_type': 'AIR',
        'sending_office': own_send.id,
        'receiving_office': own_recv.id,
        'status': 'DRAFT',
    }

    print("\n1. Create consolidation (admin)")
    r = admin.post('/api/v1/consolidations/', data=valid_payload, format='json')
    check("admin can create consolidation", r, 201)
    if r.status_code == 201:
        con_id = r.data['id']
        ref = r.data.get('reference_code', '')
        print(f"     → reference_code: {ref}")

    print("\n2. Create consolidation with associate office as receiver (staff)")
    r = staff.post('/api/v1/consolidations/', data={**valid_payload, 'receiving_office': assoc_office.id}, format='json')
    check("staff can create with associate's office as receiving", r, 201)

    print("\n3. Validation — wrong associate company (other tenant's)")
    r = admin.post('/api/v1/consolidations/', data={**valid_payload, 'associate_company': other_assoc.id}, format='json')
    check("wrong associate company → 400", r, 400)

    print("\n4. Validation — sending office from wrong company")
    r = admin.post('/api/v1/consolidations/', data={**valid_payload, 'sending_office': wrong_office.id}, format='json')
    check("wrong sending office → 400", r, 400)

    print("\n5. Validation — receiving = wrong company office (not own, not assoc)")
    r = admin.post('/api/v1/consolidations/', data={**valid_payload, 'receiving_office': wrong_office.id}, format='json')
    check("wrong receiving office → 400", r, 400)

    print("\n6. Validation — same sending and receiving office")
    r = admin.post('/api/v1/consolidations/', data={**valid_payload, 'receiving_office': own_send.id}, format='json')
    check("same sending/receiving → 400", r, 400)

    print("\n7. Cross-tenant: outsider sees no consolidations")
    r = outsider.get('/api/v1/consolidations/')
    results = r.data.get('results', r.data) if isinstance(r.data, dict) else r.data
    icon = "✅" if len(results) == 0 else "❌"
    print(f"  {icon} [{r.status_code}] outsider sees {len(results)} consolidations (expected 0)")

    print("\n8. RBAC — staff cannot delete")
    Consolidation.objects.filter(company=company).delete()  # cleanup first
    r = admin.post('/api/v1/consolidations/', data=valid_payload, format='json')
    if r.status_code == 201:
        cid = r.data['id']
        r2 = staff.delete(f'/api/v1/consolidations/{cid}/')
        check("staff cannot delete → 403", r2, 403)
        r3 = admin.delete(f'/api/v1/consolidations/{cid}/')
        check("admin can delete → 204", r3, 204)

    print("\n9. Filter by status")
    admin.post('/api/v1/consolidations/', data=valid_payload, format='json')
    r = admin.get('/api/v1/consolidations/?status=DRAFT')
    results = r.data.get('results', r.data) if isinstance(r.data, dict) else r.data
    icon = "✅" if r.status_code == 200 else "❌"
    print(f"  {icon} [{r.status_code}] ?status=DRAFT returns {len(results)} result(s)")

    print("\n" + "=" * 60)
    print("Done.")


run_tests()
