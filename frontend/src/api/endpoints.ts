/**
 * API Endpoints — single source of truth for all API paths.
 *
 * Usage:
 *   import { endpoints } from '@/api/endpoints';
 *   apiGet(endpoints.me())
 *   apiGet(endpoints.shipments(), { page: 1 })
 */

export const endpoints = {
    // Auth
    csrf: () => "/api/v1/csrf/",
    login: () => "/api/v1/login/",
    logout: () => "/api/v1/logout/",
    signup: () => "/api/v1/signup/",

    // Auth / current user
    me: () => "/api/v1/me/",

    // Core resources
    warehouses: () => "/api/v1/warehouses/",
    locations: () => "/api/v1/locations/",
    clients: () => "/api/v1/clients/",
    shipments: () => "/api/v1/shipments/",
    warehouseReceipts: () => "/api/v1/wrs/",

    // Company / membership
    associateCompanies: () => "/api/v1/associate-companies/",
    offices: () => "/api/v1/offices/",
    consolidations: () => "/api/v1/consolidations/",
    companyMembers: () => "/api/v1/company/members/",
    companies: () => "/api/v1/companies/",

    // Billing
    billingSummary: () => "/api/v1/billing/summary/",
    billingPortal: () => "/api/v1/billing/portal/",
    billingInvoices: () => "/api/v1/billing/invoices/",
    billingSync: () => "/api/v1/billing/sync-checkout/",
    billingSubscriptionIntent: () => "/api/v1/billing/subscription-intent/",
    billingSubscribeSavedCard: () => "/api/v1/billing/subscribe-saved-card/",
    paymentMethods: () => "/api/v1/billing/payment-methods/",
    paymentMethodSetupIntent: () => "/api/v1/billing/payment-methods/setup-intent/",
    paymentMethodDetail: (id: string) => `/api/v1/billing/payment-methods/${id}/`,
    paymentMethodSetDefault: (id: string) => `/api/v1/billing/payment-methods/${id}/set-default/`,
    billingCancelSubscription: () => "/api/v1/billing/subscription/cancel/",
    billingSubscriptionQueueSwitch: () => "/api/v1/billing/subscription/queue-switch/",
    billingSubscriptionCancelSwitch: () => "/api/v1/billing/subscription/cancel-switch/",
    createOnboardingSession: () => "/api/v1/billing/onboarding-session/",
    finalizeOnboarding: (id: string) => `/api/v1/billing/onboarding-session/${id}/finalize/`,

    // Client portal
    clientPortalSummary: () => "/api/v1/client/summary/",
    clientPortalPackages: () => "/api/v1/client/packages/",
    clientSetPassword: () => "/api/v1/client/set-password/",
    clientProfile: () => "/api/v1/client/profile/",
    clientNotifications: () => "/api/v1/client/notifications/",
} as const;

export type EndpointKey = keyof typeof endpoints;
