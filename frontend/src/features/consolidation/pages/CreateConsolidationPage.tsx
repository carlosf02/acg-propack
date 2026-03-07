import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ConsolidationFormData, ConsolidationCreate } from "../types";
import { createConsolidation } from "../consolidation.api";
import { listAssociateCompanies } from "../../company/associates.api";
import { listOffices } from "../../company/offices.api";
import { listWarehouseReceipts } from "../../receiving/receiving.api";
import { AssociateCompany } from "../../company/associates.types";
import { Office } from "../../company/offices.types";
import { WarehouseReceipt } from "../../receiving/types";
import { ApiError } from "../../../api/client";
import "./CreateConsolidationPage.css";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ShippingType = "All" | "AIR" | "SEA" | "GROUND";
type SearchField = "all" | "warehouseNumber" | "trackingNumber" | "sender" | "destination";

const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
    all: "All Fields",
    warehouseNumber: "Warehouse #",
    trackingNumber: "Tracking #",
    sender: "Sender",
    destination: "Destination",
};

const SHIPPING_BADGE_CLASS: Record<Exclude<ShippingType, "All">, string> = {
    AIR: "ccp-badge-air",
    SEA: "ccp-badge-sea",
    GROUND: "ccp-badge-ground",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CreateConsolidationPage() {
    const navigate = useNavigate();

    // ── Data lists for dropdowns and table ─────────────────────────────────────
    const [agencies, setAgencies] = useState<AssociateCompany[]>([]);
    const [sendingOffices, setSendingOffices] = useState<Office[]>([]);
    const [receivingOffices, setReceivingOffices] = useState<Office[]>([]);
    const [availableWarehouses, setAvailableWarehouses] = useState<WarehouseReceipt[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Form submission state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

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
    const [filterAgency, setFilterAgency] = useState("All");
    const [rowsPerPage, setRowsPerPage] = useState("10");
    const [currentPage, setCurrentPage] = useState(1);

    // Set of selected warehouse IDs
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Fetch dropdowns and available warehouse receipts on mount
    useEffect(() => {
        let isMounted = true;
        setLoadingData(true);
        setError('');

        Promise.all([
            listAssociateCompanies(),
            listOffices(),
            listOffices(),
            listWarehouseReceipts()
        ]).then(([agenciesRes, sendingRes, receivingRes, warehouseRes]) => {
            if (!isMounted) return;
            setAgencies(Array.isArray(agenciesRes) ? agenciesRes : agenciesRes.results);
            setSendingOffices(Array.isArray(sendingRes) ? sendingRes : sendingRes.results);
            setReceivingOffices(Array.isArray(receivingRes) ? receivingRes : receivingRes.results);

            // Only show warehouses that are not yet consolidated (or filter as required by your business logic)
            // For now, we list all and let the user select.
            const whs = Array.isArray(warehouseRes) ? warehouseRes : warehouseRes.results;
            setAvailableWarehouses(whs);
        }).catch(err => {
            if (!isMounted) return;
            console.error("Failed to load create consolidation data:", err);
            setError("Failed to load necessary form data. Please refresh.");
        }).finally(() => {
            if (isMounted) setLoadingData(false);
        });

        return () => { isMounted = false; };
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, searchField, fromDate, untilDate, shippingType, filterAgency, rowsPerPage]);

    // ── Details handlers ───────────────────────────────────────────────────────
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        if (selectedIds.size === 0) {
            setError("You must select at least one warehouse receipt to consolidate.");
            setSubmitting(false);
            return;
        }

        if (!formData.agency || !formData.sendingOffice || !formData.receivingOffice || !formData.shippingMethod) {
            setError("Agency, Shipping Method, Sending Office, and Receiving Office are required.");
            setSubmitting(false);
            return;
        }

        const payload: ConsolidationCreate = {
            associate_company: Number(formData.agency),
            sending_office: Number(formData.sendingOffice),
            receiving_office: Number(formData.receivingOffice),
            ship_type: formData.shippingMethod as "AIR" | "SEA" | "GROUND",
            consolidation_type: formData.type || undefined,
            note: formData.notes || undefined,
            warehouse_receipts: Array.from(selectedIds),
        };

        try {
            await createConsolidation(payload);
            navigate('/consolidated');
        } catch (err) {
            console.error('Failed to create consolidation:', err);
            if (err instanceof ApiError) {
                setError(`API Error: ${err.message}`);
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ── Warehouse selection ────────────────────────────────────────────────────
    const toggleWarehouse = (id: number) => {
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

    // Derived Agency Options for Warehouse Filter (all active agencies in current WR list)
    const activeAgencyWhs = Array.from(new Set(availableWarehouses.map(wh => String(wh.associate_company || '')))).filter(Boolean);

    // ── Filtering ─────────────────────────────────────────────────────────────
    const filtered = availableWarehouses.filter((wh) => {
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            if (searchField === "all") {
                const ok =
                    (wh.wr_number || '').toLowerCase().includes(term) ||
                    String(wh.client).includes(term);
                if (!ok) return false;
            } else {
                let val = '';
                if (searchField === 'warehouseNumber') val = wh.wr_number || '';
                if (searchField === 'sender') val = String(wh.client) || '';
                if (!val.toLowerCase().includes(term)) return false;
            }
        }

        const whDate = wh.created_at ? new Date(wh.created_at).toISOString().split('T')[0] : '';
        if (fromDate && whDate && whDate < fromDate) return false;
        if (untilDate && whDate && whDate > untilDate) return false;

        if (shippingType !== "All" && wh.shipping_method !== shippingType.toLowerCase()) return false;
        if (filterAgency !== "All" && String(wh.associate_company) !== filterAgency) return false;

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

    if (loadingData) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading form data...</div>;
    }

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="ccp-container">
            {/* Page header */}
            <div className="ccp-header">
                <div>
                    <h2>Create Consolidation</h2>
                </div>
                <div className="ccp-header-actions">
                    {error && <span style={{ color: "#dc2626", fontWeight: 500 }}>{error}</span>}
                    <button
                        type="button"
                        className="ccp-btn ccp-btn-secondary"
                        onClick={() => navigate('/consolidated')}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="ccp-btn ccp-btn-primary"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? "Saving..." : "Save Consolidation"}
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
                                {agencies.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
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
                                <option value="AIR">Air</option>
                                <option value="SEA">Sea</option>
                                <option value="GROUND">Ground</option>
                            </select>
                        </div>

                        <div className="ccp-field">
                            <label className="ccp-label" htmlFor="type">
                                Type
                            </label>
                            <input
                                id="type"
                                name="type"
                                type="text"
                                placeholder="e.g. Standard"
                                value={formData.type}
                                onChange={handleChange}
                                className="ccp-input"
                            />
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
                                {sendingOffices.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
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
                                {receivingOffices.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
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
                                <option value="sender">Sender ID</option>
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
                                <option value="AIR">Air</option>
                                <option value="SEA">Sea</option>
                                <option value="GROUND">Ground</option>
                            </select>
                        </div>
                        <div className="ccp-filter-group">
                            <label className="ccp-wh-label">Agency ID</label>
                            <select
                                className="ccp-select"
                                value={filterAgency}
                                onChange={(e) => setFilterAgency(e.target.value)}
                            >
                                <option value="All">All Agencies</option>
                                {activeAgencyWhs.map((opt) => (
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
                                    <th>Method</th>
                                    <th>Sender ID</th>
                                    <th>Agency ID</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length > 0 ? (
                                    paginated.map((wh, index) => {
                                        const isSelected = selectedIds.has(wh.id);
                                        const createdDate = wh.created_at ? new Date(wh.created_at).toLocaleDateString() : 'N/A';

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
                                                    <div className="ccp-wh-number">{wh.wr_number || `ID: ${wh.id}`}</div>
                                                </td>
                                                <td>
                                                    <span className={`ccp-badge ${SHIPPING_BADGE_CLASS[wh.shipping_method as Exclude<ShippingType, "All">]}`}>
                                                        {wh.shipping_method}
                                                    </span>
                                                </td>
                                                <td>{wh.client}</td>
                                                <td>{wh.associate_company}</td>
                                                <td>
                                                    <span className="ccp-badge">Pending</span>
                                                </td>
                                                <td>{createdDate}</td>
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
                                            colSpan={7}
                                            style={{
                                                textAlign: "center",
                                                padding: "40px",
                                                color: "#9ca3af",
                                            }}
                                        >
                                            No unconsolidated warehouse receipts found.
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
