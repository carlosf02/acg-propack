import { useState, useEffect, ReactNode } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import DashboardHome from "./pages/DashboardHome";
import CreateLockerPage from "./features/clients/pages/CreateLockerPage";
import ListLockerPage from "./features/clients/pages/ListLockerPage";
import ListWarehousePage from "./features/warehouse/pages/ListWarehousePage";
import CreateWarehousePage from "./features/warehouse/pages/CreateWarehousePage";
import CreateConsolidationPage from "./features/consolidation/pages/CreateConsolidationPage";
import ListConsolidationPage from "./features/consolidation/pages/ListConsolidationPage";
import ConsolidationDetailPage from "./features/consolidation/pages/ConsolidationDetailPage";
import CreateRepackingPage from "./features/warehouse/pages/CreateRepackingPage";
import ListRepackingPage from "./features/warehouse/pages/ListRepackingPage";
import LoginPage from "./features/auth/pages/LoginPage";
import SignupPage from "./features/auth/pages/SignupPage";
import CheckoutPage from "./features/auth/pages/CheckoutPage";
import ForgotPasswordPage from "./features/auth/pages/ForgotPasswordPage";
import { me, getPostLoginDestination } from "./features/auth/auth.api";
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import { ApiError } from "./api/client";

import ClientHomePage from "./pages/client/ClientHomePage";
import ClientPackagesPage from "./pages/client/ClientPackagesPage";
import ClientOnboardingPage from "./pages/client/ClientOnboardingPage";
import ClientSettingsPage from "./pages/client/ClientSettingsPage";

// Global Nav Routes
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";
import BillingPage from "./pages/BillingPage";
import PaymentMethodsPage from "./pages/PaymentMethodsPage";
import PaymentsPage from "./pages/PaymentsPage";
import PaymentDetailPage from "./pages/PaymentDetailPage";

// NEW: Public Pages & Layout
import PublicLayout from "./components/public/PublicLayout";
import LandingPage from "./pages/LandingPage";
import PlansPage from "./pages/PlansPage";
import SupportPage from "./pages/SupportPage";

// ---------------------------------------------------------------------------
// AuthGate — calls /api/v1/me/ on mount; redirects to /login if not authed.
// ---------------------------------------------------------------------------

type AuthState = "loading" | "authed" | "unauthed";

const ADMIN_ONLY_PATHS = ["/dashboard", "/warehouses", "/repacking", "/consolidated", "/clients", "/finance", "/receiving", "/inventory", "/shipping"];

function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("loading");
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    me()
      .then((res) => {
        setUser(res);
        setState("authed");
        if (res.auth_role === "CLIENT") {
          const dest = getPostLoginDestination(res);
          if (dest === "/client/onboarding" && location.pathname !== "/client/onboarding") {
            navigate(dest, { replace: true });
          } else if (dest === "/client" && ADMIN_ONLY_PATHS.some(p => location.pathname.startsWith(p))) {
            navigate(dest, { replace: true });
          }
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setState("unauthed");
          const protectedPaths = ["/dashboard", "/client", "/finance", "/clients", "/warehouses", "/repacking", "/consolidated", "/profile", "/settings"];
          if (protectedPaths.some(p => window.location.pathname.startsWith(p))) {
            navigate("/login", { replace: true });
          }
        } else {
          setState("unauthed");
          const protectedPaths = ["/dashboard", "/client", "/finance", "/clients", "/warehouses", "/repacking", "/consolidated", "/profile", "/settings"];
          if (protectedPaths.some(p => window.location.pathname.startsWith(p))) {
            navigate("/login", { replace: true });
          }
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

  return <>{children}</>;
}

function DefaultRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? getPostLoginDestination(user) : "/dashboard"} replace />;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <Routes>
      {/* Public Marketing Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/support" element={<SupportPage />} />
      </Route>

      {/* Auth Routes (Standalone) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/get-started" element={<CheckoutPage />} />
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
        <Route path="/dashboard" element={<DashboardHome />} />

        {/* Client routes */}
        <Route path="/client/onboarding" element={<ClientOnboardingPage />} />
        <Route path="/client" element={<ClientHomePage />} />
        <Route path="/client/packages" element={<ClientPackagesPage />} />
        <Route path="/client/settings" element={<ClientSettingsPage />} />

        {/* Clients / Lockers */}
        <Route path="/clients" element={<ListLockerPage />} />
        <Route path="/clients/new" element={<CreateLockerPage />} />

        {/* Warehouses */}
        <Route path="/warehouses" element={<ListWarehousePage />} />
        <Route path="/warehouses/new" element={<CreateWarehousePage />} />

        <Route path="/repacking" element={<ListRepackingPage />} />
        <Route path="/repacking/new" element={<CreateRepackingPage />} />

        {/* Consolidations */}
        <Route path="/consolidated" element={<ListConsolidationPage />} />
        <Route path="/consolidated/new" element={<CreateConsolidationPage />} />
        <Route path="/consolidated/:id" element={<ConsolidationDetailPage />} />

        <Route path="/finance/payments" element={<PaymentsPage />} />
        <Route path="/finance/payments/:id" element={<PaymentDetailPage />} />
        <Route path="/finance/billing" element={<BillingPage />} />
        <Route path="/finance/payment-methods" element={<PaymentMethodsPage />} />

        {/* Legacy redirects */}
        <Route path="/payments" element={<Navigate to="/finance/payments" replace />} />
        <Route path="/billing" element={<Navigate to="/finance/billing" replace />} />

        {/* Global Nav Routes */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/help" element={<HelpPage />} />

        {/* Catch-all within authenticated zone */}
        <Route path="*" element={<DefaultRedirect />} />
      </Route>
    </Routes>
  );
}