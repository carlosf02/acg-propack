import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ListWarehousePage.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ShippingType = 'All' | 'Air' | 'Sea' | 'Ground';

type SearchField = 'all' | 'warehouseNumber' | 'trackingNumber' | 'sender' | 'destination';

type WarehouseRecord = {
    id: string;
    warehouseNumber: string;
    trackingNumber: string;
    sender: string;
    destination: string;
    shippingType: Exclude<ShippingType, 'All'>;
    agency: string;
    createdAt: string; // ISO date string YYYY-MM-DD
    pieces: number;
    weight: number;
    volume: number;           // e.g. cubic inches or cm³
    invoiceNumber?: string;   // populated once assigned to an invoice
};

// ─── Placeholder data (empty until API) ──────────────────────────────────────

const warehouseData: WarehouseRecord[] = [];

// ─── Agency options (extend once API is ready) ───────────────────────────────
const AGENCY_OPTIONS: string[] = [];

const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
    all: 'All Fields',
    warehouseNumber: 'Warehouse #',
    trackingNumber: 'Tracking #',
    sender: 'Sender',
    destination: 'Destination',
};

const SHIPPING_BADGE_CLASS: Record<Exclude<ShippingType, 'All'>, string> = {
    Air: 'lwp-badge-air',
    Sea: 'lwp-badge-sea',
    Ground: 'lwp-badge-ground',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ListWarehousePage() {
    // ── Filter state ─────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState<SearchField>('all');
    const [fromDate, setFromDate] = useState('');
    const [untilDate, setUntilDate] = useState('');
    const [shippingType, setShippingType] = useState<ShippingType>('All');
    const [agency, setAgency] = useState('All');

    // ── Pagination state ──────────────────────────────────────────────────────
    const [rowsPerPage, setRowsPerPage] = useState('10');
    const [currentPage, setCurrentPage] = useState(1);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, searchField, fromDate, untilDate, shippingType, agency, rowsPerPage]);

    // ── Filtering logic ───────────────────────────────────────────────────────
    const filteredWarehouses = warehouseData.filter((wh) => {
        // Search term
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            if (searchField === 'all') {
                const matchesAny = (
                    wh.warehouseNumber.toLowerCase().includes(term) ||
                    wh.trackingNumber.toLowerCase().includes(term) ||
                    wh.sender.toLowerCase().includes(term) ||
                    wh.destination.toLowerCase().includes(term)
                );
                if (!matchesAny) return false;
            } else {
                const fieldValue = wh[searchField]?.toString().toLowerCase() ?? '';
                if (!fieldValue.includes(term)) return false;
            }
        }

        // Date range
        if (fromDate && wh.createdAt < fromDate) return false;
        if (untilDate && wh.createdAt > untilDate) return false;

        // Shipping type
        if (shippingType !== 'All' && wh.shippingType !== shippingType) return false;

        // Agency
        if (agency !== 'All' && wh.agency !== agency) return false;

        return true;
    });

    // ── Pagination math ───────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filteredWarehouses.length / Number(rowsPerPage)));
    const paginated = filteredWarehouses.slice(
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
                    className={`lwp-page-btn ${currentPage === i ? 'lwp-page-active' : ''}`}
                    onClick={() => handlePageChange(i)}
                >
                    {i}
                </button>
            );
        }
        return buttons;
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="lwp-container">
            {/* ── Page header ── */}
            <div className="lwp-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <h2>Warehouses</h2>
                    {/* Stats badge */}
                    <div className="lwp-stats-card">
                        <div className="lwp-stat-item">
                            <span className="lwp-stat-label">Total:</span>
                            <span className="lwp-stat-value">{warehouseData.length}</span>
                        </div>
                        <div className="lwp-stat-divider" />
                        <div className="lwp-stat-item">
                            <span className="lwp-stat-label">Filtered:</span>
                            <span className="lwp-stat-value">{filteredWarehouses.length}</span>
                        </div>
                    </div>
                </div>
                <Link to="/warehouses/new" className="lwp-create-btn">
                    + Create Warehouse
                </Link>
            </div>

            {/* ── Main card ── */}
            <div className="lwp-card">

                {/* ── Search row: input + search-by selector ── */}
                <div className="lwp-search-row">
                    <div className="lwp-search-field">
                        <label className="lwp-label">Search</label>
                        <input
                            type="search"
                            className="lwp-input"
                            placeholder={`Search by ${SEARCH_FIELD_LABELS[searchField]}…`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="lwp-search-by-field">
                        <label className="lwp-label">Search by</label>
                        <select
                            className="lwp-select"
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

                <hr className="lwp-section-divider" />

                {/* ── Secondary filters row ── */}
                <div className="lwp-filters-row">
                    {/* From date */}
                    <div className="lwp-filter-group">
                        <label className="lwp-label">From</label>
                        <input
                            type="date"
                            className="lwp-input"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>

                    {/* Until date */}
                    <div className="lwp-filter-group">
                        <label className="lwp-label">Until</label>
                        <input
                            type="date"
                            className="lwp-input"
                            value={untilDate}
                            onChange={(e) => setUntilDate(e.target.value)}
                        />
                    </div>

                    {/* Shipping type */}
                    <div className="lwp-filter-group">
                        <label className="lwp-label">Shipping Type</label>
                        <select
                            className="lwp-select"
                            value={shippingType}
                            onChange={(e) => setShippingType(e.target.value as ShippingType)}
                        >
                            <option value="All">All Types</option>
                            <option value="Air">Air</option>
                            <option value="Sea">Sea</option>
                            <option value="Ground">Ground</option>
                        </select>
                    </div>

                    {/* Agency */}
                    <div className="lwp-filter-group">
                        <label className="lwp-label">Agency</label>
                        <select
                            className="lwp-select"
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

                {/* ── Table placeholder (to be built next) ── */}
                <div className="lwp-table-responsive">
                    <table className="lwp-table">
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
                                <th>Invoice</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length > 0 ? (
                                paginated.map((wh, index) => (
                                    <tr
                                        key={wh.id}
                                        className={index % 2 === 0 ? 'lwp-row-even' : 'lwp-row-odd'}
                                    >
                                        <td>
                                            <div className="lwp-wh-number">{wh.warehouseNumber}</div>
                                        </td>
                                        <td>
                                            <div className="lwp-wh-tracking">{wh.trackingNumber}</div>
                                        </td>
                                        <td>{wh.sender}</td>
                                        <td>{wh.destination}</td>
                                        <td>
                                            <span
                                                className={`lwp-badge ${SHIPPING_BADGE_CLASS[wh.shippingType]}`}
                                            >
                                                {wh.shippingType}
                                            </span>
                                        </td>
                                        <td>{wh.agency}</td>
                                        <td>{wh.createdAt}</td>
                                        <td>{wh.pieces}</td>
                                        <td>{wh.weight} lb</td>
                                        <td>{wh.volume} in³</td>
                                        <td>
                                            {wh.invoiceNumber
                                                ? <span className="lwp-wh-number">{wh.invoiceNumber}</span>
                                                : <span style={{ color: '#9ca3af' }}>—</span>
                                            }
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={11}
                                        style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}
                                    >
                                        No warehouses found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination footer ── */}
                <div className="lwp-pagination-footer">
                    <div className="lwp-rows-selector">
                        <span>Show up to</span>
                        <select
                            className="lwp-select lwp-select-inline"
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

                    <div className="lwp-pagination-controls">
                        <button
                            className="lwp-page-btn lwp-page-arrow"
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                        >
                            &laquo;
                        </button>
                        <button
                            className="lwp-page-btn lwp-page-arrow"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            &lsaquo;
                        </button>
                        {renderPageButtons()}
                        <button
                            className="lwp-page-btn lwp-page-arrow"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            &rsaquo;
                        </button>
                        <button
                            className="lwp-page-btn lwp-page-arrow"
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            &raquo;
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
