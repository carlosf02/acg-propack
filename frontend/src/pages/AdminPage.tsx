import { useAuth } from "../features/auth/AuthContext";

export default function AdminPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    if (!isAdmin) {
        return (
            <div style={{ maxWidth: 800 }}>
                <h1 style={{ marginTop: 0, marginBottom: "1.5rem", color: "#dc2626" }}>Not Authorized</h1>
                <div style={{ background: "white", padding: 24, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                    <p>You do not have permission to view this page. Administration involves tenant-wide controls accessible only to administrators.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 800 }}>
            <h1 style={{ marginTop: 0, marginBottom: "1.5rem" }}>Administration</h1>
            <div style={{ background: "white", padding: 24, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <p>Welcome to the admin dashboard. Company-wide settings, user management, and advanced configuration will appear here.</p>
            </div>
        </div>
    );
}
