#!/bin/bash

source ./tests/manual/_helpers.sh


echo -e "\n--- Unauthenticated access ---"
curl -s -i http://127.0.0.1:8000/api/v1/inventory/move/

echo -e "\n\n--- Putaway Case (WR to A-01) ---"
# Assuming WR-002 exists from step 23, move it to A-01 (WH=1, Location=1)
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/inventory/move/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{
    "wr": 2,
    "to_location": 1
  }'

echo -e "\n\n--- Move Case (WR-002 from A-01 to A-01 again - should fail) ---"
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/inventory/move/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{
    "wr": 2,
    "to_location": 1
  }'

echo -e "\n\n--- Move Case (Mismatch from_location) ---"
# Assuming there is a location 2 (we need to hit it to test) - we will just test the mismatch logic
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/inventory/move/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{
    "wr": 2,
    "to_location": 1,
    "from_location": 999 
  }'

echo -e "\n\n--- Move Case (Set WR to SHIPPED to test 400 status) ---"
# Let's mock a patch then move
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X PATCH http://127.0.0.1:8000/api/v1/wrs/2/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{"status": "SHIPPED"}' > /dev/null

curl -H "Content-Type: application/json" -s -i -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/inventory/move/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{
    "wr": 2,
    "to_location": 1
  }'

# Reset status back
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X PATCH http://127.0.0.1:8000/api/v1/wrs/2/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{"status": "ACTIVE"}' > /dev/null

echo -e "\n\nDone"
