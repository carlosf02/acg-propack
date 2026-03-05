import { AddUserIcon } from "../../../components/icons/AddUserIcon";

export function SenderCard() {
    return (
        <div style={{
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: "16px"
        }}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#333" }}>Sender</h2>
            <div style={{ display: "flex", gap: "8px" }}>
                <div style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    padding: "0 12px",
                    background: "#f9f9f9"
                }}>
                    <input
                        type="text"
                        placeholder="Search"
                        style={{
                            border: "none",
                            background: "transparent",
                            width: "100%",
                            padding: "10px 0",
                            outline: "none",
                            fontSize: "14px"
                        }}
                    />
                    <span style={{ color: "#999", fontSize: "16px" }}></span>
                </div>
                <button
                    type="button"
                    style={{
                        background: "#4caf50",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        width: "42px",
                        height: "42px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                    }}
                    title="Add Sender"
                >
                    <AddUserIcon size={24} />
                </button>
            </div>
        </div>
    );
}

