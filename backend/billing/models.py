from django.db import models
from django.conf import settings
import uuid
from company.models import Company

class OnboardingSession(models.Model):
    """
    Temporary storage for company/admin details during the checkout flow.
    Accounts are created only after successful payment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Company details
    company_name = models.CharField(max_length=255)
    
    # Admin user details
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    username = models.CharField(max_length=150)
    password_hash = models.CharField(max_length=255)  # Store hashed password
    
    # Selection
    plan_id = models.CharField(max_length=50)
    
    # Stripe IDs
    stripe_customer_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, null=True, blank=True)
    
    # Status
    status = models.CharField(max_length=20, default='pending')  # pending, completed, failed
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Onboarding: {self.company_name} ({self.email})"

class Invoice(models.Model):
    """
    Local snapshot of a Stripe Invoice.
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='invoices')
    stripe_invoice_id = models.CharField(max_length=255, unique=True)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10)
    status = models.CharField(max_length=50)
    hosted_invoice_url = models.URLField(max_length=1000, null=True, blank=True)
    plan_name = models.CharField(max_length=100, null=True, blank=True)
    payment_method_details = models.CharField(max_length=100, null=True, blank=True)
    period_start = models.DateTimeField(null=True, blank=True)
    period_end = models.DateTimeField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField()
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invoice {self.stripe_invoice_id} - {self.company.name}"
