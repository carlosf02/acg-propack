import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup, createCompany } from "../auth.api";
import { ApiError } from "../../../api/client";
import "../auth.css";

export default function SignupPage() {
    const navigate = useNavigate();
    const [companyName, setCompanyName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: FormEvent) {
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

            await createCompany(companyName.trim());

            navigate("/", { replace: true });
        } catch (err) {
            if (accountCreated) {
                setError("Account created, but company creation failed. Please try again.");
            } else if (err instanceof ApiError) {
                setError(err.message || "Could not create account. Please try again.");
            } else {
                setError("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    const canSubmit = companyName.trim() && username.trim() && email.trim() && password.length >= 1 && confirmPassword.length >= 1;

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* Brand */}
                <div className="auth-brand">
                    <div className="auth-brand-icon">P</div>
                    <span className="auth-brand-name">ACG ProPack</span>
                </div>

                <h1 className="auth-title">Create account</h1>
                <p className="auth-subtitle">Get started — it only takes a few seconds.</p>

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="signup-company">
                            Company Name
                        </label>
                        <input
                            id="signup-company"
                            className="auth-input"
                            type="text"
                            placeholder="Acme Corp"
                            autoComplete="organization"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-label" htmlFor="signup-username">
                            Username
                        </label>
                        <input
                            id="signup-username"
                            className="auth-input"
                            type="text"
                            placeholder="your_username"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-label" htmlFor="signup-email">
                            Email
                        </label>
                        <input
                            id="signup-email"
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

                    <div className="auth-field">
                        <label className="auth-label" htmlFor="signup-password">
                            Password
                        </label>
                        <div className="auth-input-wrapper">
                            <input
                                id="signup-password"
                                className="auth-input"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="auth-password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                disabled={loading}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                                        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                                        <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                                        <path d="m2 2 20 20" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="auth-field">
                        <label className="auth-label" htmlFor="signup-confirm-password">
                            Confirm Password
                        </label>
                        <div className="auth-input-wrapper">
                            <input
                                id="signup-confirm-password"
                                className="auth-input"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="auth-password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                disabled={loading}
                            >
                                {showConfirmPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                                        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                                        <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                                        <path d="m2 2 20 20" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {error && <div className="auth-error" role="alert">{error}</div>}

                    <button
                        id="signup-submit"
                        className="auth-btn"
                        type="submit"
                        disabled={loading || !canSubmit}
                    >
                        {loading && <span className="auth-spinner" aria-hidden="true" />}
                        {loading ? "Creating account…" : "Create account"}
                    </button>
                </form>

                <div className="auth-divider" />

                <div className="auth-footer">
                    <div className="auth-footer-row">
                        <span>Already have an account?</span>
                        <Link className="auth-link" to="/login">
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
