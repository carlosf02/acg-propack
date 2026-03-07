import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/auth.api";
import { useAuth } from "../features/auth/AuthContext";

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    async function handleLogout() {
        try {
            await logout();
            navigate("/login", { replace: true });
        } catch (err) {
            console.error("Logout failed", err);
        }
    }

    return (
        <div style={{ maxWidth: 600 }}>
            <h1 style={{ marginTop: 0, marginBottom: "1rem" }}>My Profile</h1>
            <div style={{ background: "white", padding: 24, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                {user ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div>
                            <strong>Username:</strong> {user.username}
                        </div>
                        <div>
                            <strong>Email:</strong> {user.email}
                        </div>
                        {user.company && (
                            <div>
                                <strong>Company:</strong> {user.company.name}
                            </div>
                        )}
                        <div>
                            <strong>Role:</strong> {user.role || "Standard"}
                        </div>
                    </div>
                ) : (
                    <p>Could not load profile data.</p>
                )}

                <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />

                <button
                    onClick={handleLogout}
                    style={{
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 500,
                    }}
                >
                    Sign out
                </button>
            </div>
        </div>
    );
}
