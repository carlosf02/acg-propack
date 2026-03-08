"""
test_phase_3.py — Cross-tenant scoping isolation for /api/v1/clients/.

Run with:
  cd backend/
  .venv/bin/python3 tests/test_phase_3.py

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
from clients.models import Client
from rest_framework.test import APIClient

User = get_user_model()


def run_tests():
    print("Testing Phase 3 Scoping Isolation...")

    u1 = User.objects.get(username='tenant1')
    u2 = User.objects.get(username='tenant2')

    client1 = APIClient()
    client1.force_authenticate(user=u1)

    client2 = APIClient()
    client2.force_authenticate(user=u2)

    # 1. Test listing Clients
    print("\n--- Testing GET /clients/ ---")
    r1 = client1.get('/api/v1/clients/')
    r2 = client2.get('/api/v1/clients/')

    r1_data = r1.json().get('results', r1.json()) if isinstance(r1.json(), dict) else r1.json()
    r2_data = r2.json().get('results', r2.json()) if isinstance(r2.json(), dict) else r2.json()

    print("User 1 Clients:")
    for c in r1_data:
        print(f"  - {c['client_code']} ({c['name']})")

    print("User 2 Clients:")
    for c in r2_data:
        print(f"  - {c['client_code']} ({c['name']})")

    # 4. Try to access the other tenant's client directly by ID
    acme_client_id = r1_data[0]['id']
    globex_client_id = r2_data[0]['id']

    print("\n--- Testing cross-tenant GET by ID ---")
    sc1 = client1.get(f'/api/v1/clients/{globex_client_id}/')
    print(f"User 1 trying to get Globex client: Status {sc1.status_code}")

    sc2 = client2.get(f'/api/v1/clients/{acme_client_id}/')
    print(f"User 2 trying to get Acme client: Status {sc2.status_code}")


run_tests()
