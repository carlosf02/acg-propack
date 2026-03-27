import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { apiGet, apiPatch, ApiError } from "../../api/client";
import { endpoints } from "../../api/endpoints";

// ─── Shared field styles ─────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
    width: "100%", padding: "0.65rem 0.875rem", borderRadius: 6,
    border: "1px solid #d1d5db", fontSize: "0.875rem", boxSizing: "border-box",
    background: "#f9fafb",
};

const INPUT_READONLY_STYLE: React.CSSProperties = {
    ...INPUT_STYLE, background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>
            {children}
        </label>
    );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section style={{
            background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
            padding: "20px 24px", marginBottom: 20,
        }}>
            <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: "1rem", fontWeight: 600, color: "#374151", paddingBottom: 12, borderBottom: "1px solid #f3f4f6" }}>
                {title}
            </h2>
            {children}
        </section>
    );
}

function SaveButton({ loading, label = "Save Changes" }: { loading: boolean; label?: string }) {
    return (
        <button type="submit" disabled={loading} className="btn btn-primary"
            style={{ padding: "0.6rem 1.5rem", fontSize: "0.875rem", marginTop: 4 }}>
            {loading ? "Saving…" : label}
        </button>
    );
}

function StatusMsg({ success, error }: { success: string; error: string }) {
    if (error) return <span style={{ fontSize: "0.8125rem", color: "#dc2626", marginLeft: 12 }}>{error}</span>;
    if (success) return <span style={{ fontSize: "0.8125rem", color: "#059669", marginLeft: 12 }}>{success}</span>;
    return null;
}

// ─── Profile & address form ───────────────────────────────────────────────────

function ProfileSection() {
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
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(""); setSuccess("");
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
            // Reflect changes in auth context so header/profile shows updated name
            if (user?.client) {
                setUser({
                    ...user,
                    client: {
                        ...user.client,
                        name: name.trim(),
                        last_name: lastName.trim() || null,
                        cellphone: cellphone.trim() || null,
                        home_phone: homePhone.trim() || null,
                        address: address.trim() || null,
                        city: city.trim() || null,
                        postal_code: postalCode.trim() || null,
                        alt_address_line1: altLine1.trim() || null,
                        alt_address_line2: altLine2.trim() || null,
                        alt_city: altCity.trim() || null,
                        alt_state: altState.trim() || null,
                        alt_zip: altZip.trim() || null,
                    },
                });
            }
            setSuccess("Saved!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err instanceof ApiError ? (err.message || "Could not save profile.") : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <SectionCard title="Profile & Contact">
            <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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
                    <input value={user?.email || ""} readOnly style={INPUT_READONLY_STYLE} title="Contact support to change your email." />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                        <FieldLabel>Cellphone</FieldLabel>
                        <input value={cellphone} onChange={e => setCellphone(e.target.value)} disabled={loading} placeholder="+1 (555) 000-0000" style={INPUT_STYLE} />
                    </div>
                    <div>
                        <FieldLabel>Home / Office Phone</FieldLabel>
                        <input value={homePhone} onChange={e => setHomePhone(e.target.value)} disabled={loading} placeholder="Optional" style={INPUT_STYLE} />
                    </div>
                </div>

                <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", paddingTop: 4, paddingBottom: 6, borderBottom: "1px solid #f3f4f6" }}>
                    Primary Address
                </div>

                <div>
                    <FieldLabel>Address</FieldLabel>
                    <input value={address} onChange={e => setAddress(e.target.value)} disabled={loading} placeholder="Street address" style={INPUT_STYLE} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                        <FieldLabel>City</FieldLabel>
                        <input value={city} onChange={e => setCity(e.target.value)} disabled={loading} placeholder="City" style={INPUT_STYLE} />
                    </div>
                    <div>
                        <FieldLabel>Postal Code</FieldLabel>
                        <input value={postalCode} onChange={e => setPostalCode(e.target.value)} disabled={loading} placeholder="Postal / ZIP" style={INPUT_STYLE} />
                    </div>
                </div>

                <div>
                    <button type="button" onClick={() => setShowAlt(!showAlt)}
                        style={{ background: "none", border: "none", color: "#2679c6", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                        {showAlt ? "▾ Hide additional address" : "▸ Add / edit additional address"}
                    </button>
                </div>

                {showAlt && (
                    <>
                        <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", paddingBottom: 6, borderBottom: "1px solid #f3f4f6" }}>
                            Additional Address
                        </div>
                        <div>
                            <FieldLabel>Address Line 1</FieldLabel>
                            <input value={altLine1} onChange={e => setAltLine1(e.target.value)} disabled={loading} placeholder="Street address" style={INPUT_STYLE} />
                        </div>
                        <div>
                            <FieldLabel>Address Line 2</FieldLabel>
                            <input value={altLine2} onChange={e => setAltLine2(e.target.value)} disabled={loading} placeholder="Apt, suite, floor…" style={INPUT_STYLE} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
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

                <div style={{ display: "flex", alignItems: "center" }}>
                    <SaveButton loading={loading} />
                    <StatusMsg success={success} error={error} />
                </div>
            </form>
        </SectionCard>
    );
}

// ─── Notifications form ───────────────────────────────────────────────────────

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

function NotificationsSection() {
    const [prefs, setPrefs] = useState<NotifPrefs>({
        notify_warehouse_receipt: true,
        notify_repack: true,
        notify_consolidation: true,
        notify_arrived: true,
    });
    const [loadingInit, setLoadingInit] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        apiGet<NotifPrefs>(endpoints.clientNotifications())
            .then(data => setPrefs(data))
            .catch(() => { /* keep defaults */ })
            .finally(() => setLoadingInit(false));
    }, []);

    function toggle(key: keyof NotifPrefs) {
        setPrefs(p => ({ ...p, [key]: !p[key] }));
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(""); setSuccess("");
        setSaving(true);
        try {
            await apiPatch(endpoints.clientNotifications(), prefs);
            setSuccess("Saved!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err instanceof ApiError ? (err.message || "Could not save preferences.") : "Something went wrong.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <SectionCard title="Notification Preferences">
            {loadingInit ? (
                <div style={{ color: "#9ca3af", fontSize: "0.875rem", padding: "8px 0" }}>Loading…</div>
            ) : (
                <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {NOTIF_OPTIONS.map(opt => (
                        <label key={opt.key} style={{
                            display: "flex", alignItems: "flex-start", gap: "0.875rem",
                            padding: "0.75rem 1rem", borderRadius: 8,
                            border: `1.5px solid ${prefs[opt.key] ? "#bfdbfe" : "#e5e7eb"}`,
                            background: prefs[opt.key] ? "#eff6ff" : "#fafafa",
                            cursor: saving ? "not-allowed" : "pointer",
                            transition: "all 0.15s",
                        }}>
                            <input
                                type="checkbox"
                                checked={prefs[opt.key]}
                                onChange={() => toggle(opt.key)}
                                disabled={saving}
                                style={{ marginTop: 2, width: 15, height: 15, accentColor: "#2679c6", flexShrink: 0 }}
                            />
                            <div>
                                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{opt.label}</div>
                                <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 1 }}>{opt.description}</div>
                            </div>
                        </label>
                    ))}

                    <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
                        <SaveButton loading={saving} />
                        <StatusMsg success={success} error={error} />
                    </div>
                </form>
            )}
        </SectionCard>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientSettingsPage() {
    const { user } = useAuth();
    const c = user?.client;

    return (
        <div style={{ maxWidth: 700 }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: "1.375rem", fontWeight: 700, color: "#111827" }}>
                    Account Settings
                </h1>
                {c && (
                    <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
                        Client code: <strong>{c.client_code}</strong>
                    </p>
                )}
            </div>

            <ProfileSection />
            <NotificationsSection />
        </div>
    );
}
