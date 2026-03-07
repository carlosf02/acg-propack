export default function SettingsPage() {
    return (
        <div style={{ maxWidth: 800 }}>
            <h1 style={{ marginTop: 0, marginBottom: "1.5rem" }}>Company Settings</h1>

            <div style={{ background: "white", padding: 24, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h2 style={{ fontSize: "1.25rem", marginTop: 0 }}>Setup Checklist</h2>
                <p style={{ color: "#4b5563", marginBottom: 20 }}>Complete these steps to fully configure your company tenant.</p>

                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    <li style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#e0e7ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>1</div>
                        <div>
                            <strong style={{ display: "block", color: "#111827" }}>Add your first office</strong>
                            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Required to start receiving or processing packages.</span>
                        </div>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #d1d5db", color: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>2</div>
                        <div>
                            <strong style={{ display: "block", color: "#4b5563" }}>Add associate companies (optional)</strong>
                            <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Link to external partners or agencies.</span>
                        </div>
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #d1d5db", color: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>3</div>
                        <div>
                            <strong style={{ display: "block", color: "#4b5563" }}>Add team members (optional)</strong>
                            <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Invite staff and assign roles.</span>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    );
}
