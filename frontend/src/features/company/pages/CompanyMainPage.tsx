import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBillingSummary, BillingSummary } from "../../billing/billing.api";
import { me, MeResponse } from "../../auth/auth.api";
import { ApiError } from "../../../api/client";
import heroIllustration from "../../../assets/hero-illustration.svg";
import "../CompanyMainPage.css";

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

// Company access state - the core business logic model
interface CompanyAccessState {
  user: MeResponse | null;
  company: { id: number; name: string } | null;
  isCompanyAdmin: boolean;
  subscriptionStatus: "active" | "none" | "canceled" | "past_due" | "expired" | "loading" | "error";
  billing: BillingSummary | null;
}

// Static plan data — can be replaced with API call later
const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 399,
    description: "For small to medium warehouses",
    features: [
      "Up to 2 warehouse locations",
      "Basic inventory tracking",
      "Standard reporting",
      "Email support",
      "Monthly billing",
    ],
    cta: "Get Started",
  },
  {
    id: "pro",
    name: "Professional",
    price: 899,
    description: "For growing logistics operations",
    features: [
      "Unlimited warehouse locations",
      "Advanced inventory management",
      "Real-time analytics & dashboards",
      "Priority email & chat support",
      "Custom integrations",
      "Monthly or annual billing",
    ],
    cta: "Choose Plan",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 0, // Custom pricing
    description: "For large-scale operations",
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "Advanced API access",
      "Custom workflows & automation",
      "Phone support (24/7)",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
  },
];

export default function CompanyMainPage() {
  const [accessState, setAccessState] = useState<CompanyAccessState>({
    user: null,
    company: null,
    isCompanyAdmin: false,
    subscriptionStatus: "loading",
    billing: null,
  });

  const { user, company, isCompanyAdmin, subscriptionStatus, billing } = accessState;

  // Initialize access state
  useEffect(() => {
    const initializeAccessState = async () => {
      try {
        // Check authentication
        const userData = await me();
        
        const newState: CompanyAccessState = {
          user: userData,
          company: userData.company || null,
          isCompanyAdmin: userData.role === "admin",
          subscriptionStatus: "loading",
          billing: null,
        };

        // If user has a company, fetch billing
        if (userData.company) {
          try {
            const billingData = await getBillingSummary();
            newState.billing = billingData;
            newState.subscriptionStatus = getSubscriptionStatus(billingData);
          } catch (billingErr) {
            console.error("Failed to fetch billing", billingErr);
            newState.subscriptionStatus = "error";
          }
        } else {
          // User authenticated but no company - this is an edge case
          newState.subscriptionStatus = "none";
        }

        setAccessState(newState);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Not authenticated - show public content
          setAccessState({
            user: null,
            company: null,
            isCompanyAdmin: false,
            subscriptionStatus: "none",
            billing: null,
          });
        } else {
          console.error("Auth check failed", err);
          setAccessState(prev => ({ ...prev, subscriptionStatus: "error" }));
        }
      }
    };

    initializeAccessState();
  }, []);

  // Helper to determine subscription status from billing data
  const getSubscriptionStatus = (billing: BillingSummary): CompanyAccessState["subscriptionStatus"] => {
    if (billing.is_active) {
      return "active";
    }
    if (billing.cancel_at_period_end) {
      return "canceled";
    }
    if (billing.status === "past_due") {
      return "past_due";
    }
    if (billing.current_period_end && new Date(billing.current_period_end) < new Date()) {
      return "expired";
    }
    return "none";
  };

  // Determine main CTA based on access state
  const getMainCTA = () => {
    if (!user) {
      return { text: "Get Started", path: "/signup" };
    }
    
    if (!company) {
      return { text: "Get Started", path: "/signup" };
    }

    switch (subscriptionStatus) {
      case "active":
        return { text: "Enter Software", path: "/dashboard" };
      case "canceled":
        return isCompanyAdmin 
          ? { text: "Resume Subscription", path: "/finance/billing" }
          : { text: "Contact Admin", path: "/help" };
      case "past_due":
      case "expired":
        return isCompanyAdmin
          ? { text: "Update Payment", path: "/finance/billing" }
          : { text: "Contact Admin", path: "/help" };
      case "none":
        return isCompanyAdmin
          ? { text: "Choose Plan", path: "/finance/billing" }
          : { text: "Contact Admin", path: "/help" };
      default:
        return { text: "Get Started", path: "/signup" };
    }
  };

  const mainCTA = getMainCTA();

  // Subscription status message
  const getStatusMessage = () => {
    if (!billing) return null;
    
    switch (subscriptionStatus) {
      case "active":
        const endDate = billing.current_period_end
          ? new Date(billing.current_period_end).toLocaleDateString()
          : "soon";
        return `Your company's ${billing.plan || "current"} plan is active through ${endDate}.`;
      case "canceled":
        return "Your company's subscription is scheduled to cancel. Contact your admin to renew.";
      case "past_due":
        return "Your company's subscription payment is past due. Contact your admin to update payment.";
      case "expired":
        return "Your company's subscription has expired. Contact your admin to renew.";
      case "none":
        return "Your company doesn't have an active subscription. Contact your admin to choose a plan.";
      default:
        return null;
    }
  };

  return (
    <div className="company-main-page">
      {/* Header */}
      <header className="company-header">
        <div className="company-header-content">
          <div className="company-brand">
            <div className="company-brand-icon">◆</div>
            <span className="company-brand-name">ProPack</span>
          </div>
          <nav className="company-nav">
            <a href="#features" className="company-nav-link">Features</a>
            <a href="#plans" className="company-nav-link">Plans</a>
            <a href="#support" className="company-nav-link">Support</a>
          </nav>
          <div className="company-header-actions">
            {user ? (
              <div className="company-account-info">
                <span className="company-account-name">{user.email}</span>
                {isCompanyAdmin && (
                  <Link to="/profile" className="company-link">
                    Account
                  </Link>
                )}
              </div>
            ) : (
              <Link to="/login" className="company-btn company-btn-secondary">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="company-main-content">
        {/* Hero Section */}
        <section className="company-hero">
          <div className="company-hero-content">
            <div className="company-hero-text">
              <h1 className="company-hero-title">
                Streamline Your Warehouse Operations
              </h1>
              <p className="company-hero-subtitle">
                ProPack helps logistics companies manage inventory, track shipments,
                and optimize warehouse workflows with powerful consolidation and
                repackaging tools designed for operational efficiency.
              </p>
              <div className="company-hero-ctas">
                {subscriptionStatus === "loading" ? (
                  <div className="company-hero-loading">Loading…</div>
                ) : (
                  <Link to={mainCTA.path} className="company-btn company-btn-primary">
                    {mainCTA.text}
                  </Link>
                )}
                {!user && subscriptionStatus !== "loading" && (
                  <Link
                    to="/login"
                    className="company-btn company-btn-secondary"
                  >
                    Access Your Account
                  </Link>
                )}
              </div>
            </div>
            <div className="company-hero-visual">
              <img src={heroIllustration} alt="Warehouse operations illustration" className="company-hero-illustration" />
            </div>
          </div>
        </section>

        {/* Company Status Section (if logged in) */}
        {user && company && (
          <section className="company-status-section">
            <div className="company-section-container">
              <h2 className="company-section-title">{company.name}</h2>

              {subscriptionStatus === "loading" ? (
                <div className="company-status-loading">Loading subscription details…</div>
              ) : subscriptionStatus === "error" ? (
                <div className="company-status-error">Could not load subscription information.</div>
              ) : (
                <div className="company-status-cards">
                  <div className="company-status-card">
                    <div className="company-status-label">Current Plan</div>
                    <div className="company-status-value">
                      {billing?.plan || "No Plan"}
                    </div>
                  </div>
                  <div className="company-status-card">
                    <div className="company-status-label">Status</div>
                    <div className="company-status-value">
                      <span
                        className={`company-status-badge ${
                          subscriptionStatus === "active" ? "active" : "inactive"
                        }`}
                      >
                        {subscriptionStatus === "active" ? "Active" : 
                         subscriptionStatus === "canceled" ? "Canceled" :
                         subscriptionStatus === "past_due" ? "Past Due" :
                         subscriptionStatus === "expired" ? "Expired" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  {billing?.current_period_end && (
                    <div className="company-status-card">
                      <div className="company-status-label">Valid Through</div>
                      <div className="company-status-value">
                        {new Date(
                          billing.current_period_end
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="company-status-message">{getStatusMessage()}</p>

              {subscriptionStatus === "active" && (
                <div className="company-quick-actions">
                  <Link
                    to="/dashboard"
                    className="company-btn company-btn-primary"
                  >
                    Enter Software
                  </Link>
                  {isCompanyAdmin && (
                    <Link
                      to="/finance/billing"
                      className="company-btn company-btn-secondary"
                    >
                      Manage Subscription
                    </Link>
                  )}
                </div>
              )}
              {(subscriptionStatus === "none" || subscriptionStatus === "canceled" || 
                subscriptionStatus === "past_due" || subscriptionStatus === "expired") && 
               isCompanyAdmin && (
                <div className="company-quick-actions">
                  <Link
                    to="/finance/billing"
                    className="company-btn company-btn-primary"
                  >
                    {subscriptionStatus === "canceled" ? "Resume Subscription" :
                     subscriptionStatus === "past_due" ? "Update Payment" :
                     subscriptionStatus === "expired" ? "Renew Subscription" : "Choose Plan"}
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Product Features Section */}
        <section id="features" className="company-features-section">
          <div className="company-section-container">
            <h2 className="company-section-title">Complete Warehouse Management</h2>
            <p className="company-section-subtitle">
              Everything you need to manage inventory, shipments, and operations efficiently.
            </p>

            <div className="company-features-grid">
              <div className="company-feature-card">
                <div className="company-feature-icon">📦</div>
                <h3>Inventory Tracking</h3>
                <p>Real-time visibility into stock levels across multiple warehouse locations with automated transaction logging.</p>
              </div>

              <div className="company-feature-card">
                <div className="company-feature-icon">🚚</div>
                <h3>Shipping Management</h3>
                <p>Streamline outbound orders with shipment creation, item assignment, and status tracking.</p>
              </div>

              <div className="company-feature-card">
                <div className="company-feature-icon">🔄</div>
                <h3>Repackaging & Consolidation</h3>
                <p>Efficiently merge shipments, repackage items, and manage cross-office consolidations with full traceability.</p>
              </div>

              <div className="company-feature-card">
                <div className="company-feature-icon">📊</div>
                <h3>Operational Reporting</h3>
                <p>Access detailed analytics and reports to optimize warehouse performance and business decisions.</p>
              </div>

              <div className="company-feature-card">
                <div className="company-feature-icon">👥</div>
                <h3>Team Collaboration</h3>
                <p>Manage company members, assign roles, and coordinate operations across your logistics team.</p>
              </div>

              <div className="company-feature-card">
                <div className="company-feature-icon">🔒</div>
                <h3>Secure & Compliant</h3>
                <p>Enterprise-grade security with full audit trails and compliance-ready data management.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Plans Section */}
        <section id="plans" className="company-plans-section">
          <div className="company-section-container">
            <h2 className="company-section-title">Choose Your Plan</h2>
            <p className="company-section-subtitle">
              Select the plan that best fits your warehouse and logistics needs.
            </p>

            <div className="company-plans-grid">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`company-plan-card ${
                    plan.highlighted ? "highlighted" : ""
                  } ${billing?.plan === plan.name ? "current" : ""}`}
                >
                  {plan.highlighted && (
                    <div className="company-plan-badge">RECOMMENDED</div>
                  )}
                  {billing?.plan === plan.name && (
                    <div className="company-plan-badge current-badge">
                      CURRENT PLAN
                    </div>
                  )}

                  <div className="company-plan-header">
                    <h3 className="company-plan-name">{plan.name}</h3>
                    <p className="company-plan-description">{plan.description}</p>
                  </div>

                  <div className="company-plan-pricing">
                    {plan.price > 0 ? (
                      <>
                        <span className="company-plan-price">${plan.price}</span>
                        <span className="company-plan-frequency">/month</span>
                      </>
                    ) : (
                      <span className="company-plan-price">Custom</span>
                    )}
                  </div>

                  <div className="company-plan-features">
                    <ul className="company-features-list">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="company-feature-item">
                          <span className="company-feature-checkmark">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="company-plan-cta">
                    {billing?.plan === plan.name ? (
                      <button
                        className="company-btn company-btn-secondary"
                        disabled
                      >
                        Current Plan
                      </button>
                    ) : (
                      <Link
                        to="/finance/billing"
                        className="company-btn company-btn-primary"
                      >
                        {plan.cta}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Access & Next Steps Section */}
        <section className="company-access-section">
          <div className="company-section-container">
            <h2 className="company-section-title">Get Started with ProPack</h2>
            <p className="company-section-subtitle">
              Ready to optimize your warehouse operations? Choose a plan or access your existing account.
            </p>

            <div className="company-access-grid">
              <div className="company-access-card">
                <div className="company-access-icon">👤</div>
                <h3>Account & Team</h3>
                <p>Manage company information and add team members.</p>
                <Link to="/profile" className="company-link-inline">
                  Manage Account →
                </Link>
              </div>

              <div className="company-access-card">
                <div className="company-access-icon">💳</div>
                <h3>Payment Method</h3>
                <p>
                  Add or update your billing payment method securely with Stripe.
                </p>
                <Link to="/finance/payment-methods" className="company-link-inline">
                  Payment Methods →
                </Link>
              </div>

              <div className="company-access-card">
                <div className="company-access-icon">📊</div>
                <h3>Billing History</h3>
                <p>View invoices and payment history for your subscription.</p>
                <Link to="/finance/payments" className="company-link-inline">
                  View Invoices →
                </Link>
              </div>

              <div className="company-access-card">
                <div className="company-access-icon">📋</div>
                <h3>Onboarding</h3>
                <p>Complete your company setup and start using ProPack.</p>
                <Link to="/settings" className="company-link-inline">
                  Setup Guide →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section id="support" className="company-support-section">
          <div className="company-section-container">
            <h2 className="company-section-title">Need Help?</h2>

            <div className="company-support-content">
              <div className="company-support-card">
                <h3>Documentation & Guides</h3>
                <p>
                  Find detailed guides, best practices, and answers to common questions
                  in our comprehensive documentation.
                </p>
                <Link to="/help" className="company-link-inline">
                  Visit Help Center →
                </Link>
              </div>

              <div className="company-support-card">
                <h3>Billing & Account Support</h3>
                <p>
                  Questions about your subscription, billing, or account management?
                  Our support team is here to help.
                </p>
                <a href="mailto:support@propack.io" className="company-link-inline">
                  Contact Support →
                </a>
              </div>

              <div className="company-support-card">
                <h3>Enterprise Solutions</h3>
                <p>
                  Need advanced features or custom integrations for large-scale operations?
                  Let's discuss your requirements.
                </p>
                <a href="mailto:sales@propack.io" className="company-link-inline">
                  Contact Sales →
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="company-footer">
        <div className="company-footer-content">
          <div className="company-footer-section">
            <div className="company-brand">
              <div className="company-brand-icon">◆</div>
              <span className="company-brand-name">ProPack</span>
            </div>
            <p className="company-footer-tagline">
              Complete warehouse and logistics management for modern operations.
            </p>
          </div>

          <div className="company-footer-section">
            <h4>Product</h4>
            <ul className="company-footer-links">
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#plans">Plans</a>
              </li>
              <li>
                <Link to="/help">Documentation</Link>
              </li>
            </ul>
          </div>

          <div className="company-footer-section">
            <h4>Support</h4>
            <ul className="company-footer-links">
              <li>
                <a href="mailto:support@propack.io">Help Center</a>
              </li>
              <li>
                <a href="mailto:support@propack.io">Billing Support</a>
              </li>
              <li>
                <a href="mailto:sales@propack.io">Contact Sales</a>
              </li>
            </ul>
          </div>

          <div className="company-footer-section">
            <h4>Company</h4>
            <ul className="company-footer-links">
              <li>
                <Link to="/profile">Account</Link>
              </li>
              <li>
                <Link to="/settings">Settings</Link>
              </li>
              <li>
                <a href="mailto:support@propack.io">Contact</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="company-footer-bottom">
          <p>&copy; 2024 ProPack. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
