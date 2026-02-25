import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from clients.models import Client
from warehouse.models import Warehouse, StorageLocation, LocationType
from receiving.models import WarehouseReceipt
from inventory.models import InventoryBalance

# Assume we already created client 'CL-01' and warehouse 'WH-01' from earlier tests
client = Client.objects.filter(client_code="CL-01").first()
warehouse = Warehouse.objects.filter(code="WH-01").first()

if not client or not warehouse:
    print("Test data client/warehouse not found, creating...")
    client, _ = Client.objects.get_or_create(client_code="CL-01", defaults={"name": "Test Client"})
    warehouse, _ = Warehouse.objects.get_or_create(code="WH-01", defaults={"name": "Main Warehouse"})

location, _ = StorageLocation.objects.get_or_create(
    warehouse=warehouse, code="A-01", 
    defaults={"location_type": LocationType.STORAGE}
)

wr, _ = WarehouseReceipt.objects.get_or_create(
    wr_number="WR-001", 
    defaults={"client": client, "received_warehouse": warehouse, "tracking_number": "TRK-12345"}
)

# Create an InventoryBalance record
balance, created = InventoryBalance.objects.get_or_create(
    client=client,
    warehouse=warehouse,
    location=location,
    wr=wr,
    defaults={"on_hand_qty": 50, "reserved_qty": 10}
)

if created:
    print("Created new InventoryBalance!")
else:
    print("InventoryBalance already exists, updating quantities...")
    balance.on_hand_qty = 50
    balance.reserved_qty = 10
    balance.save()

print(f"Seeded InventoryBalance: {balance}")
