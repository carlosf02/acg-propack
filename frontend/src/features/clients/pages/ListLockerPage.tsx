import { useState, useEffect } from 'react';
import { listClients } from '../clients.api';
import { Client } from '../types';
import './ListLockerPage.css';

export default function ListLockerPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [untilDate, setUntilDate] = useState('');
    const [filterOption, setFilterOption] = useState('All');

    // Data states
    const [clientsData, setClientsData] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Pagination states
    const [rowsPerPage, setRowsPerPage] = useState('10');
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch data on mount
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError('');

        listClients()
            .then(res => {
                if (!isMounted) return;
                // Support both Paginated<Client> and Client[]
                const data = Array.isArray(res) ? res : res.results;
                setClientsData(data);
            })
            .catch(err => {
                if (!isMounted) return;
                console.error("Failed to fetch clients:", err);
                setError('Failed to load clients. Please try again later.');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, []);

    // Reset current page to 1 whenever search terms or row limits change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, fromDate, untilDate, filterOption, rowsPerPage]);

    // Apply filters locally (for this phase, we map fields to existing filter logic)
    const filteredClients = clientsData.filter(client => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const fullName = `${client.name || ''} ${client.last_name || ''}`.trim().toLowerCase();
            return (
                fullName.includes(term) ||
                (client.email || '').toLowerCase().includes(term) ||
                (client.client_code || '').toLowerCase().includes(term) ||
                (client.cellphone || '').includes(term) ||
                (client.home_phone || '').includes(term)
            );
        }
        return true;
    });

    // Pagination math
    const totalPages = Math.max(1, Math.ceil(filteredClients.length / Number(rowsPerPage)));
    const paginatedClients = filteredClients.slice(
        (currentPage - 1) * Number(rowsPerPage),
        currentPage * Number(rowsPerPage)
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const renderPageButtons = () => {
        const buttons = [];
        for (let i = 1; i <= totalPages; i++) {
            buttons.push(
                <button
                    key={i}
                    className={`llp-page-btn ${currentPage === i ? 'llp-page-active' : ''}`}
                    onClick={() => handlePageChange(i)}
                >
                    {i}
                </button>
            );
        }
        return buttons;
    };

    return (
        <div className="llp-container">
            {/* Header Section with Inline Stats */}
            <div className="llp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Lockers (Clients)</h2>
                <div className="llp-stats-card">
                    <div className="llp-stat-item">
                        <span className="llp-stat-label">Total:</span>
                        <span className="llp-stat-value">{clientsData.length}</span>
                    </div>
                    <div className="llp-stat-divider"></div>
                    <div className="llp-stat-item">
                        <span className="llp-stat-label">Filtered:</span>
                        <span className="llp-stat-value">{filteredClients.length}</span>
                    </div>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="llp-card">
                {/* Search Bar */}
                <div className="llp-search-container">
                    <label className="llp-label">Search</label>
                    <input
                        type="search"
                        className="llp-input llp-search-input"
                        placeholder="Name, Code, Email, Phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="llp-filters-row">
                    <div className="llp-filter-group">
                        <label className="llp-label">From:</label>
                        <input
                            type="date"
                            className="llp-input llp-date-input"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="llp-filter-group">
                        <label className="llp-label">Until:</label>
                        <input
                            type="date"
                            className="llp-input llp-date-input"
                            value={untilDate}
                            onChange={(e) => setUntilDate(e.target.value)}
                        />
                    </div>
                    <div className="llp-filter-group">
                        <label className="llp-label">Filter:</label>
                        <select
                            className="llp-select"
                            value={filterOption}
                            onChange={(e) => setFilterOption(e.target.value)}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Data Table */}
                <div className="llp-table-responsive">
                    {loading ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Loading clients...</div>
                    ) : error ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#dc2626' }}>{error}</div>
                    ) : (
                        <table className="llp-table">
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th>Created At</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>City</th>
                                    <th>Postal Code</th>
                                    <th>Agency</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedClients.length > 0 ? (
                                    paginatedClients.map((client, index) => {
                                        const fullName = client.client_type === 'company'
                                            ? client.name
                                            : `${client.name || ''} ${client.last_name || ''}`.trim();

                                        // Format date if present
                                        const createdDate = client.created_at
                                            ? new Date(client.created_at).toLocaleDateString()
                                            : 'N/A';

                                        return (
                                            <tr key={client.id} className={index % 2 === 0 ? 'llp-row-even' : 'llp-row-odd'}>
                                                <td>
                                                    <div className="llp-client-name">{fullName || 'Unnamed'}</div>
                                                    <div className="llp-client-id">{client.client_code || `ID: ${client.id}`}</div>
                                                </td>
                                                <td>{createdDate}</td>
                                                <td>{client.email || '-'}</td>
                                                <td>
                                                    <div className="llp-phone-main">{client.cellphone || client.phone || 'N/A'}</div>
                                                    {client.home_phone && <div className="llp-phone-sub">Alt: {client.home_phone}</div>}
                                                </td>
                                                <td>{client.city || '-'}</td>
                                                <td>{client.postal_code || '-'}</td>
                                                <td>{client.associate_company_details?.name || '-'}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                                            No clients yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="llp-pagination-footer">
                    <div className="llp-rows-selector">
                        <span>Show up to</span>
                        <select
                            className="llp-select llp-select-inline"
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

                    <div className="llp-pagination-controls">
                        <button
                            className="llp-page-btn llp-page-arrow"
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1 || loading}
                        >
                            &laquo;
                        </button>
                        <button
                            className="llp-page-btn llp-page-arrow"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                        >
                            &lsaquo;
                        </button>

                        {renderPageButtons()}

                        <button
                            className="llp-page-btn llp-page-arrow"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || loading}
                        >
                            &rsaquo;
                        </button>
                        <button
                            className="llp-page-btn llp-page-arrow"
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
