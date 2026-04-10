from django.db import models
from django.conf import settings
from core.models import TimeStampedModel


class ClientType(models.TextChoices):
    PERSON = "person", "Person"
    COMPANY = "company", "Company"


class Client(TimeStampedModel):
    company = models.ForeignKey(
        'company.Company',
        on_delete=models.PROTECT,
        related_name="clients",
    )
    associate_company = models.ForeignKey(
        'company.AssociateCompany',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clients",
        help_text="Agency this client belongs to — used to attribute billing per agency.",
    )
    client_code = models.CharField(max_length=20, unique=True, db_index=True, blank=True)
    client_type = models.CharField(
        max_length=20,
        choices=ClientType.choices,
        default=ClientType.PERSON,
    )
    name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    # cellphone is the primary mobile contact
    cellphone = models.CharField(max_length=50, blank=True, null=True)
    # phone kept for backwards compat; home_phone maps to UI "Home Phone / Company Phone"
    phone = models.CharField(max_length=50, blank=True, null=True)
    home_phone = models.CharField(max_length=50, blank=True, null=True)

    # Address — single-line address field to match UI "Address" input
    address = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)

    # Legacy multi-line address fields kept for backward compat (not removed)
    default_address_line1 = models.CharField(max_length=255, blank=True, null=True)
    default_address_line2 = models.CharField(max_length=255, blank=True, null=True)
    default_city = models.CharField(max_length=100, blank=True, null=True)
    default_state = models.CharField(max_length=100, blank=True, null=True)
    default_zip = models.CharField(max_length=20, blank=True, null=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.client_code} - {self.name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Auto-generate client_code after first insert if not provided
        if not self.client_code:
            company_id = self.company_id or 0
            self.client_code = f"CL-{company_id}-{self.pk:06d}"
            Client.objects.filter(pk=self.pk).update(client_code=self.client_code)


class UserRole(models.TextChoices):
    ADMIN = "ADMIN", "Admin"
    STAFF = "STAFF", "Staff"
    CLIENT = "CLIENT", "Client"


class UserProfile(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.CLIENT)
    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    is_active = models.BooleanField(default=True)
    must_change_password = models.BooleanField(
        default=False,
        help_text="Set to True when a temporary password has been issued. Cleared after first-login password change.",
    )
    profile_completed = models.BooleanField(
        default=False,
        help_text="Set to True after the client completes the onboarding profile/address step.",
    )
    notifications_configured = models.BooleanField(
        default=False,
        help_text="Set to True after the client completes the onboarding notification preferences step.",
    )

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class ClientNotificationPreferences(TimeStampedModel):
    """Notification preferences for a client user, set during onboarding Step 3."""
    client = models.OneToOneField(
        Client,
        on_delete=models.CASCADE,
        related_name="notification_prefs",
    )
    notify_warehouse_receipt = models.BooleanField(default=True, help_text="Notify when a warehouse receipt is created.")
    notify_repack = models.BooleanField(default=True, help_text="Notify when a repack is created.")
    notify_consolidation = models.BooleanField(default=True, help_text="Notify when a consolidation is created.")
    notify_arrived = models.BooleanField(default=True, help_text="Notify when a package arrives / is ready for pickup.")
    notify_shipment_dispatched = models.BooleanField(default=True, help_text="Notify when a shipment is dispatched.")

    def __str__(self):
        return f"NotificationPrefs({self.client})"
