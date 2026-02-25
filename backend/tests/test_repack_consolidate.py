import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from clients.models import Client
from warehouse.models import Warehouse, StorageLocation, LocationType
from receiving.models import WarehouseReceipt, WRStatus, RepackOperation, OperationType, RepackLink
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
    client = Client.objects.create(client_code="C1", name="Client 1")
    warehouse = Warehouse.objects.create(code="W1", name="Warehouse 1")
    loc1 = StorageLocation.objects.create(warehouse=warehouse, code="LOC-1")
    
    wr1 = WarehouseReceipt.objects.create(wr_number="WR-IN-1", client=client, received_warehouse=warehouse, status=WRStatus.ACTIVE)
    wr2 = WarehouseReceipt.objects.create(wr_number="WR-IN-2", client=client, received_warehouse=warehouse, status=WRStatus.ACTIVE)
    
    InventoryBalance.objects.create(client=client, warehouse=warehouse, location=loc1, wr=wr1, on_hand_qty=1)
    InventoryBalance.objects.create(client=client, warehouse=warehouse, location=loc1, wr=wr2, on_hand_qty=1)
    
    return {"client": client, "warehouse": warehouse, "loc1": loc1, "wr1": wr1, "wr2": wr2}


@pytest.mark.django_db
def test_unauthenticated_blocked(api_client, setup_data):
    url = '/api/v1/repack/consolidate/'
    response = api_client.post(url, {})
    assert response.status_code in [401, 403]

@pytest.mark.django_db
def test_happy_path_consolidate(auth_client, setup_data):
    url = '/api/v1/repack/consolidate/'
    payload = {
        "client": setup_data["client"].id,
        "input_wrs": [setup_data["wr1"].id, setup_data["wr2"].id],
        "output": {
            "wr_number": "WR-OUT-1"
        },
        "to_location": setup_data["loc1"].id,
        "notes": "Testing consolidation"
    }

    response = auth_client.post(url, payload, format='json')
    assert response.status_code == 201
    
    # 1. Output WR Created
    output_wr = WarehouseReceipt.objects.get(id=response.data["output_wr_id"])
    assert output_wr.wr_number == "WR-OUT-1"
    assert output_wr.status == WRStatus.ACTIVE

    # 2. Input WRs inactive with parent_wrr
    setup_data["wr1"].refresh_from_db()
    setup_data["wr2"].refresh_from_db()
    assert setup_data["wr1"].status == WRStatus.INACTIVE
    assert setup_data["wr2"].status == WRStatus.INACTIVE
    assert setup_data["wr1"].parent_wr == output_wr
    assert setup_data["wr2"].parent_wr == output_wr

    # 3. Balances Updated
    # Inputs should be removed
    assert not InventoryBalance.objects.filter(wr=setup_data["wr1"]).exists()
    assert not InventoryBalance.objects.filter(wr=setup_data["wr2"]).exists()
    
    # Output should exist
    output_balance = InventoryBalance.objects.get(wr=output_wr)
    assert output_balance.location == setup_data["loc1"]
    assert output_balance.on_hand_qty == 1

    # 4. Transactions
    assert InventoryTransaction.objects.filter(txn_type=TxnType.REPACK_CONSUME).exists()
    assert InventoryTransaction.objects.filter(txn_type=TxnType.REPACK_PRODUCE).exists()

    # 5. Links created
    assert RepackLink.objects.filter(input_wr=setup_data["wr1"], output_wr=output_wr).exists()
    assert RepackLink.objects.filter(input_wr=setup_data["wr2"], output_wr=output_wr).exists()


@pytest.mark.django_db
def test_reject_if_wr_not_active(auth_client, setup_data):
    setup_data["wr1"].status = WRStatus.INACTIVE
    setup_data["wr1"].save()

    url = '/api/v1/repack/consolidate/'
    payload = {
        "client": setup_data["client"].id,
        "input_wrs": [setup_data["wr1"].id, setup_data["wr2"].id],
        "output": {"wr_number": "WR-OUT-1"},
        "to_location": setup_data["loc1"].id
    }
    response = auth_client.post(url, payload, format='json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_reject_missing_balance(auth_client, setup_data):
    # Remove balance for wr2
    InventoryBalance.objects.filter(wr=setup_data["wr2"]).delete()

    url = '/api/v1/repack/consolidate/'
    payload = {
        "client": setup_data["client"].id,
        "input_wrs": [setup_data["wr1"].id, setup_data["wr2"].id],
        "output": {"wr_number": "WR-OUT-1"},
        "to_location": setup_data["loc1"].id
    }
    response = auth_client.post(url, payload, format='json')
    assert response.status_code == 400
    assert "Missing active inventory balance" in str(response.data)

@pytest.mark.django_db
def test_reject_different_client(auth_client, setup_data):
    other_client = Client.objects.create(client_code="C2", name="Client 2")
    
    url = '/api/v1/repack/consolidate/'
    payload = {
        "client": other_client.id,  # Payload client doesn't match input WRs
        "input_wrs": [setup_data["wr1"].id, setup_data["wr2"].id],
        "output": {"wr_number": "WR-OUT-1"},
        "to_location": setup_data["loc1"].id
    }
    response = auth_client.post(url, payload, format='json')
    assert response.status_code == 400

@pytest.mark.django_db
def test_reject_different_warehouse(auth_client, setup_data):
    other_warehouse = Warehouse.objects.create(code="W2", name="Warehouse 2")
    other_location = StorageLocation.objects.create(warehouse=other_warehouse, code="LOC-OTHER")

    url = '/api/v1/repack/consolidate/'
    payload = {
        "client": setup_data["client"].id,
        "input_wrs": [setup_data["wr1"].id, setup_data["wr2"].id],
        "output": {"wr_number": "WR-OUT-1"},
        "to_location": other_location.id # Trying to consolidate items in W1 out into W2 natively
    }
    response = auth_client.post(url, payload, format='json')
    assert response.status_code == 400
    assert "destination is" in str(response.data)
