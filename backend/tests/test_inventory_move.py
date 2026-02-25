import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from clients.models import Client
from warehouse.models import Warehouse, StorageLocation, LocationType
from receiving.models import WarehouseReceipt, WRStatus
from inventory.models import InventoryBalance, InventoryTransaction

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def auth_client():
    client = APIClient()
    user = User.objects.create_user(username='testuser', password='password')
    client.force_authenticate(user=user)
    return client

@pytest.fixture
def setup_data():
    client = Client.objects.create(client_code="C1", name="Client 1")
    warehouse = Warehouse.objects.create(code="W1", name="Warehouse 1")
    loc1 = StorageLocation.objects.create(warehouse=warehouse, code="LOC-1")
    loc2 = StorageLocation.objects.create(warehouse=warehouse, code="LOC-2")
    wr = WarehouseReceipt.objects.create(wr_number="WR-100", client=client, received_warehouse=warehouse, status=WRStatus.ACTIVE)
    return {"client": client, "warehouse": warehouse, "loc1": loc1, "loc2": loc2, "wr": wr}

@pytest.mark.django_db
def test_unauthenticated_blocked(api_client, setup_data):
    url = '/api/v1/inventory/move/'
    response = api_client.post(url, {"wr": setup_data["wr"].id, "to_location": setup_data["loc1"].id})
    assert response.status_code in [401, 403]

@pytest.mark.django_db
def test_putaway_creates_balance(auth_client, setup_data):
    url = '/api/v1/inventory/move/'
    payload = {"wr": setup_data["wr"].id, "to_location": setup_data["loc1"].id}
    response = auth_client.post(url, payload, format='json')
    assert response.status_code == 200
    assert response.data["status"] == "moved"
    
    # Assert DB state
    assert InventoryBalance.objects.filter(wr=setup_data["wr"], location=setup_data["loc1"]).exists()
    assert InventoryTransaction.objects.filter(reference_id=str(setup_data["wr"].id)).exists()

@pytest.mark.django_db
def test_move_updates_location(auth_client, setup_data):
    # Initial putaway
    InventoryBalance.objects.create(
        client=setup_data["client"],
        warehouse=setup_data["warehouse"],
        location=setup_data["loc1"],
        wr=setup_data["wr"],
        on_hand_qty=1
    )
    
    url = '/api/v1/inventory/move/'
    payload = {"wr": setup_data["wr"].id, "to_location": setup_data["loc2"].id}
    response = auth_client.post(url, payload, format='json')
    assert response.status_code == 200
    
    balance = InventoryBalance.objects.get(wr=setup_data["wr"])
    assert balance.location == setup_data["loc2"]

@pytest.mark.django_db
def test_move_from_mismatch(auth_client, setup_data):
    InventoryBalance.objects.create(
        client=setup_data["client"],
        warehouse=setup_data["warehouse"],
        location=setup_data["loc1"],
        wr=setup_data["wr"],
        on_hand_qty=1
    )
    
    url = '/api/v1/inventory/move/'
    # Provide wrong from_location
    payload = {
        "wr": setup_data["wr"].id,
        "to_location": setup_data["loc2"].id,
        "from_location": setup_data["loc2"].id
    }
    response = auth_client.post(url, payload, format='json')
    assert response.status_code == 400
    assert "Provided from_location does not match" in str(response.data)

@pytest.mark.django_db
def test_wr_status_not_active(auth_client, setup_data):
    setup_data["wr"].status = WRStatus.SHIPPED
    setup_data["wr"].save()

    url = '/api/v1/inventory/move/'
    payload = {"wr": setup_data["wr"].id, "to_location": setup_data["loc1"].id}
    response = auth_client.post(url, payload, format='json')
    assert response.status_code == 400
    assert "ACTIVE to move" in str(response.data)
