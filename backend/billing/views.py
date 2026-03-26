import stripe
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from company.permissions import IsCompanyAdmin, IsCompanyMember
from company.utils import get_active_company
from .services import (
    create_portal_session, 
    verify_and_sync_stripe_status,
    create_subscription_intent,
    get_default_payment_method,
    subscribe_with_saved_card,
    list_payment_methods,
    detach_payment_method,
    set_default_payment_method,
    cancel_subscription,
    create_setup_intent,
    create_onboarding_session,
    finalize_onboarding,
    queue_subscription_switch,
    cancel_queued_switch
)
from django.contrib.auth import login

from .models import Invoice
from .serializers import InvoiceSerializer

class CreateOnboardingSessionView(APIView):
    """
    Public endpoint to start the onboarding flow.
    Creates a Stripe Customer, Subscription, and OnboardingSession.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            result = create_onboarding_session(request.data)
            return Response(result, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class FinalizeOnboardingView(APIView):
    """
    Public endpoint to complete onboarding after payment.
    Creates the local User and Company.
    """
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            user, company = finalize_onboarding(pk)
            # Log the user in immediately
            login(request, user)
            return Response({
                "status": "success",
                "user": user.username,
                "company": company.name
            })
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class BillingSummaryView(APIView):
    """
    Returns the current subscription status for the active company.
    """
    permission_classes = [IsCompanyMember]

    def get(self, request):
        company = get_active_company(request.user)
        default_pm = get_default_payment_method(company)
        
        return Response({
            "status": company.subscription_status,
            "plan": company.subscription_plan,
            "current_period_end": company.subscription_current_period_end,
            "has_customer": bool(company.stripe_customer_id),
            "is_active": company.subscription_status in ['active', 'trialing'],
            "stripe_subscription_id": company.stripe_subscription_id,
            "cancel_at_period_end": company.subscription_cancel_at_period_end,
            "queued_plan": company.subscription_queued_plan,
            "default_payment_method": default_pm,
            # Phase 4 descriptive fields
            "has_default_payment_method": bool(default_pm),
            "default_payment_method_brand": default_pm.get("brand") if default_pm else None,
            "default_payment_method_last4": default_pm.get("last4") if default_pm else None,
            "next_billing_date": company.subscription_current_period_end,
            "auto_renew_enabled": not company.subscription_cancel_at_period_end and company.subscription_status in ['active', 'trialing'],
        })

class InvoiceListView(APIView):
    """
    Returns a list of invoices for the active company.
    """
    permission_classes = [IsCompanyMember]

    def get(self, request):
        company = get_active_company(request.user)
        is_archived_param = request.query_params.get('archived', 'false').lower() == 'true'
        
        invoices = Invoice.objects.filter(company=company, is_archived=is_archived_param)
        serializer = InvoiceSerializer(invoices, many=True)
        return Response(serializer.data)

class InvoiceArchiveActionView(APIView):
    """
    Toggles the is_archived status of an invoice. Admin only.
    """
    permission_classes = [IsCompanyAdmin]

    def post(self, request, pk, action=None):
        company = get_active_company(request.user)
        try:
            invoice = Invoice.objects.get(pk=pk, company=company)
            if action == 'archive':
                invoice.is_archived = True
            elif action == 'unarchive':
                invoice.is_archived = False
            else:
                # Generic toggle if no action specified
                invoice.is_archived = not invoice.is_archived
            
            invoice.save()
            return Response({"status": "success", "is_archived": invoice.is_archived})
        except Invoice.DoesNotExist:
            return Response({"error": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)

class CreateSubscriptionIntentView(APIView):
    """
    Creates a Stripe Subscription Intent for the active company. Admin only.
    Used for embedded Payment Element flow.
    """
    permission_classes = [IsCompanyAdmin]

    def post(self, request):
        company = get_active_company(request.user)
        plan_type = request.data.get("plan_type", "basic")
        save_card = request.data.get("save_card", True)
        
        try:
            intent_data = create_subscription_intent(company, plan_type=plan_type, save_card=save_card)
            return Response(intent_data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class SubscribeSavedCardView(APIView):
    """
    Subscribes the company using their saved default payment method. Admin only.
    """
    permission_classes = [IsCompanyAdmin]

    def post(self, request):
        company = get_active_company(request.user)
        plan_type = request.data.get("plan_type", "basic")
        payment_method_id = request.data.get("payment_method_id")
        
        try:
            result = subscribe_with_saved_card(company, plan_type=plan_type, payment_method_id=payment_method_id)
            return Response(result)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class CreatePortalSessionView(APIView):
    """
    Creates a Stripe Billing Portal session for the active company. Admin only.
    """
    permission_classes = [IsCompanyAdmin]

    def post(self, request):
        company = get_active_company(request.user)
        return_url = request.data.get("return_url", "http://localhost:5173/billing")

        try:
            session = create_portal_session(company, return_url)
            return Response({"url": session.url})
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PaymentMethodListView(APIView):
    """
    Lists saved payment methods for the active company. Admin only.
    """
    permission_classes = [IsCompanyAdmin]

    def get(self, request):
        company = get_active_company(request.user)
        try:
            pms = list_payment_methods(company)
            return Response(pms)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class CreateSetupIntentView(APIView):
    """
    Creates a Stripe SetupIntent for the active company. Admin only.
    """
    permission_classes = [IsCompanyAdmin]

    def post(self, request):
        company = get_active_company(request.user)
        try:
            intent_data = create_setup_intent(company)
            return Response(intent_data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PaymentMethodDetailView(APIView):
    """
    Deletes (detaches) a payment method. Admin only.
    """
    permission_classes = [IsCompanyAdmin]

    def delete(self, request, pk):
        company = get_active_company(request.user)
        try:
            result = detach_payment_method(company, pk)
            return Response(result)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class SetDefaultPaymentMethodView(APIView):
    """
    Sets a payment method as default. Admin only.
    """
    permission_classes = [IsCompanyAdmin]

    def post(self, request, pk):
        company = get_active_company(request.user)
        try:
            result = set_default_payment_method(company, pk)
            return Response(result)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class CancelSubscriptionView(APIView):
    """
    Cancels the active subscription at period end. Admin only.
    """
    permission_classes = [IsCompanyAdmin]

    def post(self, request):
        company = get_active_company(request.user)
        try:
            result = cancel_subscription(company)
            return Response(result)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class QueueSubscriptionSwitchView(APIView):
    """
    Queues a plan switch for the next billing cycle. Admin only.
    """
    permission_classes = [IsCompanyAdmin]

    def post(self, request):
        company = get_active_company(request.user)
        plan_id = request.data.get("plan_id")
        if not plan_id:
            return Response({"error": "plan_id is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            result = queue_subscription_switch(company, plan_id)
            return Response(result)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class CancelQueuedSwitchView(APIView):
    """
    Cancels a queued plan switch. Admin only.
    """
    permission_classes = [IsCompanyAdmin]

    def post(self, request):
        company = get_active_company(request.user)
        try:
            result = cancel_queued_switch(company)
            return Response(result)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class StripeWebhookView(APIView):
    """
    Full implementation for Stripe webhooks.
    """
    permission_classes = [] # Public endpoint, signature verified

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        endpoint_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')

        if not endpoint_secret:
            # Webhooks are optional for local demo environments; rely on frontend sync-checkout instead.
            return Response({"detail": "Webhook processing disabled (no secret configured)."}, status=status.HTTP_200_OK)

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except ValueError as e:
            return Response({"detail": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError as e:
            return Response({"detail": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        # Dispatch events
        event_type = event['type']
        data_object = event['data']['object']

        from .services import (
            handle_invoice_paid,
            handle_invoice_payment_failed,
            sync_company_from_stripe_subscription
        )

        if event_type in ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted']:
            sync_company_from_stripe_subscription(data_object)
            
        elif event_type == 'invoice.paid':
            handle_invoice_paid(data_object)
            
        elif event_type == 'invoice.payment_failed':
            handle_invoice_payment_failed(data_object)
        
        return Response({"status": "success"})

class SyncCheckoutView(APIView):
    """
    Directly triggers a sync of the company's Stripe status.
    Called by frontend after successful checkout redirect.
    """
    permission_classes = [IsCompanyAdmin]

    def post(self, request):
        company = get_active_company(request.user)
        if not company:
            return Response({"detail": "No active company found."}, status=status.HTTP_404_NOT_FOUND)
        
        result = verify_and_sync_stripe_status(company)
        if result.get("status") == "error":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(result)

class InvoiceDetailView(APIView):
    """
    Returns details for a single invoice. Scoped to company.
    """
    permission_classes = [IsCompanyMember]

    def get(self, request, pk):
        company = get_active_company(request.user)
        try:
            invoice = Invoice.objects.get(pk=pk, company=company)
            serializer = InvoiceSerializer(invoice)
            return Response(serializer.data)
        except Invoice.DoesNotExist:
            return Response({"error": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)
