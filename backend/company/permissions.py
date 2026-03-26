from rest_framework.permissions import BasePermission, SAFE_METHODS


def _get_member(request):
    """Helper: return the active CompanyMember for this request's user, or None."""
    from company.utils import get_active_company_member
    return get_active_company_member(request.user)


class IsCompanyMember(BasePermission):
    """
    Allows access only to users with an active CompanyMember record.
    """
    message = "You must belong to an active company to access this resource."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return _get_member(request) is not None


class IsCompanyAdmin(BasePermission):
    """
    Allows access only to company admins.
    """
    message = "Only company admins can perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        member = _get_member(request)
        return member is not None and member.role == 'admin'


class CompanyObjectPermission(BasePermission):
    """
    Unified permission for company-scoped viewsets:

    - SAFE_METHODS (GET, HEAD, OPTIONS): any active company member
    - POST / PUT / PATCH: any active company member (staff + admin)
    - DELETE: admin only

    Use `admin_only_writes = True` on the viewset to restrict ALL writes
    (POST/PUT/PATCH/DELETE) to admins only (for management endpoints like
    AssociateCompany, Office, CompanyMember).
    """
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        member = _get_member(request)
        if member is None:
            self.message = "You must belong to an active company to access this resource."
            return False

        if request.method in SAFE_METHODS:
            return True

        admin_only = getattr(view, 'admin_only_writes', False)

        if admin_only:
            if member.role != 'admin':
                self.message = "Only company admins can perform this action."
                return False
            return True

        # DELETE is always admin-only
        if request.method == 'DELETE':
            if member.role != 'admin':
                self.message = "Only company admins can delete records."
                return False

        return True
