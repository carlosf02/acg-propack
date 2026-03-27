"""
test_api.py — Manual API test for AssociateCompany and Office endpoints.

Run with:
  cd backend/
  .venv/bin/python3 tests/test_api.py

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
from rest_framework.test import APIClient
from company.models import Company, CompanyMember, AssociateCompany, Office

User = get_user_model()
u = User.objects.get(username='testuser')
c = Company.objects.get(name='Test Company')
assoc = AssociateCompany.objects.filter(name='Test Partner').first()

client = APIClient()
client.force_authenticate(user=u)

print("--- Testing GET /api/v1/associate-companies/ ---")
res = client.get('/api/v1/associate-companies/')
print("Status Code:", res.status_code)
print("Data:", res.json())

print("\n--- Testing GET /api/v1/offices/ ---")
res = client.get('/api/v1/offices/')
print("Status Code:", res.status_code)
print("Data:", res.json())

print("\n--- Testing GET /api/v1/offices/?type=own ---")
res = client.get('/api/v1/offices/?type=own')
print("Status Code:", res.status_code)
print("Data:", res.json())

if assoc:
    print(f"\n--- Testing GET /api/v1/offices/?associate_company_id={assoc.id} ---")
    res = client.get(f'/api/v1/offices/?associate_company_id={assoc.id}')
    print("Status Code:", res.status_code)
    print("Data:", res.json())

print("\n--- Testing POST /api/v1/associate-companies/ ---")
res = client.post('/api/v1/associate-companies/', {'name': 'New Partner'}, format='json')
print("Status Code:", res.status_code)
print("Data:", res.json())

if res.status_code == 201:
    new_assoc_id = res.json()["id"]
else:
    new_assoc_id = None

print("\n--- Testing POST /api/v1/offices/ (Own Office) ---")
res = client.post('/api/v1/offices/', {
    'name': 'New Tenant Office',
    'city': 'Seattle',
}, format='json')
print("Status Code:", res.status_code)
print("Data:", res.json())

if new_assoc_id:
    print("\n--- Testing POST /api/v1/offices/ (Associate Office) ---")
    res = client.post('/api/v1/offices/', {
        'name': 'New Partner Office',
        'associate_company': new_assoc_id,
        'city': 'Portland'
    }, format='json')
    print("Status Code:", res.status_code)
    print("Data:", res.json())
