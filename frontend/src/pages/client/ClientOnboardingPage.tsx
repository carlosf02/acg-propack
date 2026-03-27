import { useState, useEffect, FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { apiPost, apiGet, ApiError } from "../../api/client";
import { apiPatch } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import logo from "../../assets/acg-logo.png";

// ─── Shared layout shell ────────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
    background: "white",
    padding: "2.5rem 3rem",
    borderRadius: "12px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
    width: "100%",
    maxWidth: "560px",
};

const PAGE_STYLE: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f9fafb",
    padding: "24px 16px",
};

const STEP_LABELS = ["Set Password", "Confirm Profile", "Notifications"];

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: "1.75rem" }}>
            {[1, 2, 3].map((n, i) => (
                <div key={n} style={{ display: "flex", alignItems: "center" }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: step === n ? "#2679c6" : step > n ? "#d1fae5" : "#e5e7eb",
                        color: step === n ? "white" : step > n ? "#065f46" : "#9ca3af",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.8125rem", fontWeight: 700, flexShrink: 0,
                    }}>
                        {step > n ? "✓" : n}
                    </div>
                    <span style={{
                        marginLeft: 6, fontSize: "0.8125rem", fontWeight: step === n ? 600 : 400,
                        color: step === n ? "#111827" : "#9ca3af", whiteSpace: "nowrap",
                    }}>
                        {STEP_LABELS[n - 1]}
                    </span>
                    {i < 2 && (
                        <div style={{ width: 32, height: 2, background: "#e5e7eb", margin: "0 10px" }} />
                    )}
                </div>
            ))}
        </div>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
            {children}
        </label>
    );
}

const INPUT_STYLE: React.CSSProperties = {
    width: "100%", padding: "0.7rem 0.875rem", borderRadius: 6,
    border: "1px solid #d1d5db", fontSize: "0.9rem", boxSizing: "border-box",
    background: "#f9fafb",
};

const INPUT_READONLY_STYLE: React.CSSProperties = {
    ...INPUT_STYLE, background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed",
};

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.75rem", marginTop: "1.25rem", paddingBottom: "0.4rem", borderBottom: "1px solid #f3f4f6" }}>
            {children}
        </div>
    );
}

// ─── Step 1: Password change ────────────────────────────────────────────────

function StepPassword({ onDone }: { onDone: () => void }) {
    const { user, setUser } = useAuth();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const clientName = user?.client?.name || user?.username || "there";

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
        if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
        setLoading(true);
        try {
            await apiPost(endpoints.clientSetPassword(), { new_password: newPassword, confirm_password: confirmPassword });
            if (user) setUser({ ...user, must_change_password: false });
            onDone();
        } catch (err) {
            setError(err instanceof ApiError ? (err.message || "Could not update password.") : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={PAGE_STYLE}>
            <div style={CARD_STYLE}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                    <img src={logo} alt="ACG ProPack" style={{ height: 100, width: "auto" }} />
                </div>
                <StepIndicator step={1} />
                <h1 style={{ fontSize: "1.25rem", fontWeight: 700, textAlign: "center", color: "#111827", marginBottom: "0.375rem" }}>
                    Welcome, {clientName}!
                </h1>
                <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                    This is your first time signing in.
                </p>
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", marginBottom: "1.75rem", color: "#1e40af", fontSize: "0.8125rem", lineHeight: 1.5 }}>
                    Your account was created with a temporary password. Please set a permanent password to continue.
                </div>

                <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                        <FieldLabel>New Password</FieldLabel>
                        <div style={{ position: "relative" }}>
                            <input type={showNew ? "text" : "password"} placeholder="Min. 8 characters" autoComplete="new-password"
                                value={newPassword} onChange={e => setNewPassword(e.target.value)} required disabled={loading}
                                style={{ ...INPUT_STYLE, paddingRight: "3.5rem" }} />
                            <button type="button" onClick={() => setShowNew(!showNew)} disabled={loading}
                                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.8125rem" }}>
                                {showNew ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                    <div>
                        <FieldLabel>Confirm New Password</FieldLabel>
                        <div style={{ position: "relative" }}>
                            <input type={showConfirm ? "text" : "password"} placeholder="Re-enter your new password" autoComplete="new-password"
                                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={loading}
                                style={{ ...INPUT_STYLE, paddingRight: "3.5rem" }} />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} disabled={loading}
                                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.8125rem" }}>
                                {showConfirm ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                    {error && <div role="alert" style={{ color: "#dc2626", fontSize: "0.8125rem", textAlign: "center" }}>{error}</div>}
                    <button type="submit" disabled={loading || !newPassword || !confirmPassword} className="btn btn-primary"
                        style={{ width: "100%", padding: "0.875rem", fontSize: "0.9375rem", justifyContent: "center", marginTop: "0.5rem" }}>
                        {loading ? "Saving…" : "Set Password & Continue →"}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── Step 2: Profile & address confirmation ─────────────────────────────────

function StepProfile() {
    const { user, setUser } = useAuth();
    const c = user?.client;

    const [name, setName] = useState(c?.name || "");
    const [lastName, setLastName] = useState(c?.last_name || "");
    const [cellphone, setCellphone] = useState(c?.cellphone || "");
    const [homePhone, setHomePhone] = useState(c?.home_phone || "");

    const [address, setAddress] = useState(c?.address || "");
    const [city, setCity] = useState(c?.city || "");
    const [postalCode, setPostalCode] = useState(c?.postal_code || "");

    const [showAlt, setShowAlt] = useState(
        !!(c?.alt_address_line1 || c?.alt_city || c?.alt_state || c?.alt_zip)
    );
    const [altLine1, setAltLine1] = useState(c?.alt_address_line1 || "");
    const [altLine2, setAltLine2] = useState(c?.alt_address_line2 || "");
    const [altCity, setAltCity] = useState(c?.alt_city || "");
    const [altState, setAltState] = useState(c?.alt_state || "");
    const [altZip, setAltZip] = useState(c?.alt_zip || "");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        if (!name.trim()) { setError("First name is required."); return; }
        setLoading(true);
        try {
            await apiPatch(endpoints.clientProfile(), {
                name: name.trim(),
                last_name: lastName.trim() || null,
                cellphone: cellphone.trim() || null,
                home_phone: homePhone.trim() || null,
                address: address.trim() || null,
                city: city.trim() || null,
                postal_code: postalCode.trim() || null,
                default_address_line1: altLine1.trim() || null,
                default_address_line2: altLine2.trim() || null,
                default_city: altCity.trim() || null,
                default_state: altState.trim() || null,
                default_zip: altZip.trim() || null,
            });
            if (user) setUser({ ...user, profile_completed: true });
        } catch (err) {
            setError(err instanceof ApiError ? (err.message || "Could not save profile.") : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={PAGE_STYLE}>
            <div style={{ ...CARD_STYLE, maxWidth: 600 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                    <img src={logo} alt="ACG ProPack" style={{ height: 80, width: "auto" }} />
                </div>
                <StepIndicator step={2} />
                <h1 style={{ fontSize: "1.25rem", fontWeight: 700, textAlign: "center", color: "#111827", marginBottom: "0.375rem" }}>
                    Confirm Your Profile
                </h1>
                <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                    Please review and complete your contact information before continuing.
                </p>

                <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                    {/* Basic info */}
                    <SectionHeading>Basic Information</SectionHeading>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                        <div>
                            <FieldLabel>First Name *</FieldLabel>
                            <input value={name} onChange={e => setName(e.target.value)} required disabled={loading} placeholder="First name" style={INPUT_STYLE} />
                        </div>
                        <div>
                            <FieldLabel>Last Name</FieldLabel>
                            <input value={lastName} onChange={e => setLastName(e.target.value)} disabled={loading} placeholder="Last name" style={INPUT_STYLE} />
                        </div>
                    </div>

                    <div>
                        <FieldLabel>Email</FieldLabel>
                        <input value={user?.email || ""} readOnly style={INPUT_READONLY_STYLE} title="Your login email cannot be changed here." />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                        <div>
                            <FieldLabel>Cellphone</FieldLabel>
                            <input value={cellphone} onChange={e => setCellphone(e.target.value)} disabled={loading} placeholder="+1 (555) 000-0000" style={INPUT_STYLE} />
                        </div>
                        <div>
                            <FieldLabel>Home / Office Phone</FieldLabel>
                            <input value={homePhone} onChange={e => setHomePhone(e.target.value)} disabled={loading} placeholder="Optional" style={INPUT_STYLE} />
                        </div>
                    </div>

                    {/* Primary address */}
                    <SectionHeading>Primary Address</SectionHeading>

                    <div>
                        <FieldLabel>Address</FieldLabel>
                        <input value={address} onChange={e => setAddress(e.target.value)} disabled={loading} placeholder="Street address" style={INPUT_STYLE} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                        <div>
                            <FieldLabel>City</FieldLabel>
                            <input value={city} onChange={e => setCity(e.target.value)} disabled={loading} placeholder="City" style={INPUT_STYLE} />
                        </div>
                        <div>
                            <FieldLabel>Postal Code</FieldLabel>
                            <input value={postalCode} onChange={e => setPostalCode(e.target.value)} disabled={loading} placeholder="Postal / ZIP code" style={INPUT_STYLE} />
                        </div>
                    </div>

                    {/* Additional address */}
                    <div style={{ marginTop: "0.25rem" }}>
                        <button type="button" onClick={() => setShowAlt(!showAlt)}
                            style={{ background: "none", border: "none", color: "#2679c6", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                            {showAlt ? "▾ Hide additional address" : "▸ Add an additional address (optional)"}
                        </button>
                    </div>

                    {showAlt && (
                        <>
                            <SectionHeading>Additional Address</SectionHeading>
                            <div>
                                <FieldLabel>Address Line 1</FieldLabel>
                                <input value={altLine1} onChange={e => setAltLine1(e.target.value)} disabled={loading} placeholder="Street address" style={INPUT_STYLE} />
                            </div>
                            <div>
                                <FieldLabel>Address Line 2</FieldLabel>
                                <input value={altLine2} onChange={e => setAltLine2(e.target.value)} disabled={loading} placeholder="Apt, suite, floor…" style={INPUT_STYLE} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.875rem" }}>
                                <div>
                                    <FieldLabel>City</FieldLabel>
                                    <input value={altCity} onChange={e => setAltCity(e.target.value)} disabled={loading} placeholder="City" style={INPUT_STYLE} />
                                </div>
                                <div>
                                    <FieldLabel>State / Province</FieldLabel>
                                    <input value={altState} onChange={e => setAltState(e.target.value)} disabled={loading} placeholder="State" style={INPUT_STYLE} />
                                </div>
                                <div>
                                    <FieldLabel>ZIP / Postal</FieldLabel>
                                    <input value={altZip} onChange={e => setAltZip(e.target.value)} disabled={loading} placeholder="ZIP" style={INPUT_STYLE} />
                                </div>
                            </div>
                        </>
                    )}

                    {error && <div role="alert" style={{ color: "#dc2626", fontSize: "0.8125rem", textAlign: "center" }}>{error}</div>}

                    <button type="submit" disabled={loading || !name.trim()} className="btn btn-primary"
                        style={{ width: "100%", padding: "0.875rem", fontSize: "0.9375rem", justifyContent: "center", marginTop: "0.75rem" }}>
                        {loading ? "Saving…" : "Save Profile & Enter Dashboard →"}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── Step 3: Notification preferences ───────────────────────────────────────

interface NotifPrefs {
    notify_warehouse_receipt: boolean;
    notify_repack: boolean;
    notify_consolidation: boolean;
    notify_arrived: boolean;
}

const NOTIF_OPTIONS: { key: keyof NotifPrefs; label: string; description: string }[] = [
    { key: "notify_warehouse_receipt", label: "Warehouse Receipt", description: "When a new package arrives and a warehouse receipt is created under your account." },
    { key: "notify_repack", label: "Repack", description: "When a repack is processed for your shipment." },
    { key: "notify_consolidation", label: "Consolidation", description: "When your packages are consolidated for shipping." },
    { key: "notify_arrived", label: "Arrived / Ready for Pickup", description: "When your shipment arrives at its destination or is ready for pickup." },
];

function StepNotifications() {
    const { user, setUser } = useAuth();
    const [prefs, setPrefs] = useState<NotifPrefs>({
        notify_warehouse_receipt: true,
        notify_repack: true,
        notify_consolidation: true,
        notify_arrived: true,
    });
    const [loadingPrefs, setLoadingPrefs] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        apiGet<NotifPrefs>(endpoints.clientNotifications())
            .then(data => setPrefs(data))
            .catch(() => { /* keep defaults on error */ })
            .finally(() => setLoadingPrefs(false));
    }, []);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setSaving(true);
        try {
            await apiPatch(endpoints.clientNotifications(), prefs);
            if (user) setUser({ ...user, notifications_configured: true });
        } catch (err) {
            setError(err instanceof ApiError ? (err.message || "Could not save preferences.") : "Something went wrong.");
        } finally {
            setSaving(false);
        }
    }

    function toggle(key: keyof NotifPrefs) {
        setPrefs(p => ({ ...p, [key]: !p[key] }));
    }

    return (
        <div style={PAGE_STYLE}>
            <div style={{ ...CARD_STYLE, maxWidth: 560 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                    <img src={logo} alt="ACG ProPack" style={{ height: 80, width: "auto" }} />
                </div>
                <StepIndicator step={3} />
                <h1 style={{ fontSize: "1.25rem", fontWeight: 700, textAlign: "center", color: "#111827", marginBottom: "0.375rem" }}>
                    Notification Preferences
                </h1>
                <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
                    Choose which updates you'd like to receive. You can change these later in Settings.
                </p>

                {loadingPrefs ? (
                    <div style={{ textAlign: "center", color: "#9ca3af", padding: "1.5rem 0" }}>Loading…</div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                            {NOTIF_OPTIONS.map(opt => (
                                <label key={opt.key} style={{
                                    display: "flex", alignItems: "flex-start", gap: "0.875rem",
                                    padding: "0.875rem 1rem", borderRadius: 8,
                                    border: `1.5px solid ${prefs[opt.key] ? "#bfdbfe" : "#e5e7eb"}`,
                                    background: prefs[opt.key] ? "#eff6ff" : "white",
                                    cursor: saving ? "not-allowed" : "pointer",
                                    transition: "all 0.15s",
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={prefs[opt.key]}
                                        onChange={() => toggle(opt.key)}
                                        disabled={saving}
                                        style={{ marginTop: 2, width: 16, height: 16, accentColor: "#2679c6", flexShrink: 0 }}
                                    />
                                    <div>
                                        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{opt.label}</div>
                                        <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 2 }}>{opt.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {error && <div role="alert" style={{ color: "#dc2626", fontSize: "0.8125rem", textAlign: "center", marginBottom: "0.75rem" }}>{error}</div>}

                        <button type="submit" disabled={saving} className="btn btn-primary"
                            style={{ width: "100%", padding: "0.875rem", fontSize: "0.9375rem", justifyContent: "center" }}>
                            {saving ? "Saving…" : "Save & Enter Dashboard →"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

// ─── Container: picks which step to show ────────────────────────────────────

export default function ClientOnboardingPage() {
    const { user } = useAuth();
    const [completedStep1, setCompletedStep1] = useState(false);

    // If user has fully completed all onboarding steps, send them to the dashboard
    if (user && !user.must_change_password && user.profile_completed && user.notifications_configured) {
        return <Navigate to="/client" replace />;
    }

    // Step 1: password must be changed
    if (user?.must_change_password && !completedStep1) {
        return <StepPassword onDone={() => setCompletedStep1(true)} />;
    }

    // Step 2: profile/address confirmation (must_change_password is false, profile not yet complete)
    if (!user?.profile_completed) {
        return <StepProfile />;
    }

    // Step 3: notification preferences
    return <StepNotifications />;
}
