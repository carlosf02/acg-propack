import { useState } from "react";
import { WarehouseFormData, PackageFormData } from "../types";
import { SenderCard } from "../components/SenderCard";
import { RecipientCard } from "../components/RecipientCard";
import { WarehouseInfoCard } from "../components/WarehouseInfoCard";
import { PackagesTable } from "../components/PackagesTable";
import { TotalsSummary } from "../components/TotalsSummary";

const INITIAL_PACKAGE: PackageFormData = {
    date: new Date().toISOString().split('T')[0],
    carrier: "",
    type: "",
    tracking: "",
    description: "",
    value: "",
    length: "",
    width: "",
    height: "",
    weight: "",
    pieces: "",
    volume: 0,
};

export default function CreateWarehousePage() {
    // Top-Level State
    const [warehouseData, setWarehouseData] = useState<WarehouseFormData>({
        agency: "",
        shippingMethod: "",
        type: "",
        location: "",
        notes: "",
    });

    const [packages, setPackages] = useState<PackageFormData[]>([
        { ...INITIAL_PACKAGE, id: Date.now().toString() }
    ]);

    // Helpers to modify package array inline
    const handlePackageChange = (index: number, field: keyof PackageFormData, value: any) => {
        setPackages(prev => {
            const updated = [...prev];
            const pkg = { ...updated[index], [field]: value };

            // Auto calculate volume when dimensions change
            if (field === 'length' || field === 'width' || field === 'height') {
                const l = Number(pkg.length) || 0;
                const w = Number(pkg.width) || 0;
                const h = Number(pkg.height) || 0;
                pkg.volume = (l * w * h) / 1728;
            }

            updated[index] = pkg;
            return updated;
        });
    };

    // Handlers
    const handleWarehouseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setWarehouseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddRow = (index: number) => {
        setPackages(prev => {
            const updated = [...prev];
            updated.splice(index + 1, 0, { ...INITIAL_PACKAGE, id: Date.now().toString() });
            return updated;
        });
    };

    const handleRemoveRow = (index: number) => {
        setPackages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div style={{ padding: "0 0 40px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h1 style={{ margin: 0, fontSize: "28px", color: "#1a1a1a" }}>Create Warehouse</h1>
                <div style={{ display: "flex", gap: "12px" }}>
                    <button style={{ padding: "10px 20px", background: "white", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", fontWeight: 600, color: "#555" }}>
                        Cancel
                    </button>
                    <button style={{ padding: "10px 24px", background: "#0052cc", border: "none", borderRadius: "6px", color: "white", cursor: "pointer", fontWeight: 600 }}>
                        Save Warehouse
                    </button>
                </div>
            </div>

            {/* Top Grid: Sender, Recipient, Warehouse Info */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px", marginBottom: "24px", alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <SenderCard />
                    <RecipientCard />
                </div>

                <div style={{ height: "100%" }}>
                    <WarehouseInfoCard data={warehouseData} onChange={handleWarehouseChange} />
                </div>
            </div>

            {/* Bottom Section: Packages */}
            <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "12px", marginBottom: "20px" }}>
                    <h2 style={{ margin: 0, fontSize: "20px", color: "#333" }}>Packages</h2>

                    {/* Scanner Buttons requested at top level */}
                    <button type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "#9c6bd1ff", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M5.713 20.713Q5.425 21 5 21H2q-.425 0-.712-.288T1 20v-3q0-.425.288-.712T2 16t.713.288T3 17v2h2q.425 0 .713.288T6 20t-.288.713m17-4.426Q23 16.575 23 17v3q0 .425-.288.713T22 21h-3q-.425 0-.712-.288T18 20t.288-.712T19 19h2v-2q0-.425.288-.712T22 16t.713.288M4.5 18q-.2 0-.35-.15T4 17.5v-11q0-.2.15-.35T4.5 6h1q.2 0 .35.15T6 6.5v11q0 .2-.15.35T5.5 18zm2.65-.15Q7 17.7 7 17.5v-11q0-.2.15-.35T7.5 6t.35.15t.15.35v11q0 .2-.15.35T7.5 18t-.35-.15m3.35.15q-.2 0-.35-.15T10 17.5v-11q0-.2.15-.35T10.5 6h1q.2 0 .35.15t.15.35v11q0 .2-.15.35t-.35.15zm3 0q-.2 0-.35-.15T13 17.5v-11q0-.2.15-.35T13.5 6h2q.2 0 .35.15t.15.35v11q0 .2-.15.35t-.35.15zm3.65-.15Q17 17.7 17 17.5v-11q0-.2.15-.35T17.5 6t.35.15t.15.35v11q0 .2-.15.35t-.35.15t-.35-.15m2 0Q19 17.7 19 17.5v-11q0-.2.15-.35T19.5 6t.35.15t.15.35v11q0 .2-.15.35t-.35.15t-.35-.15M5.713 4.712Q5.425 5 5 5H3v2q0 .425-.288.713T2 8t-.712-.288T1 7V4q0-.425.288-.712T2 3h3q.425 0 .713.288T6 4t-.288.713m12.576-1.425Q18.575 3 19 3h3q.425 0 .713.288T23 4v3q0 .425-.288.713T22 8t-.712-.288T21 7V5h-2q-.425 0-.712-.288T18 4t.288-.712" /></svg> Scan
                    </button>
                </div>

                <PackagesTable
                    packages={packages}
                    onChange={handlePackageChange}
                    onAddRow={handleAddRow}
                    onRemoveRow={handleRemoveRow}
                />

                <TotalsSummary packages={packages} />
            </div>
        </div>
    );
}
