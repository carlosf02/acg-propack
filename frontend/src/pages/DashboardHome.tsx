import { useEffect, useState, type ReactNode } from "react";

type StatRow = {
    label: string;
    today: number | string;
    dailyAvg: number | string;
    monthTotal: number | string;
};

type PackageRow = {
    id: string;
    customer: string;
    vendor: string;
    weight: string;
    time: string;
};

type DashboardData = {
    kpis: {
        clients: number;
        warehouses: number;
        consolidated: number;
        toBeCollected: number;
    };
    monthlyStats: StatRow[];
    latestPackages: PackageRow[];
};

function Card(props: { title: string; children: ReactNode }) {
    return (
        <section style={{ background: "white", padding: 16, marginBottom: 16, border: "1px solid #ddd" }}>
            <h2 style={{ marginTop: 0 }}>{props.title}</h2>
            {props.children}
        </section>
    );
}

function PlaceholderBox(props: { label: string; height?: number }) {
    return (
        <div
            style={{
                height: props.height ?? 240,
                border: "1px dashed #bbb",
                display: "grid",
                placeItems: "center",
                background: "#fafafa",
            }}
        >
            {props.label}
        </div>
    );
}

export default function DashboardHome() {
    const [data, setData] = useState<DashboardData>({
        kpis: { clients: 0, warehouses: 0, consolidated: 0, toBeCollected: 0 },
        monthlyStats: [],
        latestPackages: [],
    });

    const [loading, setLoading] = useState(false);

    void setData; // remove this line once you start calling the API and setData is used

    useEffect(() => {
        setLoading(false);
    }, []);

    return (
        <div>
            <h1 style={{ marginTop: 0 }}>Company Name Dashboard</h1>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
                <div>
                    <Card title="Invoices for the last 30 days">
                        <PlaceholderBox label="Line chart placeholder" height={260} />
                        <p style={{ marginBottom: 0, color: "#666" }}>This will render when invoice data exists.</p>
                    </Card>

                    <Card title="Type of Load">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
                            <PlaceholderBox label="Donut chart placeholder" height={180} />
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Ocean Freight</span>
                                    <span>0%</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Air Freight</span>
                                    <span>0%</span>
                                </div>
                                <p style={{ marginBottom: 0, color: "#666" }}>Percentages will update when shipments exist.</p>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
                            <div style={{ border: "1px solid #ddd", padding: 12 }}>
                                <div style={{ color: "#666" }}>Clients</div>
                                <div style={{ fontSize: 22, fontWeight: 700 }}>{data.kpis.clients}</div>
                            </div>
                            <div style={{ border: "1px solid #ddd", padding: 12 }}>
                                <div style={{ color: "#666" }}>Warehouses</div>
                                <div style={{ fontSize: 22, fontWeight: 700 }}>{data.kpis.warehouses}</div>
                            </div>
                            <div style={{ border: "1px solid #ddd", padding: 12 }}>
                                <div style={{ color: "#666" }}>Consolidated</div>
                                <div style={{ fontSize: 22, fontWeight: 700 }}>{data.kpis.consolidated}</div>
                            </div>
                            <div style={{ border: "1px solid #ddd", padding: 12 }}>
                                <div style={{ color: "#666" }}>To Be Collected</div>
                                <div style={{ fontSize: 22, fontWeight: 700 }}>${data.kpis.toBeCollected.toFixed(2)}</div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div>
                    <Card title="Statistics of the month">
                        {loading ? (
                            <p>Loading...</p>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Element</th>
                                        <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Today</th>
                                        <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Daily Average</th>
                                        <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Total of the Month</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.monthlyStats.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} style={{ padding: 10, color: "#666" }}>
                                                No statistics yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.monthlyStats.map((row) => (
                                            <tr key={row.label}>
                                                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8 }}>{row.label}</td>
                                                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8 }}>{row.today}</td>
                                                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8 }}>{row.dailyAvg}</td>
                                                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8 }}>{row.monthTotal}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </Card>

                    <Card title="Latest Packages Received">
                        {loading ? (
                            <p>Loading...</p>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Package</th>
                                        <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Customer</th>
                                        <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Vendor</th>
                                        <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Weight</th>
                                        <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.latestPackages.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 10, color: "#666" }}>
                                                No packages received yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.latestPackages.map((p) => (
                                            <tr key={p.id}>
                                                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8 }}>{p.id}</td>
                                                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8 }}>{p.customer}</td>
                                                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8 }}>{p.vendor}</td>
                                                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8 }}>{p.weight}</td>
                                                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8 }}>{p.time}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}