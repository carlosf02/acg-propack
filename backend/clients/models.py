from django.db import models
from django.conf import settings
from core.models import TimeStampedModel

class Client(TimeStampedModel):
    client_code = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    
    # Default Address
    default_address_line1 = models.CharField(max_length=255, blank=True, null=True)
    default_address_line2 = models.CharField(max_length=255, blank=True, null=True)
    default_city = models.CharField(max_length=100, blank=True, null=True)
    default_state = models.CharField(max_length=100, blank=True, null=True)
    default_zip = models.CharField(max_length=20, blank=True, null=True)
    
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.client_code} - {self.name}"

class UserRole(models.TextChoices):
    ADMIN = "ADMIN", "Admin"
    STAFF = "STAFF", "Staff"
    CLIENT = "CLIENT", "Client"


class UserProfile(TimeStampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.CLIENT)
    client = models.ForeignKey(Client, on_delete=models.SET_NULL, null=True, blank=True, related_name="users")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"
