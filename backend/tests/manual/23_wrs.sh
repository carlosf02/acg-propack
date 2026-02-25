#!/bin/bash

source ./tests/manual/_helpers.sh


# Extract CSRF token for requests
CSRF=$(awk '/csrftoken/ {print $7}' cookies.txt)
echo "CSRF is $CSRF"

# Unauthenticated access check (no cookies)
echo -e "\n--- Unauthenticated access ---"
curl -s -i http://127.0.0.1:8000/api/v1/wrs/

# 1) Create a WR
echo -e "\n\n--- 1) POST /wrs/ ---"
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/wrs/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{
    "wr_number": "WR-001",
    "client": 1,
    "received_warehouse": 1,
    "tracking_number": "TRK-12345",
    "status": "ACTIVE",
    "weight_value": "150.50",
    "weight_unit": "LB",
    "length": "10.00",
    "width": "12.00",
    "height": "14.50",
    "dimension_unit": "IN"
  }' | tee wr1_response.txt

# 2) List WRs
echo -e "\n\n--- 2) GET /wrs/ ---"
curl -s -i -b cookies.txt http://127.0.0.1:8000/api/v1/wrs/

# 3) Filter WRs
echo -e "\n\n--- 3A) GET /wrs/?client=1 ---"
curl -s -i -b cookies.txt "http://127.0.0.1:8000/api/v1/wrs/?client=1"

echo -e "\n\n--- 3B) GET /wrs/?status=ACTIVE ---"
curl -s -i -b cookies.txt "http://127.0.0.1:8000/api/v1/wrs/?status=ACTIVE"

# 4) Search WRs
echo -e "\n\n--- 4) GET /wrs/?search=TRK-12345 ---"
curl -s -i -b cookies.txt "http://127.0.0.1:8000/api/v1/wrs/?search=TRK-12345"

# 5) Patch WR
echo -e "\n\n--- 5) PATCH /wrs/1/ ---"
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X PATCH http://127.0.0.1:8000/api/v1/wrs/1/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{"notes": "Package was slightly damaged"}'

# 6) Parent link test (Create WR2 with parent WR1)
echo -e "\n\n--- 6) POST /wrs/ (Parent link test) ---"
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/wrs/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{
    "wr_number": "WR-002",
    "client": 1,
    "parent_wr": 1
  }'

echo -e "\n\n--- GET /wrs/2/ (Parent link verification) ---"
curl -s -i -b cookies.txt http://127.0.0.1:8000/api/v1/wrs/2/

# 7) Negative validation test
echo -e "\n\n--- 7) POST /wrs/ (Negative validation test) ---"
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/wrs/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{
    "wr_number": "WR-ERR01",
    "client": 1,
    "weight_value": "-5.00"
  }'

echo -e "\n\nDone"
