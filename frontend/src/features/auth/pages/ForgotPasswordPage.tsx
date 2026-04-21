import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import logo from "../../../assets/acg-logo.png";
import "../auth.css";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        // Simulate a short delay so the button feedback feels intentional.
        await new Promise((r) => setTimeout(r, 600));
        setLoading(false);
        setSubmitted(true);
    }

    return (
        <div className="auth-page public-layout-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
            <div className="auth-card" style={{ 
                background: 'white', 
                padding: '3rem', 
                borderRadius: '12px', 
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                width: '100%',
                maxWidth: '440px'
            }}>
                {/* Brand */}
                <div className="auth-brand" style={{ justifyContent: 'center', marginBottom: '2.5rem' }}>
                    <Link to="/" style={{ display: 'block' }}>
                        <img src={logo} alt="ACG ProPack" style={{ height: '56px', width: 'auto', display: 'block' }} />
                    </Link>
                </div>

                <h1 className="auth-title" style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.5rem', color: '#111827' }}>
                    Reset password
                </h1>
                <p className="auth-subtitle" style={{ textAlign: 'center', color: '#6b7280', marginBottom: '2.5rem', fontSize: '0.875rem' }}>
                    Enter your email and we'll send you reset instructions.
                </p>

                {submitted ? (
                    <div className="auth-success" role="status" style={{ textAlign: 'center', color: '#059669', background: '#ecfdf5', padding: '1rem', borderRadius: '6px', fontSize: '0.875rem' }}>
                        If this email exists, you will receive reset instructions shortly.
                    </div>
                ) : (
                    <form className="auth-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="auth-field">
                            <label className="auth-label" htmlFor="forgot-email" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                                Email
                            </label>
                            <input
                                id="forgot-email"
                                className="auth-input"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9375rem' }}
                                type="email"
                                placeholder="you@example.com"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <button
                            id="forgot-submit"
                            className="btn btn-primary"
                            type="submit"
                            style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem', justifyContent: 'center', marginTop: '1rem' }}
                            disabled={loading || !email.trim()}
                        >
                            {loading ? "Sending…" : "Send reset link"}
                        </button>
                    </form>
                )}

                <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <Link className="auth-link" to="/login" style={{ fontSize: '0.875rem', color: '#2679c6', fontWeight: 600, textDecoration: 'none' }}>
                        ← Back to sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
