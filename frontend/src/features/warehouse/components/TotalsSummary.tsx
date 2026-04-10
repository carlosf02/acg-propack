import { PackageFormData } from "../types";

interface Props {
    packages: PackageFormData[];
}

export function TotalsSummary({ packages }: Props) {
    const totals = packages.reduce(
        (acc, pkg) => {
            const pieces = Math.max(1, Number(pkg.pieces) || 1);
            acc.volume += pkg.volume * pieces;
            acc.weight += (Number(pkg.weight) || 0) * pieces;
            acc.pieces += pieces;
            acc.value += (Number(pkg.value) || 0) * pieces;
            return acc;
        },
        { volume: 0, weight: 0, pieces: 0, value: 0 }
    );

    const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "16px",
            marginTop: "24px"
        }}>
            <div style={{ background: "white", padding: "16px", borderRadius: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#666", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase" }}>Total Packages</div>
                <div style={{ fontSize: "24px", color: "#1a1a1a", fontWeight: 700 }}>{packages.length}</div>
            </div>

            <div style={{ background: "white", padding: "16px", borderRadius: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#666", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase" }}>Total Volume</div>
                <div style={{ fontSize: "24px", color: "#1a1a1a", fontWeight: 700 }}>{totals.volume.toFixed(2)}</div>
            </div>

            <div style={{ background: "white", padding: "16px", borderRadius: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#666", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase" }}>Total Weight</div>
                <div style={{ fontSize: "24px", color: "#1a1a1a", fontWeight: 700 }}>{totals.weight.toFixed(2)}</div>
            </div>

            <div style={{ background: "white", padding: "16px", borderRadius: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#666", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase" }}>Total Pieces</div>
                <div style={{ fontSize: "24px", color: "#1a1a1a", fontWeight: 700 }}>{totals.pieces}</div>
            </div>

            <div style={{ background: "white", padding: "16px", borderRadius: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#666", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase" }}>Declared Value</div>
                <div style={{ fontSize: "24px", color: "#1a1a1a", fontWeight: 700 }}>{formatCurrency(totals.value)}</div>
            </div>
        </div>
    );
}
