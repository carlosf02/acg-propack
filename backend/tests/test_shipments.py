import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone
from clients.models import Client
from warehouse.models import Warehouse, StorageLocation
from receiving.models import WarehouseReceipt, WRStatus
from shipping.models import Shipment, ShipmentItem
from core.models import ShipmentStatus
from inventory.models import InventoryBalance, InventoryTransaction, TxnType

User = get_user_model()

@pytest.fixture
def auth_client():
    client = APIClient()
    user = User.objects.create_user(username='testuser', password='password')
    client.force_authenticate(user=user)
    return client

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_data():
    client1 = Client.objects.create(client_code="C1", name="Client 1")
    client2 = Client.objects.create(client_code="C2", name="Client 2")
    warehouse = Warehouse.objects.create(code="W1", name="Warehouse 1")
    loc = StorageLocation.objects.create(warehouse=warehouse, code="LOC-1")
    
    wr1 = WarehouseReceipt.objects.create(wr_number="WR-S-1", client=client1, received_warehouse=warehouse, status=WRStatus.ACTIVE)
    wr2 = WarehouseReceipt.objects.create(wr_number="WR-S-2", client=client2, received_warehouse=warehouse, status=WRStatus.ACTIVE)
    
    InventoryBalance.objects.create(client=client1, warehouse=warehouse, location=loc, wr=wr1, on_hand_qty=1)
    InventoryBalance.objects.create(client=client2, warehouse=warehouse, location=loc, wr=wr2, on_hand_qty=1)
    
    shipment = Shipment.objects.create(shipment_number="SHP-001", client=client1, from_warehouse=warehouse)
    
    return {"c1": client1, "c2": client2, "wsh": warehouse, "loc": loc, "wr1": wr1, "wr2": wr2, "shipment": shipment}

@pytest.mark.django_db
def test_unauthenticated_blocked(api_client, setup_data):
    # CRUD endpoints
    assert api_client.get('/api/v1/shipments/').status_code in [401, 403]
    # actions
    url = f'/api/v1/shipments/{setup_data["shipment"].id}/items/'
    assert api_client.post(url, {"wr_ids": [setup_data["wr1"].id]}, format='json').status_code in [401, 403]
    
    url = f'/api/v1/shipments/{setup_data["shipment"].id}/ship/'
    assert api_client.post(url, {}, format='json').status_code in [401, 403]

@pytest.mark.django_db
def test_create_and_add_items(auth_client, setup_data):
    # Create shipment
    resp = auth_client.post('/api/v1/shipments/', {
        "shipment_number": "SHP-002",
        "client": setup_data["c1"].id,
        "from_warehouse": setup_data["wsh"].id
    }, format='json')
    assert resp.status_code == 201
    shipment_id = resp.data["id"]

    # Add item
    url = f'/api/v1/shipments/{shipment_id}/items/'
    resp = auth_client.post(url, {"wr_ids": [setup_data["wr1"].id]}, format='json')
    assert resp.status_code == 200
    assert resp.data["count"] == 1
    
    # Assert DB
    assert ShipmentItem.objects.filter(shipment_id=shipment_id, wr_id=setup_data["wr1"].id).exists()

@pytest.mark.django_db
def test_ship_happy_path(auth_client, setup_data):
    shipment = setup_data["shipment"]
    wr = setup_data["wr1"]
    
    # Link item manually
    ShipmentItem.objects.create(shipment=shipment, wr=wr)
    
    url = f'/api/v1/shipments/{shipment.id}/ship/'
    payload = {"carrier": "FedEx", "tracking_number": "F-123", "notes": "Dispatched"}
    
    resp = auth_client.post(url, payload, format='json')
    assert resp.status_code == 200
    
    # Reload from DB
    shipment.refresh_from_db()
    wr.refresh_from_db()
    
    assert shipment.status == ShipmentStatus.SHIPPED
    assert shipment.carrier == "FedEx"
    assert shipment.tracking_number == "F-123"
    assert "Dispatched" in shipment.notes
    assert shipment.shipped_at is not None
    
    assert wr.status == WRStatus.SHIPPED
    
    # Balances
    assert not InventoryBalance.objects.filter(wr=wr).exists()
    
    # Txns
    txn = InventoryTransaction.objects.get(txn_type=TxnType.SHIP, reference_id=str(shipment.id))
    assert txn.lines.count() == 1
    
    line = txn.lines.first()
    assert line.wr_id == wr.id
    assert line.from_location_id == setup_data["loc"].id
    assert line.to_location is None

@pytest.mark.django_db
def test_reject_adding_not_active_wr(auth_client, setup_data):
    setup_data["wr1"].status = WRStatus.INACTIVE
    setup_data["wr1"].save()
    
    url = f'/api/v1/shipments/{setup_data["shipment"].id}/items/'
    resp = auth_client.post(url, {"wr_ids": [setup_data["wr1"].id]}, format='json')
    assert resp.status_code == 400
    assert "not ACTIVE" in str(resp.data)

@pytest.mark.django_db
def test_reject_adding_wrong_client(auth_client, setup_data):
    url = f'/api/v1/shipments/{setup_data["shipment"].id}/items/'
    resp = auth_client.post(url, {"wr_ids": [setup_data["wr2"].id]}, format='json')
    assert resp.status_code == 400
    assert "client" in str(resp.data)

@pytest.mark.django_db
def test_reject_shipping_empty(auth_client, setup_data):
    url = f'/api/v1/shipments/{setup_data["shipment"].id}/ship/'
    resp = auth_client.post(url, {}, format='json')
    assert resp.status_code == 400
    assert "empty shipment" in str(resp.data)

@pytest.mark.django_db
def test_reject_shipping_missing_balance(auth_client, setup_data):
    ShipmentItem.objects.create(shipment=setup_data["shipment"], wr=setup_data["wr1"])
    InventoryBalance.objects.filter(wr=setup_data["wr1"]).delete()
    
    url = f'/api/v1/shipments/{setup_data["shipment"].id}/ship/'
    resp = auth_client.post(url, {}, format='json')
    assert resp.status_code == 400
    assert "missing from inventory" in str(resp.data)

@pytest.mark.django_db
def test_reject_shipping_already_shipped(auth_client, setup_data):
    setup_data["shipment"].status = ShipmentStatus.SHIPPED
    setup_data["shipment"].save()

    url = f'/api/v1/shipments/{setup_data["shipment"].id}/ship/'
    resp = auth_client.post(url, {}, format='json')
    assert resp.status_code == 400
    assert "PLANNED or PACKED" in str(resp.data)
