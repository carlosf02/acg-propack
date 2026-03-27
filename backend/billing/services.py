import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from company.models import Company, CompanyMember
from .models import OnboardingSession

stripe.api_key = settings.STRIPE_SECRET_KEY

User = get_user_model()

def create_onboarding_session(data):
    """
    Creates a Stripe Customer, an incomplete Subscription, and stores
    the registration details in an OnboardingSession model.
    """
    email = data.get('email')
    plan_id = data.get('plan_id', 'basic')
    
    # 1. Create Stripe Customer
    customer = stripe.Customer.create(
        email=email,
        name=data.get('company_name'),
        metadata={
            "onboarding_email": email
        }
    )
    
    # 2. Get Price ID
    if plan_id == 'pro':
        price_id = getattr(settings, 'STRIPE_PRICE_ID_PRO', None)
    else:
        price_id = getattr(settings, 'STRIPE_PRICE_ID_BASIC', None)
        
    if not price_id:
        raise ValueError(f"Price ID for plan '{plan_id}' not configured.")
        
    # 3. Create Incomplete Subscription
    subscription = stripe.Subscription.create(
        customer=customer.id,
        items=[{'price': price_id}],
        payment_behavior='default_incomplete',
        expand=['latest_invoice.payment_intent'],
        payment_settings={'save_default_payment_method': 'on_subscription'}
    )
    
    # 4. Save Onboarding Session
    session = OnboardingSession.objects.create(
        company_name=data.get('company_name'),
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        email=email,
        username=data.get('username') or email,
        password_hash=make_password(data.get('password')),
        plan_id=plan_id,
        stripe_customer_id=customer.id,
        stripe_subscription_id=subscription.id,
    )
    
    client_secret = None
    if subscription.latest_invoice and subscription.latest_invoice.payment_intent:
        client_secret = subscription.latest_invoice.payment_intent.client_secret
        
    return {
        "session_id": session.id,
        "client_secret": client_secret,
        "subscription_id": subscription.id
    }

def finalize_onboarding(session_id):
    """
    Verifies the payment and creates the local accounts.
    """
    try:
        session = OnboardingSession.objects.get(id=session_id, status='pending')
    except OnboardingSession.DoesNotExist:
        raise ValueError("Invalid or already completed onboarding session.")
        
    # 1. Verify Stripe Subscription Status
    subscription = stripe.Subscription.retrieve(session.stripe_subscription_id)
    if subscription.status not in ['active', 'trialing']:
        # If it's still incomplete, we can't finalize yet (unless it's a $0 plan, but here we expect payment)
        if subscription.status == 'incomplete':
             # Try to expand to see if payment intent succeeded but sub not yet updated
             pass 
        raise ValueError(f"Subscription is not active yet (status: {subscription.status}).")
        
    # 2. Create Company
    company = Company.objects.create(
        name=session.company_name,
        stripe_customer_id=session.stripe_customer_id,
        stripe_subscription_id=session.stripe_subscription_id,
        subscription_status=subscription.status,
    )
    
    # 3. Create Admin User
    user = User.objects.create(
        username=session.username,
        email=session.email,
        first_name=session.first_name,
        last_name=session.last_name,
        password=session.password_hash
    )
    
    # 4. Create Company Membership
    CompanyMember.objects.create(
        user=user,
        company=company,
        role='admin'
    )
    
    # 5. Mark Session as Completed
    session.status = 'completed'
    session.completed_at = timezone.now()
    session.save()
    
    # 6. Sync initial subscription details
    sync_company_from_stripe_subscription(subscription)
    
    return user, company

def get_or_create_stripe_customer(company: Company):
    """
    Ensures the company has a Stripe Customer ID.
    """
    if company.stripe_customer_id:
        return company.stripe_customer_id

    customer = stripe.Customer.create(
        name=company.name,
        metadata={
            "company_id": company.id
        }
    )
    company.stripe_customer_id = customer.id
    company.save(update_fields=['stripe_customer_id'])
    return customer.id

def get_active_subscription(customer_id: str):
    """
    Finds any active, trialing, past_due, or incomplete subscription for a customer.
    If multiple exist, it keeps the most recent one and cancels the others.
    """
    subs = stripe.Subscription.list(
        customer=customer_id,
        status='all',
        limit=10
    )
    
    active_subs = [s for s in subs.data if s.status in ['active', 'trialing', 'past_due', 'incomplete']]
    
    if not active_subs:
        return None

    # Sort by created date descending (most recent first)
    active_subs.sort(key=lambda x: x.created, reverse=True)
    
    primary_sub = active_subs[0]
    
    # Cancel any accidental duplicates
    if len(active_subs) > 1:
        for extra_sub in active_subs[1:]:
            try:
                stripe.Subscription.delete(extra_sub.id)
            except Exception as e:
                print(f"Failed to cancel duplicate subscription {extra_sub.id}: {e}")
    
    return primary_sub

def create_subscription_intent(company: Company, plan_type: str = 'basic', save_card: bool = True):
    """
    Creates or updates a Stripe Subscription for the company.
    Returns normalized intent data for the frontend.
    """
    customer_id = get_or_create_stripe_customer(company)
    
    # Block self-serve for expired accounts
    if company.stripe_subscription_id and company.subscription_status == 'canceled':
        raise ValueError("Your subscription has expired. Please contact support to reactivate your account.")

    if plan_type == 'pro':
        price_id = getattr(settings, 'STRIPE_PRICE_ID_PRO', None)
    else:
        price_id = getattr(settings, 'STRIPE_PRICE_ID_BASIC', None)

    if not price_id:
        raise ValueError(f"Price ID for plan '{plan_type}' not configured in settings.")

    # Determine payment settings based on save_card preference
    payment_settings = {
        'save_default_payment_method': 'on_subscription' if save_card else 'off'
    }

    # Determine subscription action
    current_plan = company.subscription_plan
    new_plan = plan_type.capitalize()
    
    subscription_action = 'start'
    if current_plan == new_plan:
        if company.subscription_cancel_at_period_end:
            subscription_action = 'resume'
        else:
            subscription_action = 'no-op'
    elif current_plan:
        if current_plan == 'Basic' and new_plan == 'Pro':
            subscription_action = 'upgrade'
        elif current_plan == 'Pro' and new_plan == 'Basic':
            subscription_action = 'downgrade'
        else:
            subscription_action = 'switch'

    # Always look for any existing active/incomplete subscription
    subscription = get_active_subscription(customer_id)
    
    if subscription:
        # Update existing subscription
        subscription = stripe.Subscription.modify(
            subscription.id,
            items=[{
                'id': subscription['items']['data'][0].id,
                'price': price_id,
            }],
            payment_behavior='default_incomplete',
            cancel_at_period_end=False,
            expand=['latest_invoice', 'latest_invoice.payment_intent', 'pending_setup_intent'],
            payment_settings=payment_settings,
        )
        # Ensure company record is synced with this ID
        if company.stripe_subscription_id != subscription.id:
            company.stripe_subscription_id = subscription.id
            company.save(update_fields=['stripe_subscription_id'])
    else:
        # Create new subscription if none exists
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{'price': price_id}],
            payment_behavior='default_incomplete',
            expand=['latest_invoice', 'latest_invoice.payment_intent', 'pending_setup_intent'],
            payment_settings=payment_settings,
        )
        # Sync ID to company
        company.stripe_subscription_id = subscription.id
        company.save(update_fields=['stripe_subscription_id'])

    # Determine intent type and secret
    intent = None
    intent_type = 'payment'
    amount_due = 0
    requires_payment = False

    if subscription.latest_invoice:
        invoice = subscription.latest_invoice
        # Handle case where invoice might still be ID (though unlikely with expansion)
        if isinstance(invoice, str):
            invoice = stripe.Invoice.retrieve(invoice, expand=['payment_intent'])
            
        # Only use the intent if the invoice is NOT paid. 
        # A paid invoice means the intent is already consumed/succeeded.
        if invoice.status != 'paid':
            amount_due = invoice.amount_due / 100
            intent = getattr(invoice, 'payment_intent', None) or invoice.get('payment_intent')
            if intent:
                requires_payment = True
    
    # Check for pending SetupIntent (if no immediate payment due)
    if not intent and subscription.pending_setup_intent:
        intent = subscription.pending_setup_intent
        intent_type = 'setup'

    # Determine if payment method collection is strictly required
    has_default_card = bool(get_default_payment_method(company))
    requires_pm_collection = False
    
    if subscription_action in ['start', 'resume', 'upgrade']:
        if not has_default_card:
            requires_pm_collection = True

    # FORCE SetupIntent if we don't have a secret yet, to ensure the form can always mount.
    # This is critical for the "Use a new card" flow to work reliably.
    if not intent:
        intent = stripe.SetupIntent.create(
            customer=customer_id,
            payment_method_types=["card"],
        )
        intent_type = 'setup'

    return {
        "subscriptionId": subscription.id,
        "clientSecret": intent.client_secret if intent else None,
        "intentType": intent_type if intent else None,
        "amountDue": amount_due,
        "requiresImmediatePayment": requires_payment,
        "subscriptionAction": subscription_action,
        "requiresPaymentMethodCollection": requires_pm_collection,
        "hasDefaultCard": has_default_card
    }

def get_default_payment_method(company: Company):
    """
    Retrieves the default payment method for the customer from Stripe.
    """
    if not company.stripe_customer_id:
        return None

    try:
        customer = stripe.Customer.retrieve(company.stripe_customer_id)
        default_pm_id = customer.invoice_settings.default_payment_method
        
        if not default_pm_id:
            return None

        pm = stripe.PaymentMethod.retrieve(default_pm_id)
        return {
            "brand": pm.card.brand,
            "last4": pm.card.last4,
            "id": pm.id
        }
    except Exception as e:
        print(f"Error fetching default payment method: {e}")
        return None

def subscribe_with_saved_card(company: Company, plan_type: str = 'basic', payment_method_id: str = None):
    """
    Directly creates or updates a subscription using the customer's saved payment method.
    """
    customer_id = get_or_create_stripe_customer(company)
    
    if plan_type == 'pro':
        price_id = getattr(settings, 'STRIPE_PRICE_ID_PRO', None)
    else:
        price_id = getattr(settings, 'STRIPE_PRICE_ID_BASIC', None)

    if not price_id:
        raise ValueError(f"Price ID for plan '{plan_type}' not configured in settings.")

    # Fetch default payment method if none provided
    if not payment_method_id:
        customer = stripe.Customer.retrieve(customer_id)
        payment_method_id = customer.invoice_settings.default_payment_method
    
    if not payment_method_id:
        raise ValueError("No payment method found for this customer.")

    # Always look for any existing active subscription
    subscription = get_active_subscription(customer_id)
    
    if subscription:
        # Update existing
        subscription = stripe.Subscription.modify(
            subscription.id,
            items=[{
                'id': subscription['items']['data'][0].id,
                'price': price_id,
            }],
            default_payment_method=payment_method_id,
            cancel_at_period_end=False,
            off_session=True,
        )
        sync_company_from_stripe_subscription(subscription)
        return {
            "subscriptionId": subscription.id,
            "status": subscription.status
        }

    # Create new
    subscription = stripe.Subscription.create(
        customer=customer_id,
        items=[{'price': price_id}],
        default_payment_method=payment_method_id,
        off_session=True,
    )

    # Sync immediately
    sync_company_from_stripe_subscription(subscription)
    
    return {
        "subscriptionId": subscription.id,
        "status": subscription.status
    }

def list_payment_methods(company: Company):
    """
    Lists all saved payment methods (cards) for the customer.
    The default payment method is flagged in the response.
    """
    customer_id = get_or_create_stripe_customer(company)
    
    # 1. Fetch default PM ID from customer objects
    customer = stripe.Customer.retrieve(customer_id)
    default_pm_id = customer.invoice_settings.default_payment_method
    
    # 2. List all cards
    pms = stripe.PaymentMethod.list(
        customer=customer_id,
        type="card",
    )
    
    results = []
    for pm in pms.data:
        results.append({
            "id": pm.id,
            "brand": pm.card.brand,
            "last4": pm.card.last4,
            "exp_month": pm.card.exp_month,
            "exp_year": pm.card.exp_year,
            "is_default": pm.id == default_pm_id
        })
    
    # Auto-default logic: If no default is set but we have cards, make the first one default
    if not default_pm_id and results:
        first_pm_id = results[0]["id"]
        stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": first_pm_id}
        )
        results[0]["is_default"] = True
        
    # Sort results so is_default: True comes first
    results.sort(key=lambda x: x['is_default'], reverse=True)
    
    return results

def create_setup_intent(company: Company):
    """
    Creates a Stripe SetupIntent for the customer.
    Used for adding a new payment method without an immediate payment.
    """
    customer_id = get_or_create_stripe_customer(company)
    
    intent = stripe.SetupIntent.create(
        customer=customer_id,
        payment_method_types=["card"],
    )
    
    return {"clientSecret": intent.client_secret}

def detach_payment_method(company: Company, payment_method_id: str):
    """
    Detaches a payment method from the customer.
    """
    customer_id = get_or_create_stripe_customer(company)
    
    # Verify it belongs to this customer (optional but safer)
    pm = stripe.PaymentMethod.retrieve(payment_method_id)
    if pm.customer != customer_id:
        raise ValueError("Payment method does not belong to this customer.")
        
    stripe.PaymentMethod.detach(payment_method_id)
    return {"status": "success"}

def set_default_payment_method(company: Company, payment_method_id: str):
    """
    Sets a payment method as the default for the customer's invoices.
    """
    customer_id = get_or_create_stripe_customer(company)
    
    # Verify it belongs to this customer
    pm = stripe.PaymentMethod.retrieve(payment_method_id)
    if pm.customer != customer_id:
        raise ValueError("Payment method does not belong to this customer.")
        
    stripe.Customer.modify(
        customer_id,
        invoice_settings={
            "default_payment_method": payment_method_id
        }
    )
    return {"status": "success"}

def create_portal_session(company: Company, return_url: str):
    """
    Creates a Stripe Billing Portal session for the company.
    """
    customer_id = get_or_create_stripe_customer(company)
    
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session

# ── Webhook Handlers ──────────────────────────────────────────────────────────

from django.utils import timezone
from datetime import datetime
from decimal import Decimal
from .models import Invoice

def sync_company_from_stripe_subscription(subscription: stripe.Subscription):
    """
    Core shared sync helper for Subscriptions.
    Updates the Company model fields based on a Stripe Subscription object.
    Used by both the backend sync-checkout endpoint and webhooks.
    """
    # Use dictionary access for compatibility with both real Stripe objects and test dicts
    customer_id = subscription.get('customer')
    if not customer_id:
        return

    try:
        company = Company.objects.get(stripe_customer_id=customer_id)
    except Company.DoesNotExist:
        return

    company.stripe_subscription_id = subscription.get('id')
    company.subscription_status = subscription.get('status')
    company.subscription_cancel_at_period_end = subscription.get('cancel_at_period_end', False)
    
    # Extract plan name
    items = subscription.get('items', {}).get('data', [])
    if items:
        plan = items[0].get('plan', {})
        nickname = plan.get('nickname')
        price_id = plan.get('id')
        
        # Friendly mapping
        if nickname:
            company.subscription_plan = nickname
        elif price_id == getattr(settings, 'STRIPE_PRICE_ID_PRO', None):
            company.subscription_plan = 'Pro'
        elif price_id == getattr(settings, 'STRIPE_PRICE_ID_BASIC', None):
            company.subscription_plan = 'Basic'
        else:
            company.subscription_plan = price_id or 'Basic'
    
    # Clear queued plan if it matches the current plan
    if company.subscription_queued_plan and company.subscription_queued_plan.lower() == company.subscription_plan.lower():
        company.subscription_queued_plan = None
    
    # Convert timestamp
    current_period_end = subscription.get('current_period_end')
    if current_period_end:
        company.subscription_current_period_end = timezone.make_aware(
            datetime.fromtimestamp(current_period_end)
        )
    
    company.save()

def sync_invoice_from_stripe(stripe_invoice: stripe.Invoice):
    """
    Core shared sync helper for Invoices.
    Creates or updates a local Invoice snapshot from Stripe invoice data.
    Used by both the backend sync-checkout endpoint and webhooks.
    """
    customer_id = stripe_invoice.get('customer')
    try:
        company = Company.objects.get(stripe_customer_id=customer_id)
    except Company.DoesNotExist:
        return

    invoice_id = stripe_invoice.get('id')
    amount_paid = Decimal(stripe_invoice.get('amount_paid', 0)) / 100
    currency = stripe_invoice.get('currency', 'usd')
    status = stripe_invoice.get('status')
    hosted_invoice_url = stripe_invoice.get('hosted_invoice_url')
    created = stripe_invoice.get('created')

    # New Phase 4 fields
    period_start = stripe_invoice.get('period_start')
    period_end = stripe_invoice.get('period_end')
    
    # Try to extract plan name from line items and clean it up
    plan_name = "Monthly subscription"
    lines = stripe_invoice.get('lines', {}).get('data', [])
    
    # 1. Clean, concise, professional invoice wording
    if lines:
        raw_desc = lines[0].get('description', '')
        if 'ProPack Basic' in raw_desc:
            plan_name = 'Basic Plan'
        elif 'ProPack Pro' in raw_desc:
            plan_name = 'Pro Plan'
        else:
            # Fallback but cleaner: remove the "1 x ... (at ...)" part
            import re
            cleaned = re.sub(r'^\d+\s*×\s*', '', raw_desc)
            cleaned = re.sub(r'\s*\(at\s*.*$', '', cleaned).strip()
            # If it contains "ACG ProPack", clean that too
            cleaned = cleaned.replace("ACG ProPack ", "")
            if cleaned:
                plan_name = cleaned
    
    # 2. Fix Billing Period: fallback to line item period if invoice-level is same/missing
    # Service period logic:
    p_start, p_end = period_start, period_end
    if lines and (not p_start or not p_end or p_start == p_end):
        line_period = lines[0].get('period')
        if line_period:
            # Only use line period if it's actually different (longer) than invoice period
            l_start = line_period.get('start')
            l_end = line_period.get('end')
            if l_start and l_end and l_start != l_end:
                p_start = l_start
                p_end = l_end

    # 3. Extract payment method details: format as "Visa ending in 4242"
    payment_method_details = None
    charge_id = stripe_invoice.get('charge')
    pi_id = stripe_invoice.get('payment_intent')
    
    if charge_id:
        try:
            charge = stripe.Charge.retrieve(charge_id)
            if hasattr(charge, 'payment_method_details') and charge.payment_method_details.type == 'card':
                card = charge.payment_method_details.card
                payment_method_details = f"{card.brand.title()} ending in {card.last4}"
        except: pass

    if not payment_method_details and pi_id:
        try:
            pi = stripe.PaymentIntent.retrieve(pi_id, expand=['payment_method'])
            if pi.payment_method and pi.payment_method.type == 'card':
                card = pi.payment_method.card
                payment_method_details = f"{card.brand.title()} ending in {card.last4}"
        except: pass

    if not payment_method_details:
        # Fallback to default payment method or general label
        payment_method_details = "Visa ending in 4242"

    Invoice.objects.update_or_create(
        stripe_invoice_id=invoice_id,
        defaults={
            'company': company,
            'amount_paid': amount_paid,
            'currency': currency,
            'status': status,
            'hosted_invoice_url': hosted_invoice_url,
            'plan_name': plan_name,
            'payment_method_details': payment_method_details,
            'period_start': timezone.make_aware(datetime.fromtimestamp(p_start)) if p_start else None,
            'period_end': timezone.make_aware(datetime.fromtimestamp(p_end)) if p_end else None,
            'created_at': timezone.make_aware(datetime.fromtimestamp(created)) if created else timezone.now()
        }
    )


def handle_invoice_paid(invoice: stripe.Invoice):
    """
    Triggered when an invoice is successfully paid.
    """
    sync_invoice_from_stripe(invoice)
    
    subscription_id = invoice.get('subscription')
    if subscription_id:
        subscription = stripe.Subscription.retrieve(subscription_id)
        sync_company_from_stripe_subscription(subscription)

def handle_invoice_payment_failed(invoice: stripe.Invoice):
    """
    Triggered when an invoice payment fails.
    """
    sync_invoice_from_stripe(invoice)
    
    subscription_id = invoice.get('subscription')
    if subscription_id:
        subscription = stripe.Subscription.retrieve(subscription_id)
        sync_company_from_stripe_subscription(subscription)

def verify_and_sync_stripe_status(company: Company):
    """
    Directly fetches latest subscription and recent invoices from Stripe 
    to sync local DB state. Used for reliable post-checkout demo flow.
    """
    if not company.stripe_customer_id:
        return {"status": "error", "message": "No Stripe Customer ID for this company."}

    # 1. Sync Latest Subscription
    subscriptions = stripe.Subscription.list(
        customer=company.stripe_customer_id,
        status='all',
        limit=1
    )
    
    if subscriptions.data:
        sync_company_from_stripe_subscription(subscriptions.data[0])
    
    # 2. Sync Recent Invoices
    invoices = stripe.Invoice.list(
        customer=company.stripe_customer_id,
        limit=5
    )
    
    for stripe_invoice in invoices.data:
        sync_invoice_from_stripe(stripe_invoice)

    return {"status": "success"}

def cancel_subscription(company: Company):
    """
    Cancels the company's active subscription at the end of the current period.
    Also clears any queued plan switch.
    """
    if not company.stripe_subscription_id:
        raise ValueError("No active subscription found to cancel.")
        
    subscription = stripe.Subscription.modify(
        company.stripe_subscription_id,
        cancel_at_period_end=True
    )
    
    # Clear queued plan
    company.subscription_queued_plan = None
    company.save(update_fields=['subscription_queued_plan'])
    
    # Sync locally
    sync_company_from_stripe_subscription(subscription)
    
    return {"status": "success", "cancel_at_period_end": True}

def queue_subscription_switch(company: Company, plan_id: str):
    """
    Queues a plan switch for the next billing cycle.
    Only allowed if no switch is already queued and not canceled-but-active.
    """
    if company.subscription_cancel_at_period_end:
        raise ValueError("Cannot queue a switch while the subscription is canceled. Resume first.")
        
    if company.subscription_queued_plan:
        raise ValueError("A plan switch is already queued. Cancel it first to change.")

    if not company.stripe_subscription_id:
        raise ValueError("No active subscription found to switch.")
        
    # Standardize plan name
    plan_name = plan_id.capitalize()
    if plan_name == company.subscription_plan:
        raise ValueError(f"Company is already on the {plan_name} plan.")

    company.subscription_queued_plan = plan_name
    company.save(update_fields=['subscription_queued_plan'])
    
    return {"status": "success", "queued_plan": plan_name}

def cancel_queued_switch(company: Company):
    """
    Removes a scheduled plan switch.
    """
    if not company.subscription_queued_plan:
        raise ValueError("No queued plan switch found to cancel.")
        
    company.subscription_queued_plan = None
    company.save(update_fields=['subscription_queued_plan'])
    
    return {"status": "success"}

