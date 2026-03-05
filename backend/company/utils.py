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
    """
    member = get_active_company_member(user)
    if not member or not member.company:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("You must belong to an active company to perform this operation.")
    return member.company
