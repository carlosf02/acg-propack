import { useState, useEffect } from "react";
import "../../consolidation/pages/CreateConsolidationPage.css";

// ─── Shared Types ────────────────────────────────────────────────────────────

interface RepackFormData {
    date: string;
    type: string;
    tracking: string;
    description: string;
    value: number | "";
    length: number | "";
    width: number | "";
    height: number | "";
    weight: number | "";
    volume: number;
}

const INITIAL_REPACK: RepackFormData = {
    date: new Date().toISOString().split("T")[0],
    type: "",
    tracking: "",
    description: "",
    value: "",
    length: "",
    width: "",
    height: "",
    weight: "",
    volume: 0,
};

// ─── Warehouse picker types & placeholder data ────────────────────────────────

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
    weight: number;
    volume: number;
    value: number;
};

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

// ─── Shared Action Button ────────────────────────────────────────────────────

const ActionButton = ({
    onClick,
    color,
    icon,
    title,
}: {
    onClick: () => void;
    color: string;
    icon: React.ReactNode;
    title: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "4px",
            background: color,
            color: "white",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
        }}
    >
        {icon}
    </button>
);

// ─── New Package Table ────────────────────────────────────────────────────────

function NewPackageTable({
    rows,
    onChange,
}: {
    rows: RepackFormData[];
    onChange: (index: number, field: keyof RepackFormData, value: any) => void;
}) {
    const inputStyle: React.CSSProperties = {
        padding: "6px",
        border: "1px solid #ddd",
        borderRadius: "4px",
        width: "100%",
        boxSizing: "border-box",
        fontSize: "13px",
    };

    return (
        <div
            style={{
                overflowX: "auto",
                background: "white",
                borderRadius: "8px",
                border: "1px solid #eee",
                width: "100%",
            }}
        >
            <style>{`
                input[type=number]::-webkit-inner-spin-button,
                input[type=number]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
            <table
                style={{
                    width: "100%",
                    minWidth: "1100px",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                }}
            >
                <thead>
                    <tr
                        style={{
                            background: "#f8f9fa",
                            borderBottom: "2px solid #ddd",
                            textAlign: "center",
                        }}
                    >
                        <th style={{ padding: "10px 8px", width: "11%" }}>Date</th>
                        <th style={{ padding: "10px 8px", width: "10%" }}>Type</th>
                        <th style={{ padding: "10px 8px", width: "11%" }}>Tracking</th>
                        <th style={{ padding: "10px 8px", width: "20%" }}>Description</th>
                        <th style={{ padding: "10px 8px", width: "8%" }}>Value ($)</th>
                        <th style={{ padding: "10px 8px", width: "6%", textAlign: "center" }}>L (in)</th>
                        <th style={{ padding: "10px 8px", width: "6%", textAlign: "center" }}>W (in)</th>
                        <th style={{ padding: "10px 8px", width: "6%", textAlign: "center" }}>H (in)</th>
                        <th style={{ padding: "10px 8px", width: "7%", textAlign: "center" }}>Weight</th>
                        <th style={{ padding: "10px 8px", width: "7%", textAlign: "center" }}>Vol (CF)</th>
                        <th style={{ padding: "10px 8px", width: "5%", textAlign: "center" }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr
                            key={index}
                            style={{ borderBottom: "1px solid #eee", verticalAlign: "middle" }}
                        >
                            <td style={{ padding: "8px" }}>
                                <input
                                    type="date"
                                    value={row.date}
                                    onChange={(e) => onChange(index, "date", e.target.value)}
                                    style={inputStyle}
                                />
                            </td>

                            <td style={{ padding: "8px" }}>
                                <select
                                    value={row.type}
                                    onChange={(e) => onChange(index, "type", e.target.value)}
                                    style={{ ...inputStyle, background: "white" }}
                                >
                                    <option value="">Select Type...</option>
                                    <option value="box">Box</option>
                                    <option value="envelope">Envelope</option>
                                    <option value="backpack/bag">Backpack/Bag</option>
                                    <option value="pallet">Pallet</option>
                                    <option value="suitcase">Suitcase</option>
                                    <option value="plastic box">Plastic Box</option>
                                    <option value="cooler">Cooler</option>
                                    <option value="equipment">Equipment</option>
                                </select>
                            </td>
                            <td style={{ padding: "8px" }}>
                                <input
                                    type="text"
                                    placeholder="Tracking"
                                    value={row.tracking}
                                    onChange={(e) => onChange(index, "tracking", e.target.value)}
                                    style={inputStyle}
                                />
                            </td>
                            <td style={{ padding: "8px" }}>
                                <input
                                    type="text"
                                    placeholder="Description"
                                    value={row.description}
                                    onChange={(e) => onChange(index, "description", e.target.value)}
                                    style={{ ...inputStyle, minWidth: "150px" }}
                                />
                            </td>
                            <td style={{ padding: "8px" }}>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={row.value}
                                    onChange={(e) => onChange(index, "value", e.target.value)}
                                    style={inputStyle}
                                />
                            </td>
                            <td style={{ padding: "8px" }}>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={row.length}
                                    onChange={(e) => onChange(index, "length", e.target.value)}
                                    style={{ ...inputStyle, textAlign: "center" }}
                                />
                            </td>
                            <td style={{ padding: "8px" }}>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={row.width}
                                    onChange={(e) => onChange(index, "width", e.target.value)}
                                    style={{ ...inputStyle, textAlign: "center" }}
                                />
                            </td>
                            <td style={{ padding: "8px" }}>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={row.height}
                                    onChange={(e) => onChange(index, "height", e.target.value)}
                                    style={{ ...inputStyle, textAlign: "center" }}
                                />
                            </td>
                            <td style={{ padding: "8px" }}>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={row.weight}
                                    onChange={(e) => onChange(index, "weight", e.target.value)}
                                    style={{ ...inputStyle, textAlign: "center" }}
                                />
                            </td>
                            <td
                                style={{
                                    padding: "8px",
                                    textAlign: "center",
                                    fontWeight: 600,
                                    color: "#555",
                                    background: "#f8f9fa",
                                }}
                            >
                                {row.volume.toFixed(2)}
                            </td>
                            <td style={{ padding: "8px" }}>
                                <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                    <ActionButton
                                        onClick={() => alert("Takes a picture of this package (Placeholder)")}
                                        color="rgb(241, 158, 57)"
                                        title="Take Photo"
                                        icon={
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                                                <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                                                    <path d="M5 7h1a2 2 0 0 0 2-2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2" />
                                                    <path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0-6 0" />
                                                </g>
                                            </svg>
                                        }
                                    />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateRepackingPage() {
    const [rows, setRows] = useState<RepackFormData[]>([{ ...INITIAL_REPACK }]);

    const handleChange = (index: number, field: keyof RepackFormData, value: any) => {
        setRows((prev) => {
            const updated = [...prev];
            const row = { ...updated[index], [field]: value };

            if (field === "length" || field === "width" || field === "height") {
                const l = Number(row.length) || 0;
                const w = Number(row.width) || 0;
                const h = Number(row.height) || 0;
                row.volume = (l * w * h) / 1728;
            }

            updated[index] = row;
            return updated;
        });
    };

    // ── Warehouse picker state ────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState("");
    const [searchField, setSearchField] = useState<SearchField>("all");
    const [fromDate, setFromDate] = useState("");
    const [untilDate, setUntilDate] = useState("");
    const [shippingType, setShippingType] = useState<ShippingType>("All");
    const [agency, setAgency] = useState("All");
    const [rowsPerPage, setRowsPerPage] = useState("10");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, searchField, fromDate, untilDate, shippingType, agency, rowsPerPage]);

    // Sync value & weight from selected warehouses into the repack row
    useEffect(() => {
        const selected = availableWarehouses.filter((wh) => selectedIds.has(wh.id));
        const totalWeight = selected.reduce((sum, wh) => sum + wh.weight, 0);
        const totalValue = selected.reduce((sum, wh) => sum + wh.value, 0);
        setRows((prev) => {
            const updated = [...prev];
            updated[0] = {
                ...updated[0],
                weight: selectedIds.size > 0 ? totalWeight : "",
                value: selectedIds.size > 0 ? totalValue : "",
            };
            return updated;
        });
    }, [selectedIds]);

    // ── Warehouse picker helpers ──────────────────────────────────────────────
    const toggleWarehouse = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

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
    return (
        <div style={{ padding: "0 0 40px 0" }}>
            {/* ── Page header ── */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "24px",
                }}
            >
                <h1 style={{ margin: 0, fontSize: "28px", color: "#1a1a1a" }}>
                    Create Repack
                </h1>
                <div style={{ display: "flex", gap: "12px" }}>
                    <button
                        style={{
                            padding: "10px 20px",
                            background: "white",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: 600,
                            color: "#555",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        style={{
                            padding: "10px 24px",
                            background: "#0052cc",
                            border: "none",
                            borderRadius: "6px",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: 600,
                        }}
                    >
                        Save Repack
                    </button>
                </div>
            </div>

            {/* ── Section 1: New Package Details ── */}
            <div
                style={{
                    background: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    marginBottom: "24px",
                }}
            >
                {/* Section header */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid #eee",
                        paddingBottom: "12px",
                        marginBottom: "20px",
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: "20px", color: "#333" }}>
                        New Package Details
                    </h2>
                </div>

                <NewPackageTable
                    rows={rows}
                    onChange={handleChange}
                />

                {/* Totals bar */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "24px",
                        marginTop: "16px",
                        paddingTop: "12px",
                        borderTop: "1px solid #eee",
                        fontSize: "13px",
                        color: "#555",
                        fontWeight: 600,
                    }}
                >

                    <span>
                        Total Weight:{" "}
                        <strong style={{ color: "#1a1a1a" }}>
                            {rows.reduce((sum, r) => sum + (Number(r.weight) || 0), 0).toFixed(2)}
                        </strong>
                    </span>
                    <span>
                        Total Vol (CF):{" "}
                        <strong style={{ color: "#1a1a1a" }}>
                            {rows.reduce((sum, r) => sum + r.volume, 0).toFixed(2)}
                        </strong>
                    </span>
                    <span>
                        Total Value ($):{" "}
                        <strong style={{ color: "#1a1a1a" }}>
                            {rows.reduce((sum, r) => sum + (Number(r.value) || 0), 0).toFixed(2)}
                        </strong>
                    </span>
                </div>
            </div>
            {/* ── Section 2: Add Warehouses ── */}
            <div className="ccp-card">
                <div className="ccp-section-header">
                    <h3 className="ccp-section-title">Add Warehouses</h3>
                    {selectedIds.size > 0 && (
                        <span className="ccp-selected-badge">{selectedIds.size} selected</span>
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
                                <option key={opt} value={opt}>{opt}</option>
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
                                <th>Weight</th>
                                <th>Value ($)</th>
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
                                            <td><div className="ccp-wh-number">{wh.warehouseNumber}</div></td>
                                            <td><div className="ccp-wh-tracking">{wh.trackingNumber}</div></td>
                                            <td>{wh.sender}</td>
                                            <td>{wh.destination}</td>
                                            <td>
                                                <span className={`ccp-badge ${SHIPPING_BADGE_CLASS[wh.shippingType]}`}>
                                                    {wh.shippingType}
                                                </span>
                                            </td>
                                            <td>{wh.agency}</td>
                                            <td>{wh.createdAt}</td>
                                            <td>{wh.weight} lb</td>
                                            <td>${wh.value.toFixed(2)}</td>
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
                                        colSpan={10}
                                        style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}
                                    >
                                        No repackable warehouses found.
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
                        <button type="button" className="ccp-page-btn ccp-page-arrow" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>&laquo;</button>
                        <button type="button" className="ccp-page-btn ccp-page-arrow" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>&lsaquo;</button>
                        {renderPageButtons()}
                        <button type="button" className="ccp-page-btn ccp-page-arrow" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>&rsaquo;</button>
                        <button type="button" className="ccp-page-btn ccp-page-arrow" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}>&raquo;</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
