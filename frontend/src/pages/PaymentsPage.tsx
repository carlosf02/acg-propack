import { useEffect, useState, Fragment } from "react";
import { useAuth } from "../features/auth/AuthContext";
import {
    getInvoices,
    Invoice,
    archiveInvoice,
    unarchiveInvoice
} from "../features/billing/billing.api";

export default function PaymentsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [showArchived, setShowArchived] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const fetchInvoices = () => {
        setLoading(true);
        getInvoices(showArchived)
            .then(setInvoices)
            .catch(err => {
                console.error("Failed to fetch invoices", err);
                setError("Could not load payment history.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchInvoices();
    }, [showArchived]);

    const handleArchive = async (id: number) => {
        if (!confirm("Hide this invoice from your main history? You can still find it by checking 'Show Archived'.")) return;
        setActionLoading(id);
        try {
            await archiveInvoice(id);
            setInvoices(prev => prev.filter(inv => inv.id !== id));
            if (expandedId === id) setExpandedId(null);
        } catch (err) {
            alert("Failed to archive invoice.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRestore = async (id: number) => {
        setActionLoading(id);
        try {
            await unarchiveInvoice(id);
            setInvoices(prev => prev.filter(inv => inv.id !== id));
            if (expandedId === id) setExpandedId(null);
        } catch (err) {
            alert("Failed to restore invoice.");
        } finally {
            setActionLoading(null);
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    if (loading) return (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
            <p style={{ margin: 0 }}>Loading payment history...</p>
        </div>
    );

    if (error) return (
        <div style={{ color: "#ef4444", padding: 16, background: "#fef2f2", borderRadius: 8, border: "1px solid #fee2e2" }}>
            {error}
        </div>
    );

    return (
        <div style={{ maxWidth: 1200 }}>
            {/* Header Area */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "1.875rem", fontWeight: 800, color: "#111827" }}>Payment History</h1>
                    <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "1rem" }}>
                        Review your past transactions and billing details.
                    </p>
                </div>
                <div style={{ paddingBottom: 4 }}>
                    <label style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        fontWeight: 600,
                        padding: "6px 12px",
                        background: showArchived ? "#f3f4f6" : "transparent",
                        borderRadius: 8,
                        transition: "all 0.2s",
                        border: "1px solid transparent",
                        userSelect: "none"
                    }}>
                        <input
                            type="checkbox"
                            checked={showArchived}
                            onChange={(e) => setShowArchived(e.target.checked)}
                            style={{ width: 16, height: 16, cursor: "pointer" }}
                        />
                        Show Archived
                    </label>
                </div>
            </div>

            {/* Invoices List */}
            <div style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", tableLayout: "fixed" }}>
                    <thead>
                        <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                            <th style={{ ...thStyle, width: "15%" }}>Date</th>
                            <th style={{ ...thStyle, width: "40%" }}>Invoice</th>
                            <th style={{ ...thStyle, width: "15%" }}>Amount</th>
                            <th style={{ ...thStyle, width: "15%" }}>Status</th>
                            <th style={{ ...thStyle, width: "15%" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: "80px 24px", textAlign: "center", color: "#6b7280" }}>
                                    <div style={{ fontSize: "2rem", marginBottom: 16 }}>📄</div>
                                    <h3 style={{ margin: "0 0 8px 0", color: "#111827", fontSize: "1.125rem", fontWeight: 700 }}>
                                        {showArchived ? "No archived transactions" : "No active transactions"}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: "0.875rem" }}>
                                        {showArchived ? "Hidden invoices will be listed here after being archived." : "Your billing history will appear here once you subscribe to a plan."}
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            invoices.map((invoice) => (
                                <Fragment key={invoice.id}>
                                    <tr style={{
                                        borderBottom: expandedId === invoice.id ? "none" : "1px solid #f3f4f6",
                                        transition: "background 0.2s",
                                        background: expandedId === invoice.id ? "#f9fafb" : "transparent"
                                    }}>
                                        <td style={{ ...tdStyle, fontWeight: 500, width: "15%" }}>
                                            {new Date(invoice.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td style={{ ...tdStyle, color: "#111827", width: "40%" }}>
                                            <div style={{ fontWeight: 700 }}>{invoice.plan_name || "Basic Plan"}</div>
                                            <div style={{ fontSize: "0.8125rem", color: "#6b7280", fontWeight: 500 }}>Monthly subscription</div>
                                        </td>
                                        <td style={{ ...tdStyle, fontWeight: 700, color: "#111827", width: "15%" }}>
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency.toUpperCase() }).format(parseFloat(invoice.amount_paid))}
                                        </td>
                                        <td style={{ ...tdStyle, width: "15%" }}>
                                            <span style={{
                                                padding: "4px 10px",
                                                borderRadius: 12,
                                                fontSize: "0.75rem",
                                                fontWeight: 800,
                                                textTransform: "uppercase",
                                                background: invoice.status === 'paid' ? "#f0fdf4" : "#fef2f2",
                                                color: invoice.status === 'paid' ? "#166534" : "#991b1b",
                                                border: `1px solid ${invoice.status === 'paid' ? "#dcfce7" : "#fee2e2"}`
                                            }}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td style={{ ...tdStyle, width: "15%" }}>
                                            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                                                <button
                                                    onClick={() => toggleExpand(invoice.id)}
                                                    style={{
                                                        background: "transparent",
                                                        border: "none",
                                                        color: "#2563eb",
                                                        fontWeight: 700,
                                                        fontSize: "0.875rem",
                                                        cursor: "pointer",
                                                        padding: "4px 0",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 6,
                                                        minWidth: 80, // Stable width
                                                        textAlign: "left",
                                                        outline: "none" // Fix layout shift from focus borders
                                                    }}
                                                >
                                                    Details
                                                    <span style={{
                                                        fontSize: "10px",
                                                        transition: "transform 0.2s",
                                                        transform: expandedId === invoice.id ? "rotate(180deg)" : "rotate(0deg)"
                                                    }}>
                                                        ▼
                                                    </span>
                                                </button>

                                                {isAdmin && (
                                                    <button
                                                        onClick={() => showArchived ? handleRestore(invoice.id) : handleArchive(invoice.id)}
                                                        disabled={actionLoading === invoice.id}
                                                        style={{
                                                            background: "transparent",
                                                            border: "none",
                                                            color: "#9ca3af",
                                                            fontWeight: 600,
                                                            fontSize: "0.8125rem",
                                                            cursor: actionLoading === invoice.id ? "not-allowed" : "pointer",
                                                            padding: 0,
                                                            opacity: 0.7,
                                                            outline: "none"
                                                        }}
                                                    >
                                                        {actionLoading === invoice.id ? "..." : (showArchived ? "Restore" : "Archive")}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedId === invoice.id && (
                                        <tr style={{ background: "#f9fafb" }}>
                                            <td colSpan={5} style={{ padding: "0 24px 24px 24px" }}>
                                                <div style={{
                                                    background: "white",
                                                    borderRadius: 12,
                                                    border: "1px solid #e5e7eb",
                                                    padding: "24px",
                                                    display: "grid",
                                                    gridTemplateColumns: "repeat(4, 1fr)",
                                                    gap: "32px",
                                                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
                                                }}>
                                                    {/* Company Block */}
                                                    <div>
                                                        <label style={labelStyle}>Company</label>
                                                        <div style={valueStyle}>{invoice.company_name}</div>
                                                        <div style={subValueStyle}>
                                                            <div style={{ fontWeight: 600, color: "#374151" }}>{invoice.billing_name}</div>
                                                            <div>{invoice.billing_email}</div>
                                                        </div>
                                                    </div>

                                                    {/* Subscription Block */}
                                                    <div>
                                                        <label style={labelStyle}>Subscription</label>
                                                        <div style={valueStyle}>{invoice.plan_name || "Basic Plan"}</div>
                                                        <div style={{ ...subValueStyle, color: "#4b5563", fontWeight: 600 }}>Monthly subscription</div>
                                                        {invoice.period_start && invoice.period_end && (
                                                            <div style={subValueStyle}>
                                                                {(() => {
                                                                    const start = new Date(invoice.period_start);
                                                                    let end = new Date(invoice.period_end);
                                                                    // Fix if start and end are the same day (force a 1-month range for display)
                                                                    if (start.toDateString() === end.toDateString()) {
                                                                        end = new Date(start);
                                                                        end.setMonth(end.getMonth() + 1);
                                                                    }
                                                                    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} to ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Payment Block */}
                                                    <div>
                                                        <label style={labelStyle}>Payment</label>
                                                        <div style={valueStyle}>{invoice.payment_method_details || "Card ending in ••••"}</div>
                                                        <div style={{ ...subValueStyle, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                                                Invoice ID: <span style={{ fontFamily: "monospace", color: "#111827" }}>{invoice.stripe_invoice_id}</span>
                                                            </div>
                                                            <div style={{
                                                                display: "inline-block",
                                                                alignSelf: "start",
                                                                fontSize: "0.6875rem",
                                                                fontWeight: 800,
                                                                textTransform: "uppercase",
                                                                color: invoice.status === 'paid' ? "#059669" : "#dc2626",
                                                                background: invoice.status === 'paid' ? "#ecfdf5" : "#fef2f2",
                                                                padding: "2px 6px",
                                                                borderRadius: 4,
                                                                border: `1px solid ${invoice.status === 'paid' ? "#d1fae5" : "#fee2e2"}`
                                                            }}>
                                                                {invoice.status}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Amount Block */}
                                                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end" }}>
                                                        <div style={{ textAlign: "right" }}>
                                                            <label style={{ ...labelStyle, textAlign: "right" }}>Total Amount</label>
                                                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                                                                {invoice.currency.toUpperCase()} ${invoice.amount_paid}
                                                            </div>
                                                        </div>
                                                        {invoice.hosted_invoice_url && (
                                                            <a
                                                                href={invoice.hosted_invoice_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    color: "#2563eb",
                                                                    textDecoration: "none",
                                                                    fontSize: "0.875rem",
                                                                    fontWeight: 700,
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 4,
                                                                    padding: "6px 12px",
                                                                    background: "#f0f7ff",
                                                                    borderRadius: 6,
                                                                    transition: "background 0.2s",
                                                                    border: "1px solid #dbeafe",
                                                                    outline: "none"
                                                                }}
                                                                onMouseOver={(e) => e.currentTarget.style.background = "#e0efff"}
                                                                onMouseOut={(e) => e.currentTarget.style.background = "#f0f7ff"}
                                                            >
                                                                Download Receipt ↗
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <p style={{ marginTop: 32, fontSize: "0.875rem", color: "#9ca3af", textAlign: "center" }}>
                Transactions are processed securely by Stripe. Need help? <a href="mailto:support@agcpropack.example" style={{ color: "#6b7280", textDecoration: "none", fontWeight: 600 }}>Contact Support</a>
            </p>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: "16px 24px",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
};

const tdStyle: React.CSSProperties = {
    padding: "20px 24px",
    fontSize: "0.9375rem",
    color: "#4b5563"
};

const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.6875rem",
    fontWeight: 800,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 8
};

const valueStyle: React.CSSProperties = {
    fontSize: "0.9375rem",
    fontWeight: 700,
    color: "#111827"
};

const subValueStyle: React.CSSProperties = {
    fontSize: "0.8125rem",
    color: "#6b7280",
    marginTop: 4,
    lineHeight: 1.5
};
