# Services Layer Reference

All state-mutating (posting) logic resides in decoupled service files rather than DRF ViewSets. This pattern leverages `transaction.atomic()` to execute securely while enforcing DB locks gracefully.

## `inventory/services.py:move_wr`
- **Purpose**: Moves a `WarehouseReceipt` across logical bins / locations.
- **Inputs**: `wr`, `to_location`, `from_location` (optional), `performed_by`, `notes`.
- **Validation**:
  - Enforces `performed_by` presence natively.
  - Validates WR is `ACTIVE` and prevents moving to identical current locations.
- **Locks & Transactions**:
  - Models `select_for_update()` locking exactly the active `InventoryBalance`.
  - Creates 1 `MOVE` `InventoryTransaction`.

## `receiving/services_repack.py:consolidate_wrs`
- **Purpose**: Merges multiple inputs into one output securely.
- **Inputs**: `client`, `input_wrs` (list), `to_location`, `output_data` (dict), `performed_by`, `notes`.
- **Validation**: Requires `len(input_wrs) >= 2` and strictly `ACTIVE` inputs belonging to the identical `client`. Ensures all locked balances are physically present.
- **Side Effects**: 
  - Generates `RepackOperation` and ties components through `RepackLink`.
  - Updates input WRs to `INACTIVE`. Assigns `parent_wr`.
  - Atomically creates `REPACK_CONSUME` (destroys inputs natively) and `REPACK_PRODUCE` (assigns output inventory).

## `shipping/services.py:add_items_to_shipment`
- **Purpose**: Binds packages onto outbound dispatch structures efficiently.
- **Inputs**: `shipment`, `wr_ids` (list), `performed_by`.
- **Behavior**: Ignores duplicates seamlessly without error. Enforces `shipment.from_warehouse` matching against `InventoryBalance.warehouse` natively to prevent cross-facility payloads. Captures all `WR` keys explicitly mapping cleanly onto `ShipmentItem` rows.

## `shipping/services.py:ship_shipment`
- **Purpose**: Final dispatch processing.
- **Inputs**: `shipment`, `performed_by`, `carrier`, `tracking_number`, `shipped_at`, `notes`.
- **Action**:
  - Retrieves `Shipment` via `.select_for_update()` to strictly prevent double-shipping executions.
  - Generates an explicitly mapped `SHIP` `InventoryTransaction` natively storing user actions.
  - Maps `WRStatus.SHIPPED` consistently for tracking records while permanently deleting active `InventoryBalance` rows, fully severing warehouse existence appropriately.
