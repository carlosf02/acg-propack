import { useEffect, useState } from "react";
import acgLogo from "../assets/acg-logo.png";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../features/auth/auth.api";
import { useAuth } from "../features/auth/AuthContext";
import SetupBanner from "../components/SetupBanner";

function TopMenuButton(props: { label: string; to?: string; active?: boolean }) {
    const Component = props.to ? NavLink : "button";

    return (
        <Component
            to={props.to as any}
            style={({ isActive }: any) => ({
                border: "none",
                background: isActive || props.active ? "rgba(255,255,255,0.15)" : "transparent",
                color: "white",
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: isActive || props.active ? 700 : 500,
                borderRadius: 4,
                textDecoration: "none",
                transition: "background 0.15s ease",
            })}
        >
            {props.label}
        </Component>
    );
}

function SideNavItem(props: { to: string; label: string }) {
    return (
        <NavLink
            to={props.to}
            style={({ isActive }) => ({
                display: "block",
                padding: "12px 14px",
                textDecoration: "none",
                color: "white",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                fontWeight: isActive ? 700 : 500,
            })}
        >
            {props.label}
        </NavLink>
    );
}

function SideNavDropdown(props: {
    label: string;
    basePath: string;
    items: { to: string; label: string }[];
}) {
    const { pathname } = useLocation();
    const isActive = pathname === props.basePath || pathname.startsWith(props.basePath + "/");

    const [open, setOpen] = useState(isActive);

    useEffect(() => {
        if (isActive) setOpen(true);
    }, [isActive]);

    return (
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: isActive ? 700 : 500,
                    textAlign: "left",
                }}
            >
                <span>{props.label}</span>
                <span style={{ opacity: 0.85 }}>{open ? "▾" : "▸"}</span>
            </button>

            {open && (
                <div style={{ paddingBottom: 8 }}>
                    {props.items.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            style={({ isActive }) => ({
                                display: "block",
                                padding: "10px 14px 10px 28px",
                                textDecoration: "none",
                                color: "white",
                                opacity: isActive ? 1 : 0.9,
                                fontWeight: isActive ? 700 : 500,
                            })}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AppLayout() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const isClient = user?.auth_role === "CLIENT";

    async function handleLogout() {
        try {
            await logout();
            navigate("/login", { replace: true });
        } catch (err) {
            console.error("Logout failed", err);
        }
    }

    return (
        <div style={{ minHeight: "100vh", background: "#f6f6f6" }}>
            <header
                style={{
                    height: 60,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 16px 0 0px",
                    background: "rgba(38, 121, 198, 1)",
                    borderBottom: "1px solid rgba(0,0,0,0.2)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Link to="/" style={{ textDecoration: "none", color: "inherit", position: "relative", top: 6 }}>
                        <img
                            src={acgLogo}
                            alt="ACG ProPack"
                            style={{ height: 90, width: "auto", display: "block", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.45))" }}
                        />
                    </Link>

                    <div style={{ display: "flex", gap: 8 }}>
                        {isAdmin && <TopMenuButton label="Administration" to="/admin" />}
                        <TopMenuButton label="Settings" to={isClient ? "/client/settings" : "/settings"} />
                        <TopMenuButton label="Help" to="/help" />
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" style={{ color: "white", flexShrink: 0 }}>
                        <path fill="currentColor" d="M12 2a5 5 0 1 1-5 5l.005-.217A5 5 0 0 1 12 2m2 12a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-1a5 5 0 0 1 5-5z" />
                    </svg>
                    <div style={{ marginLeft: -4 }}>
                        <TopMenuButton label="Profile" to="/profile" />
                    </div>
                    <div style={{ marginLeft: 8 }}>
                        <button
                            title="Sign out"
                            aria-label="Sign out"
                            onClick={handleLogout}
                            style={{
                                background: "rgba(255, 255, 255, 0.1)",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                borderRadius: 6,
                                padding: "6px 8px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.1rem"
                            }}
                        >
                            🚪
                        </button>
                    </div>
                    <div style={{ marginLeft: 16 }}>
                        <TopMenuButton label="Backend Connected" to="/backend-connected" />
                    </div>
                </div>
            </header>

            <div style={{ display: "flex" }}>
                <aside
                    style={{
                        width: 200,
                        flexShrink: 0,
                        minHeight: "calc(100vh - 60px)",
                        background: "#2b3a55",
                        color: "white",
                    }}
                >
                    {isClient ? (
                        <nav>
                            <SideNavItem to="/client" label="Home" />
                            <SideNavItem to="/client/packages" label="Packages" />
                            <SideNavItem to="/client/payments" label="Payments" />
                        </nav>
                    ) : (
                        <nav>
                            <SideNavItem to="/" label="Home" />
                            <SideNavDropdown
                                label="Warehouses"
                                basePath="/warehouses"
                                items={[
                                    { to: "/warehouses", label: "List Warehouses" },
                                    { to: "/warehouses/new", label: "Create Warehouse" },
                                ]}
                            />
                            <SideNavDropdown
                                label="Repacking"
                                basePath="/repacking"
                                items={[
                                    { to: "/repacking", label: "List Repacking" },
                                    { to: "/repacking/new", label: "Create Repack" },
                                ]}
                            />
                            <SideNavDropdown
                                label="Consolidations"
                                basePath="/consolidated"
                                items={[
                                    { to: "/consolidated", label: "List Consolidations" },
                                    { to: "/consolidated/new", label: "Create Consolidation" },
                                ]}
                            />
                            <SideNavDropdown
                                label="Lockers"
                                basePath="/clients"
                                items={[
                                    { to: "/clients", label: "List Lockers" },
                                    { to: "/clients/new", label: "Create Locker" },
                                ]}
                            />
                            <SideNavDropdown
                                label="Finance"
                                basePath="/finance"
                                items={[
                                    { to: "/finance/billing", label: "Billing & Subscription" },
                                    { to: "/finance/payment-methods", label: "Payment Methods" },
                                    { to: "/finance/payments", label: "Payment History" },
                                ]}
                            />
                            <SideNavItem to="/search" label="Search" />
                        </nav>
                    )}
                </aside>

                <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <SetupBanner />
                    <div style={{ padding: 20, flex: 1 }}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}