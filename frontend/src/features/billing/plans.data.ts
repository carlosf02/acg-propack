/**
 * Shared source of truth for ACG ProPack plans.
 */

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  stripe_price_id?: string;
  is_popular?: boolean;
}

export const PLANS: BillingPlan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 29,
    period: "month",
    description: "Essential warehouse control for small teams.",
    features: [
      "5 Office Slots",
      "Basic Reporting",
      "Email Support"
    ],
    stripe_price_id: "price_basic_29", // Placeholder
  },
  {
    id: "pro",
    name: "Pro",
    price: 50,
    period: "month",
    description: "Advanced performance for growing logistics operations.",
    features: [
      "Unlimited Offices",
      "Advanced Analytics",
      "Priority Support",
      "Custom Branding"
    ],
    stripe_price_id: "price_pro_50", // Placeholder
    is_popular: true,
  }
];

export const getPlanById = (id: string) => PLANS.find(p => p.id === id);
