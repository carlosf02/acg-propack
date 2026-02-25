#!/bin/bash

source ./tests/manual/_helpers.sh


echo -e "\n\n--- 1) Create WR to Ship (WR-SHIP-1) ---"
curl -s -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" -H "Referer: http://127.0.0.1:8000/" -X POST http://127.0.0.1:8000/api/v1/wrs/ -d '{"wr_number": "WR-SHIP-1", "client": 1, "received_warehouse": 1, "status": "ACTIVE"}' > wr_ship.json
WR_ID=$(cat wr_ship.json | jq -r '.id')
echo "Created WR ID: $WR_ID"

echo -e "\n\n--- 2) Putaway WR into A-01 ---"
curl -s -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" -H "Referer: http://127.0.0.1:8000/" -X POST http://127.0.0.1:8000/api/v1/inventory/move/ -d "{\"wr\": $WR_ID, \"to_location\": 1}" > /dev/null

echo -e "\n\n--- 3) Create a Shipment ---"
curl -s -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" -H "Referer: http://127.0.0.1:8000/" -X POST http://127.0.0.1:8000/api/v1/shipments/ -d '{"shipment_number": "SHP-MANUAL-01", "client": 1, "from_warehouse": 1}' > shipment.json
SHP_ID=$(cat shipment.json | jq -r '.id')
echo "Created Shipment ID: $SHP_ID"

echo -e "\n\n--- 4) Add WR to Shipment ---"
curl -s -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" -H "Referer: http://127.0.0.1:8000/" -X POST http://127.0.0.1:8000/api/v1/shipments/$SHP_ID/items/ -d "{\"wr_ids\": [$WR_ID]}" | jq .

echo -e "\n\n--- 5) Ship! ---"
curl -s -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" -H "Referer: http://127.0.0.1:8000/" -X POST http://127.0.0.1:8000/api/v1/shipments/$SHP_ID/ship/ -d '{"carrier": "UPS", "tracking_number": "1Z99999", "notes": "Handed to driver."}' > ship.json
cat ship.json | jq '{id: .id, status: .status, carrier: .carrier, tracking_number: .tracking_number}'

echo -e "\n\n--- 6) Verify Output (WR is SHIPPED) ---"
curl -s -b cookies.txt "http://127.0.0.1:8000/api/v1/wrs/$WR_ID/" | jq '{id: .id, wr_number: .wr_number, status: .status}'

echo -e "\n\n--- 7) Verify Inventory Balance is removed entirely ---"
curl -s -b cookies.txt "http://127.0.0.1:8000/api/v1/inventory/balances/?wr=$WR_ID" | jq '{count: .count}'

# Cleanup temporary files
rm wr_ship.json shipment.json ship.json

echo -e "\n\nDone"
