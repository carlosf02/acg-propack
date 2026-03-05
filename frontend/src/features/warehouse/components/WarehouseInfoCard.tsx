import { WarehouseFormData } from "../types";

interface Props {
    data: WarehouseFormData;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export function WarehouseInfoCard({ data, onChange }: Props) {
    return (
        <div style={{
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            height: "100%",
            display: "flex",
            flexDirection: "column"
        }}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#333" }}>Warehouse info</h2>

            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "16px"
            }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Agency</label>
                    <select
                        name="agency"
                        value={data.agency}
                        onChange={onChange}
                        style={{
                            padding: "10px 12px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontSize: "14px",
                            background: "white"
                        }}
                    >
                        <option value="">Select an agency...</option>
                        {/* Options will be populated later */}
                    </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Shipping Method</label>
                    <select
                        name="shippingMethod"
                        value={data.shippingMethod}
                        onChange={onChange}
                        style={{
                            padding: "10px 12px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontSize: "14px",
                            background: "white"
                        }}
                    >
                        <option value="">Select...</option>
                        <option value="air">Air</option>
                        <option value="boat">Sea</option>
                        <option value="air">Ground</option>
                    </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Type</label>
                    <select
                        name="type"
                        value={data.type}
                        onChange={onChange}
                        style={{
                            padding: "10px 12px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontSize: "14px",
                            background: "white"
                        }}
                    >
                        <option value="">Select...</option>
                        <option value="standard">Standard</option>
                        <option value="express">Express</option>
                        <option value="refrigerated">Refrigerated</option>
                    </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Location</label>
                    <input
                        type="text"
                        name="location"
                        value={data.location}
                        onChange={onChange}
                        style={{
                            padding: "10px 12px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontSize: "14px"
                        }}
                    />
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Notes</label>
                <textarea
                    name="notes"
                    value={data.notes}
                    onChange={onChange}
                    rows={3}
                    placeholder="Add last-minute notes or reminders..."
                    style={{
                        padding: "10px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        resize: "vertical",
                        flex: 1
                    }}
                />
            </div>
        </div>
    );
}
