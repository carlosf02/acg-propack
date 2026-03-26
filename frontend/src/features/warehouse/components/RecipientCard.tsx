import { useState } from "react";
import { Client } from "../../clients/types";
import { AddUserIcon } from "../../../components/icons/AddUserIcon";
import { CreateLockerModal } from "./CreateLockerModal";

interface Props {
    clients: Client[];
    selectedClientId: number | "";
    onChange: (clientId: number) => void;
    onClientCreated: (newClient: Client) => void;
}

export function RecipientCard({ clients, selectedClientId, onChange, onClientCreated }: Props) {
    const [modalOpen, setModalOpen] = useState(false);

    function handleClientCreated(newClient: Client) {
        onClientCreated(newClient);
        onChange(newClient.id);
        setModalOpen(false);
    }

    return (
        <>
            {modalOpen && (
                <CreateLockerModal
                    onSuccess={handleClientCreated}
                    onClose={() => setModalOpen(false)}
                />
            )}

            <div style={{
                background: "white",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: "16px"
            }}>
                <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#333" }}>Recipient</h2>
                <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                    <select
                        value={selectedClientId}
                        onChange={(e) => onChange(Number(e.target.value))}
                        style={{
                            padding: "10px 12px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontSize: "14px",
                            background: "white",
                            width: "100%"
                        }}
                    >
                        <option value="">Select a recipient...</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.client_code} - {c.client_type === 'company' ? c.name : `${c.name || ''} ${c.last_name || ''}`.trim()}
                            </option>
                        ))}
                    </select>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
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
                </div>
            </div>
        </>
    );
}
