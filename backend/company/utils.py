from .models import CompanyMember

def get_active_company_member(user):
    """
    Returns the first active CompanyMember for the given user, or None.
    """
    if not user.is_authenticated:
        return None
        
    return CompanyMember.objects.filter(user=user, is_active=True).first()

def get_active_company(user):
    """
    Returns the Company for the first active CompanyMember, or raises PermissionDenied.
    For superusers with no membership, falls back to the first available company.
    """
    member = get_active_company_member(user)
    if member and member.company:
        return member.company
        
    if user.is_authenticated and getattr(user, 'is_superuser', False):
        from .models import Company
        company = Company.objects.first()
        if company:
            return company

    from rest_framework.exceptions import PermissionDenied
    raise PermissionDenied("You must belong to an active company to perform this operation.")


def get_company_from_serializer_context(context):
    """
    Extracts the active company from a DRF serializer's context dict.
    Returns None if the request is not available in context (e.g. in tests
    that instantiate serializers without a request).
    """
    request = context.get('request')
    if request:
        return get_active_company(request.user)
    return None
