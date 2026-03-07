import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../auth.api";
import { ApiError } from "../../../api/client";
import "../auth.css";

export default function LoginPage() {
    const navigate = useNavigate();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(identifier.trim(), password);
            navigate("/", { replace: true });
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message || "Invalid credentials.");
            } else {
                setError("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* Brand */}
                <div className="auth-brand">
                    <div className="auth-brand-icon">P</div>
                    <span className="auth-brand-name">ACG ProPack</span>
                </div>

                <h1 className="auth-title">Sign in</h1>
                <p className="auth-subtitle">Welcome back — enter your credentials below.</p>

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="login-identifier">
                            Email or Username
                        </label>
                        <input
                            id="login-identifier"
                            className="auth-input"
                            type="text"
                            placeholder="you@example.com"
                            autoComplete="username"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-label" htmlFor="login-password">
                            Password
                        </label>
                        <div className="auth-input-wrapper">
                            <input
                                id="login-password"
                                className="auth-input"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                autoComplete="current-password"
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

                    {error && <div className="auth-error" role="alert">{error}</div>}

                    <button
                        id="login-submit"
                        className="auth-btn"
                        type="submit"
                        disabled={loading || !identifier || !password}
                    >
                        {loading && <span className="auth-spinner" aria-hidden="true" />}
                        {loading ? "Signing in…" : "Sign in"}
                    </button>
                </form>

                <div className="auth-divider" />

                <div className="auth-footer">
                    <div className="auth-footer-row">
                        <Link className="auth-link" to="/forgot-password">
                            Forgot password?
                        </Link>
                    </div>
                    <div className="auth-footer-row">
                        <span>Don't have an account?</span>
                        <Link className="auth-link" to="/signup">
                            Create an account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
