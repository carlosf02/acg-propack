import { Link } from "react-router-dom";

export default function SupportPage() {
  return (
    <div className="support-page">
      <section className="public-section public-container">
        <div className="section-header">
          <h1 className="section-title">Support & Contact</h1>
          <p className="section-subtitle">
            We are here to help you get the most out of ACG ProPack. 
            Reach out to us directly via email and we'll get back to you promptly.
          </p>
        </div>

        <div className="support-content">
          <div className="features-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '720px', margin: '0 auto' }}>
            <div className="pricing-card" style={{ textAlign: 'left', padding: '3rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Get in Touch</h3>
              <p style={{ fontSize: '1.125rem', marginBottom: '2rem' }}>
                For general questions, technical assistance, or billing inquiries, please email us at:
              </p>
              <div style={{ 
                background: '#f3f4f6', 
                padding: '1.5rem', 
                borderRadius: '8px', 
                fontSize: '1.25rem', 
                fontWeight: 600,
                color: 'var(--public-brand-dark)',
                textAlign: 'center',
                border: '1px solid var(--public-border)'
              }}>
                contact@alexismorales.next
              </div>
              <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: 'var(--public-text-light)' }}>
                Response time is typically within 24 business hours.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '4rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--public-text-light)', marginBottom: '1.5rem' }}>
              Ready to start your warehouse transformation?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <Link to="/signup" className="btn btn-primary">Create Account</Link>
              <Link to="/plans" className="btn btn-ghost">View Plans</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
