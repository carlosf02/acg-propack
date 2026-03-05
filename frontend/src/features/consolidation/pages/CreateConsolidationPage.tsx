import { useState, useEffect } from "react";
import { ConsolidationFormData } from "../types";
import "./CreateConsolidationPage.css";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ShippingType = "All" | "Air" | "Sea" | "Ground";
type SearchField = "all" | "warehouseNumber" | "trackingNumber" | "sender" | "destination";

type WarehouseRecord = {
    id: string;
    warehouseNumber: string;
    trackingNumber: string;
    sender: string;
    destination: string;
    shippingType: Exclude<ShippingType, "All">;
    agency: string;
    createdAt: string;
    pieces: number;
    weight: number;
    volume: number;
};

// ─── Placeholder data (swap for API call when ready) ──────────────────────────

const availableWarehouses: WarehouseRecord[] = [];

const AGENCY_OPTIONS: string[] = [];

const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
    all: "All Fields",
    warehouseNumber: "Warehouse #",
    trackingNumber: "Tracking #",
    sender: "Sender",
    destination: "Destination",
};

const SHIPPING_BADGE_CLASS: Record<Exclude<ShippingType, "All">, string> = {
    Air: "ccp-badge-air",
    Sea: "ccp-badge-sea",
    Ground: "ccp-badge-ground",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CreateConsolidationPage() {
    // ── Details form state ─────────────────────────────────────────────────────
    const [formData, setFormData] = useState<ConsolidationFormData>({
        agency: "",
        shippingMethod: "",
        type: "",
        notes: "",
        sendingOffice: "",
        receivingOffice: "",
    });

    // ── Warehouse picker state ─────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState("");
    const [searchField, setSearchField] = useState<SearchField>("all");
    const [fromDate, setFromDate] = useState("");
    const [untilDate, setUntilDate] = useState("");
    const [shippingType, setShippingType] = useState<ShippingType>("All");
    const [agency, setAgency] = useState("All");
    const [rowsPerPage, setRowsPerPage] = useState("10");
    const [currentPage, setCurrentPage] = useState(1);

    // Set of selected warehouse IDs
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, searchField, fromDate, untilDate, shippingType, agency, rowsPerPage]);

    // ── Details handlers ───────────────────────────────────────────────────────
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Consolidation data:", formData);
        console.log("Selected warehouse IDs:", [...selectedIds]);
    };

    // ── Warehouse selection ────────────────────────────────────────────────────
    const toggleWarehouse = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // ── Filtering ─────────────────────────────────────────────────────────────
    const filtered = availableWarehouses.filter((wh) => {
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            if (searchField === "all") {
                const ok =
                    wh.warehouseNumber.toLowerCase().includes(term) ||
                    wh.trackingNumber.toLowerCase().includes(term) ||
                    wh.sender.toLowerCase().includes(term) ||
                    wh.destination.toLowerCase().includes(term);
                if (!ok) return false;
            } else {
                const val = wh[searchField]?.toString().toLowerCase() ?? "";
                if (!val.includes(term)) return false;
            }
        }
        if (fromDate && wh.createdAt < fromDate) return false;
        if (untilDate && wh.createdAt > untilDate) return false;
        if (shippingType !== "All" && wh.shippingType !== shippingType) return false;
        if (agency !== "All" && wh.agency !== agency) return false;
        return true;
    });

    // ── Pagination ─────────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filtered.length / Number(rowsPerPage)));
    const paginated = filtered.slice(
        (currentPage - 1) * Number(rowsPerPage),
        currentPage * Number(rowsPerPage)
    );

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    const renderPageButtons = () => {
        const buttons = [];
        for (let i = 1; i <= totalPages; i++) {
            buttons.push(
                <button
                    key={i}
                    type="button"
                    className={`ccp-page-btn ${currentPage === i ? "ccp-page-active" : ""}`}
                    onClick={() => handlePageChange(i)}
                >
                    {i}
                </button>
            );
        }
        return buttons;
    };

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="ccp-container">
            {/* Page header */}
            <div className="ccp-header">
                <div>
                    <h2>Create Consolidation</h2>
                </div>
                <div className="ccp-header-actions">
                    <button type="button" className="ccp-btn ccp-btn-secondary">
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="ccp-btn ccp-btn-primary"
                        onClick={handleSubmit}
                    >
                        Save Consolidation
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* ── Details card ── */}
                <div className="ccp-card">
                    <div className="ccp-section-header">
                        <h3 className="ccp-section-title">Details</h3>
                    </div>

                    {/* Row 1 — Agency, Shipping Method, Type */}
                    <div className="ccp-grid-3">
                        <div className="ccp-field">
                            <label className="ccp-label" htmlFor="agency">
                                Agency
                            </label>
                            <select
                                id="agency"
                                name="agency"
                                value={formData.agency}
                                onChange={handleChange}
                                className="ccp-select"
                            >
                                <option value="">Select an agency…</option>
                            </select>
                        </div>

                        <div className="ccp-field">
                            <label className="ccp-label" htmlFor="shippingMethod">
                                Shipping Method
                            </label>
                            <select
                                id="shippingMethod"
                                name="shippingMethod"
                                value={formData.shippingMethod}
                                onChange={handleChange}
                                className="ccp-select"
                            >
                                <option value="">Select…</option>
                                <option value="air">Air</option>
                                <option value="sea">Sea</option>
                                <option value="ground">Ground</option>
                            </select>
                        </div>

                        <div className="ccp-field">
                            <label className="ccp-label" htmlFor="type">
                                Type
                            </label>
                            <select
                                id="type"
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="ccp-select"
                            >
                                <option value="">Select…</option>
                                <option value="standard">Standard</option>
                                <option value="express">Express</option>
                                <option value="refrigerated">Refrigerated</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 2 — Sending Office, Receiving Office */}
                    <div className="ccp-grid-2">
                        <div className="ccp-field">
                            <label className="ccp-label" htmlFor="sendingOffice">
                                Sending Office
                            </label>
                            <select
                                id="sendingOffice"
                                name="sendingOffice"
                                value={formData.sendingOffice}
                                onChange={handleChange}
                                className="ccp-select"
                            >
                                <option value="">Select sending office…</option>
                            </select>
                        </div>

                        <div className="ccp-field">
                            <label className="ccp-label" htmlFor="receivingOffice">
                                Receiving Office
                            </label>
                            <select
                                id="receivingOffice"
                                name="receivingOffice"
                                value={formData.receivingOffice}
                                onChange={handleChange}
                                className="ccp-select"
                            >
                                <option value="">Select receiving office…</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 3 — Additional Notes */}
                    <div className="ccp-field ccp-field-full">
                        <label className="ccp-label" htmlFor="notes">
                            Additional Notes
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            className="ccp-textarea"
                            placeholder="Add any additional notes or instructions for this consolidation…"
                        />
                    </div>
                </div>

                {/* ── Add Warehouses card ── */}
                <div className="ccp-card">
                    <div className="ccp-section-header">
                        <h3 className="ccp-section-title">Add Warehouses</h3>
                        {selectedIds.size > 0 && (
                            <span className="ccp-selected-badge">
                                {selectedIds.size} selected
                            </span>
                        )}
                    </div>

                    {/* Search row */}
                    <div className="ccp-search-row">
                        <div className="ccp-search-field">
                            <label className="ccp-wh-label">Search</label>
                            <input
                                type="search"
                                className="ccp-input"
                                placeholder={`Search by ${SEARCH_FIELD_LABELS[searchField]}…`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="ccp-search-by-field">
                            <label className="ccp-wh-label">Search by</label>
                            <select
                                className="ccp-select"
                                value={searchField}
                                onChange={(e) => setSearchField(e.target.value as SearchField)}
                            >
                                <option value="all">All Fields</option>
                                <option value="warehouseNumber">Warehouse #</option>
                                <option value="trackingNumber">Tracking #</option>
                                <option value="sender">Sender</option>
                                <option value="destination">Destination</option>
                            </select>
                        </div>
                    </div>

                    <hr className="ccp-section-divider" />

                    {/* Filters row */}
                    <div className="ccp-filters-row">
                        <div className="ccp-filter-group">
                            <label className="ccp-wh-label">From</label>
                            <input
                                type="date"
                                className="ccp-input"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className="ccp-filter-group">
                            <label className="ccp-wh-label">Until</label>
                            <input
                                type="date"
                                className="ccp-input"
                                value={untilDate}
                                onChange={(e) => setUntilDate(e.target.value)}
                            />
                        </div>
                        <div className="ccp-filter-group">
                            <label className="ccp-wh-label">Shipping Type</label>
                            <select
                                className="ccp-select"
                                value={shippingType}
                                onChange={(e) => setShippingType(e.target.value as ShippingType)}
                            >
                                <option value="All">All Types</option>
                                <option value="Air">Air</option>
                                <option value="Sea">Sea</option>
                                <option value="Ground">Ground</option>
                            </select>
                        </div>
                        <div className="ccp-filter-group">
                            <label className="ccp-wh-label">Agency</label>
                            <select
                                className="ccp-select"
                                value={agency}
                                onChange={(e) => setAgency(e.target.value)}
                            >
                                <option value="All">All Agencies</option>
                                {AGENCY_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="ccp-table-responsive">
                        <table className="ccp-wh-table">
                            <thead>
                                <tr>
                                    <th>Warehouse #</th>
                                    <th>Tracking #</th>
                                    <th>Sender</th>
                                    <th>Destination</th>
                                    <th>Type</th>
                                    <th>Agency</th>
                                    <th>Date</th>
                                    <th>Pcs</th>
                                    <th>Weight</th>
                                    <th>Volume</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length > 0 ? (
                                    paginated.map((wh, index) => {
                                        const isSelected = selectedIds.has(wh.id);
                                        return (
                                            <tr
                                                key={wh.id}
                                                className={
                                                    isSelected
                                                        ? "ccp-row-selected"
                                                        : index % 2 === 0
                                                            ? "ccp-row-even"
                                                            : "ccp-row-odd"
                                                }
                                            >
                                                <td>
                                                    <div className="ccp-wh-number">{wh.warehouseNumber}</div>
                                                </td>
                                                <td>
                                                    <div className="ccp-wh-tracking">{wh.trackingNumber}</div>
                                                </td>
                                                <td>{wh.sender}</td>
                                                <td>{wh.destination}</td>
                                                <td>
                                                    <span className={`ccp-badge ${SHIPPING_BADGE_CLASS[wh.shippingType]}`}>
                                                        {wh.shippingType}
                                                    </span>
                                                </td>
                                                <td>{wh.agency}</td>
                                                <td>{wh.createdAt}</td>
                                                <td>{wh.pieces}</td>
                                                <td>{wh.weight} lb</td>
                                                <td>{wh.volume} in³</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className={
                                                            isSelected
                                                                ? "ccp-action-btn ccp-action-remove"
                                                                : "ccp-action-btn ccp-action-add"
                                                        }
                                                        onClick={() => toggleWarehouse(wh.id)}
                                                    >
                                                        {isSelected ? "Remove" : "Add"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={11}
                                            style={{
                                                textAlign: "center",
                                                padding: "40px",
                                                color: "#9ca3af",
                                            }}
                                        >
                                            No unconsolidated warehouses found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination footer */}
                    <div className="ccp-pagination-footer">
                        <div className="ccp-rows-selector">
                            <span>Show up to</span>
                            <select
                                className="ccp-select ccp-select-inline"
                                value={rowsPerPage}
                                onChange={(e) => setRowsPerPage(e.target.value)}
                            >
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                            </select>
                            <span>per page</span>
                        </div>
                        <div className="ccp-pagination-controls">
                            <button
                                type="button"
                                className="ccp-page-btn ccp-page-arrow"
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage === 1}
                            >
                                &laquo;
                            </button>
                            <button
                                type="button"
                                className="ccp-page-btn ccp-page-arrow"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                &lsaquo;
                            </button>
                            {renderPageButtons()}
                            <button
                                type="button"
                                className="ccp-page-btn ccp-page-arrow"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                &rsaquo;
                            </button>
                            <button
                                type="button"
                                className="ccp-page-btn ccp-page-arrow"
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages}
                            >
                                &raquo;
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
