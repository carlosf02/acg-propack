import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, me } from "../auth.api";
import { ApiError } from "../../../api/client";
import logo from "../../../assets/acg-logo.png";
import "../auth.css"; // Keep base styles but I'll override some for premium feel

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
            const user = await me();
            let dest = "/dashboard";
            if (user.auth_role === "CLIENT") {
                const needsOnboarding = user.must_change_password || !user.profile_completed || !user.notifications_configured;
                dest = needsOnboarding ? "/client/onboarding" : "/client";
            }
            navigate(dest, { replace: true });
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
                        <img src={logo} alt="ACG ProPack" style={{ height: '150px', width: 'auto', display: 'block' }} />
                    </Link>
                </div>

                <h1 className="auth-title" style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.5rem', color: '#111827' }}>
                    Sign in to ProPack
                </h1>
                <p className="auth-subtitle" style={{ textAlign: 'center', color: '#6b7280', marginBottom: '2.5rem', fontSize: '0.875rem' }}>
                    Enter your credentials to access your warehouse software.
                </p>

                <form className="auth-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="login-identifier" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                            Email or Username
                        </label>
                        <input
                            id="login-identifier"
                            className="auth-input"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9375rem' }}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label className="auth-label" htmlFor="login-password" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
                                Password
                            </label>
                            <Link className="auth-link" to="/forgot-password" style={{ fontSize: '0.8125rem', color: '#4f46e5', textDecoration: 'none' }}>
                                Forgot?
                            </Link>
                        </div>
                        <div className="auth-input-wrapper" style={{ position: 'relative' }}>
                            <input
                                id="login-password"
                                className="auth-input"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9375rem' }}
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
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                disabled={loading}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    {error && <div className="auth-error" role="alert" style={{ color: '#dc2626', fontSize: '0.8125rem', textAlign: 'center' }}>{error}</div>}

                    <button
                        id="login-submit"
                        className="btn btn-primary"
                        type="submit"
                        style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem', justifyContent: 'center', marginTop: '1rem' }}
                        disabled={loading || !identifier || !password}
                    >
                        {loading ? "Signing in…" : "Sign in"}
                    </button>
                </form>

            </div>
        </div>
    );
}
