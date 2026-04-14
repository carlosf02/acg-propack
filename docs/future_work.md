# Future Work

This document tracks scoped-down / demo features shipped ahead of their full
product scope, along with what remains to be built. Search for
`TODO(<tag>)` in the codebase to find the in-code markers that point back here.

---

## Consolidation Pricing v2

Tag: `TODO(pricing-v2)`

### What the demo version does (today)

On the Consolidation Detail page, the **Pricing Summary** card shows three
numbers, recomputed in the browser from the consolidation's currently-added
items:

- **Total Volumetric Weight (Pvol)** — sum over every line of every item of
  `(L × W × H) / divisor`, where the divisor is:
  - `166` for AIR consolidations
  - `1728` for SEA consolidations
- **Total Actual Weight** — sum of `weight` across every line of every item.
- **Chargeable Weight** — `max(Total Volumetric Weight, Total Actual Weight)`,
  i.e. what the carrier would charge the admin against.

GROUND consolidations show `N/A — pricing not yet configured for ground
consolidations` in place of the stats.

Units: inches for dimensions, pounds for weight (matching how the rest of the
app stores these values). No currency involved yet.

Items in the calculation are fetched by ID from
`consolidation.warehouse_receipt_ids` (one `GET /api/v1/wrs/{id}/` per item in
parallel) so that items already locked into a consolidation are always
included even if they'd no longer satisfy the eligibility filter — for
example, a closed consolidation whose items were later added to a shipment,
or if any filter criterion (agency, shipping method, type) drifted.

### What v2 needs to add

1. **Per-item billing optimization.** The current implementation takes
   `max(actual_total, pvol_total)` across the *whole* consolidation. Real
   pricing should decide per-item (per WR or per repack, possibly per line)
   which of `weight_billed` vs `pvol_billed` maximizes admin revenue, sum
   those per-item choices, and present that number. The max-at-the-top
   shortcut here under-bills in mixed consolidations where some items are
   weight-heavy and others are volume-heavy.

2. **Dollar rate configuration.** Pvol/actual weights are only half the
   picture — the admin needs a $/lb rate for actual weight and a $/pvol-unit
   rate for volumetric weight. Open product decisions:
   - Where do rates live? `Company`? `AssociateCompany` (likely, since
     agencies negotiate their own rates)? Per-consolidation override?
   - Are rates per-mode (AIR/SEA/GROUND) or also per-destination / per-lane?
   - Do clients see their own rates, or just final billed amounts?

3. **Ground consolidation pricing.** Needs industry research — ground
   carriers typically price on actual weight + linear-foot or pallet counts
   rather than pvol, so the UX and math diverge from AIR/SEA and may need
   different inputs (pallet count, linear feet) captured on the item.

4. **Revenue vs cost display.** Once rates exist, show admin profit margin
   per consolidation (what the admin pays the carrier vs what the admin
   charges the clients). This is the core business insight the feature is
   ultimately for.

5. **Snapshot pricing on CLOSE.** When a consolidation is closed, freeze the
   final pricing (rates, dimensions, weights, chargeable number) onto the
   consolidation so historical records don't silently re-price when rates
   change. The demo re-renders from live data every time, which is fine for
   open consolidations but wrong for historical ones.

### Files / functions involved

- `frontend/src/features/consolidation/pages/ConsolidationDetailPage.tsx` —
  demo implementation lives here. The `PVOL_DIVISOR_*` constants, the
  `pricingTotals` `useMemo`, the fetch-by-id effect, and the Pricing Summary
  JSX card are all in this file. All simplifications are tagged with
  `TODO(pricing-v2)` inline.
- `backend/receiving/models.py` — `WarehouseReceiptLine` holds the physical
  dimensions (`length`, `width`, `height`, `weight`, `pieces`). Pre-computed
  `volume_cf` on the line is already available if we want to use it.
- `backend/consolidation/models.py` — `Consolidation` is where
  pricing-snapshot fields (`chargeable_weight_snapshot`,
  `rate_snapshot_json`, etc.) would live in v2.
- `backend/consolidation/serializers.py` — would expose snapshotted pricing
  data on read after v2.
- *(new in v2)* Some rate model / admin UI for configuring $/lb and
  $/pvol-unit rates per associate company (or wherever rates are decided to
  live).
