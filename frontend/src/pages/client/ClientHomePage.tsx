import { useEffect, useState } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { apiGet } from "../../api/client";
import { endpoints } from "../../api/endpoints";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PackageItem {
    id: number;
    kind: "WR" | "REPACK";
    reference: string;
    status: string;
    date: string | null;
    description: string | null;
    weight: string | null;
}

interface LatestProgress {
    reference: string;
    status: string;
    stage_received: boolean;
    stage_consolidated: boolean;
    stage_arrived: boolean;
}

interface PortalSummary {
    warehouse_receipts: PackageItem[];
    repacks: PackageItem[];
    latest_progress: LatestProgress | null;
}

// ---------------------------------------------------------------------------
// Small shared components
// ---------------------------------------------------------------------------

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <section
            style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "20px 24px",
                ...style,
            }}
        >
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: "1rem", fontWeight: 600, color: "#374151" }}>
                {title}
            </h2>
            {children}
        </section>
    );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ width: 148, flexShrink: 0, color: "#6b7280", fontSize: "0.8125rem" }}>{label}</span>
            <span style={{ color: value ? "#111827" : "#9ca3af", fontSize: "0.8125rem" }}>
                {value || "—"}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Progress indicator
// ---------------------------------------------------------------------------

function PackageProgress({ progress }: { progress: LatestProgress }) {
    const stages = [
        { label: "Received", sublabel: "Warehouse receipt created", done: progress.stage_received },
        { label: "Consolidated", sublabel: "Package consolidated", done: progress.stage_consolidated },
        { label: "Arrived", sublabel: "Ready for pickup", done: progress.stage_arrived },
    ];

    return (
        <div>
            <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginBottom: 16 }}>
                Latest package: <span style={{ fontWeight: 600, color: "#374151" }}>{progress.reference}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {stages.map((s, i) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", flex: i < stages.length - 1 ? 1 : "none" }}>
                        {/* Circle */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: "50%",
                                    background: s.done ? "#2679c6" : "#e5e7eb",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                {s.done && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                            <div style={{ marginTop: 6, textAlign: "center" }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: s.done ? "#374151" : "#9ca3af" }}>
                                    {s.label}
                                </div>
                                <div style={{ fontSize: "0.6875rem", color: "#9ca3af", whiteSpace: "nowrap" }}>
                                    {s.sublabel}
                                </div>
                            </div>
                        </div>
                        {/* Connector line */}
                        {i < stages.length - 1 && (
                            <div
                                style={{
                                    flex: 1,
                                    height: 2,
                                    background: s.done && stages[i + 1].done ? "#2679c6" : "#e5e7eb",
                                    margin: "0 4px",
                                    alignSelf: "flex-start",
                                    marginTop: 13,
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
                <span
                    style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 12,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background:
                            progress.status === "SHIPPED" ? "#d1fae5" :
                            progress.status === "ACTIVE" ? "#dbeafe" :
                            progress.status === "CANCELLED" ? "#fee2e2" : "#f3f4f6",
                        color:
                            progress.status === "SHIPPED" ? "#065f46" :
                            progress.status === "ACTIVE" ? "#1e40af" :
                            progress.status === "CANCELLED" ? "#991b1b" : "#374151",
                    }}
                >
                    {progress.status}
                </span>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; text: string }> = {
        ACTIVE: { bg: "#dbeafe", text: "#1e40af" },
        SHIPPED: { bg: "#d1fae5", text: "#065f46" },
        INACTIVE: { bg: "#f3f4f6", text: "#374151" },
        CANCELLED: { bg: "#fee2e2", text: "#991b1b" },
        CONSOLIDATE: { bg: "#fef3c7", text: "#92400e" },
        REPACK: { bg: "#ede9fe", text: "#5b21b6" },
    };
    const style = map[status] ?? { bg: "#f3f4f6", text: "#374151" };
    return (
        <span
            style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 10,
                fontSize: "0.7rem",
                fontWeight: 600,
                background: style.bg,
                color: style.text,
                whiteSpace: "nowrap",
            }}
        >
            {status}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClientHomePage() {
    const { user } = useAuth();
    const client = user?.client;

    const [summary, setSummary] = useState<PortalSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        apiGet<PortalSummary>(endpoints.clientPortalSummary())
            .then(setSummary)
            .catch(() => setError("Could not load your package data."))
            .finally(() => setLoading(false));
    }, []);

    // Merge and sort WRs + repacks by date descending
    const allPackages: PackageItem[] = summary
        ? [
              ...summary.warehouse_receipts,
              ...summary.repacks,
          ].sort((a, b) => {
              if (!a.date) return 1;
              if (!b.date) return -1;
              return new Date(b.date).getTime() - new Date(a.date).getTime();
          })
        : [];

    const fullName = [client?.name, client?.last_name].filter(Boolean).join(" ") || user?.username || "—";
    const phone = client?.cellphone || client?.phone || client?.home_phone;
    const addressParts = [client?.address, client?.city, client?.postal_code].filter(Boolean);
    const addressLine = addressParts.length > 0 ? addressParts.join(", ") : null;

    return (
        <div>
            <h1 style={{ marginTop: 0, marginBottom: 20, fontSize: "1.4rem", fontWeight: 700, color: "#111827" }}>
                Welcome, {client?.name || user?.username}
            </h1>

            {/* Top row: account summary + latest progress */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                {/* Account summary */}
                <Card title="Account Summary">
                    <InfoRow label="Name" value={fullName} />
                    <InfoRow label="Client Code" value={client?.client_code} />
                    <InfoRow label="Company" value={client?.company_name || user?.company?.name} />
                    <InfoRow label="Email" value={client?.email || user?.email} />
                    <InfoRow label="Phone" value={phone} />
                    <InfoRow label="Address" value={addressLine} />
                    {client?.city && !addressLine?.includes(client.city) && (
                        <InfoRow label="City" value={client.city} />
                    )}
                </Card>

                {/* Latest package progress */}
                <Card title="Latest Package Progress">
                    {loading ? (
                        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Loading…</p>
                    ) : summary?.latest_progress ? (
                        <PackageProgress progress={summary.latest_progress} />
                    ) : (
                        <div style={{ color: "#9ca3af", fontSize: "0.875rem", paddingTop: 8 }}>
                            No packages on file yet.
                        </div>
                    )}
                </Card>
            </div>

            {/* Combined packages table */}
            <Card title="My Packages" style={{ marginBottom: 0 }}>
                {error && (
                    <p style={{ color: "#dc2626", fontSize: "0.875rem" }}>{error}</p>
                )}
                {loading ? (
                    <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Loading…</p>
                ) : allPackages.length === 0 && !error ? (
                    <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>No packages found.</p>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                        <thead>
                            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                                <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 600, whiteSpace: "nowrap" }}>Reference</th>
                                <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>Type</th>
                                <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>Status</th>
                                <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>Description</th>
                                <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 600, whiteSpace: "nowrap" }}>Weight</th>
                                <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allPackages.map((pkg) => (
                                <tr key={`${pkg.kind}-${pkg.id}`} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>{pkg.reference}</td>
                                    <td style={{ padding: "8px 10px" }}>
                                        <span
                                            style={{
                                                display: "inline-block",
                                                padding: "2px 8px",
                                                borderRadius: 10,
                                                fontSize: "0.7rem",
                                                fontWeight: 600,
                                                background: pkg.kind === "WR" ? "#dbeafe" : "#ede9fe",
                                                color: pkg.kind === "WR" ? "#1e40af" : "#5b21b6",
                                            }}
                                        >
                                            {pkg.kind === "WR" ? "Warehouse Receipt" : "Repack"}
                                        </span>
                                    </td>
                                    <td style={{ padding: "8px 10px" }}>
                                        <StatusBadge status={pkg.status} />
                                    </td>
                                    <td style={{ padding: "8px 10px", color: pkg.description ? "#374151" : "#9ca3af", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {pkg.description || "—"}
                                    </td>
                                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                                        {pkg.weight ? `${pkg.weight} lbs` : "—"}
                                    </td>
                                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap", color: "#6b7280" }}>
                                        {pkg.date ? new Date(pkg.date).toLocaleDateString() : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
}
