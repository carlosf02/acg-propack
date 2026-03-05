import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ListConsolidationPage.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ShippingMethod = 'All' | 'Air' | 'Sea' | 'Ground';

type SearchField =
    | 'all'
    | 'consolidationNumber'
    | 'agency'
    | 'sendingOffice'
    | 'receivingOffice';

type ConsolidationRecord = {
    id: string;
    consolidationNumber: string;
    agency: string;
    shippingMethod: Exclude<ShippingMethod, 'All'>;
    type: string;
    sendingOffice: string;
    receivingOffice: string;
    createdAt: string; // ISO date string YYYY-MM-DD
    warehouseCount: number;
    totalWeight: number; // lbs
    totalVolume: number; // in³
};

// ─── Placeholder data (empty until API) ──────────────────────────────────────

const consolidationData: ConsolidationRecord[] = [];

// ─── Agency options (extend once API is ready) ───────────────────────────────
const AGENCY_OPTIONS: string[] = [];

const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
    all: 'All Fields',
    consolidationNumber: 'Consolidation #',
    agency: 'Agency',
    sendingOffice: 'Sending Office',
    receivingOffice: 'Receiving Office',
};

const SHIPPING_BADGE_CLASS: Record<Exclude<ShippingMethod, 'All'>, string> = {
    Air: 'lcp-badge-air',
    Sea: 'lcp-badge-sea',
    Ground: 'lcp-badge-ground',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ListConsolidationPage() {
    // ── Filter state ─────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState<SearchField>('all');
    const [fromDate, setFromDate] = useState('');
    const [untilDate, setUntilDate] = useState('');
    const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('All');
    const [agency, setAgency] = useState('All');

    // ── Pagination state ──────────────────────────────────────────────────────
    const [rowsPerPage, setRowsPerPage] = useState('10');
    const [currentPage, setCurrentPage] = useState(1);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, searchField, fromDate, untilDate, shippingMethod, agency, rowsPerPage]);

    // ── Filtering logic ───────────────────────────────────────────────────────
    const filteredConsolidations = consolidationData.filter((con) => {
        // Search term
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            if (searchField === 'all') {
                const matchesAny =
                    con.consolidationNumber.toLowerCase().includes(term) ||
                    con.agency.toLowerCase().includes(term) ||
                    con.sendingOffice.toLowerCase().includes(term) ||
                    con.receivingOffice.toLowerCase().includes(term);
                if (!matchesAny) return false;
            } else {
                const fieldValue = con[searchField]?.toString().toLowerCase() ?? '';
                if (!fieldValue.includes(term)) return false;
            }
        }

        // Date range
        if (fromDate && con.createdAt < fromDate) return false;
        if (untilDate && con.createdAt > untilDate) return false;

        // Shipping method
        if (shippingMethod !== 'All' && con.shippingMethod !== shippingMethod) return false;

        // Agency
        if (agency !== 'All' && con.agency !== agency) return false;

        return true;
    });

    // ── Pagination math ───────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filteredConsolidations.length / Number(rowsPerPage)));
    const paginated = filteredConsolidations.slice(
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
                    className={`lcp-page-btn ${currentPage === i ? 'lcp-page-active' : ''}`}
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
        <div className="lcp-container">
            {/* ── Page header ── */}
            <div className="lcp-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <h2>Consolidations</h2>
                    {/* Stats badge */}
                    <div className="lcp-stats-card">
                        <div className="lcp-stat-item">
                            <span className="lcp-stat-label">Total:</span>
                            <span className="lcp-stat-value">{consolidationData.length}</span>
                        </div>
                        <div className="lcp-stat-divider" />
                        <div className="lcp-stat-item">
                            <span className="lcp-stat-label">Filtered:</span>
                            <span className="lcp-stat-value">{filteredConsolidations.length}</span>
                        </div>
                    </div>
                </div>
                <Link to="/consolidated/new" className="lcp-create-btn">
                    + Create Consolidation
                </Link>
            </div>

            {/* ── Main card ── */}
            <div className="lcp-card">

                {/* ── Search row: input + search-by selector ── */}
                <div className="lcp-search-row">
                    <div className="lcp-search-field">
                        <label className="lcp-label">Search</label>
                        <input
                            type="search"
                            className="lcp-input"
                            placeholder={`Search by ${SEARCH_FIELD_LABELS[searchField]}…`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="lcp-search-by-field">
                        <label className="lcp-label">Search by</label>
                        <select
                            className="lcp-select"
                            value={searchField}
                            onChange={(e) => setSearchField(e.target.value as SearchField)}
                        >
                            <option value="all">All Fields</option>
                            <option value="consolidationNumber">Consolidation #</option>
                            <option value="agency">Agency</option>
                            <option value="sendingOffice">Sending Office</option>
                            <option value="receivingOffice">Receiving Office</option>
                        </select>
                    </div>
                </div>

                <hr className="lcp-section-divider" />

                {/* ── Secondary filters row ── */}
                <div className="lcp-filters-row">
                    {/* From date */}
                    <div className="lcp-filter-group">
                        <label className="lcp-label">From</label>
                        <input
                            type="date"
                            className="lcp-input"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>

                    {/* Until date */}
                    <div className="lcp-filter-group">
                        <label className="lcp-label">Until</label>
                        <input
                            type="date"
                            className="lcp-input"
                            value={untilDate}
                            onChange={(e) => setUntilDate(e.target.value)}
                        />
                    </div>

                    {/* Shipping method */}
                    <div className="lcp-filter-group">
                        <label className="lcp-label">Shipping Method</label>
                        <select
                            className="lcp-select"
                            value={shippingMethod}
                            onChange={(e) => setShippingMethod(e.target.value as ShippingMethod)}
                        >
                            <option value="All">All Methods</option>
                            <option value="Air">Air</option>
                            <option value="Sea">Sea</option>
                            <option value="Ground">Ground</option>
                        </select>
                    </div>

                    {/* Agency */}
                    <div className="lcp-filter-group">
                        <label className="lcp-label">Agency</label>
                        <select
                            className="lcp-select"
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

                {/* ── Table ── */}
                <div className="lcp-table-responsive">
                    <table className="lcp-table">
                        <thead>
                            <tr>
                                <th>Consolidation #</th>
                                <th>Agency</th>
                                <th>Method</th>
                                <th>Type</th>
                                <th>Sending Office</th>
                                <th>Receiving Office</th>
                                <th>Date</th>
                                <th>Warehouses</th>
                                <th>Weight</th>
                                <th>Volume</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length > 0 ? (
                                paginated.map((con, index) => (
                                    <tr
                                        key={con.id}
                                        className={index % 2 === 0 ? 'lcp-row-even' : 'lcp-row-odd'}
                                    >
                                        <td>
                                            <div className="lcp-con-number">{con.consolidationNumber}</div>
                                        </td>
                                        <td>{con.agency}</td>
                                        <td>
                                            <span
                                                className={`lcp-badge ${SHIPPING_BADGE_CLASS[con.shippingMethod]}`}
                                            >
                                                {con.shippingMethod}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="lcp-type-badge">{con.type}</span>
                                        </td>
                                        <td>{con.sendingOffice}</td>
                                        <td>{con.receivingOffice}</td>
                                        <td>{con.createdAt}</td>
                                        <td>
                                            <span className="lcp-wh-count">{con.warehouseCount}</span>
                                        </td>
                                        <td>{con.totalWeight} lb</td>
                                        <td>{con.totalVolume} in³</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={10}
                                        style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}
                                    >
                                        No consolidations found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination footer ── */}
                <div className="lcp-pagination-footer">
                    <div className="lcp-rows-selector">
                        <span>Show up to</span>
                        <select
                            className="lcp-select lcp-select-inline"
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

                    <div className="lcp-pagination-controls">
                        <button
                            className="lcp-page-btn lcp-page-arrow"
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                        >
                            &laquo;
                        </button>
                        <button
                            className="lcp-page-btn lcp-page-arrow"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            &lsaquo;
                        </button>
                        {renderPageButtons()}
                        <button
                            className="lcp-page-btn lcp-page-arrow"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            &rsaquo;
                        </button>
                        <button
                            className="lcp-page-btn lcp-page-arrow"
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
