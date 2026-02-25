# Testing Reference

To ensure backend stability effectively, tests are broadly divided into Automated Unit suites and parameterized End-to-End terminal scripts.

## 1. Running Pytest
The test suite spans across all domains and utilizes `pytest-django`.
- **Command**: `python manage.py check && pytest -q`
- **What it covers**: 
  - Validates unauthenticated requests are rejected.
  - Ensures constraints limit quantities to exactly 1.
  - Generates full lifecycle mock chains to evaluate `Trace` recursive output logic precisely.

## 2. Parameterized Bash Scripts
The `backend/tests/manual/` folder contains linear workflows meant to simulate frontend HTTP state exactly.
- **Workflow**:
  1. Login once and generate `cookies.txt` with `backend/tests/manual/get_cookie.py`.
  2. The `_helpers.sh` natively configures the environment parsing `$CSRF`.
  3. Every `POST`, `PATCH`, and `PUT` wrapper defaults appropriately to `Content-Type: application/json` enforcing API security smoothly.
- **Scripts Included**:
  - `22_masterdata_crud.sh`: Validates core components.
  - `23_wrs.sh`: Exercises `WarehouseReceipt` modifications.
  - `24_inventory_balances.sh`: Analyzes filters across reads.
  - `25_inventory_move.sh`: Checks facility transfers correctly limiting out-of-sync operations.
  - `26_repack_consolidate.sh`: Runs the multi-input lifecycle effectively.
  - `27_shipments.sh`: Verifies shipment locking, binding, packaging, and dispatch workflows.
  - `28_traceability.sh`: Verifies nested relationships across JSON traces.
