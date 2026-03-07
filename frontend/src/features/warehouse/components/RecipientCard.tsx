import { AddUserIcon } from "../../../components/icons/AddUserIcon";

interface Props {
    recipientName: string;
    recipientAddress: string;
    onChangeName: (name: string) => void;
    onChangeAddress: (address: string) => void;
}

export function RecipientCard({ recipientName, recipientAddress, onChangeName, onChangeAddress }: Props) {
    return (
        <div style={{
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: "16px"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ margin: 0, fontSize: "18px", color: "#333" }}>Recipient</h2>
                <button
                    type="button"
                    style={{
                        background: "#4caf50",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        fontSize: "13px"
                    }}
                >
                    <AddUserIcon size={16} /> Add New
                </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Name</label>
                    <input
                        type="text"
                        value={recipientName}
                        onChange={e => onChangeName(e.target.value)}
                        placeholder="e.g. Jane Doe"
                        style={{
                            padding: "10px 12px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontSize: "14px"
                        }}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>Address</label>
                    <input
                        type="text"
                        value={recipientAddress}
                        onChange={e => onChangeAddress(e.target.value)}
                        placeholder="123 Main St..."
                        style={{
                            padding: "10px 12px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontSize: "14px"
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
