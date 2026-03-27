import { Link } from "react-router-dom";
import logo from "../../assets/acg-logo.png";

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-container footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/">
              <img src={logo} alt="ACG ProPack Logo" className="footer-logo" />
            </Link>
            <p className="footer-tagline">
              Premium logistics management for modern operations.
            </p>
          </div>
          
          <div className="footer-links-compact">
            <ul>
              <li><Link to="/plans">Plans</Link></li>
              <li><Link to="/plans">Get started</Link></li>
              <li><Link to="/login">Log in</Link></li>
              <li><a href="mailto:contact@alexismorales.next">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} ACG ProPack. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
