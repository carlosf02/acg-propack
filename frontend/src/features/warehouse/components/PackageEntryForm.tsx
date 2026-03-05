import { PackageFormData } from "../types";

interface Props {
    packageData: PackageFormData;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onToggle: (field: keyof PackageFormData) => void;
    onSave: () => void;
    onClear: () => void;
}

export function PackageEntryForm({ packageData, onChange, onToggle, onSave, onClear }: Props) {
    return (
        <div style={{
            background: "#f9f9f9",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #eee",
            marginBottom: "20px"
        }}>
            {/* Top row controls */}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                        <input type="checkbox" checked={packageData.repackable} onChange={() => onToggle('repackable')} />
                        Repackable
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                        <input type="checkbox" checked={packageData.billInvoice} onChange={() => onToggle('billInvoice')} />
                        Bill / Invoice
                    </label>
                </div>
            </div>

            {/* Grid Form */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Date</label>
                    <input type="date" name="date" value={packageData.date} onChange={onChange} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Carrier</label>
                    <select name="carrier" value={packageData.carrier} onChange={onChange} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px", background: "white" }}>
                        <option value="">Select...</option>
                        <option value="ups">UPS</option>
                        <option value="fedex">FedEx</option>
                        <option value="usps">USPS</option>
                        <option value="dhl">DHL</option>
                    </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Type / Classification</label>
                    <input type="text" name="type" value={packageData.type} onChange={onChange} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Tracking</label>
                    <input type="text" name="tracking" value={packageData.tracking} onChange={onChange} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Description</label>
                    <input type="text" name="description" value={packageData.description} onChange={onChange} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }} />
                </div>
            </div>

            {/* Metrics Row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 100px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Value ($)</label>
                    <input type="number" name="value" value={packageData.value} onChange={onChange} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }} min="0" step="0.01" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 80px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>L (in)</label>
                    <input type="number" name="length" value={packageData.length} onChange={onChange} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }} min="0" step="0.1" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 80px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>W (in)</label>
                    <input type="number" name="width" value={packageData.width} onChange={onChange} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }} min="0" step="0.1" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 80px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>H (in)</label>
                    <input type="number" name="height" value={packageData.height} onChange={onChange} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }} min="0" step="0.1" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 100px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Weight</label>
                    <input type="number" name="weight" value={packageData.weight} onChange={onChange} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }} min="0" step="0.1" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 80px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Pieces</label>
                    <input type="number" name="pieces" value={packageData.pieces} onChange={onChange} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }} min="1" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 120px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#666" }}>Volume (CF)</label>
                    <div style={{ padding: "8px", background: "#e9ecef", border: "1px solid #ddd", borderRadius: "4px", color: "#495057", fontWeight: 600, height: "35px", display: "flex", alignItems: "center" }}>
                        {packageData.volume.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", borderTop: "1px solid #eaeaea", paddingTop: "16px" }}>
                <button type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "white", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>
                    <span>📸</span> Take Photo
                </button>
                <div style={{ display: "flex", gap: "12px" }}>
                    <button type="button" onClick={onClear} style={{ padding: "8px 16px", background: "white", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", fontSize: "14px", color: "#555" }}>
                        Clear
                    </button>
                    <button type="button" onClick={onSave} style={{ padding: "8px 24px", background: "#0052cc", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", color: "white", fontWeight: 600 }}>
                        Save Package
                    </button>
                </div>
            </div>
        </div>
    );
}
