#!/bin/bash

source ./tests/manual/_helpers.sh


# Extract CSRF token for requests
CSRF=$(awk '/csrftoken/ {print $7}' cookies.txt)

echo "CSRF is $CSRF"

# 3. Unauthenticated access check (no cookies)
echo -e "\n--- Unauthenticated access ---"
curl -s -i http://127.0.0.1:8000/api/v1/clients/

# 4. Authenticated CRUD Flow
echo -e "\n--- A) POST /clients/ ---"
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/clients/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{"client_code": "CL-01", "name": "Test Client"}'

echo -e "\n\n--- GET /clients/ ---"
curl -s -i -b cookies.txt http://127.0.0.1:8000/api/v1/clients/

echo -e "\n\n--- PATCH /clients/1/ ---"
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X PATCH http://127.0.0.1:8000/api/v1/clients/1/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{"name": "Updated Client Name"}'

echo -e "\n\n--- GET /clients/1/ ---"
curl -s -i -b cookies.txt http://127.0.0.1:8000/api/v1/clients/1/

echo -e "\n\n--- B) POST /warehouses/ ---"
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/warehouses/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{"code": "WH-01", "name": "Main Warehouse"}'

echo -e "\n\n--- GET /warehouses/ ---"
curl -s -i -b cookies.txt http://127.0.0.1:8000/api/v1/warehouses/

echo -e "\n\n--- C) POST /locations/ ---"
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/locations/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{"warehouse": 1, "code": "A-01", "location_type": "STORAGE"}'

echo -e "\n\n--- GET /locations/?warehouse=1 ---"
curl -s -i -b cookies.txt "http://127.0.0.1:8000/api/v1/locations/?warehouse=1"

echo -e "\n\n--- POST duplicate location ---"
curl -H "Content-Type: application/json" -s -i -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/locations/ \
  -H "X-CSRFToken: $CSRF" -H "Content-Type: application/json" \
  -H "Referer: http://127.0.0.1:8000/" \
  -d '{"warehouse": 1, "code": "A-01", "location_type": "STORAGE"}'

echo -e "\n\n--- Verify search clients ---"
curl -s -i -b cookies.txt "http://127.0.0.1:8000/api/v1/clients/?search=CL-"

echo -e "\n\n--- Verify search locations ---"
curl -s -i -b cookies.txt "http://127.0.0.1:8000/api/v1/locations/?search=A-01"
