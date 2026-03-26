import pytest
import json
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from company.models import Company, CompanyMember
from django.contrib.auth.models import User
from unittest.mock import patch, MagicMock

@pytest.fixture
def company():
    return Company.objects.create(
        name="Test Corp",
        stripe_customer_id="cus_test_123"
    )

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
class TestBillingWebhooks:
    
    @patch('stripe.Webhook.construct_event')
    def test_webhook_signature_verification_fail(self, mock_construct, api_client):
        import stripe
        from django.conf import settings
        mock_construct.side_effect = stripe.error.SignatureVerificationError("Invalid signature", "sig_header")
        
        url = reverse('billing-webhook')
        with patch.object(settings, 'STRIPE_WEBHOOK_SECRET', 'whsec_test'):
            response = api_client.post(
                url,
                data=json.dumps({"id": "evt_123"}),
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='invalid_sig'
            )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch('stripe.Webhook.construct_event')
    @patch('stripe.Subscription.retrieve')
    def test_subscription_updated_syncs_company(self, mock_retrieve, mock_construct, api_client, company):
        from django.conf import settings
        # Mock Stripe event
        mock_event = {
            'type': 'customer.subscription.updated',
            'data': {
                'object': {
                    'id': 'sub_test_456',
                    'customer': 'cus_test_123',
                    'status': 'active',
                    'current_period_end': 1711200000,
                    'items': {'data': [{'plan': {'nickname': 'Pro Plan', 'id': 'price_123'}}]}
                }
            }
        }
        mock_construct.return_value = mock_event
        
        url = reverse('billing-webhook')
        with patch.object(settings, 'STRIPE_WEBHOOK_SECRET', 'whsec_test'):
            response = api_client.post(
                url,
                data=json.dumps(mock_event),
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='valid_sig'
            )
        
        assert response.status_code == status.HTTP_200_OK
        
        company.refresh_from_db()
        assert company.subscription_status == 'active'
        assert company.stripe_subscription_id == 'sub_test_456'
        assert company.subscription_plan == 'Pro Plan'

    @patch('stripe.Invoice.list')
    @patch('stripe.Subscription.list')
    def test_verify_and_sync_stripe_status(self, mock_sub_list, mock_inv_list, company):
        from .services import verify_and_sync_stripe_status
        
        # Mock Subscription retrieval
        mock_sub = {
            'id': 'sub_test_456',
            'customer': 'cus_test_123',
            'status': 'active',
            'current_period_end': 1711200000,
            'items': {'data': [{'plan': {'nickname': 'Pro Plan', 'id': 'price_123'}}]}
        }
        
        # Mock Invoice retrieval
        mock_inv = {
            'id': 'in_test_789',
            'customer': 'cus_test_123',
            'amount_paid': 2000,
            'currency': 'usd',
            'status': 'paid',
            'hosted_invoice_url': 'https://pay.stripe.com/receipts/123',
            'created': 1711200000
        }
        
        # Setup mocks
        mock_sub_list.return_value = MagicMock(data=[mock_sub])
        mock_inv_list.return_value = MagicMock(data=[mock_inv])

        # Execute
        result = verify_and_sync_stripe_status(company)
        assert result['status'] == 'success'
        
        # Verify Company updated
        company.refresh_from_db()
        assert company.subscription_status == 'active'
        assert company.stripe_subscription_id == 'sub_test_456'
        
        # Verify Invoice created
        assert company.invoices.count() == 1
        invoice = company.invoices.first()
        assert invoice.stripe_invoice_id == 'in_test_789'
        assert invoice.amount_paid == 20.00

    @patch('billing.services.get_active_subscription')
    @patch('stripe.Subscription.create')
    @patch('stripe.Customer.create')
    def test_create_subscription_intent(self, mock_customer_create, mock_sub_create, mock_get_sub, api_client, company):
        mock_get_sub.return_value = None
        from django.conf import settings
        from django.contrib.auth.models import User
        from company.models import CompanyMember
        
        # Mock Customer create
        mock_customer_create.return_value = MagicMock(id='cus_test_123')
        
        # Mock Subscription create
        mock_sub = MagicMock()
        mock_sub.id = 'sub_test_456'
        mock_sub.latest_invoice.payment_intent.client_secret = 'pi_test_secret_123'
        mock_sub_create.return_value = mock_sub
        
        # Create and authenticate user
        user = User.objects.create_user(username='admin_user', password='password')
        CompanyMember.objects.create(user=user, company=company, role='admin')
        api_client.force_authenticate(user=user)
        
        # Ensure price ID is set for test
        with patch.object(settings, 'STRIPE_PRICE_ID_BASIC', 'price_123'):
            url = reverse('billing-subscription-intent')
            response = api_client.post(url)
            
            assert response.status_code == status.HTTP_200_OK
            assert response.data['subscriptionId'] == 'sub_test_456'
    @patch('billing.services.get_active_subscription')
    @patch('stripe.Subscription.create')
    @patch('stripe.Customer.create')
    def test_create_subscription_intent_with_plan(self, mock_customer_create, mock_sub_create, mock_get_sub, api_client, company):
        mock_get_sub.return_value = None
        from django.conf import settings
        from django.contrib.auth.models import User
        from company.models import CompanyMember
        
        # Mock Customer create
        mock_customer_create.return_value = MagicMock(id='cus_test_123')
        
        # Mock Subscription create
        mock_sub = MagicMock()
        mock_sub.id = 'sub_pro_123'
        mock_sub.latest_invoice.payment_intent.client_secret = 'pi_pro_secret'
        mock_sub_create.return_value = mock_sub
        
        # Create and authenticate user
        user = User.objects.create_user(username='admin_user_pro', password='password')
        CompanyMember.objects.create(user=user, company=company, role='admin')
        api_client.force_authenticate(user=user)
        
        # Test Pro Plan
        with patch.object(settings, 'STRIPE_PRICE_ID_PRO', 'price_pro_456', create=True):
            url = reverse('billing-subscription-intent')
            response = api_client.post(url, data={'plan_type': 'pro'}, format='json')
            
            assert response.status_code == status.HTTP_200_OK
            assert response.data['subscriptionId'] == 'sub_pro_123'
            
            # Verify correct price was used
            mock_sub_create.assert_called_with(
                customer='cus_test_123',
                items=[{'price': 'price_pro_456'}],
                payment_behavior='default_incomplete',
                expand=['latest_invoice.payment_intent'],
                payment_settings={'save_default_payment_method': 'on_subscription'}
            )

    @patch('billing.services.get_active_subscription')
    @patch('stripe.Subscription.create')
    @patch('stripe.Customer.retrieve')
    def test_subscribe_saved_card(self, mock_customer_retrieve, mock_sub_create, mock_get_sub, api_client, company):
        mock_get_sub.return_value = None
        from django.conf import settings
        from django.contrib.auth.models import User
        from company.models import CompanyMember
        
        # Mock Customer retrieve with default PM
        mock_customer = MagicMock()
        mock_customer.invoice_settings.default_payment_method = 'pm_test_card'
        mock_customer_retrieve.return_value = mock_customer
        
        # Mock Subscription create
        mock_sub = MagicMock()
        mock_sub.id = 'sub_saved_123'
        mock_sub.status = 'active'
        mock_sub.get.side_effect = lambda k, default=None: {'id': 'sub_saved_123', 'status': 'active', 'customer': 'cus_test_123'}.get(k, default)
        mock_sub_create.return_value = mock_sub
        
        # Create and authenticate user
        user = User.objects.create_user(username='admin_user_saved', password='password')
        CompanyMember.objects.create(user=user, company=company, role='admin')
        api_client.force_authenticate(user=user)
        
        url = reverse('billing-subscribe-saved-card')
        with patch.object(settings, 'STRIPE_PRICE_ID_BASIC', 'price_basic_123', create=True):
            response = api_client.post(url, data={'plan_type': 'basic'}, format='json')
            
            assert response.status_code == status.HTTP_200_OK
            assert response.data['subscriptionId'] == 'sub_saved_123'
            
            # Verify correct parameters
            mock_sub_create.assert_called_with(
                customer='cus_test_123',
                items=[{'price': 'price_basic_123'}],
                default_payment_method='pm_test_card',
                off_session=True,
                confirm=True
            )

@pytest.mark.django_db
class TestStrictSubscriptionRules:
    
    @pytest.fixture
    def company(self):
        return Company.objects.create(
            name="Test Corp",
            stripe_customer_id="cus_test_123",
            stripe_subscription_id="sub_test_456",
            subscription_status="active",
            subscription_plan="Basic"
        )

    def test_cannot_queue_multiple_switches(self, company):
        from .services import queue_subscription_switch
        # First queue
        queue_subscription_switch(company, "pro")
        assert company.subscription_queued_plan == "Pro"
        
        # Second queue should fail
        with pytest.raises(ValueError, match="A plan switch is already queued"):
            queue_subscription_switch(company, "pro")

    def test_cannot_queue_switch_while_canceled(self, company):
        from .services import queue_subscription_switch
        company.subscription_cancel_at_period_end = True
        company.save()
        
        with pytest.raises(ValueError, match="Cannot queue a switch while the subscription is canceled"):
            queue_subscription_switch(company, "pro")

    @patch('stripe.Subscription.modify')
    def test_cancel_clears_queued_switch(self, mock_modify, company):
        from .services import cancel_subscription, queue_subscription_switch
        # Mock stripe modification
        mock_modify.return_value = {
            'id': 'sub_test_456',
            'customer': 'cus_test_123',
            'status': 'active',
            'cancel_at_period_end': True,
            'items': {'data': [{'plan': {'nickname': 'Basic', 'id': 'price_basic'}}]}
        }
        
        queue_subscription_switch(company, "pro")
        assert company.subscription_queued_plan == "Pro"
        
        cancel_subscription(company)
        company.refresh_from_db()
        assert company.subscription_cancel_at_period_end is True
        assert company.subscription_queued_plan is None

    def test_cannot_start_plan_while_expired(self, company):
        from .services import create_subscription_intent
        company.subscription_status = "canceled"
        company.save()
        
        with patch('billing.services.get_or_create_stripe_customer', return_value="cus_123"):
            with pytest.raises(ValueError, match="Your subscription has expired"):
                create_subscription_intent(company, "pro")

    def test_can_resume_while_canceled_but_active(self, company):
        from .services import create_subscription_intent
        # Scenario: User canceled but period hasn't ended yet
        company.subscription_status = "active"
        company.subscription_cancel_at_period_end = True
        company.save()
        
        # This should NOT raise ValueError
        with patch('billing.services.get_or_create_stripe_customer', return_value="cus_123"):
            with patch('billing.services.get_active_subscription', return_value=None):
                with patch('stripe.Subscription.create') as mock_create:
                    mock_create.return_value = MagicMock(id='sub_123', latest_invoice=None)
                    create_subscription_intent(company, "pro")
                    # Success if no exception

    def test_cannot_queue_switch_to_same_plan(self, company):
        from .services import queue_subscription_switch
        # Already on Basic (set in fixture)
        with pytest.raises(ValueError, match="Company is already on the Basic plan"):
            queue_subscription_switch(company, "basic")

@pytest.mark.django_db
class TestBillingPermissions:
    
    @pytest.fixture
    def setup_company(self):
        from company.models import CompanyMember
        from django.contrib.auth.models import User
        
        company = Company.objects.create(name="Perm Corp")
        admin_user = User.objects.create_user(username='admin_perm', password='password')
        CompanyMember.objects.create(user=admin_user, company=company, role='admin')
        
        member_user = User.objects.create_user(username='member_perm', password='password')
        CompanyMember.objects.create(user=member_user, company=company, role='member')
        
        return company, admin_user, member_user

    def test_non_admin_cannot_perform_billing_actions(self, setup_company, api_client):
        company, admin, member = setup_company
        api_client.force_authenticate(user=member)
        
        actions = [
            (reverse('billing-subscription-queue-switch'), {'plan_id': 'pro'}),
            (reverse('billing-subscription-cancel-switch'), {}),
            (reverse('billing-subscription-cancel'), {}),
            (reverse('billing-subscription-intent'), {'plan_type': 'pro'}),
            (reverse('billing-subscribe-saved-card'), {'plan_type': 'pro'}),
        ]
        
        for url, data in actions:
            response = api_client.post(url, data=data, format='json')
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert "Only company admins can perform this action" in str(response.data.get('detail', ''))

@pytest.mark.django_db
class TestBillingSummary:
    def test_billing_summary_contains_descriptive_fields(self, api_client, company):
        from django.contrib.auth.models import User
        from company.models import CompanyMember
        
        # Setup company state
        company.subscription_status = 'active'
        company.subscription_plan = 'Basic'
        company.subscription_cancel_at_period_end = False
        company.save()
        
        # Create and authenticate admin user
        user = User.objects.create_user(username='summary_admin', password='password')
        CompanyMember.objects.create(user=user, company=company, role='admin')
        api_client.force_authenticate(user=user)
        
        # Mock get_default_payment_method to return a card
        with patch('billing.views.get_default_payment_method', return_value={'brand': 'visa', 'last4': '4242', 'id': 'pm_123'}):
            url = reverse('billing-summary')
            response = api_client.get(url)
            
            assert response.status_code == status.HTTP_200_OK
            assert response.data['has_default_payment_method'] is True
            assert response.data['default_payment_method_brand'] == 'visa'
            assert response.data['default_payment_method_last4'] == '4242'
            assert response.data['auto_renew_enabled'] is True
            assert response.data['next_billing_date'] == company.subscription_current_period_end

    def test_billing_summary_auto_renew_false_when_canceled(self, api_client, company):
        from django.contrib.auth.models import User
        from company.models import CompanyMember
        
        company.subscription_cancel_at_period_end = True
        company.save()
        
        user = User.objects.create_user(username='summary_admin_2', password='password')
        CompanyMember.objects.create(user=user, company=company, role='admin')
        api_client.force_authenticate(user=user)
        
        url = reverse('billing-summary')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['auto_renew_enabled'] is False
