from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Company, CompanyMember, AssociateCompany, Office

User = get_user_model()


# ── Existing serializers ──────────────────────────────────────────────────────

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'created_at', 'updated_at']


class UserMeSerializer(serializers.ModelSerializer):
    company = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    auth_role = serializers.SerializerMethodField()
    client = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'company', 'role', 'auth_role', 'client']

    def get_company(self, obj):
        from .utils import get_active_company_member
        member = get_active_company_member(obj)
        if member and member.company:
            return CompanySerializer(member.company).data
        
        # Fallback for superusers
        if getattr(obj, 'is_superuser', False):
            from .models import Company
            company = Company.objects.first()
            if company:
                return CompanySerializer(company).data
        return None

    def get_role(self, obj):
        if getattr(obj, 'is_superuser', False):
            return 'admin'
            
        from .utils import get_active_company_member
        member = get_active_company_member(obj)
        if member:
            return member.role
        return None

    def get_auth_role(self, obj):
        from .utils import get_active_company_member
        member = get_active_company_member(obj)
        if member:
            return member.role.upper()
        
        try:
            profile = obj.profile
            if profile and profile.role == "CLIENT":
                return "CLIENT"
        except Exception:
            pass
            
        return "UNKNOWN"

    def get_client(self, obj):
        try:
            profile = obj.profile
            if profile and profile.role == "CLIENT" and profile.client:
                return {
                    "id": profile.client.pk,
                    "client_code": profile.client.client_code,
                    "name": profile.client.name,
                }
        except Exception:
            pass
        return None


class AssociateCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssociateCompany
        fields = ['id', 'name', 'partner_type', 'notes', 'is_active', 'created_at', 'updated_at']


class OfficeSerializer(serializers.ModelSerializer):
    associate_company_name = serializers.CharField(source='associate_company.name', read_only=True)
    owner_type = serializers.SerializerMethodField()

    class Meta:
        model = Office
        fields = [
            'id', 'name', 'code', 'address1', 'address2', 'city', 'state', 'postal_code', 'country',
            'phone', 'email', 'is_active', 'created_at', 'updated_at',
            'company', 'associate_company', 'associate_company_name', 'owner_type'
        ]

    def get_owner_type(self, obj):
        if obj.company_id:
            return "own"
        if obj.associate_company_id:
            return "associate"
        return None


# ── Phase 4: New serializers ──────────────────────────────────────────────────

class CompanyCreateSerializer(serializers.Serializer):
    """Used for POST /api/v1/companies/ — creates a company and joins as admin."""
    name = serializers.CharField(max_length=255)

    def validate_name(self, value):
        if Company.objects.filter(name__iexact=value.strip()).exists():
            raise serializers.ValidationError("A company with this name already exists.")
        return value.strip()


class CompanyMemberSerializer(serializers.ModelSerializer):
    """Read + partial-update of a CompanyMember (role / is_active)."""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = CompanyMember
        fields = ['id', 'username', 'email', 'role', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'username', 'email', 'created_at', 'updated_at']


class CompanyMemberAddSerializer(serializers.Serializer):
    """Used for POST /api/v1/company/members/ — add existing user to company."""
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=['admin', 'staff'], default='staff')

    def validate(self, data):
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        if not username and not email:
            raise serializers.ValidationError("Provide either 'username' or 'email'.")

        qs = User.objects.all()
        if username:
            qs = qs.filter(username=username)
        else:
            qs = qs.filter(email__iexact=email)

        user = qs.first()
        if user is None:
            raise serializers.ValidationError(
                "No user found with the provided username/email. "
                "The user must already have an account."
            )
        data['user'] = user
        return data
