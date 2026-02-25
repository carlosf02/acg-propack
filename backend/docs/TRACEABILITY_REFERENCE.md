# Traceability Reference

This document explains how audit chains are structurally guaranteed throughout the application lifecycle.

## Overview
Traceability is guaranteed through an immutable ledger (`InventoryTransaction` and `InventoryTransactionLine`) acting alongside explicitly linked relationships (`parent_wr`, `RepackLink`, `ShipmentItem`).

## 1. Move & Putaway Operations
- **Data Flow**: Moving an active stock object (`qty=1`) across locations.
- **Guarantee**: A `MOVE` entry is securely written in `InventoryTransaction`. The underlying `InventoryTransactionLine` captures the exact `from_location` and `to_location`.

## 2. Repack Consolidations
- **Data Flow**: Consuming multiple WRs to produce exactly one structural output.
- **Guarantee**:
  - **Inputs**: Updated to `INACTIVE`. A `REPACK_CONSUME` transaction explicitly links `from_location` mappings out to `None`. 
  - **Outputs**: Instantiated as `ACTIVE`. A `REPACK_PRODUCE` assigns `from_location=None` connecting out to `to_location`. 
  - **Linkage**: The `RepackLink` structurally joins all elements to the exact `RepackOperation`, enabling recursive backwards checks seamlessly inside the `Trace` APIs.

## 3. Shipping Operations
- **Data Flow**: Exporting and eliminating warehouse inventory cleanly.
- **Guarantee**:
  - **Execution**: The `.select_for_update()` strictly locks execution states seamlessly evaluating the `SHIP` Transaction.
  - **Result**: `InventoryTransactionLine` entries securely push the item `from_location` onto `to_location=None`. The `InventoryBalance` entity is permanently deleted, ending the physical lifetime while preserving identity data.

## Interpretation Checklist
- **`InventoryTransactionLine`**: Tracks "what" moved "where", consistently enforcing the `qty=1` physical box standard seamlessly across domains.
- **`RepackLink`**: Explains "why" a WR became `INACTIVE` intelligently tracing backwards up the tree.
- **`ShipmentItem`**: Acts as the permanent logical bridge pointing `SHIPPED` WRs firmly to the dispatch identity regardless of timeline destruction natively.
