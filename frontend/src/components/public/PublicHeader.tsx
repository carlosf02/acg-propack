import { Link } from "react-router-dom";
import logo from "../../assets/acg-logo.png";

export default function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-container header-inner">
        <Link to="/" className="public-logo">
          <img src={logo} alt="ACG ProPack Logo" className="logo-img" />
        </Link>
        <nav className="public-nav">
          <a href="/#features" className="nav-link">Product</a>
          <Link to="/plans" className="nav-link">Plans</Link>
        </nav>
        <div className="header-actions">
          <Link to="/login" className="btn btn-ghost">Log in</Link>
          <Link to="/plans" className="btn btn-primary">Get started</Link>
        </div>
      </div>
    </header>
  );
}
