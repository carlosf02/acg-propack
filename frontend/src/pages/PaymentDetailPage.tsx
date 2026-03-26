import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getInvoiceDetail, Invoice } from "../features/billing/billing.api";

export default function PaymentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [invoice, setInvoice] = useState<Invoice | null>(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getInvoiceDetail(id)
            .then((data: Invoice) => setInvoice(data))
            .catch((err: any) => {
                console.error("Failed to fetch invoice", err);
                setError("Could not load invoice details.");
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
            <p>Loading receipt details...</p>
        </div>
    );

    if (error || !invoice) return (
        <div style={{ padding: 24 }}>
            <div style={{ color: "#ef4444", padding: 16, background: "#fef2f2", borderRadius: 8, border: "1px solid #fee2e2", marginBottom: 16 }}>
                {error || "Invoice not found."}
            </div>
            <button onClick={() => navigate("/finance/payments")} style={{ background: "transparent", border: "none", color: "#2563eb", fontWeight: 600, cursor: "pointer" }}>
                ← Back to History
            </button>
        </div>
    );

    const formattedDate = new Date(invoice.created_at).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const periodText = invoice.period_start && invoice.period_end ? (
        `${new Date(invoice.period_start).toLocaleDateString()} - ${new Date(invoice.period_end).toLocaleDateString()}`
    ) : null;

    return (
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 0" }}>
            <div style={{ marginBottom: 24 }}>
                <Link to="/finance/payments" style={{ textDecoration: "none", color: "#6b7280", fontSize: "0.875rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    ← Back to Payment History
                </Link>
            </div>

            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                {/* Header Gradient Area */}
                <div style={{ background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)", padding: "32px 40px", borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Receipt from</div>
                            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#111827" }}>ACG ProPack</h1>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827" }}>
                                {invoice.currency.toUpperCase()} ${invoice.amount_paid}
                            </div>
                            <div style={{ 
                                display: "inline-block", 
                                marginTop: 8, 
                                padding: "2px 8px", 
                                borderRadius: 4, 
                                fontSize: "0.75rem", 
                                fontWeight: 700, 
                                background: invoice.status === 'paid' ? "#dcfce7" : "#fef2f2",
                                color: invoice.status === 'paid' ? "#166534" : "#991b1b",
                                textTransform: "uppercase"
                            }}>
                                {invoice.status}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div style={{ padding: 40 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                        <div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Date Paid</label>
                                <div style={{ fontSize: "1rem", color: "#111827", fontWeight: 500 }}>{formattedDate}</div>
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Receipt Number</label>
                                <div style={{ fontSize: "0.875rem", color: "#4b5563", fontFamily: "monospace" }}>{invoice.stripe_invoice_id}</div>
                            </div>
                        </div>
                        <div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Plan</label>
                                <div style={{ fontSize: "1rem", color: "#111827", fontWeight: 600 }}>{invoice.plan_name || "AGC ProPack Subscription"}</div>
                            </div>
                            {periodText && (
                                <div style={{ marginBottom: 24 }}>
                                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Billing Period</label>
                                    <div style={{ fontSize: "0.875rem", color: "#4b5563" }}>{periodText}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: 32, padding: 24, background: "#f9fafb", borderRadius: 12, border: "1px solid #f3f4f6" }}>
                        <div style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.6 }}>
                            This receipt confirms your payment for AGC ProPack services. If you have any questions or require a formal PDF for tax purposes, you can use the original Stripe hosted receipt below.
                        </div>
                        {invoice.hosted_invoice_url && (
                            <a 
                                href={invoice.hosted_invoice_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                    display: "inline-block", 
                                    marginTop: 16, 
                                    color: "#2563eb", 
                                    textDecoration: "none", 
                                    fontSize: "0.875rem", 
                                    fontWeight: 700 
                                }}
                            >
                                View full details on Stripe →
                            </a>
                        )}
                    </div>
                </div>

                <div style={{ padding: "24px 40px", borderTop: "1px solid #f3f4f6", textAlign: "center", color: "#9ca3af", fontSize: "0.75rem" }}>
                    &copy; 2026 AGC ProPack. All rights reserved.
                </div>
            </div>
        </div>
    );
}
