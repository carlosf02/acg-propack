/**
 * Billing API module
 */

import { apiGet, apiPost, apiDelete } from "../../api/client";
import { endpoints } from "../../api/endpoints";

export interface BillingSummary {
    status: string;
    plan: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    queued_plan: string | null;
    has_customer: boolean;
    is_active: boolean;
    stripe_subscription_id: string | null;
    default_payment_method: {
        brand: string;
        last4: string;
        id: string;
    } | null;
    // Phase 4 descriptive fields
    has_default_payment_method: boolean;
    default_payment_method_brand: string | null;
    default_payment_method_last4: string | null;
    next_billing_date: string | null;
    auto_renew_enabled: boolean;
}

export interface PaymentMethod {
    id: string;
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    is_default: boolean;
}

export interface Invoice {
    id: number;
    stripe_invoice_id: string;
    amount_paid: string;
    currency: string;
    status: string;
    hosted_invoice_url: string | null;
    plan_name: string | null;
    payment_method_details: string | null;
    period_start: string | null;
    period_end: string | null;
    is_archived: boolean;
    created_at: string;
    company_name: string;
    billing_email: string;
    billing_name: string;
}

/** Get current subscription status for the company. */
export async function getBillingSummary(): Promise<BillingSummary> {
    return apiGet<BillingSummary>(endpoints.billingSummary());
}

/** Get invoice history for the company. */
export async function getInvoices(includeArchived: boolean = false): Promise<Invoice[]> {
    return apiGet<Invoice[]>(`${endpoints.billingInvoices()}?archived=${includeArchived}`);
}

/** Archive an invoice locally. */
export async function archiveInvoice(id: string | number): Promise<{ status: string }> {
    return apiPost<{ status: string }>(`${endpoints.billingInvoices()}${id}/archive/`, {});
}

/** Unarchive a previously archived invoice. */
export async function unarchiveInvoice(id: string | number): Promise<{ status: string }> {
    return apiPost<{ status: string }>(`${endpoints.billingInvoices()}${id}/unarchive/`, {});
}
/** Get a single invoice's details. */
export async function getInvoiceDetail(id: string | number): Promise<Invoice> {
    return apiGet<Invoice>(`${endpoints.billingInvoices()}${id}/`);
}

/** Create a Stripe Billing Portal session and return the URL. */
export async function createPortalSession(return_url?: string): Promise<{ url: string }> {
    return apiPost<{ url: string }>(endpoints.billingPortal(), { return_url });
}

/** Trigger a manual sync of checkout status from Stripe. */
export async function syncCheckout(): Promise<{ status: string }> {
    return apiPost<{ status: string }>(endpoints.billingSync(), {});
}

/** Create a Stripe Subscription Intent and return normalized data. */
export async function createSubscriptionIntent(planType: 'basic' | 'pro' = 'basic', saveCard: boolean = true): Promise<{ 
    subscriptionId: string, 
    clientSecret: string | null, 
    intentType: 'payment' | 'setup' | null,
    amountDue: number,
    requiresImmediatePayment: boolean,
    subscriptionAction: 'start' | 'upgrade' | 'downgrade' | 'resume' | 'no-op',
    requiresPaymentMethodCollection: boolean,
    hasDefaultCard: boolean
}> {
    return apiPost(endpoints.billingSubscriptionIntent(), { 
        plan_type: planType,
        save_card: saveCard
    });
}

/** Subscribe using a saved payment method. */
export async function subscribeWithSavedCard(planType: 'basic' | 'pro' = 'basic', paymentMethodId?: string): Promise<{ subscriptionId: string, status: string }> {
    return apiPost<{ subscriptionId: string, status: string }>(endpoints.billingSubscribeSavedCard(), { 
        plan_type: planType,
        payment_method_id: paymentMethodId
    });
}

/** List all saved payment methods for the company. */
export async function listPaymentMethods(): Promise<PaymentMethod[]> {
    return apiGet<PaymentMethod[]>(endpoints.paymentMethods());
}

/** Detach a payment method from the customer. */
export async function detachPaymentMethod(id: string): Promise<{ status: string }> {
    return apiDelete<{ status: string }>(endpoints.paymentMethodDetail(id));
}

/** Create a Stripe SetupIntent for adding a card. */
export async function createSetupIntent(): Promise<{ clientSecret: string }> {
    return apiPost<{ clientSecret: string }>(endpoints.paymentMethodSetupIntent(), {});
}

/** Set a payment method as the default. */
export async function setDefaultPaymentMethod(id: string): Promise<{ status: string }> {
    return apiPost<{ status: string }>(endpoints.paymentMethodSetDefault(id), {});
}

/** Cancel the current subscription locally. */
export async function cancelSubscription(): Promise<{ status: string }> {
    return apiPost<{ status: string }>(endpoints.billingCancelSubscription(), {});
}

/** Queue a plan switch for the next billing cycle. */
export async function queuePlanSwitch(planId: string): Promise<{ status: string, queued_plan: string }> {
    return apiPost(endpoints.billingSubscriptionQueueSwitch(), { plan_id: planId });
}

/** Cancel a scheduled plan switch. */
export async function cancelQueuedSwitch(): Promise<{ status: string }> {
    return apiPost(endpoints.billingSubscriptionCancelSwitch(), {});
}

/** Create a temporary onboarding session. */
export async function createOnboardingSession(data: any): Promise<{ session_id: string, client_secret: string, subscription_id: string }> {
    return apiPost(endpoints.createOnboardingSession(), data);
}

/** Finalize onboarding after payment success. */
export async function finalizeOnboarding(sessionId: string): Promise<{ status: string, user: string, company: string }> {
    return apiPost(endpoints.finalizeOnboarding(sessionId), {});
}
