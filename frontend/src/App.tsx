import { useState, useEffect, ReactNode } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import DashboardHome from "./pages/DashboardHome";
import BackendConnected from "./pages/BackendConnected";
import CreateLockerPage from "./features/clients/pages/CreateLockerPage";
import ListLockerPage from "./features/clients/pages/ListLockerPage";
import ListWarehousePage from "./features/warehouse/pages/ListWarehousePage";
import CreateWarehousePage from "./features/warehouse/pages/CreateWarehousePage";
import CreateConsolidationPage from "./features/consolidation/pages/CreateConsolidationPage";
import ListConsolidationPage from "./features/consolidation/pages/ListConsolidationPage";
import CreateRepackingPage from "./features/warehouse/pages/CreateRepackingPage";
import ListRepackingPage from "./features/warehouse/pages/ListRepackingPage";
import LoginPage from "./features/auth/pages/LoginPage";
import SignupPage from "./features/auth/pages/SignupPage";
import ForgotPasswordPage from "./features/auth/pages/ForgotPasswordPage";
import { me } from "./features/auth/auth.api";
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import { ApiError } from "./api/client";

// Phase 7 Routes
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import HelpPage from "./pages/HelpPage";

// ---------------------------------------------------------------------------
// AuthGate — calls /api/v1/me/ on mount; redirects to /login if not authed.
// ---------------------------------------------------------------------------

type AuthState = "loading" | "authed" | "unauthed";

function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("loading");
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    me()
      .then((res) => {
        setUser(res);
        setState("authed");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setState("unauthed");
          navigate("/login", { replace: true });
        } else {
          // Unexpected error — still block the app but don't redirect
          setState("unauthed");
          navigate("/login", { replace: true });
        }
      });
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#6b7280",
          fontSize: "0.9rem",
        }}
      >
        Loading…
      </div>
    );
  }

  if (state === "unauthed") {
    return null;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Placeholder
// ---------------------------------------------------------------------------

function PlaceholderPage(props: { title: string }) {
  return <h1 style={{ marginTop: 0 }}>{props.title}</h1>;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <Routes>
      {/* Public auth routes — no gate */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected app routes */}
      <Route
        element={
          <AuthProvider>
            <AuthGate>
              <AppLayout />
            </AuthGate>
          </AuthProvider>
        }
      >
        <Route path="/" element={<DashboardHome />} />

        {/* Clients / Lockers */}
        <Route path="/clients" element={<ListLockerPage />} />
        <Route path="/clients/new" element={<CreateLockerPage />} />

        {/* Warehouses */}
        <Route path="/warehouses" element={<ListWarehousePage />} />
        <Route path="/warehouses/new" element={<CreateWarehousePage />} />

        {/* Development */}
        <Route path="/backend-connected" element={<BackendConnected />} />

        {/* Placeholders so sidebar links have somewhere to go */}
        <Route path="/receiving" element={<PlaceholderPage title="Receiving" />} />
        <Route path="/inventory" element={<PlaceholderPage title="Inventory" />} />
        <Route path="/shipping" element={<PlaceholderPage title="Shipping" />} />
        <Route path="/repacking" element={<ListRepackingPage />} />
        <Route path="/repacking/new" element={<CreateRepackingPage />} />

        {/* Consolidations */}
        <Route path="/consolidated" element={<ListConsolidationPage />} />
        <Route path="/consolidated/new" element={<CreateConsolidationPage />} />

        <Route path="/payments" element={<PlaceholderPage title="Payments" />} />
        <Route path="/billing" element={<PlaceholderPage title="Billing" />} />
        <Route path="/search" element={<PlaceholderPage title="Search" />} />

        {/* Global Nav Routes */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/help" element={<HelpPage />} />

        {/* Catch-all within authenticated zone */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}