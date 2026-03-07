import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
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
        <div className="auth-page">
            <div className="auth-card">
                {/* Brand */}
                <div className="auth-brand">
                    <div className="auth-brand-icon">P</div>
                    <span className="auth-brand-name">ACG ProPack</span>
                </div>

                <h1 className="auth-title">Reset password</h1>
                <p className="auth-subtitle">
                    Enter your email and we'll send you reset instructions.
                </p>

                {submitted ? (
                    <div className="auth-success" role="status">
                        If this email exists, you will receive reset instructions shortly.
                    </div>
                ) : (
                    <form className="auth-form" onSubmit={handleSubmit} noValidate>
                        <div className="auth-field">
                            <label className="auth-label" htmlFor="forgot-email">
                                Email
                            </label>
                            <input
                                id="forgot-email"
                                className="auth-input"
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
                            className="auth-btn"
                            type="submit"
                            disabled={loading || !email.trim()}
                        >
                            {loading && <span className="auth-spinner" aria-hidden="true" />}
                            {loading ? "Sending…" : "Send reset link"}
                        </button>
                    </form>
                )}

                <div className="auth-divider" />

                <div className="auth-footer">
                    <div className="auth-footer-row">
                        <Link className="auth-link" to="/login">
                            ← Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
