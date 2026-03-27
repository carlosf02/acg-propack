import { useState } from "react";
import { Link } from "react-router-dom";
import { PLANS } from "../features/billing/plans.data";

export default function PlansPage() {
  const [selectedPlanId, setSelectedPlanId] = useState<string>("pro");

  return (
    <div className="plans-page">
      <section className="public-section public-container">
        <div className="section-header">
          <h1 className="section-title">Professional Plans for Modern Logistics</h1>
          <p className="section-subtitle">Choose the plan that matches your scale. Toggle to compare.</p>
        </div>

        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <div 
              key={plan.id} 
              className={`pricing-card selectable-card ${selectedPlanId === plan.id ? 'highlighted' : ''}`}
              onClick={() => setSelectedPlanId(plan.id)}
            >
              {plan.id === 'pro' && (
                <span className="plan-badge">Recommended</span>
              )}
              <h3>{plan.name}</h3>
              <div className="pricing-price">
                <span className="price-amount">${plan.price}</span>
                <span className="price-period">/{plan.period}</span>
              </div>
              <p>{plan.description}</p>
              
              <ul className="plan-features" style={{ listStyle: 'none', padding: 0, margin: '2rem 0', textAlign: 'left' }}>
                {plan.features.map((feature, i) => (
                  <li key={i} style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--public-text-light)' }}>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link 
                to={`/get-started?plan=${plan.id}`} 
                className={`btn ${selectedPlanId === plan.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Get started with {plan.name}
              </Link>
            </div>
          ))}
        </div>

        <div className="plans-faq" style={{ marginTop: '6rem', paddingTop: '4rem', borderTop: '1px solid var(--public-border)', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '2rem' }}>Frequently Asked Questions</h3>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Can I upgrade later?</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--public-text-light)' }}>Yes, you can upgrade from Basic to Pro at any time from your account settings.</p>
            </div>
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>What is an Office Slot?</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--public-text-light)' }}>An office slot represents a single physical warehouse or administrative facility managed within the system.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
