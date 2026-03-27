import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup, createCompany } from "../auth.api";
import { ApiError } from "../../../api/client";
import logo from "../../../assets/acg-logo.png";
import "../auth.css";

type SignupStep = "choice" | "form" | "message";
type SignupType = "company" | "join" | "partner";

export default function SignupPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<SignupStep>("choice");
    const [signupType, setSignupType] = useState<SignupType | null>(null);

    // Form fields
    const [companyName, setCompanyName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSignup(e: FormEvent) {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        let accountCreated = false;

        try {
            await signup(username.trim(), email.trim(), password);
            accountCreated = true;

            if (signupType === "company") {
                await createCompany(companyName.trim());
            }

            navigate("/dashboard", { replace: true });
        } catch (err) {
            if (accountCreated) {
                setError("Account created, but company setup failed. Please contact support.");
            } else if (err instanceof ApiError) {
                setError(err.message || "Could not create account. Please try again.");
            } else {
                setError("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    const canSubmit = signupType === "company"
        ? (companyName.trim() && username.trim() && email.trim() && password.length >= 6 && confirmPassword === password)
        : (username.trim() && email.trim() && password.length >= 6 && confirmPassword === password);

    const selectType = (type: SignupType) => {
        setSignupType(type);
        if (type === "company") {
            setStep("form");
        } else {
            setStep("message");
        }
    };

    return (
        <div className="auth-page public-layout-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
            <div className="auth-card" style={{
                background: 'white',
                padding: '3rem',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                width: '100%',
                maxWidth: step === "choice" ? '600px' : '480px'
            }}>
                {/* Brand */}
                <div className="auth-brand" style={{ justifyContent: 'center', marginBottom: '2.5rem' }}>
                    <Link to="/" style={{ display: 'block' }}>
                        <img src={logo} alt="ACG ProPack" style={{ height: '150px', width: 'auto', display: 'block' }} />
                    </Link>
                </div>

                {step === "choice" && (
                    <>
                        <div style={{ background: '#e0e7ff', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', color: '#3730a3', fontSize: '0.875rem', textAlign: 'center' }}>
                            Looking to start a new company? <Link to="/plans" style={{ fontWeight: 700, color: '#4338ca' }}>View plans and get started here.</Link>
                        </div>

                        <h1 className="auth-title" style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.5rem', color: '#111827' }}>
                            Choose your account type
                        </h1>
                        <p className="auth-subtitle" style={{ textAlign: 'center', color: '#6b7280', marginBottom: '2.5rem', fontSize: '0.875rem' }}>
                            How will you be using the ProPack logistics platform?
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                            <button
                                onClick={() => selectType("company")}
                                className="choice-card"
                                style={{
                                    padding: '1.5rem',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    textAlign: 'left',
                                    background: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <h3 style={{ margin: '0 0 0.25rem', color: '#111827' }}>Create company account</h3>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Register a new warehouse or logistics company as an admin.</p>
                            </button>

                            <button
                                onClick={() => selectType("join")}
                                className="choice-card"
                                style={{
                                    padding: '1.5rem',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    textAlign: 'left',
                                    background: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <h3 style={{ margin: '0 0 0.25rem', color: '#111827' }}>Join existing company</h3>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Connect with your existing team using an invitation or company code.</p>
                            </button>

                            <button
                                onClick={() => selectType("partner")}
                                className="choice-card"
                                style={{
                                    padding: '1.5rem',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    textAlign: 'left',
                                    background: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <h3 style={{ margin: '0 0 0.25rem', color: '#111827' }}>Register as partner company</h3>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Collaborate on shipments and consolidations as a logistics partner.</p>
                            </button>
                        </div>
                    </>
                )}

                {step === "form" && signupType === "company" && (
                    <>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem', textAlign: 'center' }}>
                            Register your company
                        </h2>
                        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="auth-field">
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Company Name</label>
                                <input
                                    type="text"
                                    className="auth-input"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    placeholder="Acme Logistics"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="auth-field">
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Username</label>
                                <input
                                    type="text"
                                    className="auth-input"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    placeholder="admin_username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="auth-field">
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Email</label>
                                <input
                                    type="email"
                                    className="auth-input"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="auth-field">
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Password</label>
                                <input
                                    type="password"
                                    className="auth-input"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="auth-field">
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Confirm Password</label>
                                <input
                                    type="password"
                                    className="auth-input"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {error && <div style={{ color: '#dc2626', fontSize: '0.8125rem', textAlign: 'center' }}>{error}</div>}

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ justifyContent: 'center', padding: '0.875rem', marginTop: '1rem' }}
                                disabled={loading || !canSubmit}
                            >
                                {loading ? "Setting up..." : "Create account & setup company"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep("choice")}
                                className="btn btn-ghost"
                                style={{ justifyContent: 'center' }}
                            >
                                Back
                            </button>
                        </form>
                    </>
                )}

                {step === "message" && (
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                            {signupType === "join" ? "Joining a company" : "Partner registration"}
                        </h2>
                        <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: '2.5rem' }}>
                            {signupType === "join"
                                ? "To join an existing company, please contact your company administrator. They can send you an invitation link or provide your company's access code."
                                : "Partner registration is currently handled through our sales team. Please contact us to set up your partner account and begin collaborating."}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <Link to="/support" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                                {signupType === "join" ? "Contact Support" : "Contact Sales"}
                            </Link>
                            <button
                                onClick={() => setStep("choice")}
                                className="btn btn-ghost"
                                style={{ justifyContent: 'center' }}
                            >
                                Back
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Already have an account? <Link className="auth-link" to="/login" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
