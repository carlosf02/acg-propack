import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

function TopMenuButton(props: { label: string }) {
    return (
        <button
            type="button"
            style={{
                border: "1px solid rgba(0,0,0,0.15)",
                background: "white",
                padding: "8px 10px",
                borderRadius: 6,
                cursor: "default",
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
                    padding: "0 16px",
                    background: "#eee",
                    borderBottom: "1px solid #ddd",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
                        <div
                            style={{
                                width: 140,
                                height: 36,
                                border: "1px solid #ddd",
                                background: "white",
                                borderRadius: 6,
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 700,
                            }}
                        >
                            AGC ProPack
                        </div>
                    </Link>

                    <div style={{ display: "flex", gap: 8 }}>
                        <TopMenuButton label="Administration" />
                        <TopMenuButton label="Settings" />
                        <TopMenuButton label="Help" />
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>👤</span>
                    <TopMenuButton label="User" />
                    <Link to="/backend-connected" style={{ textDecoration: "none" }}>
                        <TopMenuButton label="Backend Connected" />
                    </Link>
                </div>
            </header>

            <div style={{ display: "flex" }}>
                <aside
                    style={{
                        width: 240,
                        minHeight: "calc(100vh - 60px)",
                        background: "#2b3a55",
                        color: "white",
                    }}
                >
                    <nav>
                        <SideNavItem to="/" label="Home" />
                        <SideNavItem to="/warehouses" label="Warehouses" />
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