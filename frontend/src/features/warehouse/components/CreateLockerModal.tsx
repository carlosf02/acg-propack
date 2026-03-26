import { useState, FormEvent, useEffect } from "react";
import { createClient } from "../../clients/clients.api";
import { Client, ClientCreate } from "../../clients/types";
import { ApiError } from "../../../api/client";

interface Props {
    onSuccess: (newClient: Client) => void;
    onClose: () => void;
}

export function CreateLockerModal({ onSuccess, onClose }: Props) {
    const [clientType, setClientType] = useState<"person" | "company">("person");
    const [name, setName] = useState("");
    const [lastName, setLastName] = useState("");
    const [address, setAddress] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [city, setCity] = useState("");
    const [cellphone, setCellphone] = useState("");
    const [homePhone, setHomePhone] = useState("");
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const handleSubmit = async (e: React.MouseEvent | React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        if (!name || !address || !city || !email) {
            setError("Please fill in all required fields (*)");
            setSubmitting(false);
            return;
        }

        const payload: ClientCreate = {
            client_type: clientType,
            name,
            last_name: clientType === "person" ? lastName : undefined,
            address,
            city,
            postal_code: postalCode,
            cellphone,
            home_phone: homePhone,
            email,
        };

        try {
            const newClient = await createClient(payload) as Client;
            onSuccess(newClient);
        } catch (err) {
            console.error("Failed to create client:", err);
            if (err instanceof ApiError) {
                setError(`API Error: ${err.message}`);
            } else {
                setError("An unexpected error occurred. Please try again.");
            }
            setSubmitting(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "14px",
        color: "#111827",
        background: "#f9fafb",
        boxSizing: "border-box",
        fontFamily: "inherit",
    };

    const labelStyle: React.CSSProperties = {
        fontSize: "13px",
        fontWeight: 600,
        color: "#4b5563",
        display: "block",
        marginBottom: "5px",
    };

    const fieldStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
    };

    return (
        /* Backdrop */
        <div
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
            }}
        >
            {/* Modal Box */}
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: "white",
                    borderRadius: "12px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
                    width: "100%",
                    maxWidth: "600px",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Modal Header */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "20px 24px 16px",
                    borderBottom: "1px solid #e5e7eb",
                }}>
                    <h2 style={{ margin: 0, fontSize: "20px", color: "#1f2937", fontWeight: 700 }}>
                        Add New Locker
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "none",
                            fontSize: "22px",
                            cursor: "pointer",
                            color: "#6b7280",
                            lineHeight: 1,
                            padding: "4px 8px",
                            borderRadius: "6px",
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: "20px 24px 24px" }}>
                    {error && (
                        <div style={{
                            background: "#fee2e2",
                            color: "#991b1b",
                            padding: "12px",
                            borderRadius: "8px",
                            marginBottom: "16px",
                            fontSize: "14px",
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Client Type */}
                    <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "20px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#4b5563" }}>Type:</span>
                        {(["person", "company"] as const).map(type => (
                            <label key={type} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px", color: "#374151" }}>
                                <input
                                    type="radio"
                                    name="modal-clientType"
                                    value={type}
                                    checked={clientType === type}
                                    onChange={() => setClientType(type)}
                                    style={{ accentColor: "#3b82f6", width: 16, height: 16 }}
                                />
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </label>
                        ))}
                    </div>

                    {/* Name Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>Name / Company Name <span style={{ color: "#ef4444" }}>*</span></label>
                            <input type="text" style={inputStyle} placeholder="e.g. John or Acme Corp" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>Last Name</label>
                            <input type="text" style={{ ...inputStyle, background: clientType === "company" ? "#e5e7eb" : "#f9fafb" }} placeholder="e.g. Doe" disabled={clientType === "company"} value={clientType === "company" ? "" : lastName} onChange={e => setLastName(e.target.value)} />
                        </div>
                    </div>

                    {/* Address */}
                    <div style={{ ...fieldStyle, marginBottom: "16px" }}>
                        <label style={labelStyle}>Address <span style={{ color: "#ef4444" }}>*</span></label>
                        <input type="text" style={inputStyle} placeholder="Street, building, suite..." value={address} onChange={e => setAddress(e.target.value)} required />
                    </div>

                    {/* Zip / City */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>Zip Code</label>
                            <input type="text" style={inputStyle} placeholder="e.g. 33166" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
                        </div>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>City <span style={{ color: "#ef4444" }}>*</span></label>
                            <input type="text" style={inputStyle} placeholder="Search city..." list="modal-city-options" value={city} onChange={e => setCity(e.target.value)} required />
                            <datalist id="modal-city-options">
                                <option value="Miami" />
                                <option value="Caracas" />
                                <option value="Orlando" />
                                <option value="Maracaibo" />
                            </datalist>
                        </div>
                    </div>

                    {/* Phone */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>Cellphone</label>
                            <input type="tel" style={inputStyle} placeholder="+1 (555) 000-0000" value={cellphone} onChange={e => setCellphone(e.target.value)} />
                        </div>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>{clientType === "person" ? "Home Phone" : "Company Phone"}</label>
                            <input type="tel" style={inputStyle} placeholder="+1 (555) 111-1111" value={homePhone} onChange={e => setHomePhone(e.target.value)} />
                        </div>
                    </div>

                    {/* Email */}
                    <div style={{ ...fieldStyle, marginBottom: "24px" }}>
                        <label style={labelStyle}>Email <span style={{ color: "#ef4444" }}>*</span></label>
                        <input type="email" style={inputStyle} placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>

                    {/* Footer */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            style={{ padding: "10px 20px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "8px", fontWeight: 600, fontSize: "14px", color: "#374151", cursor: "pointer" }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            style={{ padding: "10px 20px", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "14px", color: "white", cursor: "pointer", boxShadow: "0 2px 10px rgba(37,99,235,0.2)" }}
                        >
                            {submitting ? "Creating..." : "Create Locker"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
