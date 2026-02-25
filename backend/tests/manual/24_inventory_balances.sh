#!/bin/bash

source ./tests/manual/_helpers.sh


CSRF=$(awk '/csrftoken/ {print $7}' cookies.txt)
echo "CSRF is $CSRF"

echo -e "\n--- Unauthenticated access ---"
curl -s -i http://127.0.0.1:8000/api/v1/inventory/balances/

echo -e "\n\n--- Authenticated list ---"
curl -s -i -b cookies.txt http://127.0.0.1:8000/api/v1/inventory/balances/

echo -e "\n\n--- Filtering by warehouse ---"
curl -s -i -b cookies.txt "http://127.0.0.1:8000/api/v1/inventory/balances/?warehouse=1"

echo -e "\n\n--- Filtering by location ---"
curl -s -i -b cookies.txt "http://127.0.0.1:8000/api/v1/inventory/balances/?location=1"

echo -e "\n\n--- Filtering by wr ---"
curl -s -i -b cookies.txt "http://127.0.0.1:8000/api/v1/inventory/balances/?wr=1"

echo -e "\n\n--- Search by wr_number ---"
curl -s -i -b cookies.txt "http://127.0.0.1:8000/api/v1/inventory/balances/?search=WR-001"

echo -e "\n\n--- Search by location_code ---"
curl -s -i -b cookies.txt "http://127.0.0.1:8000/api/v1/inventory/balances/?search=A-01"

echo -e "\n\n--- Ordering by wr__wr_number ---"
curl -s -i -b cookies.txt "http://127.0.0.1:8000/api/v1/inventory/balances/?ordering=wr__wr_number"

echo -e "\n\n--- Ordering by -updated_at ---"
curl -s -i -b cookies.txt "http://127.0.0.1:8000/api/v1/inventory/balances/?ordering=-updated_at"

echo -e "\n\nDone"
