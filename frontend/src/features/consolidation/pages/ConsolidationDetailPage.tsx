// TODO(pricing-v2): This is the demo version of consolidation
// pricing — volumetric/weight math only, no dollar rates, no
// per-item billing optimization. See docs/future_work.md for
// the full scope of what needs to change to finish this feature.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
    addItemToConsolidation,
    closeConsolidation,
    getConsolidation,
    removeItemFromConsolidation,
} from "../consolidation.api";
import { Consolidation } from "../types";
import { getWarehouseReceipt, listWarehouseReceipts } from "../../receiving/receiving.api";
import { WarehouseReceipt } from "../../receiving/types";
import { useAuth } from "../../auth/AuthContext";
import { ApiError } from "../../../api/client";
import "./ConsolidationDetailPage.css";

// TODO(pricing-v2): hardcoded divisors. Real pricing uses per-admin
// configured rates (e.g. per-associate-company or per-consolidation)
// and may differ from industry-standard 166 / 1728.
const PVOL_DIVISOR_AIR = 166;
const PVOL_DIVISOR_SEA = 1728;

const STATUS_BADGE_CLASS: Record<string, string> = {
    DRAFT: "cdp-status-draft",
    OPEN: "cdp-status-open",
    CLOSED: "cdp-status-closed",
};

const SHIPPING_BADGE_CLASS: Record<"air" | "sea" | "ground", string> = {
    air: "cdp-badge-air",
    sea: "cdp-badge-sea",
    ground: "cdp-badge-ground",
};

function formatDate(iso?: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function ConsolidationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();

    const [consolidation, setConsolidation] = useState<Consolidation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [items, setItems] = useState<WarehouseReceipt[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [itemsError, setItemsError] = useState("");

    const [addedItems, setAddedItems] = useState<WarehouseReceipt[]>([]);
    const [addedItemsLoading, setAddedItemsLoading] = useState(false);
    const [addedItemsError, setAddedItemsError] = useState("");

    const [pendingItemIds, setPendingItemIds] = useState<Set<number>>(new Set());
    const [mutationError, setMutationError] = useState("");
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (!id) return;
        let isMounted = true;
        setLoading(true);
        setError("");

        getConsolidation(Number(id))
            .then((data) => {
                if (!isMounted) return;
                setConsolidation(data);
            })
            .catch((err) => {
                if (!isMounted) return;
                console.error("Failed to fetch consolidation:", err);
                if (err instanceof ApiError && err.status === 404) {
                    setError("Consolidation not found.");
                } else {
                    setError("Failed to load consolidation. Please try again later.");
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [id]);

    const refetchItems = useCallback(async (consolidationId: number) => {
        setItemsLoading(true);
        setItemsError("");
        try {
            const res = await listWarehouseReceipts({
                eligible_for: "consolidation",
                consolidation_id: consolidationId,
            });
            setItems(Array.isArray(res) ? res : res.results);
        } catch (err) {
            console.error("Failed to fetch eligible items:", err);
            setItemsError("Failed to load eligible warehouses and repacks.");
        } finally {
            setItemsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!consolidation) return;
        let isMounted = true;
        setItemsLoading(true);
        setItemsError("");

        listWarehouseReceipts({
            eligible_for: "consolidation",
            consolidation_id: consolidation.id,
        })
            .then((res) => {
                if (!isMounted) return;
                setItems(Array.isArray(res) ? res : res.results);
            })
            .catch((err) => {
                if (!isMounted) return;
                console.error("Failed to fetch eligible items:", err);
                setItemsError("Failed to load eligible warehouses and repacks.");
            })
            .finally(() => {
                if (isMounted) setItemsLoading(false);
            });

        return () => { isMounted = false; };
    }, [consolidation?.id]);

    const addedIds = useMemo(
        () => new Set(consolidation?.warehouse_receipt_ids ?? []),
        [consolidation]
    );

    // Fetch full WR details for every item in this consolidation by ID so the
    // pricing calculation works even if an item would no longer match the
    // eligibility query (e.g. a closed consolidation whose items later got
    // shipped, or if any filter criterion drifted post-add).
    const addedIdsKey = useMemo(
        () => (consolidation?.warehouse_receipt_ids ?? []).slice().sort((a, b) => a - b).join(","),
        [consolidation]
    );
    useEffect(() => {
        if (!consolidation) return;
        const ids = consolidation.warehouse_receipt_ids ?? [];
        if (ids.length === 0) {
            setAddedItems([]);
            setAddedItemsError("");
            setAddedItemsLoading(false);
            return;
        }
        let isMounted = true;
        setAddedItemsLoading(true);
        setAddedItemsError("");
        Promise.all(ids.map((wrId) => getWarehouseReceipt(wrId)))
            .then((results) => {
                if (!isMounted) return;
                setAddedItems(results);
            })
            .catch((err) => {
                if (!isMounted) return;
                console.error("Failed to fetch added consolidation items:", err);
                setAddedItemsError("Failed to load pricing details.");
            })
            .finally(() => {
                if (isMounted) setAddedItemsLoading(false);
            });
        return () => { isMounted = false; };
    }, [consolidation, addedIdsKey]);

    // TODO(pricing-v2): real pricing uses per-admin rates for $/lb vs
    // $/pvol-unit, and picks the more profitable option per-item to
    // maximize admin revenue. This demo only aggregates totals and takes
    // max(actual, pvol) across the whole consolidation.
    const pricingTotals = useMemo(() => {
        const shipType = consolidation?.ship_type;
        if (shipType !== "AIR" && shipType !== "SEA") {
            return null;
        }
        const divisor = shipType === "AIR" ? PVOL_DIVISOR_AIR : PVOL_DIVISOR_SEA;
        let totalActual = 0;
        let totalPvol = 0;
        for (const wr of addedItems) {
            for (const line of wr.lines ?? []) {
                const weight = parseFloat(line.weight ?? "");
                if (!Number.isNaN(weight)) totalActual += weight;
                const l = parseFloat(line.length ?? "");
                const w = parseFloat(line.width ?? "");
                const h = parseFloat(line.height ?? "");
                if (!Number.isNaN(l) && !Number.isNaN(w) && !Number.isNaN(h)) {
                    totalPvol += (l * w * h) / divisor;
                }
            }
        }
        return {
            totalActual,
            totalPvol,
            chargeable: Math.max(totalActual, totalPvol),
        };
    }, [consolidation?.ship_type, addedItems]);

    const handleToggleItem = useCallback(
        async (wrId: number, currentlyIn: boolean) => {
            if (!consolidation) return;
            if (consolidation.status === "CLOSED") return;
            if (pendingItemIds.has(wrId)) return;

            setMutationError("");
            setPendingItemIds((prev) => {
                const next = new Set(prev);
                next.add(wrId);
                return next;
            });

            try {
                const updated = currentlyIn
                    ? await removeItemFromConsolidation(consolidation.id, wrId)
                    : await addItemToConsolidation(consolidation.id, wrId);
                setConsolidation(updated);
                await refetchItems(consolidation.id);
            } catch (err) {
                console.error("Failed to toggle item:", err);
                if (err instanceof ApiError) {
                    setMutationError(err.message);
                } else {
                    setMutationError("Failed to update item. Please try again.");
                }
            } finally {
                setPendingItemIds((prev) => {
                    const next = new Set(prev);
                    next.delete(wrId);
                    return next;
                });
            }
        },
        [consolidation, pendingItemIds, refetchItems]
    );

    const handleClose = useCallback(async () => {
        if (!consolidation) return;
        if (consolidation.status !== "OPEN") return;
        if (closing) return;

        if (!window.confirm("Close this consolidation? This cannot be undone.")) {
            return;
        }

        setMutationError("");
        setClosing(true);
        try {
            const updated = await closeConsolidation(consolidation.id);
            setConsolidation(updated);
            await refetchItems(consolidation.id);
        } catch (err) {
            console.error("Failed to close consolidation:", err);
            if (err instanceof ApiError) {
                setMutationError(err.message);
            } else {
                setMutationError("Failed to close consolidation. Please try again.");
            }
        } finally {
            setClosing(false);
        }
    }, [consolidation, closing, refetchItems]);

    if (loading) {
        return <div className="cdp-state-message">Loading consolidation…</div>;
    }

    if (error || !consolidation) {
        return (
            <div className="cdp-state-message cdp-state-error">
                {error || "Consolidation not found."}
            </div>
        );
    }

    const title = consolidation.reference_code || `Consolidation #${consolidation.id}`;
    const statusClass = STATUS_BADGE_CLASS[consolidation.status] || "cdp-status-draft";
    const statusLabel = consolidation.status_display || consolidation.status;
    const isClosed = consolidation.status === "CLOSED";
    const isOpen = consolidation.status === "OPEN";
    const closeDisabledReason = isClosed
        ? "Consolidation is already closed"
        : !isOpen
            ? "Add at least one item to open this consolidation before closing"
            : "";

    const agency = consolidation.associate_company_name || `#${consolidation.associate_company}`;
    const shippingMethod = consolidation.ship_type_display || consolidation.ship_type;
    const type = consolidation.consolidation_type;
    const sendingOffice = consolidation.sending_office_name || `#${consolidation.sending_office}`;
    const receivingOffice = consolidation.receiving_office_name || `#${consolidation.receiving_office}`;
    const createdAt = formatDate(consolidation.created_at);
    const notes = consolidation.note;

    return (
        <div className="cdp-container">
            <div className="cdp-header">
                <div className="cdp-title-group">
                    <h2>{title}</h2>
                    <span className={`cdp-status-badge ${statusClass}`}>
                        {statusLabel}
                    </span>
                </div>
                <div className="cdp-header-actions">
                    <button
                        type="button"
                        className="cdp-close-btn"
                        onClick={handleClose}
                        disabled={!isOpen || closing}
                        title={closeDisabledReason || "Close this consolidation"}
                    >
                        {closing ? "Closing…" : "Close Consolidation"}
                    </button>
                </div>
            </div>

            {mutationError && (
                <div className="cdp-mutation-error">{mutationError}</div>
            )}

            <div className="cdp-card">
                <div className="cdp-section-header">
                    <h3 className="cdp-section-title">Details</h3>
                </div>

                <div className="cdp-grid-2">
                    <div className="cdp-field">
                        <div className="cdp-label">Agency</div>
                        <div className="cdp-value">{agency}</div>
                    </div>

                    <div className="cdp-field">
                        <div className="cdp-label">Shipping Method</div>
                        <div className="cdp-value">{shippingMethod}</div>
                    </div>

                    <div className="cdp-field">
                        <div className="cdp-label">Type</div>
                        <div className={`cdp-value ${type ? "" : "cdp-value-muted"}`}>
                            {type || "—"}
                        </div>
                    </div>

                    <div className="cdp-field">
                        <div className="cdp-label">Created</div>
                        <div className="cdp-value">{createdAt}</div>
                    </div>

                    <div className="cdp-field">
                        <div className="cdp-label">Sending Office</div>
                        <div className="cdp-value">{sendingOffice}</div>
                    </div>

                    <div className="cdp-field">
                        <div className="cdp-label">Receiving Office</div>
                        <div className="cdp-value">{receivingOffice}</div>
                    </div>

                    <div className="cdp-field cdp-field-full">
                        <div className="cdp-label">Notes</div>
                        <div className={`cdp-value ${notes ? "" : "cdp-value-muted"}`}>
                            {notes || "—"}
                        </div>
                    </div>
                </div>
            </div>

            <div className="cdp-card">
                <div className="cdp-section-header">
                    <h3 className="cdp-section-title">Pricing Summary</h3>
                </div>

                {addedItemsLoading ? (
                    <div className="cdp-items-loading">Calculating…</div>
                ) : addedItemsError ? (
                    <div className="cdp-items-loading cdp-state-error">{addedItemsError}</div>
                ) : consolidation.ship_type === "GROUND" ? (
                    // TODO(pricing-v2): ground consolidation pricing rules need
                    // industry research + product decision before we can compute
                    // chargeable weight here.
                    <div className="cdp-value cdp-value-muted">
                        N/A — pricing not yet configured for ground consolidations
                    </div>
                ) : pricingTotals ? (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "16px",
                    }}>
                        {[
                            { label: "Total Volumetric Weight (lb)", value: pricingTotals.totalPvol.toFixed(2) },
                            { label: "Total Actual Weight (lb)", value: pricingTotals.totalActual.toFixed(2) },
                            { label: "Chargeable Weight (lb)", value: pricingTotals.chargeable.toFixed(2) },
                        ].map((stat) => (
                            <div key={stat.label} style={{ background: "white", padding: "16px", borderRadius: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                                <div style={{ fontSize: "13px", color: "#666", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase" }}>{stat.label}</div>
                                <div style={{ fontSize: "24px", color: "#1a1a1a", fontWeight: 700 }}>{stat.value}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="cdp-value cdp-value-muted">—</div>
                )}
            </div>

            <div className="cdp-card">
                <div className="cdp-section-header">
                    <h3 className="cdp-section-title">Warehouses and Repacks</h3>
                </div>

                <div className="cdp-table-responsive">
                    {itemsLoading ? (
                        <div className="cdp-items-loading">Loading items…</div>
                    ) : itemsError ? (
                        <div className="cdp-items-loading cdp-state-error">{itemsError}</div>
                    ) : (
                        <table className="cdp-items-table">
                            <thead>
                                <tr>
                                    <th>Item #</th>
                                    <th>Sender</th>
                                    <th>Receiver</th>
                                    <th>Destination</th>
                                    <th>Method</th>
                                    <th>Agency</th>
                                    <th>Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length > 0 ? (
                                    items.map((wh, index) => {
                                        const isInThisConsolidation = addedIds.has(wh.id);
                                        const method = wh.shipping_method;
                                        const isPending = pendingItemIds.has(wh.id);
                                        const disabled = isClosed || isPending;
                                        const buttonTitle = isClosed
                                            ? "Consolidation is closed"
                                            : isPending
                                                ? "Working…"
                                                : isInThisConsolidation
                                                    ? "Remove item"
                                                    : "Add item";
                                        return (
                                            <tr
                                                key={wh.id}
                                                className={index % 2 === 0 ? "cdp-row-even" : "cdp-row-odd"}
                                            >
                                                <td>
                                                    <div className="cdp-wh-number">{wh.wr_number ?? `#${wh.id}`}</div>
                                                </td>
                                                <td>{wh.client_details?.name ?? "—"}</td>
                                                <td>{wh.recipient_name ?? "—"}</td>
                                                <td>{wh.client_details?.city ?? "—"}</td>
                                                <td>
                                                    {method ? (
                                                        <span className={`cdp-badge ${SHIPPING_BADGE_CLASS[method]}`}>
                                                            {method.charAt(0).toUpperCase() + method.slice(1)}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: "#9ca3af" }}>—</span>
                                                    )}
                                                </td>
                                                <td>{wh.associate_company_details?.name ?? user?.company?.name ?? "—"}</td>
                                                <td>{wh.received_at?.slice(0, 10) ?? "—"}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        aria-label={isInThisConsolidation ? "Remove item" : "Add item"}
                                                        title={buttonTitle}
                                                        onClick={() => handleToggleItem(wh.id, isInThisConsolidation)}
                                                        disabled={disabled}
                                                        style={{
                                                            width: 32,
                                                            height: 32,
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            borderRadius: 6,
                                                            border: "none",
                                                            cursor: isClosed
                                                                ? "not-allowed"
                                                                : isPending
                                                                    ? "wait"
                                                                    : "pointer",
                                                            fontSize: 20,
                                                            fontWeight: 700,
                                                            lineHeight: 1,
                                                            color: "white",
                                                            background: isInThisConsolidation ? "#dc2626" : "#16a34a",
                                                            opacity: isClosed ? 0.5 : isPending ? 0.6 : 1,
                                                        }}
                                                    >
                                                        {isInThisConsolidation ? "−" : "+"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="cdp-empty-row">
                                            No eligible warehouses or repacks to add.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
