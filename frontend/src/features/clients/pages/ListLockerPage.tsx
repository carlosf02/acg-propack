import { useState, useEffect } from 'react';
import './ListLockerPage.css';

// Type definition for Locker/Client
type LockerType = {
    id: string;
    clientName: string;
    createdAt: string;
    email: string;
    cellPhone: string;
    homePhone: string;
    city: string;
    state: string;
    country: string;
};

// Start with empty data until API integration
const lockersData: LockerType[] = [];

export default function ListLockerPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [untilDate, setUntilDate] = useState('');
    const [filterOption, setFilterOption] = useState('All');

    // Pagination states
    const [rowsPerPage, setRowsPerPage] = useState('10');
    const [currentPage, setCurrentPage] = useState(1);

    // Reset current page to 1 whenever search terms or row limits change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, fromDate, untilDate, filterOption, rowsPerPage]);

    // Apply filters
    const filteredLockers = lockersData.filter(locker => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return (
                locker.clientName.toLowerCase().includes(term) ||
                locker.email.toLowerCase().includes(term) ||
                locker.id.toLowerCase().includes(term) ||
                locker.cellPhone.includes(term) ||
                (locker.homePhone && locker.homePhone.includes(term))
            );
        }
        return true;
    });

    // Pagination math
    const totalPages = Math.max(1, Math.ceil(filteredLockers.length / Number(rowsPerPage)));
    const paginatedLockers = filteredLockers.slice(
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
        // Show a max span or all if it's small, doing all simple buttons for now up to totalPages
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
            <div className="llp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <h2 style={{ margin: 0 }}>Lockers</h2>
                <div className="llp-stats-card">
                    <div className="llp-stat-item">
                        <span className="llp-stat-label">Total:</span>
                        <span className="llp-stat-value">{lockersData.length}</span>
                    </div>
                    <div className="llp-stat-divider"></div>
                    <div className="llp-stat-item">
                        <span className="llp-stat-label">Filtered:</span>
                        <span className="llp-stat-value">{filteredLockers.length}</span>
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
                        placeholder="Number, Customer, Email, Phone..."
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
                    <table className="llp-table">
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Created At</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>City</th>
                                <th>State / Region</th>
                                <th>Country</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLockers.length > 0 ? (
                                paginatedLockers.map((locker, index) => (
                                    <tr key={locker.id} className={index % 2 === 0 ? 'llp-row-even' : 'llp-row-odd'}>
                                        <td>
                                            <div className="llp-client-name">{locker.clientName}</div>
                                            <div className="llp-client-id">{locker.id}</div>
                                        </td>
                                        <td>{locker.createdAt}</td>
                                        <td>{locker.email}</td>
                                        <td>
                                            <div className="llp-phone-main">{locker.cellPhone || 'N/A'}</div>
                                            {locker.homePhone && <div className="llp-phone-sub">Home: {locker.homePhone}</div>}
                                        </td>
                                        <td>{locker.city}</td>
                                        <td>{locker.state}</td>
                                        <td>{locker.country}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                                        No lockers found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
                            disabled={currentPage === 1}
                        >
                            &laquo;
                        </button>
                        <button
                            className="llp-page-btn llp-page-arrow"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            &lsaquo;
                        </button>

                        {renderPageButtons()}

                        <button
                            className="llp-page-btn llp-page-arrow"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            &rsaquo;
                        </button>
                        <button
                            className="llp-page-btn llp-page-arrow"
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
