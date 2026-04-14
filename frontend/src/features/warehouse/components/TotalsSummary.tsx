interface StatItem {
    label: string;
    value: string | number;
}

interface Props {
    items: StatItem[];
}

export function TotalsSummary({ items }: Props) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "16px",
            marginTop: "24px"
        }}>
            {items.map((item) => (
                <div key={item.label} style={{ background: "white", padding: "16px", borderRadius: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                    <div style={{ fontSize: "13px", color: "#666", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase" }}>{item.label}</div>
                    <div style={{ fontSize: "24px", color: "#1a1a1a", fontWeight: 700 }}>{item.value}</div>
                </div>
            ))}
        </div>
    );
}
