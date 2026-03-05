import { Routes, Route } from "react-router-dom";
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

function PlaceholderPage(props: { title: string }) {
  return <h1 style={{ marginTop: 0 }}>{props.title}</h1>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardHome />} />

        {/* Clients / Lockers */}
        <Route path="/clients" element={<ListLockerPage />} />
        <Route path="/clients/new" element={<CreateLockerPage />} />

        {/* Warehouses */}
        <Route path="/warehouses" element={<ListWarehousePage />} />
        <Route path="/warehouses/new" element={<CreateWarehousePage />} />

        {/* Development */}
        <Route path="/backend-connected" element={<BackendConnected />} />

        {/* placeholders so sidebar links have somewhere to go */}
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
      </Route>
    </Routes>
  );
}