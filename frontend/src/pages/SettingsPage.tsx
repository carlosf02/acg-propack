import { useState, useEffect, FormEvent } from "react";
import { apiGet, apiPost, ApiError } from "../api/client";
import { endpoints } from "../api/endpoints";

// ─── Local types ──────────────────────────────────────────────────────────────

interface OwnOffice {
    id: number;
    name: string;
    code: string;
    address1: string;
    city: string;
    state: string;
    country: string;
}

interface Agency {
    id: number;
    name: string;
    partner_type: string;
    notes: string;
}

function unwrap<T>(res: unknown): T[] {
    if (Array.isArray(res)) return res as T[];
    return ((res as any).results ?? []) as T[];
}

// ─── Shared micro-styles ─────────────────────────────────────────────────────

const INP: React.CSSProperties = {
    width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #d1d5db",
    borderRadius: 6, fontSize: "0.875rem", boxSizing: "border-box", background: "#fff",
};

const LBL: React.CSSProperties = {
    display: "block", fontSize: "0.8125rem", fontWeight: 600,
    color: "#374151", marginBottom: "0.3rem",
};

// ─── Step indicator dot ───────────────────────────────────────────────────────

function Dot({ done, num, locked }: { done: boolean; num: number; locked?: boolean }) {
    const style: React.CSSProperties = {
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: "bold", fontSize: "0.875rem",
        ...(done
            ? { background: "#16a34a", color: "white" }
            : locked
            ? { border: "2px solid #d1d5db", color: "#9ca3af" }
            : { background: "#e0e7ff", color: "#4f46e5" }),
    };
    return <div style={style}>{done ? "✓" : num}</div>;
}

// ─── Office form ──────────────────────────────────────────────────────────────

function OfficeForm({ onCreated, onCancel }: { onCreated: (o: OwnOffice) => void; onCancel: () => void }) {
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [address1, setAddress1] = useState("");
    const [address2, setAddress2] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [country, setCountry] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!name.trim()) { setError("Office name is required."); return; }
        setError(""); setSaving(true);
        try {
            const result = await apiPost<OwnOffice>(endpoints.offices(), {
                name: name.trim(),
                ...(code.trim() && { code: code.trim() }),
                ...(address1.trim() && { address1: address1.trim() }),
                ...(address2.trim() && { address2: address2.trim() }),
                ...(city.trim() && { city: city.trim() }),
                ...(state.trim() && { state: state.trim() }),
                ...(postalCode.trim() && { postal_code: postalCode.trim() }),
                ...(country.trim() && { country: country.trim() }),
                ...(phone.trim() && { phone: phone.trim() }),
                ...(email.trim() && { email: email.trim() }),
            });
            onCreated(result);
        } catch (err) {
            setError(err instanceof ApiError ? (err.message || "Failed to create office.") : "Something went wrong.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate
            style={{ borderTop: "1px solid #e5e7eb", marginTop: 12, paddingTop: 16, display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                <div>
                    <label style={LBL}>Office Name *</label>
                    <input value={name} onChange={e => setName(e.target.value)}
                        placeholder="e.g. Miami Warehouse" required disabled={saving} style={INP} />
                </div>
                <div>
                    <label style={LBL}>Office Code</label>
                    <input value={code} onChange={e => setCode(e.target.value)}
                        placeholder="e.g. MIA-01" disabled={saving} style={INP} />
                </div>
            </div>
            <div>
                <label style={LBL}>Address Line 1</label>
                <input value={address1} onChange={e => setAddress1(e.target.value)}
                    placeholder="Street address" disabled={saving} style={INP} />
            </div>
            <div>
                <label style={LBL}>Address Line 2</label>
                <input value={address2} onChange={e => setAddress2(e.target.value)}
                    placeholder="Suite, floor, etc." disabled={saving} style={INP} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.875rem" }}>
                <div>
                    <label style={LBL}>City</label>
                    <input value={city} onChange={e => setCity(e.target.value)}
                        placeholder="City" disabled={saving} style={INP} />
                </div>
                <div>
                    <label style={LBL}>State / Province</label>
                    <input value={state} onChange={e => setState(e.target.value)}
                        placeholder="State" disabled={saving} style={INP} />
                </div>
                <div>
                    <label style={LBL}>ZIP / Postal</label>
                    <input value={postalCode} onChange={e => setPostalCode(e.target.value)}
                        placeholder="ZIP" disabled={saving} style={INP} />
                </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.875rem" }}>
                <div>
                    <label style={LBL}>Country</label>
                    <input value={country} onChange={e => setCountry(e.target.value)}
                        placeholder="Country" disabled={saving} style={INP} />
                </div>
                <div>
                    <label style={LBL}>Phone</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)}
                        placeholder="Phone" disabled={saving} style={INP} />
                </div>
                <div>
                    <label style={LBL}>Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="office@example.com" type="email" disabled={saving} style={INP} />
                </div>
            </div>
            {error && <div style={{ color: "#dc2626", fontSize: "0.8125rem" }}>{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={saving} className="btn btn-primary"
                    style={{ padding: "0.55rem 1.25rem", fontSize: "0.875rem" }}>
                    {saving ? "Creating…" : "Create Office"}
                </button>
                <button type="button" onClick={onCancel} disabled={saving}
                    style={{ padding: "0.55rem 1.25rem", fontSize: "0.875rem", borderRadius: 6, border: "1px solid #d1d5db", background: "transparent", color: "#6b7280", cursor: "pointer" }}>
                    Cancel
                </button>
            </div>
        </form>
    );
}

// ─── Agency form ──────────────────────────────────────────────────────────────

function AgencyForm({ onCreated, onCancel }: { onCreated: (a: Agency) => void; onCancel: () => void }) {
    const [name, setName] = useState("");
    const [partnerType, setPartnerType] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!name.trim()) { setError("Agency name is required."); return; }
        setError(""); setSaving(true);
        try {
            const result = await apiPost<Agency>(endpoints.associateCompanies(), {
                name: name.trim(),
                partner_type: partnerType,
                notes: notes.trim(),
            });
            onCreated(result);
        } catch (err) {
            setError(err instanceof ApiError ? (err.message || "Failed to create agency.") : "Something went wrong.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate
            style={{ borderTop: "1px solid #e5e7eb", marginTop: 12, paddingTop: 16, display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "#6b7280" }}>
                Agencies and subcompanies are grouped under your company account — they are not separate tenants.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                <div>
                    <label style={LBL}>Agency / Company Name *</label>
                    <input value={name} onChange={e => setName(e.target.value)}
                        placeholder="e.g. Acme Logistics" required disabled={saving} style={INP} />
                </div>
                <div>
                    <label style={LBL}>Type</label>
                    <select value={partnerType} onChange={e => setPartnerType(e.target.value)}
                        disabled={saving} style={INP}>
                        <option value="">— Select type —</option>
                        <option value="Agency">Agency</option>
                        <option value="Subcompany">Subcompany / Business Unit</option>
                        <option value="Partner">Business Partner</option>
                    </select>
                </div>
            </div>
            <div>
                <label style={LBL}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Optional notes about this agency…" disabled={saving} rows={2}
                    style={{ ...INP, resize: "vertical" as const }} />
            </div>
            {error && <div style={{ color: "#dc2626", fontSize: "0.8125rem" }}>{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={saving} className="btn btn-primary"
                    style={{ padding: "0.55rem 1.25rem", fontSize: "0.875rem" }}>
                    {saving ? "Creating…" : "Add Agency"}
                </button>
                <button type="button" onClick={onCancel} disabled={saving}
                    style={{ padding: "0.55rem 1.25rem", fontSize: "0.875rem", borderRadius: 6, border: "1px solid #d1d5db", background: "transparent", color: "#6b7280", cursor: "pointer" }}>
                    Cancel
                </button>
            </div>
        </form>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const [pageLoading, setPageLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");
    const [offices, setOffices] = useState<OwnOffice[]>([]);
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [expandedStep, setExpandedStep] = useState<1 | 2 | null>(null);

    useEffect(() => {
        Promise.all([
            apiGet<unknown>(endpoints.offices(), { type: "own" }),
            apiGet<unknown>(endpoints.associateCompanies()),
        ])
            .then(([offRes, agRes]) => {
                setOffices(unwrap<OwnOffice>(offRes));
                setAgencies(unwrap<Agency>(agRes));
            })
            .catch(() => setFetchError("Could not load company settings. Please refresh."))
            .finally(() => setPageLoading(false));
    }, []);

    // Auto-expand step 1 on first load when no offices exist yet
    useEffect(() => {
        if (!pageLoading && expandedStep === null && offices.length === 0) {
            setExpandedStep(1);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageLoading]);

    const hasOffice = offices.length > 0;
    const hasAgency = agencies.length > 0;
    const completedCount = [hasOffice, hasAgency].filter(Boolean).length;

    function toggle(step: 1 | 2) {
        setExpandedStep(prev => (prev === step ? null : step));
    }

    const step1IsPrimary = expandedStep !== 1 && !hasOffice;

    return (
        <div style={{ maxWidth: 800 }}>
            <h1 style={{ marginTop: 0, marginBottom: "1.5rem" }}>Company Settings</h1>

            <div style={{ background: "white", padding: 24, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h2 style={{ fontSize: "1.25rem", marginTop: 0, marginBottom: 4 }}>Setup Checklist</h2>
                <p style={{ color: "#4b5563", marginBottom: 20, marginTop: 0 }}>
                    Complete these steps to fully configure your company tenant.
                    {!pageLoading && (
                        <span style={{ marginLeft: 8, fontSize: "0.8125rem", color: completedCount === 2 ? "#16a34a" : "#9ca3af" }}>
                            {completedCount} / 2 complete
                        </span>
                    )}
                </p>

                {pageLoading && (
                    <div style={{ color: "#9ca3af", fontSize: "0.875rem", padding: "12px 0" }}>Loading…</div>
                )}
                {fetchError && (
                    <div style={{ color: "#dc2626", fontSize: "0.875rem" }}>{fetchError}</div>
                )}

                {!pageLoading && !fetchError && (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>

                        {/* ── Step 1: Office ─────────────────────────────────────────────── */}
                        <li style={{ padding: "12px", background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <Dot done={hasOffice} num={1} />
                                <div style={{ flex: 1 }}>
                                    <strong style={{ display: "block", color: "#111827" }}>Add your first office</strong>
                                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                                        {hasOffice
                                            ? `${offices.length} office${offices.length > 1 ? "s" : ""} configured`
                                            : "Required to start receiving or processing packages."}
                                    </span>
                                </div>
                                <button type="button" onClick={() => toggle(1)} style={{
                                    fontSize: "0.8125rem", fontWeight: 600, padding: "5px 12px", borderRadius: 6,
                                    cursor: "pointer", whiteSpace: "nowrap",
                                    background: step1IsPrimary ? "#4f46e5" : "transparent",
                                    color: step1IsPrimary ? "white" : "#374151",
                                    border: step1IsPrimary ? "1px solid #4f46e5" : "1px solid #d1d5db",
                                }}>
                                    {expandedStep === 1 ? "Cancel" : hasOffice ? "+ Add another" : "Set up →"}
                                </button>
                            </div>

                            {hasOffice && expandedStep !== 1 && (
                                <ul style={{ margin: "10px 0 0", padding: "0 0 0 40px", listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                                    {offices.map(o => (
                                        <li key={o.id} style={{ fontSize: "0.875rem", color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span>
                                            <strong>{o.name}</strong>
                                            {o.code && <span style={{ color: "#9ca3af" }}>({o.code})</span>}
                                            {o.city && (
                                                <span style={{ color: "#6b7280" }}>
                                                    · {o.city}{o.state ? `, ${o.state}` : ""}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {expandedStep === 1 && (
                                <OfficeForm
                                    onCreated={office => { setOffices(prev => [...prev, office]); setExpandedStep(null); }}
                                    onCancel={() => setExpandedStep(null)}
                                />
                            )}
                        </li>

                        {/* ── Step 2: Agencies ───────────────────────────────────────────── */}
                        <li style={{ padding: "12px", background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <Dot done={hasAgency} num={2} />
                                <div style={{ flex: 1 }}>
                                    <strong style={{ display: "block", color: hasAgency ? "#111827" : "#4b5563" }}>
                                        Add agencies / subcompanies{" "}
                                        <span style={{ fontSize: "0.8125rem", fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
                                    </strong>
                                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                                        {hasAgency
                                            ? `${agencies.length} agenc${agencies.length > 1 ? "ies" : "y"} configured`
                                            : "Track packages by agency or subcompany under your account."}
                                    </span>
                                </div>
                                <button type="button" onClick={() => toggle(2)} style={{
                                    fontSize: "0.8125rem", fontWeight: 600, padding: "5px 12px", borderRadius: 6,
                                    border: "1px solid #d1d5db", background: "transparent", color: "#374151",
                                    cursor: "pointer", whiteSpace: "nowrap",
                                }}>
                                    {expandedStep === 2 ? "Cancel" : hasAgency ? "+ Add another" : "Add agency →"}
                                </button>
                            </div>

                            {hasAgency && expandedStep !== 2 && (
                                <ul style={{ margin: "10px 0 0", padding: "0 0 0 40px", listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                                    {agencies.map(a => (
                                        <li key={a.id} style={{ fontSize: "0.875rem", color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span>
                                            <strong>{a.name}</strong>
                                            {a.partner_type && <span style={{ color: "#6b7280" }}>· {a.partner_type}</span>}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {expandedStep === 2 && (
                                <AgencyForm
                                    onCreated={agency => { setAgencies(prev => [...prev, agency]); setExpandedStep(null); }}
                                    onCancel={() => setExpandedStep(null)}
                                />
                            )}
                        </li>

                        {/* ── Step 3: Team members (locked / coming soon) ─────────────────── */}
                        <li style={{ padding: "12px", background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb", opacity: 0.6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <Dot done={false} num={3} locked />
                                <div style={{ flex: 1 }}>
                                    <strong style={{ display: "block", color: "#4b5563" }}>Add team members</strong>
                                    <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Invite staff and assign roles.</span>
                                </div>
                                <span style={{ fontSize: "0.75rem", color: "#9ca3af", border: "1px solid #e5e7eb", borderRadius: 4, padding: "3px 8px" }}>
                                    Coming soon
                                </span>
                            </div>
                        </li>

                    </ul>
                )}
            </div>
        </div>
    );
}
