#!/bin/bash

export AUTH_COOKIES="cookies.txt"
if [ ! -f "$AUTH_COOKIES" ]; then
    echo "Please run 21_system_auth.sh first to login and get cookies."
    exit 1
fi

export CSRF=$(awk '/csrftoken/ {print $7}' "$AUTH_COOKIES")
export BASE_URL="http://127.0.0.1:8000/api/v1"

# Wrapper function for POST/PATCH
curl_json() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    curl -s -X "$method" \
        -b "$AUTH_COOKIES" \
        -H "X-CSRFToken: $CSRF" \
        -H "Content-Type: application/json" \
        -H "Referer: http://127.0.0.1:8000/" \
        -d "$data" \
        "$BASE_URL$endpoint"
}

# Wrapper function for GET
curl_get() {
    local endpoint=$1
    curl -s -X GET \
        -b "$AUTH_COOKIES" \
        -H "X-CSRFToken: $CSRF" \
        -H "Referer: http://127.0.0.1:8000/" \
        "$BASE_URL$endpoint"
}
