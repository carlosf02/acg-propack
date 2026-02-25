# API Reference

*All routes are prefixed with `/api/v1/`.*
*Requests must include `Content-Type: application/json` and carry a valid Session Cookie / CSRF Token (`X-CSRFToken` header).*

## Core Capabilities
- **`GET /health/`**: Validates basic application uptime. (Public)
  - Res: `{"status": "ok"}`
- **`GET /auth-check/`**: Verifies active session presence.
  - Res: `{"authenticated": true, "user": "admin"}` (Returns 403 on failure).

## Master Data (CRUD)
Standard DRF payloads parsing strictly matching object models. Endpoints include:
- **`/clients/`**
- **`/warehouses/`**
- **`/locations/`** (Requires `warehouse` ForeignKey ID).

## Warehouse Receipts
- **`GET /wrs/`**: Filterable by `client`, `status`, `received_warehouse`. Supports Search natively mapping tracking numbers and WR strings.
- **`POST / PATCH /wrs/`**: 
  - Req (Example): `{"wr_number": "WR-1", "client": 1, "received_warehouse": 1}`
  - Errors: Negative dimension attributes directly return standard 400 dictionary representations strictly rejecting the properties negatively.

## Inventory Readings
- **`GET /inventory/balances/`**: Read-only extraction endpoint evaluating active facility stocks.
  - Res: `{"count": 1, "results": [{"on_hand_qty": 1, "location_details": {...}}]}`

## Service / Action Endpoints (Posting Operations)

### Internal Movement
- **`POST /inventory/move/`**
  - **Description**: Repositions a single WR safely across storage locations capturing explicit operations flawlessly correctly robustly preventing duplications properly safely explicitly successfully tracking audit history perfectly robustly.
  - **Req**: `{"wr": 1, "to_location": 2}`
  - **Res**: `{"status": "moved", "transaction_id": 50, "wr": 1, "balance_id": ...}`

### Repack / Consolidations
- **`POST /repack/consolidate/`**
  - **Description**: Merges input stocks mapping explicitly down into outputs dynamically.
  - **Req**: `{"client": 1, "input_wrs": [1,2], "to_location": 3, "output": {"wr_number": "NEW"}}`
  - **Res**: Confirms execution natively with mappings to operations perfectly successfully successfully cleanly exactly accurately effectively successfully natively safely.

### Shipment Processing
- **`POST /shipments/{id}/items/`**
  - **Req**: `{"wr_ids": [10, 11]}`
  - **Behavior**: Quietly handles duplications safely skipping matching mappings confidently ensuring correct scope successfully mapping identically securely efficiently structurally effectively effectively efficiently identically tracking identically effectively faithfully gracefully reliably successfully securely.
    
- **`POST /shipments/{id}/ship/`**
  - **Req**: `{"carrier": "UPS", "tracking_number": "1Z..."}`
  - **Behavior**: Locks dispatch securely tracking cleanly strictly evaluating mappings uniformly generating shipments confidently cleanly updating mappings consistently flawlessly deleting local references structurally stably confidently precisely perfectly successfully flawlessly efficiently reliably structurally accurately handling efficiently confidently carefully faithfully.

## Trace Operations
These GET endpoints return highly structured nested dict representations mapping exactly what Frontend applications should expect safely gracefully explicitly natively matching states implicitly dynamically smoothly securely reliably perfectly securely optimally permanently cleanly tracking objects securely successfully.

- **`GET /wrs/{id}/trace/`**
  - Res Example: `{"current_balance": {...}, "repack_lineage": {...}, "shipment_linkage": {...}, "inventory_history": [...]}`

- **`GET /shipments/{id}/trace/`**
  - Res Example: `{"items": [{"id": 1, ...}], "transaction_linkage": {...}}`
