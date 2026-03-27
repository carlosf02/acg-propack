from django.urls import path
from . import views

urlpatterns = [
    path('summary/', views.BillingSummaryView.as_view(), name='billing-summary'),
    path('subscription-intent/', views.CreateSubscriptionIntentView.as_view(), name='billing-subscription-intent'),
    path('subscribe-saved-card/', views.SubscribeSavedCardView.as_view(), name='billing-subscribe-saved-card'),
    path('portal/', views.CreatePortalSessionView.as_view(), name='billing-portal'),
    path('invoices/', views.InvoiceListView.as_view(), name='billing-invoices'),
    path('sync-checkout/', views.SyncCheckoutView.as_view(), name='sync-checkout'),
    path('payment-methods/', views.PaymentMethodListView.as_view(), name='payment-methods-list'),
    path('payment-methods/setup-intent/', views.CreateSetupIntentView.as_view(), name='payment-methods-setup-intent'),
    path('payment-methods/<str:pk>/', views.PaymentMethodDetailView.as_view(), name='payment-methods-detail'),
    path('payment-methods/<str:pk>/set-default/', views.SetDefaultPaymentMethodView.as_view(), name='payment-methods-set-default'),
    path('onboarding-session/', views.CreateOnboardingSessionView.as_view(), name='create-onboarding-session'),
    path('onboarding-session/<uuid:pk>/finalize/', views.FinalizeOnboardingView.as_view(), name='finalize-onboarding'),
    path('subscription/cancel/', views.CancelSubscriptionView.as_view(), name='billing-subscription-cancel'),
    path('subscription/queue-switch/', views.QueueSubscriptionSwitchView.as_view(), name='billing-subscription-queue-switch'),
    path('subscription/cancel-switch/', views.CancelQueuedSwitchView.as_view(), name='billing-subscription-cancel-switch'),
    path('invoices/<int:pk>/', views.InvoiceDetailView.as_view(), name='billing-invoice-detail'),
    path('invoices/<int:pk>/archive/', views.InvoiceArchiveActionView.as_view(), {'action': 'archive'}, name='billing-invoice-archive'),
    path('invoices/<int:pk>/unarchive/', views.InvoiceArchiveActionView.as_view(), {'action': 'unarchive'}, name='billing-invoice-unarchive'),
    path('webhook/', views.StripeWebhookView.as_view(), name='billing-webhook'),
]
