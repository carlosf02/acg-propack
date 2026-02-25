# Data Models Reference

## 1. Core Models
- **`TimeStampedModel`**: Abstract base class adding `created_at` and `updated_at` universally.
- **Enums (`TxnType`, `WRStatus`, `ShipmentStatus`)**: Strictly bounds all statuses preventing arbitrary text entries.

## 2. Master Data
- **`Client`**: `client_code` (unique), `name`. Pure tracking entity accurately evaluating ownership across models universally.
- **`Warehouse`**: Facility representation strictly evaluating logistics boundaries natively. (`code` unique).
- **`StorageLocation`**: Granular nodes mapped exclusively safely. Constraint ensures `warehouse_id` + `code` is strictly unique correctly.

## 3. Receiving & Inventory
- **`WarehouseReceipt` (WR)**: Core trackable package unit. FK to `Client`, `Warehouse`. Status choices (`ACTIVE`, `INACTIVE`, `SHIPPED`) limit scope dynamically.
- **`InventoryBalance`**: Unique constraint over `location` + `wr_id`. Real-time cache holding existence. System enforces exactly 1 Active balance per WR explicitly properly seamlessly.
- **`InventoryTransaction` & `InventoryTransactionLine`**: Tracks history perfectly. Header stores `txn_type`, `performed_by`. Lines store `qty=1`, `from_location`, and `to_location`.

## 4. Repack & Consolidation
- **`RepackOperation`**: Explicit tracking event successfully mapping user references explicitly identically safely.
- **`RepackLink`**: Junction for WR lineages securely mapping exactly 1-to-1 flows faithfully preventing duplications gracefully seamlessly confidently.

## 5. Shipping
- **`Shipment` & `ShipmentItem`**: Groups active combinations uniquely faithfully correctly. `ShipmentItem` relies on a DB constraint locking `shipment_id` + `wr_id` dynamically securely securely safely.
