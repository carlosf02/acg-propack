import { useEffect, useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { 
    listPaymentMethods, 
    detachPaymentMethod, 
    setDefaultPaymentMethod, 
    PaymentMethod, 
    createSetupIntent 
} from "../features/billing/billing.api";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import StripePaymentForm from "../components/StripePaymentForm";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function PaymentMethodsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showAddCard, setShowAddCard] = useState(false);
    const [setupIntentSecret, setSetupIntentSecret] = useState<string | null>(null);
    const [fetchingSecret, setFetchingSecret] = useState(false);

    const fetchMethods = () => {
        setLoading(true);
        listPaymentMethods()
            .then(setMethods)
            .catch(err => {
                console.error("Failed to fetch payment methods", err);
                setError("Could not load payment methods.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchMethods();
    }, []);

    const handleRemove = async (id: string) => {
        if (!confirm("Are you sure you want to remove this payment method?")) return;
        
        setActionLoading(id);
        try {
            await detachPaymentMethod(id);
            fetchMethods();
        } catch (err: any) {
            alert(err.message || "Failed to remove card.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleSetDefault = async (id: string) => {
        setActionLoading(id);
        try {
            await setDefaultPaymentMethod(id);
            fetchMethods();
        } catch (err: any) {
            alert(err.message || "Failed to set default card.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleAddSuccess = () => {
        setShowAddCard(false);
        setSetupIntentSecret(null);
        fetchMethods();
    };

    const handleOpenAddCard = async () => {
        setFetchingSecret(true);
        try {
            const { clientSecret } = await createSetupIntent();
            setSetupIntentSecret(clientSecret);
            setShowAddCard(true);
        } catch (err: any) {
            alert(err.message || "Failed to initialize payment form.");
        } finally {
            setFetchingSecret(false);
        }
    };

    if (loading) return (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
            <p style={{ margin: 0 }}>Loading payment methods...</p>
        </div>
    );
    
    if (error) return (
        <div style={{ color: "#ef4444", padding: 16, background: "#fef2f2", borderRadius: 8, border: "1px solid #fee2e2" }}>
            {error}
        </div>
    );

    return (
        <div style={{ maxWidth: 800 }}>
            {/* Header Area */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "1.875rem", fontWeight: 800, color: "#111827" }}>Payment Methods</h1>
                    <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "1rem" }}>
                        Manage your credit cards and choose your default payment method.
                    </p>
                </div>
                {isAdmin && !showAddCard && (
                    <button 
                        onClick={handleOpenAddCard}
                        disabled={fetchingSecret}
                        style={{
                            background: "#2563eb",
                            color: "white",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: 8,
                            fontWeight: 700,
                            cursor: fetchingSecret ? "not-allowed" : "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)"
                        }}
                    >
                        {fetchingSecret ? "Connecting..." : "+ Add Card"}
                    </button>
                )}
            </div>

            {showAddCard ? (
                <div style={{ background: "white", padding: 32, borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", marginBottom: 40 }}>
                    <div style={{ marginBottom: 24 }}>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Add New Card</h2>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>Your card will be saved securely for future subscription renewals.</p>
                    </div>
                    
                    {setupIntentSecret && (
                        <Elements 
                            stripe={stripePromise} 
                            options={{ 
                                clientSecret: setupIntentSecret,
                                appearance: { theme: 'stripe', variables: { colorPrimary: '#2563eb' } },
                                developerTools: { assistant: { enabled: false } }
                            } as any}
                        >
                            <StripePaymentForm 
                                onSuccess={handleAddSuccess} 
                                onCancel={() => {
                                    setShowAddCard(false);
                                    setSetupIntentSecret(null);
                                }} 
                                onReady={() => {}}
                                mode="setup"
                            />
                        </Elements>
                    )}
                </div>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {methods.length === 0 ? (
                    <div style={{ padding: "64px 24px", textAlign: "center", background: "#f9fafb", borderRadius: 16, border: "1px dashed #d1d5db" }}>
                        <h3 style={{ margin: "0 0 8px 0", color: "#111827", fontSize: "1.125rem" }}>No cards saved</h3>
                        <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>Add a payment method to get started with your ProPack subscription.</p>
                    </div>
                ) : (
                    methods.map((pm) => (
                        <div key={pm.id} style={{
                            background: "white",
                            padding: 24,
                            borderRadius: 16,
                            border: "1px solid #e5e7eb",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            transition: "all 0.2s ease",
                            boxShadow: pm.is_default ? "0 4px 6px -1px rgba(0,0,0,0.05)" : "none"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                                <div style={{ 
                                    background: "#f9fafb", 
                                    padding: "10px 14px", 
                                    borderRadius: 8, 
                                    border: "1px solid #e5e7eb", 
                                    fontWeight: 800, 
                                    fontSize: "0.75rem",
                                    color: "#374151",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em"
                                }}>
                                    {pm.brand}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, color: "#111827", fontSize: "1rem", display: "flex", alignItems: "center", gap: 10 }}>
                                        •••• •••• •••• {pm.last4}
                                        {pm.is_default && (
                                            <span style={{ 
                                                padding: "2px 8px", 
                                                borderRadius: 12, 
                                                background: "#f0fdf4", 
                                                color: "#166534", 
                                                fontSize: "0.625rem", 
                                                fontWeight: 800,
                                                textTransform: "uppercase",
                                                border: "1px solid #dcfce7"
                                            }}>
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: 4 }}>
                                        Expires {pm.exp_month.toString().padStart(2, '0')}/{pm.exp_year}
                                    </div>
                                </div>
                            </div>

                            {isAdmin && (
                                <div style={{ display: "flex", gap: 10 }}>
                                    {!pm.is_default && (
                                        <button
                                            onClick={() => handleSetDefault(pm.id)}
                                            disabled={!!actionLoading}
                                            style={{
                                                background: "white",
                                                border: "1px solid #e5e7eb",
                                                padding: "8px 16px",
                                                borderRadius: 8,
                                                fontSize: "0.875rem",
                                                fontWeight: 600,
                                                cursor: actionLoading ? "not-allowed" : "pointer",
                                                color: "#374151",
                                                transition: "all 0.2s ease"
                                            }}
                                        >
                                            {actionLoading === pm.id ? "..." : "Set as Default"}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleRemove(pm.id)}
                                        disabled={!!actionLoading}
                                        style={{
                                            background: "white",
                                            border: "1px solid #fee2e2",
                                            padding: "8px 16px",
                                            borderRadius: 8,
                                            fontSize: "0.875rem",
                                            fontWeight: 600,
                                            cursor: actionLoading ? "not-allowed" : "pointer",
                                            color: "#dc2626",
                                            transition: "all 0.2s ease"
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {!isAdmin && (
                <div style={{ marginTop: 32, padding: 16, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.8125rem", color: "#6b7280", display: "flex", gap: 10, alignItems: "center" }}>
                    <span>ℹ️</span> Payment method management is restricted to company administrators.
                </div>
            )}
        </div>
    );
}
