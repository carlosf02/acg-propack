import { Link } from "react-router-dom";
import { PLANS } from "../features/billing/plans.data";

export default function LandingPage() {
  const basicPlan = PLANS.find(p => p.id === "basic");
  const proPlan = PLANS.find(p => p.id === "pro");

  return (
    <div className="landing-page">
      {/* Hero Section - Typography Only */}
      <section className="hero public-container">
        <div className="hero-content">
          <h1 className="hero-title">Refined Logistics for Modern Warehouses</h1>
          <p className="hero-subtitle">
            Streamline inventory, shipments, and operations with precision and control.
            Built for professionals who demand a cleaner way to work.
          </p>
          <div className="hero-actions">
            <Link to="/plans" className="btn btn-primary hero-btn">Get started</Link>
            <Link to="/login" className="btn btn-ghost hero-btn">Log in</Link>
          </div>
        </div>
      </section>

      {/* Product Value Section - Tightened */}
      <section id="features" className="public-section public-container">
        <div className="section-header">
          <h2 className="section-title">Complete Warehouse Management</h2>
          <p className="section-subtitle">Restrained tools for complex logistics operations.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <h3>Warehouse Operations</h3>
            <p>Manage multiple locations with real-time inventory tracking and automated stock alerts.</p>
          </div>
          <div className="feature-card">
            <h3>Shipment Visibility</h3>
            <p>Track every package from arrival to departure with granular traceability and historical logs.</p>
          </div>
          <div className="feature-card">
            <h3>Repacking & Consolidation</h3>
            <p>Professional tools for merging shipments and optimized repackaging to reduce costs.</p>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section - Two Plans Only */}
      <section id="plans" className="public-section" style={{ background: '#f9fafb' }}>
        <div className="public-container">
          <div className="section-header">
            <h2 className="section-title">Simplified Pricing</h2>
            <p className="section-subtitle">Straightforward options for operations of any scale.</p>
          </div>

          <div className="pricing-grid">
            {basicPlan && (
              <div className="pricing-card">
                <div className="pricing-card-header">
                  <h3>{basicPlan.name}</h3>
                </div>
                <div className="pricing-price">
                  <span className="price-amount">${basicPlan.price}</span>
                  <span className="price-period">/month</span>
                </div>
                <p>Essential warehouse control for small teams.</p>
              </div>
            )}
            {proPlan && (
              <div className="pricing-card highlighted">
                <span className="plan-badge">Recommended</span>
                <div className="pricing-card-header">
                  <h3>{proPlan.name}</h3>
                </div>
                <div className="pricing-price">
                  <span className="price-amount">${proPlan.price}</span>
                  <span className="price-period">/month</span>
                </div>
                <p>Advanced performance for growing logistics operations.</p>
              </div>
            )}
          </div>
          
          <div className="section-actions" style={{ marginTop: '3rem', textAlign: 'center' }}>
            <Link to="/plans" className="btn btn-primary hero-btn">See plans</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
