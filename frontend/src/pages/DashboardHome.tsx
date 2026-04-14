// TODO(dashboard-v2): two real charts (WRs/day, ship-type donut) are wired up.
// SHOW_CHARTS still gates the legacy "Invoices" and "Type of Load" placeholder
// blocks — leave hidden until invoice/freight % data is ready. Future work:
// financial summary using the new pricing-v2 math.
import { useEffect, useMemo, useState } from "react";
import {
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { apiGet, ApiError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { useAuth } from "../features/auth/AuthContext";
import "./DashboardHome.css";

const SHOW_CHARTS = false;

type RecentWR = {
    wr_number: string;
    client_name: string;
    agency_name: string;
    total_weight: number;
    received_at: string | null;
};

type DashboardStats = {
    active_wr_count: number;
    consolidations: { draft: number; open: number; closed: number };
    active_clients: number;
    repacks_this_month: number;
    recent_wrs: RecentWR[];
    wrs_per_day: { date: string; count: number }[];
    consolidations_by_ship_type: { air: number; sea: number; ground: number };
};

// Match lwp-badge-air/sea/ground palette so donut reads as same shipping-type vocabulary.
const SHIP_TYPE_COLORS = {
    air: "#1d4ed8",
    sea: "#065f46",
    ground: "#92400e",
};

function formatDate(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
}

function formatAxisDate(iso: string): string {
    const [, m, d] = iso.split("-");
    return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

export default function DashboardHome() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await apiGet<DashboardStats>(endpoints.dashboardStats());
                if (!cancelled) setStats(data);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof ApiError ? err.message : "Failed to load dashboard.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const companyName = user?.company?.name ?? "";
    const title = companyName ? `${companyName} Dashboard` : "Dashboard";

    const shipTypeData = useMemo(() => {
        if (!stats) return [];
        const s = stats.consolidations_by_ship_type;
        return [
            { name: "Air", value: s.air, fill: SHIP_TYPE_COLORS.air },
            { name: "Sea", value: s.sea, fill: SHIP_TYPE_COLORS.sea },
            { name: "Ground", value: s.ground, fill: SHIP_TYPE_COLORS.ground },
        ].filter((d) => d.value > 0);
    }, [stats]);
    const shipTypeTotal = shipTypeData.reduce((acc, d) => acc + d.value, 0);

    return (
        <div className="dh-container">
            <h1 className="dh-title">{title}</h1>

            <div className="dh-stack">
                {SHOW_CHARTS && (
                    <>
                        <section className="dh-card">
                            <h2 className="dh-card-title">Invoices for the last 30 days</h2>
                            <p className="dh-state">This will render when invoice data exists.</p>
                        </section>
                        <section className="dh-card">
                            <h2 className="dh-card-title">Type of Load</h2>
                            <p className="dh-state">Percentages will update when shipments exist.</p>
                        </section>
                    </>
                )}

                <section className="dh-card">
                    <h2 className="dh-card-title">Overview</h2>
                    {loading ? (
                        <p className="dh-state">Loading…</p>
                    ) : error ? (
                        <p className="dh-state dh-state-error">{error}</p>
                    ) : stats ? (
                        <div className="dh-stats-grid">
                            <div className="dh-stat">
                                <div className="dh-stat-label">Active Warehouse Receipts</div>
                                <div className="dh-stat-value">{stats.active_wr_count}</div>
                            </div>
                            <div className="dh-stat">
                                <div className="dh-stat-label">Consolidations</div>
                                <div className="dh-stat-rows">
                                    <div className="dh-stat-row">
                                        <span className="dh-stat-row-label dh-stat-row-label-draft">DRAFT</span>
                                        <span className="dh-stat-row-count">{stats.consolidations.draft}</span>
                                    </div>
                                    <div className="dh-stat-row">
                                        <span className="dh-stat-row-label dh-stat-row-label-open">OPEN</span>
                                        <span className="dh-stat-row-count">{stats.consolidations.open}</span>
                                    </div>
                                    <div className="dh-stat-row">
                                        <span className="dh-stat-row-label dh-stat-row-label-closed">CLOSED</span>
                                        <span className="dh-stat-row-count">{stats.consolidations.closed}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="dh-stat">
                                <div className="dh-stat-label">Active Clients</div>
                                <div className="dh-stat-value">{stats.active_clients}</div>
                            </div>
                            <div className="dh-stat">
                                <div className="dh-stat-label">Repacks This Month</div>
                                <div className="dh-stat-value">{stats.repacks_this_month}</div>
                            </div>
                        </div>
                    ) : null}
                </section>

                <div className="dh-charts-row">
                <section className="dh-card">
                    <h2 className="dh-card-title">Warehouse Receipts — Last 30 Days</h2>
                    {loading ? (
                        <p className="dh-state">Loading…</p>
                    ) : error ? (
                        <p className="dh-state dh-state-error">{error}</p>
                    ) : stats ? (
                        <div className="dh-chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.wrs_per_day} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                                    <CartesianGrid stroke="#f3f4f6" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={formatAxisDate}
                                        tick={{ fill: "#6b7280", fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={{ stroke: "#e5e7eb" }}
                                        minTickGap={16}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fill: "#6b7280", fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={{ stroke: "#e5e7eb" }}
                                        width={32}
                                    />
                                    <Tooltip
                                        labelFormatter={(v: string) => formatDate(v)}
                                        formatter={(v: number) => [v, "WRs"]}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#2563eb"
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: "#2563eb", stroke: "#2563eb" }}
                                        activeDot={{ r: 5 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : null}
                </section>

                <section className="dh-card">
                    <h2 className="dh-card-title">Consolidations by Ship Type</h2>
                    {loading ? (
                        <p className="dh-state">Loading…</p>
                    ) : error ? (
                        <p className="dh-state dh-state-error">{error}</p>
                    ) : !stats || shipTypeTotal === 0 ? (
                        <div className="dh-chart dh-chart-empty">No consolidations yet.</div>
                    ) : (
                        <div className="dh-chart dh-donut-layout">
                            <div className="dh-donut-chart">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Tooltip formatter={(v: number, name: string) => [v, name]} />
                                        <Pie
                                            data={shipTypeData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={60}
                                            outerRadius={95}
                                            paddingAngle={2}
                                        >
                                            {shipTypeData.map((d) => (
                                                <Cell key={d.name} fill={d.fill} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <ul className="dh-donut-legend">
                                {shipTypeData.map((d) => {
                                    const pct = Math.round((d.value / shipTypeTotal) * 100);
                                    return (
                                        <li key={d.name} className="dh-donut-legend-item">
                                            <span className="dh-donut-swatch" style={{ background: d.fill }} />
                                            <span className="dh-donut-name">{d.name}</span>
                                            <span className="dh-donut-pct">{pct}%</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </section>
                </div>

                <section className="dh-card">
                    <h2 className="dh-card-title">Latest Packages Received</h2>
                    {loading ? (
                        <p className="dh-state">Loading…</p>
                    ) : error ? (
                        <p className="dh-state dh-state-error">{error}</p>
                    ) : (
                        <div className="dh-table-responsive">
                            <table className="dh-table">
                                <thead>
                                    <tr>
                                        <th>WR #</th>
                                        <th>Client</th>
                                        <th>Agency</th>
                                        <th>Weight</th>
                                        <th>Received</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!stats || stats.recent_wrs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="dh-empty">
                                                No packages received yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        stats.recent_wrs.map((p, index) => (
                                            <tr
                                                key={p.wr_number}
                                                className={index % 2 === 0 ? "dh-row-even" : "dh-row-odd"}
                                            >
                                                <td>
                                                    <div className="dh-wr-number">{p.wr_number}</div>
                                                </td>
                                                <td>{p.client_name}</td>
                                                <td>{p.agency_name}</td>
                                                <td>{p.total_weight.toFixed(2)} lb</td>
                                                <td>{formatDate(p.received_at)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
