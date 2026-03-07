import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listOffices } from "../features/company/offices.api";

export default function SetupBanner() {
    const navigate = useNavigate();
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If already dismissed, don't even fetch
        if (localStorage.getItem("setupBannerDismissed") === "true") {
            setLoading(false);
            return;
        }

        listOffices({ type: "own" })
            .then((res: any) => {
                const results = Array.isArray(res) ? res : res.results;
                if (!results || results.length === 0) {
                    setShow(true);
                }
            })
            .catch((err: unknown) => {
                console.error("Failed to check offices for setup banner", err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (loading || !show) return null;

    function handleDismiss() {
        localStorage.setItem("setupBannerDismissed", "true");
        setShow(false);
    }

    return (
        <div
            style={{
                background: "#e0e7ff",
                borderBottom: "1px solid #c7d2fe",
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "#3730a3",
                fontSize: "0.9375rem",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span role="img" aria-label="Info" style={{ fontSize: "1.1rem" }}>
                    ℹ️
                </span>
                <strong>Finish setup:</strong> add your first office to start receiving packages.
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                    onClick={() => navigate("/settings")}
                    style={{
                        background: "#4f46e5",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "0.875rem",
                    }}
                >
                    Add office
                </button>
                <button
                    onClick={handleDismiss}
                    style={{
                        background: "transparent",
                        color: "#4f46e5",
                        border: "1px solid #c7d2fe",
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontSize: "0.875rem",
                    }}
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}
