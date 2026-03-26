import { Outlet } from "react-router-dom";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";
import "./public.css";

export default function PublicLayout() {
  return (
    <div className="public-layout-wrapper">
      <PublicHeader />
      <main className="public-main-content">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
