import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from clients.models import Client
from warehouse.models import Warehouse, StorageLocation
from receiving.models import WarehouseReceipt, WRStatus, RepackOperation, OperationType, RepackLink
from shipping.models import Shipment, ShipmentItem
from core.models import ShipmentStatus
from inventory.models import InventoryBalance, InventoryTransaction, InventoryTransactionLine, TxnType

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
    loc2 = StorageLocation.objects.create(warehouse=warehouse, code="LOC-2")
    
    user = User.objects.create_user(username='fixtureuser')
    wr_move = WarehouseReceipt.objects.create(wr_number="WR-MOVE", client=client, received_warehouse=warehouse, status=WRStatus.ACTIVE)
    InventoryBalance.objects.create(client=client, warehouse=warehouse, location=loc2, wr=wr_move, on_hand_qty=1)
    
    txn_move = InventoryTransaction.objects.create(client=client, txn_type=TxnType.MOVE, performed_by=user)
    InventoryTransactionLine.objects.create(transaction=txn_move, wr=wr_move, from_location=loc1, to_location=loc2, qty=1)
    
    wr_in1 = WarehouseReceipt.objects.create(wr_number="WR-IN-1", client=client, status=WRStatus.INACTIVE)
    wr_in2 = WarehouseReceipt.objects.create(wr_number="WR-IN-2", client=client, status=WRStatus.INACTIVE)
    wr_out = WarehouseReceipt.objects.create(wr_number="WR-OUT", client=client, status=WRStatus.ACTIVE)
    
    wr_in1.parent_wr = wr_out
    wr_in2.parent_wr = wr_out
    wr_in1.save()
    wr_in2.save()
    
    InventoryBalance.objects.create(client=client, warehouse=warehouse, location=loc1, wr=wr_out, on_hand_qty=1)
    
    op = RepackOperation.objects.create(client=client, operation_type=OperationType.CONSOLIDATE, performed_by=user)
    RepackLink.objects.create(repack_operation=op, input_wr=wr_in1, output_wr=wr_out)
    RepackLink.objects.create(repack_operation=op, input_wr=wr_in2, output_wr=wr_out)
    
    txn_consume = InventoryTransaction.objects.create(client=client, txn_type=TxnType.REPACK_CONSUME, reference_type="REPACK_OP", reference_id=str(op.id), performed_by=user)
    InventoryTransactionLine.objects.create(transaction=txn_consume, wr=wr_in1, from_location=loc1, qty=1)
    
    txn_produce = InventoryTransaction.objects.create(client=client, txn_type=TxnType.REPACK_PRODUCE, reference_type="REPACK_OP", reference_id=str(op.id), performed_by=user)
    InventoryTransactionLine.objects.create(transaction=txn_produce, wr=wr_out, to_location=loc1, qty=1)

    shipment = Shipment.objects.create(shipment_number="SHP-TRACE", client=client, status=ShipmentStatus.SHIPPED)
    wr_ship = WarehouseReceipt.objects.create(wr_number="WR-SHIP", client=client, status=WRStatus.SHIPPED)
    ShipmentItem.objects.create(shipment=shipment, wr=wr_ship)
    
    txn_ship = InventoryTransaction.objects.create(client=client, txn_type=TxnType.SHIP, reference_type="SHIPMENT", reference_id=str(shipment.id), performed_by=user)
    InventoryTransactionLine.objects.create(transaction=txn_ship, wr=wr_ship, from_location=loc1, qty=1)

    return {
        "wr_move": wr_move, "loc2": loc2, 
        "wr_out": wr_out, "wr_in1": wr_in1, "wr_in2": wr_in2, "op": op,
        "shipment": shipment, "wr_ship": wr_ship, "txn_ship": txn_ship
    }

@pytest.mark.django_db
def test_unauthenticated(api_client, setup_data):
    assert api_client.get(f'/api/v1/wrs/{setup_data["wr_move"].id}/trace/').status_code in [401, 403]
    assert api_client.get(f'/api/v1/shipments/{setup_data["shipment"].id}/trace/').status_code in [401, 403]

@pytest.mark.django_db
def test_wr_trace_moved(auth_client, setup_data):
    url = f'/api/v1/wrs/{setup_data["wr_move"].id}/trace/'
    response = auth_client.get(url)
    assert response.status_code == 200
    
    data = response.data
    assert data["wr_number"] == "WR-MOVE"
    assert data["current_balance"]["location_details"]["code"] == "LOC-2"
    assert len(data["inventory_history"]) == 1
    assert data["inventory_history"][0]["txn_type"] == "MOVE"

@pytest.mark.django_db
def test_wr_trace_consolidated_output(auth_client, setup_data):
    url = f'/api/v1/wrs/{setup_data["wr_out"].id}/trace/'
    response = auth_client.get(url)
    assert response.status_code == 200
    data = response.data
    
    assert data["repack_lineage"] is not None
    assert len(data["repack_lineage"]["consolidated_from"]) == 2
    
    history_types = [h["txn_type"] for h in data["inventory_history"]]
    assert "REPACK_PRODUCE" in history_types

@pytest.mark.django_db
def test_wr_trace_consolidated_input(auth_client, setup_data):
    url = f'/api/v1/wrs/{setup_data["wr_in1"].id}/trace/'
    response = auth_client.get(url)
    assert response.status_code == 200
    data = response.data
    
    assert data["status"] == "INACTIVE"
    assert data["repack_lineage"]["consolidated_into"]["wr_number"] == "WR-OUT"
    assert data["repack_lineage"]["operation"]["operation_type"] == "CONSOLIDATE"

@pytest.mark.django_db
def test_shipment_trace(auth_client, setup_data):
    url = f'/api/v1/shipments/{setup_data["shipment"].id}/trace/'
    response = auth_client.get(url)
    assert response.status_code == 200
    data = response.data
    
    assert data["shipment_number"] == "SHP-TRACE"
    assert len(data["items"]) == 1
    assert data["items"][0]["wr_number"] == "WR-SHIP"
    
    assert data["transaction_linkage"]["transaction_id"] == setup_data["txn_ship"].id
    assert data["transaction_linkage"]["line_count"] == 1

@pytest.mark.django_db
def test_wr_trace_shipped(auth_client, setup_data):
    url = f'/api/v1/wrs/{setup_data["wr_ship"].id}/trace/'
    response = auth_client.get(url)
    assert response.status_code == 200
    data = response.data
    
    assert data["status"] == "SHIPPED"
    assert data["current_balance"] is None
    assert data["shipment_linkage"]["shipment_number"] == "SHP-TRACE"
