import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from company.models import Company, CompanyMember, Office, AssociateCompany
from receiving.models import WarehouseReceipt, WRStatus
from clients.models import Client
from warehouse.models import Warehouse
from consolidation.models import Consolidation, ConsolidationReceipt, ShipType

User = get_user_model()

@pytest.fixture
def auth_client(setup_data):
    client = APIClient()
    user = User.objects.create_user(username='testuser', password='password')
    CompanyMember.objects.create(company=setup_data["company"], user=user, is_active=True)
    client.force_authenticate(user=user)
    return client

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_data():
    company = Company.objects.create(name="Test Company")
    client = Client.objects.create(company=company, client_code="C1", name="Client 1")
    warehouse = Warehouse.objects.create(company=company, code="W1", name="Warehouse 1")
    
    associate = AssociateCompany.objects.create(company=company, name="Partner Agency")
    sending_office = Office.objects.create(company=company, name="Miami HQ")
    receiving_office = Office.objects.create(company=company, name="Bogota Branch")

    wr1 = WarehouseReceipt.objects.create(company=company, wr_number="WR-1", client=client, received_warehouse=warehouse, status=WRStatus.ACTIVE)
    wr2 = WarehouseReceipt.objects.create(company=company, wr_number="WR-2", client=client, received_warehouse=warehouse, status=WRStatus.ACTIVE)
    wr3 = WarehouseReceipt.objects.create(company=company, wr_number="WR-3", client=client, received_warehouse=warehouse, status=WRStatus.ACTIVE)
    
    # Cross tenant data
    other_company = Company.objects.create(name="Other Company")
    other_client = Client.objects.create(company=other_company, client_code="C2", name="Client 2")
    other_wr = WarehouseReceipt.objects.create(company=other_company, wr_number="WR-OTHER", client=other_client, status=WRStatus.ACTIVE)

    return {
        "company": company,
        "associate_company": associate,
        "sending_office": sending_office,
        "receiving_office": receiving_office,
        "wr1": wr1,
        "wr2": wr2,
        "wr3": wr3,
        "other_wr": other_wr,
    }


@pytest.mark.django_db
def test_create_consolidation_with_receipts(auth_client, setup_data):
    url = '/api/v1/consolidations/'
    payload = {
        "associate_company": setup_data["associate_company"].id,
        "ship_type": ShipType.AIR,
        "sending_office": setup_data["sending_office"].id,
        "receiving_office": setup_data["receiving_office"].id,
        "warehouse_receipts": [setup_data["wr1"].id, setup_data["wr2"].id]
    }
    
    response = auth_client.post(url, payload, format='json')
    assert response.status_code == 201
    
    consolidation_id = response.data['id']
    consolidation = Consolidation.objects.get(id=consolidation_id)
    
    # Check join model
    links = ConsolidationReceipt.objects.filter(consolidation=consolidation)
    assert links.count() == 2
    linked_wr_ids = set(links.values_list('warehouse_receipt_id', flat=True))
    assert linked_wr_ids == {setup_data["wr1"].id, setup_data["wr2"].id}
    
    # Check read-only output in response
    assert set(response.data['warehouse_receipt_ids']) == {setup_data["wr1"].id, setup_data["wr2"].id}


@pytest.mark.django_db
def test_create_consolidation_invalid_receipt_id(auth_client, setup_data):
    url = '/api/v1/consolidations/'
    payload = {
        "associate_company": setup_data["associate_company"].id,
        "ship_type": ShipType.AIR,
        "sending_office": setup_data["sending_office"].id,
        "receiving_office": setup_data["receiving_office"].id,
        "warehouse_receipts": [99999]
    }
    
    response = auth_client.post(url, payload, format='json')
    assert response.status_code == 400
    assert "warehouse_receipts" in response.data
    assert "invalid or not found" in response.data["warehouse_receipts"][0]


@pytest.mark.django_db
def test_create_consolidation_cross_tenant_receipt(auth_client, setup_data):
    url = '/api/v1/consolidations/'
    payload = {
        "associate_company": setup_data["associate_company"].id,
        "ship_type": ShipType.AIR,
        "sending_office": setup_data["sending_office"].id,
        "receiving_office": setup_data["receiving_office"].id,
        "warehouse_receipts": [setup_data["other_wr"].id]
    }
    
    response = auth_client.post(url, payload, format='json')
    assert response.status_code == 400
    assert "warehouse_receipts" in response.data
    assert "invalid or not found" in response.data["warehouse_receipts"][0]


@pytest.mark.django_db
def test_update_consolidation_replaces_receipts(auth_client, setup_data):
    url = '/api/v1/consolidations/'
    payload = {
        "associate_company": setup_data["associate_company"].id,
        "ship_type": ShipType.AIR,
        "sending_office": setup_data["sending_office"].id,
        "receiving_office": setup_data["receiving_office"].id,
        "warehouse_receipts": [setup_data["wr1"].id]
    }
    
    # Create
    response = auth_client.post(url, payload, format='json')
    assert response.status_code == 201
    consolidation_id = response.data['id']
    
    # Update to replace wr1 with wr2 and wr3
    update_url = f'/api/v1/consolidations/{consolidation_id}/'
    update_payload = {
        "warehouse_receipts": [setup_data["wr2"].id, setup_data["wr3"].id]
    }
    update_response = auth_client.patch(update_url, update_payload, format='json')
    assert update_response.status_code == 200
    
    consolidation = Consolidation.objects.get(id=consolidation_id)
    links = ConsolidationReceipt.objects.filter(consolidation=consolidation)
    assert links.count() == 2
    linked_wr_ids = set(links.values_list('warehouse_receipt_id', flat=True))
    assert linked_wr_ids == {setup_data["wr2"].id, setup_data["wr3"].id}
