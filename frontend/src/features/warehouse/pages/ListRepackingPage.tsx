import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ListRepackingPage.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type PackageType =
    | 'All'
    | 'box'
    | 'envelope'
    | 'backpack/bag'
    | 'pallet'
    | 'suitcase'
    | 'plastic box'
    | 'cooler'
    | 'equipment';

type SearchField =
    | 'all'
    | 'repackNumber'
    | 'tracking'
    | 'description';

type RepackRecord = {
    id: string;
    repackNumber: string;
    tracking: string;
    description: string;
    type: Exclude<PackageType, 'All'>;
    createdAt: string; // ISO date YYYY-MM-DD
    warehouseCount: number;
    weight: number;   // lbs
    volume: number;   // CF
    value: number;    // $
};

// ─── Placeholder data (empty until API) ──────────────────────────────────────

const repackData: RepackRecord[] = [];

// ─── Labels & badge maps ─────────────────────────────────────────────────────

const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
    all: 'All Fields',
    repackNumber: 'Repack #',
    tracking: 'Tracking #',
    description: 'Description',
};

const TYPE_BADGE_CLASS: Record<Exclude<PackageType, 'All'>, string> = {
    box: 'lrp-type-box',
    envelope: 'lrp-type-envelope',
    'backpack/bag': 'lrp-type-bag',
    pallet: 'lrp-type-pallet',
    suitcase: 'lrp-type-suitcase',
    'plastic box': 'lrp-type-plasticbox',
    cooler: 'lrp-type-cooler',
    equipment: 'lrp-type-equipment',
};

const TYPE_OPTIONS: Exclude<PackageType, 'All'>[] = [
    'box',
    'envelope',
    'backpack/bag',
    'pallet',
    'suitcase',
    'plastic box',
    'cooler',
    'equipment',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ListRepackingPage() {
    // ── Filter state ──────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState<SearchField>('all');
    const [fromDate, setFromDate] = useState('');
    const [untilDate, setUntilDate] = useState('');
    const [typeFilter, setTypeFilter] = useState<PackageType>('All');

    // ── Pagination state ──────────────────────────────────────────────────────
    const [rowsPerPage, setRowsPerPage] = useState('10');
    const [currentPage, setCurrentPage] = useState(1);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, searchField, fromDate, untilDate, typeFilter, rowsPerPage]);

    // ── Filtering logic ───────────────────────────────────────────────────────
    const filteredRepacks = repackData.filter((rp) => {
        // Search term
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            if (searchField === 'all') {
                const matchesAny =
                    rp.repackNumber.toLowerCase().includes(term) ||
                    rp.tracking.toLowerCase().includes(term) ||
                    rp.description.toLowerCase().includes(term);
                if (!matchesAny) return false;
            } else {
                const fieldValue = rp[searchField]?.toString().toLowerCase() ?? '';
                if (!fieldValue.includes(term)) return false;
            }
        }

        // Date range
        if (fromDate && rp.createdAt < fromDate) return false;
        if (untilDate && rp.createdAt > untilDate) return false;

        // Package type
        if (typeFilter !== 'All' && rp.type !== typeFilter) return false;

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
                    {/* Stats badge */}
                    <div className="lrp-stats-card">
                        <div className="lrp-stat-item">
                            <span className="lrp-stat-label">Total:</span>
                            <span className="lrp-stat-value">{repackData.length}</span>
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
                            <option value="description">Description</option>
                        </select>
                    </div>
                </div>

                <hr className="lrp-section-divider" />

                {/* ── Secondary filters row ── */}
                <div className="lrp-filters-row">
                    {/* From date */}
                    <div className="lrp-filter-group">
                        <label className="lrp-label">From</label>
                        <input
                            type="date"
                            className="lrp-input"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>

                    {/* Until date */}
                    <div className="lrp-filter-group">
                        <label className="lrp-label">Until</label>
                        <input
                            type="date"
                            className="lrp-input"
                            value={untilDate}
                            onChange={(e) => setUntilDate(e.target.value)}
                        />
                    </div>

                    {/* Package type */}
                    <div className="lrp-filter-group">
                        <label className="lrp-label">Package Type</label>
                        <select
                            className="lrp-select"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as PackageType)}
                        >
                            <option value="All">All Types</option>
                            {TYPE_OPTIONS.map((t) => (
                                <option key={t} value={t} style={{ textTransform: 'capitalize' }}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="lrp-table-responsive">
                    <table className="lrp-table">
                        <thead>
                            <tr>
                                <th>Repack #</th>
                                <th>Tracking #</th>
                                <th>Description</th>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Warehouses</th>
                                <th>Weight (lb)</th>
                                <th>Volume (CF)</th>
                                <th>Value ($)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length > 0 ? (
                                paginated.map((rp, index) => (
                                    <tr
                                        key={rp.id}
                                        className={index % 2 === 0 ? 'lrp-row-even' : 'lrp-row-odd'}
                                    >
                                        <td>
                                            <div className="lrp-rp-number">{rp.repackNumber}</div>
                                        </td>
                                        <td>
                                            <div className="lrp-tracking">{rp.tracking}</div>
                                        </td>
                                        <td>{rp.description}</td>
                                        <td>
                                            <span className={`lrp-type-badge ${TYPE_BADGE_CLASS[rp.type]}`}>
                                                {rp.type}
                                            </span>
                                        </td>
                                        <td>{rp.createdAt}</td>
                                        <td>
                                            <span className="lrp-wh-count">{rp.warehouseCount}</span>
                                        </td>
                                        <td>{rp.weight.toFixed(2)}</td>
                                        <td>{rp.volume.toFixed(2)}</td>
                                        <td>${rp.value.toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={9}
                                        style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}
                                    >
                                        No repackings found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
                            disabled={currentPage === 1}
                        >
                            &laquo;
                        </button>
                        <button
                            className="lrp-page-btn lrp-page-arrow"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            &lsaquo;
                        </button>
                        {renderPageButtons()}
                        <button
                            className="lrp-page-btn lrp-page-arrow"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            &rsaquo;
                        </button>
                        <button
                            className="lrp-page-btn lrp-page-arrow"
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
