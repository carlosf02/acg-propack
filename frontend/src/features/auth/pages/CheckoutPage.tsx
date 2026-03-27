import { useState, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { createOnboardingSession, finalizeOnboarding } from "../../../features/billing/billing.api";
import { getPlanById } from "../../../features/billing/plans.data";
import StripePaymentForm from "../../../components/StripePaymentForm";
import logo from "../../../assets/acg-logo.png";
import "../auth.css";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

type CheckoutStep = "details" | "payment" | "success";

export default function CheckoutPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const planId = searchParams.get("plan") || "pro";
    const plan = getPlanById(planId) || getPlanById("pro")!;

    const [step, setStep] = useState<CheckoutStep>("details");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);

    // Form fields
    const [companyName, setCompanyName] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const EyeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
    );
    const EyeOffIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
    );

    async function handleContinueToPayment(e: FormEvent) {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const result = await createOnboardingSession({
                company_name: companyName.trim(),
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                username: email.trim(), // Defaults to email as username
                password: password,
                plan_id: planId
            });
            setSessionId(result.session_id);
            setClientSecret(result.client_secret);
            setStep("payment");
        } catch (err: any) {
            setError(err.message || "Could not initialize setup. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handlePaymentSuccess() {
        if (!sessionId) return;
        setLoading(true);
        try {
            await finalizeOnboarding(sessionId);
            setStep("success");
            setTimeout(() => {
                navigate("/dashboard", { replace: true });
            }, 2000);
        } catch (err: any) {
            setError("Payment succeeded, but account creation failed. Please contact support.");
        } finally {
            setLoading(false);
        }
    }

    const canSubmitDetails =
        companyName.trim() &&
        firstName.trim() &&
        lastName.trim() &&
        email.trim() &&
        password.length >= 6 &&
        confirmPassword === password;

    return (
        <div className="auth-page checkout-flow" style={{ background: '#f9fafb', minHeight: '100vh', padding: '4rem 2rem' }}>
            <div className="checkout-container" style={{ maxWidth: '1800px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(280px, 350px) 1fr', gap: '2rem' }}>

                {/* Left Column: Plan Summary */}
                <aside className="checkout-summary">
                    <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'center' }}>
                        <Link to="/">
                            <img src={logo} alt="ACG ProPack" style={{ height: '140px', width: 'auto' }} />
                        </Link>
                    </div>

                    <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: '#111827' }}>Selected Plan</h2>

                        <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#2563eb' }}>{plan.name}</h3>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>${plan.price}<span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 400 }}>/mo</span></div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>{plan.description}</p>
                        </div>

                        <ul style={{ padding: 0, margin: '0 0 2rem 0', listStyle: 'none' }}>
                            {plan.features.map((f, i) => (
                                <li key={i} style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.75rem', display: 'flex', gap: '8px' }}>
                                    <span style={{ color: '#10b981' }}>✓</span> {f}
                                </li>
                            ))}
                        </ul>

                        <Link to="/plans" style={{ display: 'block', textAlign: 'center', fontSize: '0.875rem', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                            Change plan
                        </Link>
                    </div>

                    <div style={{ marginTop: '1rem', padding: '1rem', color: '#6b7280', fontSize: '0.75rem', lineHeight: 1.5 }}>
                        <p>Complete your payment securely with Stripe. You can cancel your subscription at any time from your account settings.</p>
                    </div>
                </aside>

                {/* Right Column: Setup & Payment */}
                <main className="checkout-main">
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>

                        {step === "details" && (
                            <>
                                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem', color: '#111827' }}>Setup your account</h1>
                                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Enter your company and admin details to get started.</p>

                                <form onSubmit={handleContinueToPayment} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Company Name</label>
                                        <input
                                            type="text"
                                            className="auth-input"
                                            placeholder="Acme Warehouse LLC"
                                            value={companyName}
                                            onChange={e => setCompanyName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>First Name</label>
                                        <input
                                            type="text"
                                            className="auth-input"
                                            placeholder="Jane"
                                            value={firstName}
                                            onChange={e => setFirstName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Last Name</label>
                                        <input
                                            type="text"
                                            className="auth-input"
                                            placeholder="Smith"
                                            value={lastName}
                                            onChange={e => setLastName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Work Email</label>
                                        <input
                                            type="email"
                                            className="auth-input"
                                            placeholder="jane@acme.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Password</label>
                                        <div className="auth-input-wrapper">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="auth-input"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="auth-password-toggle"
                                                onClick={() => setShowPassword(!showPassword)}
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Confirm Password</label>
                                        <div className="auth-input-wrapper">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                className="auth-input"
                                                placeholder="••••••••"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="auth-password-toggle"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                tabIndex={-1}
                                            >
                                                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                                            </button>
                                        </div>
                                    </div>

                                    {error && <div style={{ gridColumn: 'span 2', color: '#dc2626', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}

                                    <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
                                            disabled={loading || !canSubmitDetails}
                                        >
                                            {loading ? "Initializing..." : "Continue to Payment"}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}

                        {step === "payment" && clientSecret && (
                            <div style={{ animation: 'fadeIn 0.5s ease' }}>
                                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem', color: '#111827' }}>Secure Payment</h1>
                                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Finalize your {plan.name} plan subscription.</p>

                                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>Billing card</h4>
                                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
                                        This card will be saved as your company’s default payment method and charged automatically each month unless the subscription is canceled.
                                    </p>
                                </div>

                                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                                    <Elements
                                        stripe={stripePromise}
                                        options={{
                                            clientSecret,
                                            appearance: { theme: 'stripe', variables: { colorPrimary: '#2563eb', borderRadius: '12px' } },
                                            developerTools: { assistant: { enabled: false } }
                                        } as any}
                                    >
                                        <StripePaymentForm
                                            onSuccess={handlePaymentSuccess}
                                            onCancel={() => setStep("details")}
                                            onReady={() => { }}
                                            mode="payment"
                                            submitLabel={`Start ${plan.name} plan`}
                                        />
                                    </Elements>
                                </div>
                            </div>
                        )}

                        {step === "success" && (
                            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                                <div style={{ width: '64px', height: '64px', background: '#f0fdf4', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', fontSize: '2rem' }}>
                                    ✓
                                </div>
                                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '1rem', color: '#111827' }}>Welcome aboard!</h1>
                                <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Your account and company have been created successfully. Redirecting you to the platform...</p>
                                <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                            </div>
                        )}

                    </div>
                </main>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .checkout-container {
                    display: grid;
                }
                @media (max-width: 768px) {
                    .checkout-container {
                        grid-template-columns: 1fr;
                        gap: 2rem;
                    }
                    .checkout-summary {
                        order: 1;
                    }
                    .checkout-main {
                        order: 2;
                    }
                }
            `}</style>
        </div>
    );
}
