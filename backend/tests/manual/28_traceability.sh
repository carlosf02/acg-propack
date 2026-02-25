#!/bin/bash

source ./tests/manual/_helpers.sh


CSRF=$(awk '/csrftoken/ {print $7}' cookies.txt)

echo -e "\n\n--- 1) Create WR to Move and Track ---"
curl -s -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" -X POST http://127.0.0.1:8000/api/v1/wrs/ -d '{"wr_number": "WR-TRACE-1", "client": 1, "status": "ACTIVE"}' > wr.json
WR_ID=$(cat wr.json | jq -r '.id')
echo "Created WR ID: $WR_ID"

echo -e "\n\n--- 2) Move WR to Location 1 ---"
curl -s -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" -X POST http://127.0.0.1:8000/api/v1/inventory/move/ -d "{\"wr\": $WR_ID, \"to_location\": 1}" > /dev/null

echo -e "\n\n--- 3) Trace WR Details ---"
curl -s -b cookies.txt "http://127.0.0.1:8000/api/v1/wrs/$WR_ID/trace/" > trace_wr.json
cat trace_wr.json | jq '{wr_number: .wr_number, status: .status, current_location: .current_balance.location_details.code, history_count: (.inventory_history | length)}'

# We know Shipment 1 from previous tests is SHIPPED with 1 element
echo -e "\n\n--- 4) Trace Existing Shipped Shipment (Assuming ID 1 exists) ---"
curl -s -b cookies.txt "http://127.0.0.1:8000/api/v1/shipments/1/trace/" > trace_ship.json
cat trace_ship.json | jq '{shipment_number: .shipment_number, status: .status, items_count: (.items | length), transaction_id: .transaction_linkage.transaction_id}'

# Clean up
rm wr.json trace_wr.json trace_ship.json

echo -e "\n\nDone"
