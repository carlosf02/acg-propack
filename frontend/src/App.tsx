import { Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import DashboardHome from "./pages/DashboardHome";
import BackendConnected from "./pages/BackendConnected";
import CreateLockerPage from "./features/clients/pages/CreateLockerPage";
import ListLockerPage from "./features/clients/pages/ListLockerPage";

function PlaceholderPage(props: { title: string }) {
  return <h1 style={{ marginTop: 0 }}>{props.title}</h1>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/clients" element={<ListLockerPage />} />
        <Route path="/clients/new" element={<CreateLockerPage />} />
        <Route path="/backend-connected" element={<BackendConnected />} />

        {/* placeholders so sidebar links have somewhere to go */}
        <Route path="/warehouses" element={<PlaceholderPage title="Warehouses" />} />
        <Route path="/receiving" element={<PlaceholderPage title="Receiving" />} />
        <Route path="/inventory" element={<PlaceholderPage title="Inventory" />} />
        <Route path="/shipping" element={<PlaceholderPage title="Shipping" />} />
        <Route path="/repacking" element={<PlaceholderPage title="Repacking" />} />
        <Route path="/consolidated" element={<PlaceholderPage title="Consolidated" />} />
        <Route path="/payments" element={<PlaceholderPage title="Payments" />} />
        <Route path="/billing" element={<PlaceholderPage title="Billing" />} />
        <Route path="/search" element={<PlaceholderPage title="Search" />} />
      </Route>
    </Routes>
  );
}