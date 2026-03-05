import { useEffect, useState } from "react";
import acgLogo from "../assets/acg-logo.png";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

function TopMenuButton(props: { label: string }) {
    return (
        <button
            type="button"
            style={{
                border: "none",
                background: "transparent",
                color: "white",
                padding: "8px 10px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
            }}
        >
            {props.label}
        </button>
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
                        <TopMenuButton label="Administration" />
                        <TopMenuButton label="Settings" />
                        <TopMenuButton label="Help" />
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" style={{ color: "white", flexShrink: 0 }}>
                        <path fill="currentColor" d="M12 2a5 5 0 1 1-5 5l.005-.217A5 5 0 0 1 12 2m2 12a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-1a5 5 0 0 1 5-5z" />
                    </svg>
                    <div style={{ marginLeft: -4 }}>
                        <TopMenuButton label="User" />
                    </div>
                    <div style={{ marginLeft: 16 }}>
                        <Link to="/backend-connected" style={{ textDecoration: "none" }}>
                            <TopMenuButton label="Backend Connected" />
                        </Link>
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
                        <SideNavItem to="/repacking" label="Repacking" />
                        <SideNavItem to="/consolidated" label="Consolidated" />
                        <SideNavDropdown
                            label="Lockers"
                            basePath="/clients"
                            items={[
                                { to: "/clients", label: "List Lockers" },
                                { to: "/clients/new", label: "Create Locker" },
                            ]}
                        />
                        <SideNavItem to="/payments" label="Payments" />
                        <SideNavItem to="/billing" label="Billing" />
                        <SideNavItem to="/search" label="Search" />
                    </nav>
                </aside>

                <main style={{ flex: 1, padding: 20 }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}