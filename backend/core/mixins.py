from company.permissions import CompanyObjectPermission


class CompanyScopedViewSetMixin:
    """
    Mixin for ViewSets to automatically scope queries and creations to the
    active company, and enforce company-wide RBAC via CompanyObjectPermission.
    """
    permission_classes = [CompanyObjectPermission]

    def get_company(self):
        from company.utils import get_active_company
        return get_active_company(self.request.user)

    def get_queryset(self):
        """
        Filter the queryset to objects belonging to the current user's active company.
        """
        company = self.get_company()
        queryset = super().get_queryset()
        return queryset.filter(company=company)

    def perform_create(self, serializer):
        """
        Automatically set the company to the current user's active company on creation.
        """
        company = self.get_company()
        serializer.save(company=company)
