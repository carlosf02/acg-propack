import { PackageFormData } from "../types";

interface Props {
    packages: PackageFormData[];
    onEdit: (pkg: PackageFormData) => void;
    onRemove: (id: string) => void;
}

export function SavedPackagesList({ packages, onEdit, onRemove }: Props) {
    if (packages.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "32px", color: "#888", background: "white", borderRadius: "8px", border: "1px dashed #ccc" }}>
                No packages added yet.
            </div>
        );
    }

    return (
        <div style={{ overflowX: "auto", background: "white", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                    <tr style={{ background: "#f1f3f5", borderBottom: "2px solid #ddd", textAlign: "left" }}>
                        <th style={{ padding: "12px 16px", color: "#495057", fontWeight: 600 }}>Pkg #</th>
                        <th style={{ padding: "12px 16px", color: "#495057", fontWeight: 600 }}>Tracking</th>
                        <th style={{ padding: "12px 16px", color: "#495057", fontWeight: 600 }}>Carrier</th>
                        <th style={{ padding: "12px 16px", color: "#495057", fontWeight: 600 }}>Type</th>
                        <th style={{ padding: "12px 16px", color: "#495057", fontWeight: 600 }}>Volume</th>
                        <th style={{ padding: "12px 16px", color: "#495057", fontWeight: 600 }}>Weight</th>
                        <th style={{ padding: "12px 16px", color: "#495057", fontWeight: 600 }}>Pieces</th>
                        <th style={{ padding: "12px 16px", color: "#495057", fontWeight: 600, textAlign: "center" }}>Photo</th>
                        <th style={{ padding: "12px 16px", color: "#495057", fontWeight: 600, textAlign: "right" }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {packages.map((pkg, index) => (
                        <tr key={pkg.id} style={{ borderBottom: "1px solid #eee" }}>
                            <td style={{ padding: "12px 16px", color: "#333", fontWeight: 500 }}>{index + 1}</td>
                            <td style={{ padding: "12px 16px" }}>{pkg.tracking || "-"}</td>
                            <td style={{ padding: "12px 16px", textTransform: "capitalize" }}>{pkg.carrier || "-"}</td>
                            <td style={{ padding: "12px 16px" }}>{pkg.type || "-"}</td>
                            <td style={{ padding: "12px 16px" }}>{pkg.volume.toFixed(2)}</td>
                            <td style={{ padding: "12px 16px" }}>{pkg.weight}</td>
                            <td style={{ padding: "12px 16px" }}>{pkg.pieces}</td>
                            <td style={{ padding: "12px 16px", textAlign: "center", color: "#ccc" }}>📷</td>
                            <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                <button onClick={() => onEdit(pkg)} style={{ background: "none", border: "none", cursor: "pointer", marginRight: "8px", fontSize: "16px" }} title="Edit">✏️</button>
                                <button onClick={() => pkg.id && onRemove(pkg.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }} title="Remove">❌</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
