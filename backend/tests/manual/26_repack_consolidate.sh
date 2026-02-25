#!/bin/bash

source ./tests/manual/_helpers.sh


echo -e "\n\n--- 1) Create First WR (WR-REPACK-1) ---"
curl -s -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" -H "Referer: http://127.0.0.1:8000/" -X POST http://127.0.0.1:8000/api/v1/wrs/ -d '{"wr_number": "WR-REPACK-1", "client": 1, "received_warehouse": 1, "status": "ACTIVE"}' > wr1.json
WR1_ID=$(cat wr1.json | jq -r '.id')
echo "Created WR1 ID: $WR1_ID"

echo -e "\n\n--- 2) Create Second WR (WR-REPACK-2) ---"
curl -s -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" -H "Referer: http://127.0.0.1:8000/" -X POST http://127.0.0.1:8000/api/v1/wrs/ -d '{"wr_number": "WR-REPACK-2", "client": 1, "received_warehouse": 1, "status": "ACTIVE"}' > wr2.json
WR2_ID=$(cat wr2.json | jq -r '.id')
echo "Created WR2 ID: $WR2_ID"

echo -e "\n\n--- 3) Putaway WR1 into A-01 ---"
curl -s -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" -H "Referer: http://127.0.0.1:8000/" -X POST http://127.0.0.1:8000/api/v1/inventory/move/ -d "{\"wr\": $WR1_ID, \"to_location\": 1}" > /dev/null

echo -e "\n\n--- 4) Putaway WR2 into A-01 ---"
curl -s -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" -H "Referer: http://127.0.0.1:8000/" -X POST http://127.0.0.1:8000/api/v1/inventory/move/ -d "{\"wr\": $WR2_ID, \"to_location\": 1}" > /dev/null

echo -e "\n\n--- 5) Consolidate WR1 and WR2 into WR-NEW-001 ---"
curl -s -b cookies.txt -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" -H "Referer: http://127.0.0.1:8000/" -X POST http://127.0.0.1:8000/api/v1/repack/consolidate/ -d "{
    \"client\": 1,
    \"input_wrs\": [$WR1_ID, $WR2_ID],
    \"output\": {
        \"wr_number\": \"WR-NEW-001\"
    },
    \"to_location\": 1
}" > consolidate.json
cat consolidate.json | jq .
NEW_WR_ID=$(cat consolidate.json | jq -r '.output_wr_id')

echo -e "\n\n--- 6) Verify Input WRs are INACTIVE and parent_wrr is set ---"
curl -s -b cookies.txt "http://127.0.0.1:8000/api/v1/wrs/$WR1_ID/" | jq '{id: .id, wr_number: .wr_number, status: .status, parent_wr: .parent_wr}'
curl -s -b cookies.txt "http://127.0.0.1:8000/api/v1/wrs/$WR2_ID/" | jq '{id: .id, wr_number: .wr_number, status: .status, parent_wr: .parent_wr}'

echo -e "\n\n--- 7) Verify Output WR is ACTIVE ---"
curl -s -b cookies.txt "http://127.0.0.1:8000/api/v1/wrs/$NEW_WR_ID/" | jq '{id: .id, wr_number: .wr_number, status: .status}'

echo -e "\n\n--- 8) Verify Inventory Balances ---"
curl -s -b cookies.txt "http://127.0.0.1:8000/api/v1/inventory/balances/?wr=$WR1_ID" | jq '{count: .count}'
curl -s -b cookies.txt "http://127.0.0.1:8000/api/v1/inventory/balances/?wr=$WR2_ID" | jq '{count: .count}'
curl -s -b cookies.txt "http://127.0.0.1:8000/api/v1/inventory/balances/?wr=$NEW_WR_ID" | jq '{count: .count, location: .results[0].location_details.code, on_hand: .results[0].on_hand_qty}'

# Cleanup temporary files
rm wr1.json wr2.json consolidate.json

echo -e "\n\nDone"
