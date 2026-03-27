"""
test_phase_2.py — Model-level tests for AssociateCompany and Office.

Run with:
  cd backend/
  .venv/bin/python3 tests/test_phase_2.py

Requires seed data (run tests/seed_test_data.py first).
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
from company.models import Company, CompanyMember, AssociateCompany, Office

User = get_user_model()
c = Company.objects.get(name='Test Company')
u = User.objects.get(username='testuser')

print("--- Testing Phase 2 Models ---")
assoc, created = AssociateCompany.objects.get_or_create(company=c, name='Test Partner')
print(f"{'Created' if created else 'Found'} AssociateCompany: {assoc}")

off1, created = Office.objects.get_or_create(name='Tenant HQ', company=c)
print(f"{'Created' if created else 'Found'} Office (Tenant): {off1}")

off2, created = Office.objects.get_or_create(name='Partner Branch', associate_company=assoc)
print(f"{'Created' if created else 'Found'} Office (Partner): {off2}")

try:
    off_fail = Office(name='Invalid Office', company=c, associate_company=assoc)
    off_fail.clean()
    print("FAILED: clean() did not catch invalid office")
except Exception as e:
    print(f"SUCCESS: clean() caught invalid office -> {e}")

try:
    off_fail_db = Office.objects.create(name='Invalid Office DB', company=c, associate_company=assoc)
    print("FAILED: DB Constraint did not catch invalid office")
except Exception as e:
    print(f"SUCCESS: DB Constraint caught invalid office -> {e}")
