import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listRepacks } from '../repacking.api';
import type { Repack } from '../repacking.api';
import './ListRepackingPage.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchField =
    | 'all'
    | 'repackNumber'
    | 'tracking'
    | 'client'
    | 'notes';

// ─── Labels ───────────────────────────────────────────────────────────────────

const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
    all: 'All Fields',
    repackNumber: 'Repack #',
    tracking: 'Tracking #',
    client: 'Client',
    notes: 'Notes',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ListRepackingPage() {
    // ── Data state ────────────────────────────────────────────────────────────
    const [repacks, setRepacks] = useState<Repack[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ── Filter state ──────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState<SearchField>('all');
    const [fromDate, setFromDate] = useState('');
    const [untilDate, setUntilDate] = useState('');

    // ── Pagination state ──────────────────────────────────────────────────────
    const [rowsPerPage, setRowsPerPage] = useState('10');
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch data on mount
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError('');

        listRepacks()
            .then(res => {
                if (!isMounted) return;
                const data = Array.isArray(res) ? res : res.results;
                setRepacks(data);
            })
            .catch(err => {
                if (!isMounted) return;
                console.error('Failed to fetch repacks:', err);
                setError('Failed to load repacks. Please try again later.');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, searchField, fromDate, untilDate, rowsPerPage]);

    // ── Filtering logic ───────────────────────────────────────────────────────
    const rowRepackNumber = (rp: Repack) => rp.output_wr_number || `#${rp.id}`;

    const filteredRepacks = repacks.filter((rp) => {
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            const repackNumber = rowRepackNumber(rp).toLowerCase();
            const tracking = (rp.output_tracking_number || '').toLowerCase();
            const client = (rp.client_name || '').toLowerCase();
            const notes = (rp.notes || '').toLowerCase();

            if (searchField === 'all') {
                const matchesAny =
                    repackNumber.includes(term) ||
                    tracking.includes(term) ||
                    client.includes(term) ||
                    notes.includes(term);
                if (!matchesAny) return false;
            } else {
                const fieldValue =
                    searchField === 'repackNumber' ? repackNumber :
                    searchField === 'tracking' ? tracking :
                    searchField === 'client' ? client :
                    notes;
                if (!fieldValue.includes(term)) return false;
            }
        }

        // Date range (compare on created_at YYYY-MM-DD)
        const rpDate = rp.created_at ? new Date(rp.created_at).toISOString().split('T')[0] : '';
        if (fromDate && rpDate && rpDate < fromDate) return false;
        if (untilDate && rpDate && rpDate > untilDate) return false;

        return true;
    });

    // ── Pagination math ───────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filteredRepacks.length / Number(rowsPerPage)));
    const paginated = filteredRepacks.slice(
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
                    className={`lrp-page-btn ${currentPage === i ? 'lrp-page-active' : ''}`}
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
        <div className="lrp-container">
            {/* ── Page header ── */}
            <div className="lrp-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <h2>Repacking</h2>
                    <div className="lrp-stats-card">
                        <div className="lrp-stat-item">
                            <span className="lrp-stat-label">Total:</span>
                            <span className="lrp-stat-value">{repacks.length}</span>
                        </div>
                        <div className="lrp-stat-divider" />
                        <div className="lrp-stat-item">
                            <span className="lrp-stat-label">Filtered:</span>
                            <span className="lrp-stat-value">{filteredRepacks.length}</span>
                        </div>
                    </div>
                </div>
                <Link to="/repacking/new" className="lrp-create-btn">
                    + Create Repack
                </Link>
            </div>

            {/* ── Main card ── */}
            <div className="lrp-card">

                {/* ── Search row: input + search-by selector ── */}
                <div className="lrp-search-row">
                    <div className="lrp-search-field">
                        <label className="lrp-label">Search</label>
                        <input
                            type="search"
                            className="lrp-input"
                            placeholder={`Search by ${SEARCH_FIELD_LABELS[searchField]}…`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="lrp-search-by-field">
                        <label className="lrp-label">Search by</label>
                        <select
                            className="lrp-select"
                            value={searchField}
                            onChange={(e) => setSearchField(e.target.value as SearchField)}
                        >
                            <option value="all">All Fields</option>
                            <option value="repackNumber">Repack #</option>
                            <option value="tracking">Tracking #</option>
                            <option value="client">Client</option>
                            <option value="notes">Notes</option>
                        </select>
                    </div>
                </div>

                <hr className="lrp-section-divider" />

                {/* ── Secondary filters row ── */}
                <div className="lrp-filters-row">
                    <div className="lrp-filter-group">
                        <label className="lrp-label">From</label>
                        <input
                            type="date"
                            className="lrp-input"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>

                    <div className="lrp-filter-group">
                        <label className="lrp-label">Until</label>
                        <input
                            type="date"
                            className="lrp-input"
                            value={untilDate}
                            onChange={(e) => setUntilDate(e.target.value)}
                        />
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="lrp-table-responsive">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading repacks...</div>
                    ) : error ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{error}</div>
                    ) : (
                        <table className="lrp-table">
                            <thead>
                                <tr>
                                    <th>Repack #</th>
                                    <th>Tracking #</th>
                                    <th>Client</th>
                                    <th>Input WRs</th>
                                    <th>Date</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length > 0 ? (
                                    paginated.map((rp, index) => {
                                        const createdDate = rp.created_at ? new Date(rp.created_at).toLocaleDateString() : 'N/A';
                                        const inputWrs = rp.input_wr_numbers?.length
                                            ? rp.input_wr_numbers.join(', ')
                                            : `${rp.input_wr_count}`;

                                        return (
                                            <tr
                                                key={rp.id}
                                                className={index % 2 === 0 ? 'lrp-row-even' : 'lrp-row-odd'}
                                            >
                                                <td>
                                                    <div className="lrp-rp-number">{rowRepackNumber(rp)}</div>
                                                </td>
                                                <td>
                                                    <div className="lrp-tracking">{rp.output_tracking_number || '-'}</div>
                                                </td>
                                                <td>{rp.client_name || rp.client_code || '-'}</td>
                                                <td>
                                                    <span className="lrp-wh-count" title={inputWrs}>
                                                        {rp.input_wr_count}
                                                    </span>
                                                </td>
                                                <td>{createdDate}</td>
                                                <td>{rp.notes || '-'}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}
                                        >
                                            No repackings found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── Pagination footer ── */}
                <div className="lrp-pagination-footer">
                    <div className="lrp-rows-selector">
                        <span>Show up to</span>
                        <select
                            className="lrp-select lrp-select-inline"
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

                    <div className="lrp-pagination-controls">
                        <button
                            className="lrp-page-btn lrp-page-arrow"
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1 || loading}
                        >
                            &laquo;
                        </button>
                        <button
                            className="lrp-page-btn lrp-page-arrow"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                        >
                            &lsaquo;
                        </button>
                        {renderPageButtons()}
                        <button
                            className="lrp-page-btn lrp-page-arrow"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || loading}
                        >
                            &rsaquo;
                        </button>
                        <button
                            className="lrp-page-btn lrp-page-arrow"
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
