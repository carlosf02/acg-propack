import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listConsolidations } from '../consolidation.api';
import { Consolidation } from '../types';
import './ListConsolidationPage.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ShippingMethod = 'All' | 'AIR' | 'SEA' | 'GROUND';

type SearchField =
    | 'all'
    | 'consolidationNumber'
    | 'agency'
    | 'sendingOffice'
    | 'receivingOffice';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
    all: 'All Fields',
    consolidationNumber: 'Consolidation #',
    agency: 'Agency',
    sendingOffice: 'Sending Office',
    receivingOffice: 'Receiving Office',
};

const SHIPPING_BADGE_CLASS: Record<Exclude<ShippingMethod, 'All'>, string> = {
    AIR: 'lcp-badge-air',
    SEA: 'lcp-badge-sea',
    GROUND: 'lcp-badge-ground',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ListConsolidationPage() {
    // ── Data state ───────────────────────────────────────────────────────────
    const [consolidations, setConsolidations] = useState<Consolidation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ── Filter state ─────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState<SearchField>('all');
    const [fromDate, setFromDate] = useState('');
    const [untilDate, setUntilDate] = useState('');
    const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('All');

    // We'll keep agency as a string ID for now since we just have the IDs in the consolidation record
    const [agency, setAgency] = useState('All');

    // ── Pagination state ──────────────────────────────────────────────────────
    const [rowsPerPage, setRowsPerPage] = useState('10');
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch data on mount
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError('');

        listConsolidations()
            .then(res => {
                if (!isMounted) return;
                const data = Array.isArray(res) ? res : res.results;
                setConsolidations(data);
            })
            .catch(err => {
                if (!isMounted) return;
                console.error("Failed to fetch consolidations:", err);
                setError('Failed to load consolidations. Please try again later.');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, searchField, fromDate, untilDate, shippingMethod, agency, rowsPerPage]);

    // Derived Agency Options from active dataset (since we don't have full name resolution here yet)
    const activeAgencies = Array.from(new Set(consolidations.map(c => String(c.associate_company))));

    // ── Filtering logic ───────────────────────────────────────────────────────
    const ObjectValuesToString = (con: Consolidation, field: SearchField) => {
        switch (field) {
            case 'consolidationNumber': return con.reference_code || '';
            case 'agency': return String(con.associate_company);
            case 'sendingOffice': return String(con.sending_office);
            case 'receivingOffice': return String(con.receiving_office);
            default: return '';
        }
    };

    const filteredConsolidations = consolidations.filter((con) => {
        // Search term
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            if (searchField === 'all') {
                const matchesAny =
                    (con.reference_code || '').toLowerCase().includes(term) ||
                    String(con.associate_company).includes(term) ||
                    String(con.sending_office).includes(term) ||
                    String(con.receiving_office).includes(term);
                if (!matchesAny) return false;
            } else {
                const fieldValue = ObjectValuesToString(con, searchField).toLowerCase();
                if (!fieldValue.includes(term)) return false;
            }
        }

        // Date range
        const conDate = con.created_at ? new Date(con.created_at).toISOString().split('T')[0] : '';
        if (fromDate && conDate && conDate < fromDate) return false;
        if (untilDate && conDate && conDate > untilDate) return false;

        // Shipping method
        if (shippingMethod !== 'All' && con.ship_type !== shippingMethod) return false;

        // Agency
        if (agency !== 'All' && String(con.associate_company) !== agency) return false;

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
                    <div className="lcp-stats-card">
                        <div className="lcp-stat-item">
                            <span className="lcp-stat-label">Total:</span>
                            <span className="lcp-stat-value">{consolidations.length}</span>
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
                            <option value="consolidationNumber">Reference #</option>
                            <option value="agency">Agency ID</option>
                            <option value="sendingOffice">Sending Office ID</option>
                            <option value="receivingOffice">Receiving Office ID</option>
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
                            <option value="AIR">Air</option>
                            <option value="SEA">Sea</option>
                            <option value="GROUND">Ground</option>
                        </select>
                    </div>

                    {/* Agency */}
                    <div className="lcp-filter-group">
                        <label className="lcp-label">Agency ID</label>
                        <select
                            className="lcp-select"
                            value={agency}
                            onChange={(e) => setAgency(e.target.value)}
                        >
                            <option value="All">All Agencies</option>
                            {activeAgencies.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="lcp-table-responsive">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading consolidations...</div>
                    ) : error ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{error}</div>
                    ) : (
                        <table className="lcp-table">
                            <thead>
                                <tr>
                                    <th>Reference #</th>
                                    <th>Agency ID</th>
                                    <th>Method</th>
                                    <th>Type</th>
                                    <th>Sending Office ID</th>
                                    <th>Receiving Office ID</th>
                                    <th>Status</th>
                                    <th>Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length > 0 ? (
                                    paginated.map((con, index) => {
                                        const createdDate = con.created_at ? new Date(con.created_at).toLocaleDateString() : 'N/A';

                                        return (
                                            <tr
                                                key={con.id}
                                                className={index % 2 === 0 ? 'lcp-row-even' : 'lcp-row-odd'}
                                            >
                                                <td>
                                                    <div className="lcp-con-number">{con.reference_code || `ID: ${con.id}`}</div>
                                                </td>
                                                <td>{con.associate_company}</td>
                                                <td>
                                                    <span
                                                        className={`lcp-badge ${SHIPPING_BADGE_CLASS[con.ship_type as Exclude<ShippingMethod, 'All'>]}`}
                                                    >
                                                        {con.ship_type}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="lcp-type-badge">{con.consolidation_type || '-'}</span>
                                                </td>
                                                <td>{con.sending_office}</td>
                                                <td>{con.receiving_office}</td>
                                                <td>
                                                    <span className="lcp-type-badge">{con.status || 'Pending'}</span>
                                                </td>
                                                <td>{createdDate}</td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}
                                        >
                                            No consolidations found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
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
                            disabled={currentPage === 1 || loading}
                        >
                            &laquo;
                        </button>
                        <button
                            className="lcp-page-btn lcp-page-arrow"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                        >
                            &lsaquo;
                        </button>
                        {renderPageButtons()}
                        <button
                            className="lcp-page-btn lcp-page-arrow"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || loading}
                        >
                            &rsaquo;
                        </button>
                        <button
                            className="lcp-page-btn lcp-page-arrow"
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages || loading}
                        >
                            &raquo;
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
