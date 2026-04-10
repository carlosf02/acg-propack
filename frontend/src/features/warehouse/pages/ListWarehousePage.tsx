import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listWarehouseReceipts } from '../../receiving/receiving.api';
import { useAuth } from '../../auth/AuthContext';
import './ListWarehousePage.css';

// ─── Types (reconciled with WarehouseReceiptSerializer) ───────────────────────

type ShippingType = 'All' | 'air' | 'sea' | 'ground';

type SearchField = 'all' | 'warehouseNumber' | 'sender' | 'destination';

type WarehouseRecord = {
    id: number;
    wr_number: string;
    tracking_number?: string | null;
    client_details?: { id: number; client_code: string; name: string; city?: string | null } | null;
    recipient_name?: string | null;
    shipping_method?: 'air' | 'sea' | 'ground' | null;
    associate_company?: number | null;
    associate_company_details?: { id: number; name: string } | null;
    received_at?: string | null;
    wr_status_display?: { type: 'not_processed' | 'processed' | 'repacked'; reference: string | null } | null;
    lines: Array<{
        pieces: number;
        weight?: string | null;
        volume_cf?: string | null;
    }>;
};

// ─── Agency options (extend once API is ready) ───────────────────────────────
const AGENCY_OPTIONS: string[] = [];

const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
    all: 'All Fields',
    warehouseNumber: 'Warehouse #',
    sender: 'Sender',
    destination: 'Receiver',
};

const SHIPPING_BADGE_CLASS: Record<Exclude<ShippingType, 'All'>, string> = {
    air: 'lwp-badge-air',
    sea: 'lwp-badge-sea',
    ground: 'lwp-badge-ground',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ListWarehousePage() {
    const { user } = useAuth();

    // ── Data state ────────────────────────────────────────────────────────────
    const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

    // Fetch on mount
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        listWarehouseReceipts()
            .then(res => {
                if (!isMounted) return;
                setWarehouses(Array.isArray(res) ? res : res.results);
            })
            .catch(() => {
                if (!isMounted) return;
                setError('Failed to load warehouse receipts.');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, searchField, fromDate, untilDate, shippingType, agency, rowsPerPage]);

    // ── Filtering logic ───────────────────────────────────────────────────────
    const filteredWarehouses = warehouses.filter((wh) => {
        const wrNumber = wh.wr_number ?? '';
        const sender = wh.client_details?.name ?? '';
        const destination = wh.recipient_name ?? '';
        const date = wh.received_at?.slice(0, 10) ?? '';

        // Search term
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            if (searchField === 'all') {
                const matchesAny = (
                    wrNumber.toLowerCase().includes(term) ||
                    sender.toLowerCase().includes(term) ||
                    destination.toLowerCase().includes(term)
                );
                if (!matchesAny) return false;
            } else {
                const fieldMap: Record<SearchField, string> = {
                    all: '',
                    warehouseNumber: wrNumber,
                    sender: sender,
                    destination: destination,
                };
                if (!fieldMap[searchField].toLowerCase().includes(term)) return false;
            }
        }

        // Date range
        if (fromDate && date < fromDate) return false;
        if (untilDate && date > untilDate) return false;

        // Shipping type
        if (shippingType !== 'All' && wh.shipping_method !== shippingType) return false;

        // Agency
        if (agency !== 'All' && wh.associate_company?.toString() !== agency) return false;

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
                            <span className="lwp-stat-value">{warehouses.length}</span>
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
                            <option value="air">Air</option>
                            <option value="sea">Sea</option>
                            <option value="ground">Ground</option>
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

                {/* ── Table ── */}
                <div className="lwp-table-responsive">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                            Loading…
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
                            {error}
                        </div>
                    ) : (
                        <table className="lwp-table">
                            <thead>
                                <tr>
                                    <th>Warehouse #</th>
                                    <th>Sender</th>
                                    <th>Receiver</th>
                                    <th>Destination</th>
                                    <th>Type</th>
                                    <th>Agency</th>
                                    <th>Date</th>
                                    <th>Pcs</th>
                                    <th>Weight</th>
                                    <th>Volume</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length > 0 ? (
                                    paginated.map((wh, index) => {
                                        const totalPieces = wh.lines.reduce((sum, l) => sum + (l.pieces || 0), 0);
                                        const totalWeight = wh.lines.reduce((sum, l) => sum + parseFloat(l.weight ?? '0'), 0);
                                        const totalVolume = wh.lines.reduce((sum, l) => sum + parseFloat(l.volume_cf ?? '0'), 0);
                                        return (
                                            <tr
                                                key={wh.id}
                                                className={index % 2 === 0 ? 'lwp-row-even' : 'lwp-row-odd'}
                                            >
                                                <td>
                                                    <div className="lwp-wh-number">{wh.wr_number}</div>
                                                </td>
                                                <td>{wh.client_details?.name ?? '—'}</td>
                                                <td>{wh.recipient_name ?? '—'}</td>
                                                <td>{wh.client_details?.city ?? '—'}</td>
                                                <td>
                                                    {wh.shipping_method ? (
                                                        <span className={`lwp-badge ${SHIPPING_BADGE_CLASS[wh.shipping_method]}`}>
                                                            {wh.shipping_method.charAt(0).toUpperCase() + wh.shipping_method.slice(1)}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af' }}>—</span>
                                                    )}
                                                </td>
                                                <td>{wh.associate_company_details?.name ?? user?.company?.name ?? '—'}</td>
                                                <td>{wh.received_at?.slice(0, 10) ?? '—'}</td>
                                                <td>{totalPieces}</td>
                                                <td>{totalWeight > 0 ? `${totalWeight.toFixed(2)} lb` : '—'}</td>
                                                <td>{totalVolume > 0 ? `${totalVolume.toFixed(4)} ft³` : '—'}</td>
                                                <td>
                                                    {(() => {
                                                        const s = wh.wr_status_display;
                                                        if (!s || s.type === 'not_processed') {
                                                            return <span style={{ color: '#9ca3af', fontSize: '13px' }}>Not Processed</span>;
                                                        }
                                                        if (s.type === 'processed') {
                                                            return <span style={{ color: '#0052cc', fontWeight: 600, fontSize: '13px' }}>Processed · {s.reference}</span>;
                                                        }
                                                        return <span style={{ color: '#7c3aed', fontWeight: 600, fontSize: '13px' }}>Repacked · {s.reference}</span>;
                                                    })()}
                                                </td>
                                            </tr>
                                        );
                                    })
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
                    )}
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
