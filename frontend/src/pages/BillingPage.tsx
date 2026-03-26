import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { 
    getBillingSummary, 
    createSubscriptionIntent,
    subscribeWithSavedCard,
    cancelSubscription,
    syncCheckout,
    queuePlanSwitch,
    cancelQueuedSwitch,
    BillingSummary
} from "../features/billing/billing.api";
import { PLANS } from "../features/billing/plans.data";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import StripePaymentForm from "../components/StripePaymentForm";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

type BillingState = 'ACTIVE' | 'ACTIVE_WITH_QUEUED_SWITCH' | 'CANCELED_BUT_ACTIVE' | 'EXPIRED';

export default function BillingPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<BillingSummary | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [intentType, setIntentType] = useState<'payment' | 'setup' | null>('payment');
    const [amountDue, setAmountDue] = useState<number>(0);
    const [subscriptionAction, setSubscriptionAction] = useState<'start' | 'upgrade' | 'downgrade' | 'resume' | 'no-op' | null>(null);
    const [requiresPMCollection, setRequiresPMCollection] = useState<boolean>(false);
    const [formReady, setFormReady] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    
    // UI State
    const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | null>(null);
    const [checkoutType, setCheckoutType] = useState<'default' | 'new' | null>(null);

    const fetchBillingData = async () => {
        setLoading(true);
        try {
            const summary = await getBillingSummary();
            setData(summary);
            
            // Default checkout mode logic
            if (summary.default_payment_method) {
                setCheckoutType('default');
            } else {
                setCheckoutType('new');
            }
        } catch (err) {
            console.error("Failed to fetch billing data", err);
            setError("Could not load billing information.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBillingData();
    }, []);

    // State Derivation
    const billingState: BillingState = (() => {
        if (!data) return 'ACTIVE';
        // If not active and not trialing, they have no access
        if (!data.is_active && data.status !== 'trialing') return 'EXPIRED';
        if (data.cancel_at_period_end) return 'CANCELED_BUT_ACTIVE';
        if (data.queued_plan) return 'ACTIVE_WITH_QUEUED_SWITCH';
        return 'ACTIVE';
    })();

    const currentPlan = data?.plan; // 'Basic' or 'Pro' or null

    const handleSelectPlan = async (plan: 'basic' | 'pro') => {
        if (!isAdmin) return;
        
        const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
        
        // 1. Logic for ACTIVE: Switch queues for next cycle
        if (billingState === 'ACTIVE') {
            if (currentPlan === planName) return; // Already on it
            
            if (!confirm(`Switch to ${planName} starting next billing cycle?`)) return;
            
            setActionLoading(true);
            try {
                await queuePlanSwitch(plan);
                await fetchBillingData();
            } catch (err: any) {
                alert(err.message || "Failed to queue plan switch.");
            } finally {
                setActionLoading(false);
            }
            return;
        }

        // 2. Logic for ACTIVE_WITH_QUEUED_SWITCH: Block or handle
        if (billingState === 'ACTIVE_WITH_QUEUED_SWITCH') {
            if (data?.queued_plan === planName) {
                // Clicking the already queued plan: maybe offer to cancel?
                return;
            }
            alert("A plan switch is already queued. Cancel it first to select a different plan.");
            return;
        }

        // 3. Logic for CANCELED_BUT_ACTIVE: Only allow resume
        if (billingState === 'CANCELED_BUT_ACTIVE') {
            if (currentPlan === planName) {
                handleResumeInitiate();
            } else {
                alert("Please resume your current plan first before switching to another plan.");
            }
            return;
        }

        // 4. Logic for EXPIRED: Blocked
        if (billingState === 'EXPIRED') {
            return;
        }
    };

    const handleResumeInitiate = async () => {
        if (!data?.plan) return;
        const planId = data.plan.toLowerCase() as 'basic' | 'pro';
        
        setSelectedPlan(planId);
        setClientSecret(null);
        setFormReady(false);
        setRefreshKey(prev => prev + 1);
        setActionLoading(true);

        try {
            const result = await createSubscriptionIntent(planId, true); // Always save card for subscriptions
            setClientSecret(result.clientSecret);
            setIntentType(result.intentType);
            setAmountDue(result.amountDue);
            setSubscriptionAction(result.subscriptionAction);
            setRequiresPMCollection(result.requiresPaymentMethodCollection);

            if (result.requiresPaymentMethodCollection) {
                setCheckoutType('new');
            } else if (result.hasDefaultCard) {
                setCheckoutType('default');
            } else {
                setCheckoutType('new');
            }
        } catch (err: any) {
            alert(err.message || "Failed to initialize resume.");
            setSelectedPlan(null);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelQueuedAction = async () => {
        if (!confirm("Remove the scheduled plan switch?")) return;
        setActionLoading(true);
        try {
            await cancelQueuedSwitch();
            await fetchBillingData();
        } catch (err: any) {
            alert(err.message || "Failed to cancel scheduled switch.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelSubscriptionAction = async () => {
        const msg = billingState === 'ACTIVE_WITH_QUEUED_SWITCH' 
            ? "Are you sure? This will cancel your subscription AND remove your scheduled plan switch."
            : "Are you sure you want to cancel your subscription? You will retain access until the end of your current period.";
            
        if (!confirm(msg)) return;
        
        setActionLoading(true);
        try {
            await cancelSubscription();
            await fetchBillingData();
        } catch (err: any) {
            alert(err.message || "Failed to cancel subscription.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleExecuteSubscription = async () => {
        if (!selectedPlan) return;
        
        setActionLoading(true);
        try {
            if (checkoutType === 'default') {
                await subscribeWithSavedCard(selectedPlan);
                handlePaymentSuccess();
            }
        } catch (err: any) {
            alert(err.message || "Failed to complete subscription.");
        } finally {
            setActionLoading(false);
        }
    };

    const handlePaymentSuccess = async () => {
        try {
            await syncCheckout();
        } catch (err) {
            console.error("Post-payment sync failed", err);
        }
        
        setSelectedPlan(null);
        setClientSecret(null);
        setIntentType('payment');
        fetchBillingData();
    };

    const handlePrepareNewCard = async (plan: 'basic' | 'pro') => {
        setActionLoading(true);
        setClientSecret(null);
        setFormReady(false);
        setRefreshKey(prev => prev + 1);
        try {
            const result = await createSubscriptionIntent(plan, true); // Always save card
            setClientSecret(result.clientSecret);
            setIntentType(result.intentType);
            setAmountDue(result.amountDue);
            setSubscriptionAction(result.subscriptionAction);
            setRequiresPMCollection(result.requiresPaymentMethodCollection);
            setCheckoutType('new');
        } catch (err: any) {
            alert(err.message || "Failed to initialize payment form.");
        } finally {
            setActionLoading(false);
        }
    };

    useEffect(() => {
        if (checkoutType === 'new' && selectedPlan && !actionLoading && !clientSecret) {
            handlePrepareNewCard(selectedPlan);
        }
    }, [checkoutType, selectedPlan]);

    if (loading) return (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
            <p style={{ margin: 0 }}>Loading billing details...</p>
        </div>
    );
    
    if (error) return (
        <div style={{ color: "#ef4444", padding: 16, background: "#fef2f2", borderRadius: 8, border: "1px solid #fee2e2" }}>
            {error}
        </div>
    );

    if (!data) return null;

    return (
        <div style={{ maxWidth: 1000 }}>
            <div style={{ marginBottom: "2.5rem" }}>
                <h1 style={{ margin: 0, fontSize: "1.875rem", fontWeight: 800, color: "#111827" }}>Billing & Subscription</h1>
                <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: "1rem" }}>
                    Manage your company plan and payment settings.
                </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                    
                    {/* --- 1. Subscription Status & Renewal Messaging --- */}
                    <div style={{ 
                        background: "white", 
                        padding: 32, 
                        borderRadius: 24, 
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#111827" }}>Subscription Status</h2>
                                <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
                                    {billingState === 'EXPIRED' ? 'Your access has ended.' : `You are currently on the ${data?.plan} plan.`}
                                </p>
                            </div>
                            <div style={{ 
                                padding: "6px 14px", 
                                borderRadius: 100, 
                                fontSize: "0.75rem", 
                                fontWeight: 800, 
                                textTransform: "uppercase",
                                border: "1px solid",
                                ...(billingState === 'ACTIVE' || billingState === 'ACTIVE_WITH_QUEUED_SWITCH' 
                                    ? { background: "#f0fdf4", color: "#166534", borderColor: "#dcfce7" }
                                    : billingState === 'CANCELED_BUT_ACTIVE' 
                                    ? { background: "#fff7ed", color: "#c2410c", borderColor: "#ffedd5" }
                                    : { background: "#fef2f2", color: "#991b1b", borderColor: "#fee2e2" })
                            }}>
                                {data?.status.replace(/_/g, ' ') || 'unknown'}
                            </div>
                        </div>

                        {/* Renewal / Expiry Info */}
                        <div style={{ padding: 20, background: "#f9fafb", borderRadius: 16 }}>
                            {data?.auto_renew_enabled && data.has_default_payment_method ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 4px #10b98115" }}></div>
                                    <div style={{ fontSize: "0.9375rem", color: "#374151" }}>
                                        <strong>Automatic renewal is enabled.</strong> Your default card ending in <strong>{data.default_payment_method_last4}</strong> will be charged on <strong>{new Date(data.next_billing_date!).toLocaleDateString()}</strong>.
                                    </div>
                                </div>
                            ) : billingState === 'CANCELED_BUT_ACTIVE' ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f97316", boxShadow: "0 0 0 4px #f9731615" }}></div>
                                    <div style={{ fontSize: "0.9375rem", color: "#374151" }}>
                                        <strong>Subscription canceled.</strong> Your access will expire on <strong>{new Date(data.next_billing_date!).toLocaleDateString()}</strong>.
                                    </div>
                                </div>
                            ) : billingState === 'ACTIVE' && !data?.has_default_payment_method ? (
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                    <div style={{ fontSize: "1.25rem", lineHeight: 1 }}>⚠️</div>
                                    <div>
                                        <div style={{ fontWeight: 700, color: "#991b1b", fontSize: "0.9375rem" }}>No default payment method is on file.</div>
                                        <div style={{ fontSize: "0.875rem", color: "#b91c1c", marginTop: 4, lineHeight: 1.5 }}>
                                            Add a card to avoid failed renewal and possible loss of access to your company account.
                                        </div>
                                        <Link to="/finance/payment-methods" style={{ 
                                            display: "inline-block", 
                                            marginTop: 12, 
                                            background: "#991b1b", 
                                            color: "white", 
                                            padding: "8px 16px", 
                                            borderRadius: 8, 
                                            fontSize: "0.8125rem", 
                                            fontWeight: 700, 
                                            textDecoration: "none" 
                                        }}>
                                            Add Payment Method
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ fontSize: "0.9375rem", color: "#6b7280" }}>
                                    {billingState === 'EXPIRED' ? 'Subscription has ended.' : 'Subscription state pending...'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- 2. Plan Selection --- */}
                    <div style={{ 
                        opacity: billingState === 'EXPIRED' ? 0.6 : 1,
                        pointerEvents: billingState === 'EXPIRED' ? 'none' : 'auto'
                    }}>
                        <div style={{ marginBottom: 20 }}>
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", margin: 0 }}>Available Plans</h2>
                            <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
                                {billingState === 'CANCELED_BUT_ACTIVE' ? 'Resume your plan to keep access.' : 'Upgrade or downgrade your subscription.'}
                            </p>
                        </div>

                        <div style={{ 
                            display: "grid", 
                            gridTemplateColumns: "1fr 1fr", 
                            gap: 20
                        }}>
                            {PLANS.map((plan) => {
                                const isCurrent = currentPlan === plan.name;
                                const isQueued = data?.queued_plan === plan.name;
                                const isSelected = selectedPlan === plan.id;
                                
                                // Badge logic
                                let badge = null;
                                if (isCurrent) {
                                    if (billingState === 'CANCELED_BUT_ACTIVE') {
                                        badge = { text: "Canceled", bg: "#fff7ed", color: "#c2410c", border: "#ffedd5" };
                                    } else {
                                        badge = { text: "Current Plan", bg: "#f0fdf4", color: "#166534", border: "#dcfce7" };
                                    }
                                } else if (isQueued) {
                                    badge = { text: "Planned Next Cycle", bg: "#eff6ff", color: "#1e40af", border: "#dbeafe" };
                                }

                                return (
                                    <div key={plan.id} style={{ 
                                        background: "white", 
                                        padding: 30, 
                                        borderRadius: 20, 
                                        border: `3px solid ${isCurrent ? '#2563eb' : (isQueued || isSelected ? '#2563eb40' : '#e5e7eb')}`,
                                        position: "relative",
                                        transition: "all 0.2s ease",
                                        boxShadow: isCurrent ? "0 10px 15px -3px rgba(37, 99, 235, 0.1)" : "none",
                                        cursor: (isCurrent && billingState !== 'CANCELED_BUT_ACTIVE') || isQueued ? "default" : "pointer",
                                        display: "flex",
                                        flexDirection: "column"
                                    }} onClick={() => handleSelectPlan(plan.id as 'basic' | 'pro')}>
                                        <div style={{ 
                                            fontWeight: 700, 
                                            color: plan.id === 'pro' ? "#2563eb" : "#4b5563", 
                                            fontSize: "0.875rem", 
                                            textTransform: "uppercase", 
                                            letterSpacing: "0.05em" 
                                        }}>{plan.name}</div>
                                        <div style={{ fontSize: "2.25rem", fontWeight: 800, marginTop: 12, color: "#111827" }}>
                                            ${plan.price}<span style={{ fontSize: "1rem", color: "#6b7280", fontWeight: 400 }}>/mo</span>
                                        </div>
                                        
                                        <p style={{ margin: "12px 0 0 0", fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.5 }}>
                                            {plan.description}
                                        </p>

                                        {badge && (
                                            <div style={{ 
                                                position: "absolute", 
                                                top: 16, 
                                                right: 16, 
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "flex-end",
                                                gap: 4
                                            }}>
                                                <div style={{ 
                                                    background: badge.bg, 
                                                    color: badge.color, 
                                                    padding: "4px 10px", 
                                                    borderRadius: 20, 
                                                    fontSize: "0.75rem", 
                                                    fontWeight: 800,
                                                    border: `1px solid ${badge.border}`,
                                                    textTransform: "uppercase"
                                                }}>
                                                    {badge.text}
                                                </div>
                                            </div>
                                        )}

                                        <ul style={{ padding: 0, margin: "24px 0", listStyle: "none", fontSize: "0.9375rem", color: "#4b5563" }}>
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                                                    <span>✓</span> {feature}
                                                </li>
                                            ))}
                                        </ul>

                                        {isAdmin && (
                                            <div style={{ marginTop: "auto", paddingTop: 16 }}>
                                                {isCurrent ? (
                                                    billingState === 'CANCELED_BUT_ACTIVE' ? (
                                                        <div style={{ width: "100%", background: "#2563eb", color: "white", textAlign: "center", padding: "12px", borderRadius: 10, fontWeight: 700 }}>Resume Plan</div>
                                                    ) : (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleCancelSubscriptionAction(); }}
                                                            disabled={actionLoading}
                                                            style={{ width: "100%", background: "transparent", color: "#dc2626", border: "1px solid #fee2e2", padding: "10px", borderRadius: 10, fontSize: "0.8125rem", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer" }}
                                                        >
                                                            Cancel Subscription
                                                        </button>
                                                    )
                                                ) : isQueued ? (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleCancelQueuedAction(); }}
                                                        disabled={actionLoading}
                                                        style={{ width: "100%", background: "transparent", color: "#2563eb", border: "1px solid #dbeafe", padding: "10px", borderRadius: 10, fontSize: "0.8125rem", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer" }}
                                                    >
                                                        Cancel Scheduled Change
                                                    </button>
                                                ) : (
                                                    billingState === 'ACTIVE' ? (
                                                        <div style={{ width: "100%", background: "#f3f4f6", color: "#374151", textAlign: "center", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: "0.875rem" }}>
                                                            Switch to {plan.name} next cycle
                                                        </div>
                                                    ) : (
                                                        <div style={{ textAlign: "center", fontSize: "0.875rem", color: "#9ca3af", fontWeight: 500, padding: "12px" }}>
                                                            Switching disabled
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Integrated Checkout Panel (for Resume) */}
                    {selectedPlan && (
                        <div style={{ 
                            background: "white", 
                            padding: 32, 
                            borderRadius: 24, 
                            border: "1px solid #2563eb", 
                            boxShadow: "0 20px 25px -5px rgba(37, 99, 235, 0.1)",
                            animation: "slideUp 0.3s ease"
                        }}>
                             <h3 style={{ marginTop: 0, marginBottom: 24, fontSize: "1.25rem", fontWeight: 700 }}>
                                {subscriptionAction === 'resume' ? "Confirm Plan Resume" : `Subscribe to ${selectedPlan === 'pro' ? 'Pro' : 'Basic'}`}
                            </h3>

                            {amountDue > 0 && (
                                <div style={{ marginBottom: 24, padding: "12px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #dcfce7", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.875rem", color: "#166534", fontWeight: 600 }}>Total due now:</span>
                                    <span style={{ fontSize: "1.125rem", color: "#166534", fontWeight: 800 }}>${(amountDue / 100).toFixed(2)}</span>
                                </div>
                            )}
                            
                            {/* Payment Method Selection */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                                {!requiresPMCollection && data?.default_payment_method && (
                                    <label style={{ 
                                        display: "flex", 
                                        alignItems: "center", 
                                        gap: 12, 
                                        padding: "14px 20px", 
                                        borderRadius: 12, 
                                        border: `2px solid ${checkoutType === 'default' ? '#2563eb' : '#f3f4f6'}`,
                                        cursor: "pointer",
                                        background: checkoutType === 'default' ? "#eff6ff" : "white",
                                        transition: "all 0.2s ease"
                                    }}>
                                        <div style={{ 
                                            width: 18, 
                                            height: 18, 
                                            borderRadius: "50%", 
                                            border: `2px solid ${checkoutType === 'default' ? '#2563eb' : '#d1d5db'}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "white"
                                        }}>
                                            {checkoutType === 'default' && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#2563eb" }} />}
                                        </div>
                                        <input 
                                            type="radio" 
                                            name="checkout" 
                                            checked={checkoutType === 'default'} 
                                            onChange={() => {
                                                setCheckoutType('default');
                                                setClientSecret(null);
                                            }}
                                            style={{ display: "none" }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Use default card ending in {data.default_payment_method.last4}</div>
                                            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{data.default_payment_method.brand.toUpperCase()}</div>
                                        </div>
                                    </label>
                                )}

                                <label style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: 12, 
                                    padding: "14px 20px", 
                                    borderRadius: 12, 
                                    border: `2px solid ${checkoutType === 'new' ? '#2563eb' : '#f3f4f6'}`,
                                    cursor: "pointer",
                                    background: checkoutType === 'new' ? "#eff6ff" : "white",
                                    transition: "all 0.2s ease"
                                }}>
                                    <div style={{ 
                                        width: 18, 
                                        height: 18, 
                                        borderRadius: "50%", 
                                        border: `2px solid ${checkoutType === 'new' ? '#2563eb' : '#d1d5db'}`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: "white"
                                    }}>
                                        {checkoutType === 'new' && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#2563eb" }} />}
                                    </div>
                                    <input 
                                        type="radio" 
                                        name="checkout" 
                                        checked={checkoutType === 'new'} 
                                        onChange={() => setCheckoutType('new')}
                                        style={{ display: "none" }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Use a new card</div>
                                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>This card will become your default renewal card.</div>
                                    </div>
                                </label>
                            </div>

                            {/* Stripe Element Area */}
                            {checkoutType === 'new' && clientSecret && (
                                <div style={{ 
                                    marginBottom: 32, 
                                    padding: 24, 
                                    background: "#f9fafb", 
                                    borderRadius: 16, 
                                    border: "1px solid #e5e7eb", 
                                    minHeight: 200,
                                    position: "relative"
                                }}>
                                    {!formReady && (
                                        <div style={{ 
                                            position: "absolute", top: 0, left: 0, right: 0, bottom: 0, 
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            background: "#f9fafb", borderRadius: 16, zIndex: 1
                                        }}>
                                            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>Loading secure fields...</p>
                                        </div>
                                    )}
                                    <div style={{ visibility: formReady ? "visible" : "hidden" }}>
                                        <Elements 
                                            stripe={stripePromise} 
                                            options={{ 
                                                clientSecret,
                                                appearance: { theme: 'stripe', variables: { colorPrimary: '#2563eb', borderRadius: '10px' } },
                                                developerTools: { assistant: { enabled: false } }
                                            } as any}
                                            key={`${clientSecret}-${refreshKey}`}
                                        >
                                            <StripePaymentForm 
                                                onSuccess={handlePaymentSuccess} 
                                                onCancel={() => { setSelectedPlan(null); setClientSecret(null); }} 
                                                onReady={() => setFormReady(true)}
                                                mode={intentType === 'setup' ? 'setup' : 'payment'}
                                                submitLabel="Confirm Resume"
                                            />
                                        </Elements>
                                    </div>
                                </div>
                            )}

                            {/* Default checkout action buttons */}
                            {checkoutType !== 'new' && (
                                <div style={{ display: "flex", gap: 12 }}>
                                    <button
                                        onClick={() => setSelectedPlan(null)}
                                        style={{ flex: 1, padding: "14px", borderRadius: 12, border: "1px solid #d1d5db", background: "white", fontWeight: 700, cursor: "pointer" }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleExecuteSubscription}
                                        disabled={actionLoading}
                                        style={{ flex: 2, padding: "14px", borderRadius: 12, border: "none", background: "#2563eb", color: "white", fontWeight: 700, cursor: actionLoading ? "not-allowed" : "pointer", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }}
                                    >
                                        {actionLoading ? "Processing..." : "Confirm Resume"}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div style={{ background: "#f9fafb", padding: 24, borderRadius: 20, border: "1px solid #e5e7eb" }}>
                        <h4 style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Default Payment</h4>
                        <div style={{ marginTop: 16 }}>
                            {data?.default_payment_method ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ background: "white", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: 4, fontWeight: 700, fontSize: "0.625rem", color: "#374151" }}>
                                        {data.default_payment_method.brand.toUpperCase()}
                                    </div>
                                    <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.9375rem" }}>
                                        •••• {data.default_payment_method.last4}
                                    </div>
                                </div>
                            ) : (
                                <p style={{ margin: 0, fontSize: "0.875rem", color: "#b91c1c", fontWeight: 600 }}>No card on file</p>
                            )}
                        </div>
                        <Link to="/finance/payment-methods" style={{ display: "inline-block", marginTop: 20, fontSize: "0.875rem", color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
                            Manage Methods →
                        </Link>
                    </div>

                    <div style={{ background: "white", padding: 24, borderRadius: 20, border: "1px solid #e5e7eb" }}>
                        <h4 style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>History</h4>
                        <Link to="/finance/payments" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.875rem", color: "#111827", textDecoration: "none", fontWeight: 700, padding: "8px 12px", background: "#f3f4f6", borderRadius: 10, marginTop: 16, width: "100%", justifyContent: "center" }}>
                            View Invoices
                        </Link>
                    </div>

                    <div style={{ padding: "0 8px", borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
                        <p style={{ fontSize: "0.75rem", color: "#9ca3af", margin: 0 }}>
                            <a href="mailto:support@agcpropack.example" style={{ color: "#9ca3af", textDecoration: "none" }}>Contact Support</a>
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
