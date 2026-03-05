from django.db import models
from django.conf import settings

class Company(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Companies"

class CompanyMember(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('staff', 'Staff'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="company_memberships")
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="members")
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='staff')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'company')

    def __str__(self):
        return f"{self.user} - {self.company.name} ({self.role})"


class AssociateCompany(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="associates")
    name = models.CharField(max_length=255)
    partner_type = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Associate Companies"
        unique_together = ('company', 'name')

    def __str__(self):
        return f"{self.name} ({self.company.name})"


class Office(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    address1 = models.CharField(max_length=255, blank=True)
    address2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, null=True, blank=True, related_name="offices"
    )
    associate_company = models.ForeignKey(
        AssociateCompany, on_delete=models.CASCADE, null=True, blank=True, related_name="offices"
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(company__isnull=False, associate_company__isnull=True) |
                    models.Q(company__isnull=True, associate_company__isnull=False)
                ),
                name='office_must_have_company_or_associate',
                violation_error_message="Office must belong to exactly one: company or associate_company"
            )
        ]

    def clean(self):
        if self.company and self.associate_company:
            from django.core.exceptions import ValidationError
            raise ValidationError("Office cannot belong to both a company and an associate_company.")
        if not self.company and not self.associate_company:
            from django.core.exceptions import ValidationError
            raise ValidationError("Office must belong to either a company or an associate_company.")

    def __str__(self):
        owner = self.company.name if self.company else self.associate_company.name
        return f"{self.name} ({owner})"
