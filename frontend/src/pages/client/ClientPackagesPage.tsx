import { useState, useEffect } from 'react';
import { apiGet } from '../../api/client';
import { endpoints } from '../../api/endpoints';
import { formatClientStatus } from './clientPortalStatus';
import './ClientPackagesPage.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type Kind = 'All' | 'WR' | 'REPACK';
type SearchField = 'all' | 'reference' | 'tracking_number' | 'description';

interface PackageItem {
    id: number;
    reference: string;
    is_repack: boolean;
    tracking_number: string | null;
    carrier: string | null;
    status: string;
    date: string | null;
    description: string | null;
    weight: string | null;
    weight_unit: string | null;
    shipping_method: string | null;
}

interface PackagesResponse {
    results: PackageItem[];
    count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
    all: 'All Fields',
    reference: 'Package #',
    tracking_number: 'Tracking #',
    description: 'Description',
};

function statusClass(status: string): string {
    switch (status.toUpperCase()) {
        case 'ACTIVE':      return 'cpp-status-active';
        case 'SHIPPED':     return 'cpp-status-shipped';
        case 'INACTIVE':    return 'cpp-status-inactive';
        case 'CANCELLED':   return 'cpp-status-cancelled';
        default:            return 'cpp-status-default';
    }
}

function shippingClass(method: string | null): string {
    switch ((method || '').toLowerCase()) {
        case 'air':    return 'cpp-badge cpp-shipping-air';
        case 'sea':    return 'cpp-badge cpp-shipping-sea';
        case 'ground': return 'cpp-badge cpp-shipping-ground';
        default:       return '';
    }
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientPackagesPage() {
    // ── Remote data ───────────────────────────────────────────────────────────
    const [allItems, setAllItems] = useState<PackageItem[]>([]);
    const [totalFromServer, setTotalFromServer] = useState(0);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // ── Filter state ──────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState<SearchField>('all');
    const [fromDate, setFromDate] = useState('');
    const [untilDate, setUntilDate] = useState('');
    const [kindFilter, setKindFilter] = useState<Kind>('All');

    // ── Pagination state ──────────────────────────────────────────────────────
    const [rowsPerPage, setRowsPerPage] = useState('10');
    const [currentPage, setCurrentPage] = useState(1);

    // ── Fetch data ────────────────────────────────────────────────────────────
    useEffect(() => {
        setLoading(true);
        setFetchError(null);

        const params: Record<string, string> = {};
        if (kindFilter !== 'All') params.kind = kindFilter;
        if (fromDate) params.from_date = fromDate;
        if (untilDate) params.until_date = untilDate;

        apiGet<PackagesResponse>(endpoints.clientPortalPackages(), params)
            .then((res) => {
                setAllItems(res.results);
                setTotalFromServer(res.count);
            })
            .catch(() => setFetchError('Could not load packages. Please try again.'))
            .finally(() => setLoading(false));
    }, [kindFilter, fromDate, untilDate]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, searchField, fromDate, untilDate, kindFilter, rowsPerPage]);

    // ── Client-side search ────────────────────────────────────────────────────
    const filtered = allItems.filter((pkg) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.trim().toLowerCase();
        if (searchField === 'all') {
            return (
                pkg.reference.toLowerCase().includes(term) ||
                (pkg.tracking_number ?? '').toLowerCase().includes(term) ||
                (pkg.description ?? '').toLowerCase().includes(term)
            );
        }
        const val = (pkg[searchField] ?? '').toString().toLowerCase();
        return val.includes(term);
    });

    // ── Pagination ────────────────────────────────────────────────────────────
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
        // Show at most 7 page buttons with ellipsis logic
        const maxVisible = 7;
        const half = Math.floor(maxVisible / 2);
        let start = Math.max(1, currentPage - half);
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

        for (let i = start; i <= end; i++) {
            buttons.push(
                <button
                    key={i}
                    className={`cpp-page-btn ${currentPage === i ? 'cpp-page-active' : ''}`}
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
        <div className="cpp-container">
            {/* ── Page header ── */}
            <div className="cpp-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <h2>My Packages</h2>
                    <div className="cpp-stats-card">
                        <div className="cpp-stat-item">
                            <span className="cpp-stat-label">Total:</span>
                            <span className="cpp-stat-value">{totalFromServer}</span>
                        </div>
                        <div className="cpp-stat-divider" />
                        <div className="cpp-stat-item">
                            <span className="cpp-stat-label">Filtered:</span>
                            <span className="cpp-stat-value">{filtered.length}</span>
                        </div>
                    </div>
                </div>
                {/* No create button — read-only for clients */}
            </div>

            {/* ── Main card ── */}
            <div className="cpp-card">

                {/* ── Search row ── */}
                <div className="cpp-search-row">
                    <div className="cpp-search-field">
                        <label className="cpp-label">Search</label>
                        <input
                            type="search"
                            className="cpp-input"
                            placeholder={`Search by ${SEARCH_FIELD_LABELS[searchField]}…`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="cpp-search-by-field">
                        <label className="cpp-label">Search by</label>
                        <select
                            className="cpp-select"
                            value={searchField}
                            onChange={(e) => setSearchField(e.target.value as SearchField)}
                        >
                            <option value="all">All Fields</option>
                            <option value="reference">Package #</option>
                            <option value="tracking_number">Tracking #</option>
                            <option value="description">Description</option>
                        </select>
                    </div>
                </div>

                <hr className="cpp-section-divider" />

                {/* ── Filters row ── */}
                <div className="cpp-filters-row">
                    <div className="cpp-filter-group">
                        <label className="cpp-label">From</label>
                        <input
                            type="date"
                            className="cpp-input"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="cpp-filter-group">
                        <label className="cpp-label">Until</label>
                        <input
                            type="date"
                            className="cpp-input"
                            value={untilDate}
                            onChange={(e) => setUntilDate(e.target.value)}
                        />
                    </div>
                    <div className="cpp-filter-group">
                        <label className="cpp-label">Type</label>
                        <select
                            className="cpp-select"
                            value={kindFilter}
                            onChange={(e) => setKindFilter(e.target.value as Kind)}
                        >
                            <option value="All">All Types</option>
                            <option value="WR">Warehouse Receipt</option>
                            <option value="REPACK">Repack</option>
                        </select>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="cpp-table-responsive">
                    <table className="cpp-table">
                        <thead>
                            <tr>
                                <th>Package #</th>
                                <th>Tracking #</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Weight</th>
                                <th>Carrier</th>
                                <th>Ship Method</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                        Loading packages…
                                    </td>
                                </tr>
                            ) : fetchError ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
                                        {fetchError}
                                    </td>
                                </tr>
                            ) : paginated.length > 0 ? (
                                paginated.map((pkg, index) => (
                                    <tr
                                        key={pkg.id}
                                        className={index % 2 === 0 ? 'cpp-row-even' : 'cpp-row-odd'}
                                    >
                                        <td>
                                            <div className="cpp-ref-number">{pkg.reference}</div>
                                        </td>
                                        <td>
                                            {pkg.tracking_number
                                                ? <div className="cpp-tracking">{pkg.tracking_number}</div>
                                                : <span style={{ color: '#9ca3af' }}>—</span>
                                            }
                                        </td>
                                        <td>
                                            <span className={`cpp-badge ${pkg.is_repack ? 'cpp-badge-repack' : 'cpp-badge-wr'}`}>
                                                {pkg.is_repack ? 'Repack' : 'Warehouse Receipt'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`cpp-status ${statusClass(pkg.status)}`}>
                                                {formatClientStatus(pkg.status)}
                                            </span>
                                        </td>
                                        <td>{formatDate(pkg.date)}</td>
                                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {pkg.description || <span style={{ color: '#9ca3af' }}>—</span>}
                                        </td>
                                        <td>
                                            {pkg.weight
                                                ? `${pkg.weight} ${pkg.weight_unit ?? 'lb'}`
                                                : <span style={{ color: '#9ca3af' }}>—</span>
                                            }
                                        </td>
                                        <td>{pkg.carrier || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                                        <td>
                                            {pkg.shipping_method
                                                ? <span className={shippingClass(pkg.shipping_method)}>
                                                    {pkg.shipping_method.charAt(0).toUpperCase() + pkg.shipping_method.slice(1)}
                                                  </span>
                                                : <span style={{ color: '#9ca3af' }}>—</span>
                                            }
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                        No packages found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination footer ── */}
                <div className="cpp-pagination-footer">
                    <div className="cpp-rows-selector">
                        <span>Show up to</span>
                        <select
                            className="cpp-select cpp-select-inline"
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

                    <div className="cpp-pagination-controls">
                        <button
                            className="cpp-page-btn cpp-page-arrow"
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                        >&laquo;</button>
                        <button
                            className="cpp-page-btn cpp-page-arrow"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >&lsaquo;</button>
                        {renderPageButtons()}
                        <button
                            className="cpp-page-btn cpp-page-arrow"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >&rsaquo;</button>
                        <button
                            className="cpp-page-btn cpp-page-arrow"
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                        >&raquo;</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
