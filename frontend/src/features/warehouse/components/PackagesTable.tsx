import { PackageFormData } from "../types";

interface Props {
    packages: PackageFormData[];
    onChange: (index: number, field: keyof PackageFormData, value: any) => void;
    onAddRow: (index: number) => void;
    onRemoveRow: (index: number) => void;
}

const ActionButton = ({ onClick, color, icon, title, disabled = false }: { onClick: () => void, color: string, icon: React.ReactNode, title: string, disabled?: boolean }) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        disabled={disabled}
        style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "4px",
            background: color,
            color: "white",
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            flexShrink: 0,
            opacity: disabled ? 0.5 : 1
        }}
    >
        {icon}
    </button>
);

export function PackagesTable({ packages, onChange, onAddRow, onRemoveRow }: Props) {
    return (
        <div style={{ overflowX: "auto", background: "white", borderRadius: "8px", border: "1px solid #eee", width: "100%" }}>
            <style>
                {`
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
                `}
            </style>
            <table style={{ width: "100%", minWidth: "1100px", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                    <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #ddd", textAlign: "center" }}>
                        <th style={{ padding: "10px 8px", width: "9%" }}>Date</th>
                        <th style={{ padding: "10px 8px", width: "8%" }}>Carrier</th>
                        <th style={{ padding: "10px 8px", width: "9%" }}>Type</th>
                        <th style={{ padding: "10px 8px", width: "10%" }}>Tracking</th>
                        <th style={{ padding: "10px 8px", width: "18%" }}>Description</th>
                        <th style={{ padding: "10px 8px", width: "7%" }}>Value ($)</th>
                        <th style={{ padding: "10px 8px", width: "5%", textAlign: "center" }}>L (in)</th>
                        <th style={{ padding: "10px 8px", width: "5%", textAlign: "center" }}>W (in)</th>
                        <th style={{ padding: "10px 8px", width: "5%", textAlign: "center" }}>H (in)</th>
                        <th style={{ padding: "10px 8px", width: "6%", textAlign: "center" }}>Weight</th>
                        <th style={{ padding: "10px 8px", width: "5%", textAlign: "center" }}>Pieces</th>
                        <th style={{ padding: "10px 8px", width: "6%", textAlign: "center" }}>Vol (CF)</th>
                        <th style={{ padding: "10px 8px", width: "7%", textAlign: "center" }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {packages.map((pkg, index) => {
                        const inputStyle = { padding: "6px", border: "1px solid #ddd", borderRadius: "4px", width: "100%", boxSizing: "border-box" as const, fontSize: "13px" };

                        return (
                            <tr key={pkg.id || index} style={{ borderBottom: "1px solid #eee", verticalAlign: "middle" }}>
                                <td style={{ padding: "8px" }}>
                                    <input type="date" value={pkg.date} onChange={(e) => onChange(index, "date", e.target.value)} style={inputStyle} />
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <select value={pkg.carrier} onChange={(e) => onChange(index, "carrier", e.target.value)} style={{ ...inputStyle, background: "white" }}>
                                        <option value="">Select...</option>
                                        <option value="ups">UPS</option>
                                        <option value="fedex">FedEx</option>
                                        <option value="usps">USPS</option>
                                        <option value="dhl">DHL</option>
                                    </select>
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <select value={pkg.type} onChange={(e) => onChange(index, "type", e.target.value)} style={{ ...inputStyle, background: "white" }}>
                                        <option value="">Select Type...</option>
                                        <option value="box">Box</option>
                                        <option value="envelope">Envelope</option>
                                        <option value="backpack/bag">Backpack/Bag</option>
                                        <option value="pallet">Pallet</option>
                                        <option value="suitcase">Suitcase</option>
                                        <option value="plastic box">Plastic Box</option>
                                        <option value="cooler">Cooler</option>
                                        <option value="equipment">Equipment</option>
                                    </select>
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        {Array.from({ length: Math.max(1, Number(pkg.pieces) || 1) }, (_, i) => (
                                            <input
                                                key={i}
                                                type="text"
                                                placeholder={Number(pkg.pieces) > 1 ? `Tracking ${i + 1}` : "Tracking"}
                                                value={pkg.trackingNumbers[i] ?? ""}
                                                onChange={(e) => {
                                                    const count = Math.max(1, Number(pkg.pieces) || 1);
                                                    const full = Array.from({ length: count }, (_, j) => pkg.trackingNumbers[j] ?? '');
                                                    full[i] = e.target.value;
                                                    onChange(index, "trackingNumbers", full);
                                                }}
                                                style={inputStyle}
                                            />
                                        ))}
                                    </div>
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <input type="text" placeholder="Description" value={pkg.description} onChange={(e) => onChange(index, "description", e.target.value)} style={{ ...inputStyle, minWidth: "150px" }} />
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <input type="number" min="0" step="0.01" value={pkg.value} onChange={(e) => onChange(index, "value", e.target.value)} style={inputStyle} />
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <input type="number" min="0" step="0.1" value={pkg.length} onChange={(e) => onChange(index, "length", e.target.value)} style={{ ...inputStyle, textAlign: "center" }} />
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <input type="number" min="0" step="0.1" value={pkg.width} onChange={(e) => onChange(index, "width", e.target.value)} style={{ ...inputStyle, textAlign: "center" }} />
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <input type="number" min="0" step="0.1" value={pkg.height} onChange={(e) => onChange(index, "height", e.target.value)} style={{ ...inputStyle, textAlign: "center" }} />
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <input type="number" min="0" step="0.1" value={pkg.weight} onChange={(e) => onChange(index, "weight", e.target.value)} style={{ ...inputStyle, textAlign: "center" }} />
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <input type="number" min="1" value={pkg.pieces} onChange={(e) => onChange(index, "pieces", e.target.value)} style={{ ...inputStyle, textAlign: "center" }} />
                                </td>
                                <td style={{ padding: "8px", textAlign: "center", fontWeight: 600, color: "#555", background: "#f8f9fa" }}>
                                    {pkg.volume.toFixed(2)}
                                </td>
                                <td style={{ padding: "8px" }}>
                                    <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                        <ActionButton
                                            onClick={() => onAddRow(index)}
                                            color="#2563eb"
                                            title="Add Package"
                                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 8H5m0 4h9m-3 4H5m10 0h6m-3-3v6" /></svg>}
                                        />
                                        <ActionButton
                                            onClick={() => alert("Takes a picture of this package (Placeholder)")}
                                            color="rgb(241, 158, 57)"
                                            title="Take Photo"
                                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M5 7h1a2 2 0 0 0 2-2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2" /><path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0-6 0" /></g></svg>}
                                        />
                                        <ActionButton
                                            onClick={() => onRemoveRow(index)}
                                            disabled={packages.length <= 1}
                                            color="#dc2626"
                                            title="Remove Row"
                                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 6L6 18M6 6l12 12" /></svg>}
                                        />
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
