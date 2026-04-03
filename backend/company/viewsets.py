from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q

from .models import AssociateCompany, Company, CompanyMember, Office
from .serializers import (
    AssociateCompanySerializer,
    CompanyCreateSerializer,
    CompanyMemberAddSerializer,
    CompanyMemberSerializer,
    CompanySerializer,
    OfficeSerializer,
)
from .permissions import CompanyObjectPermission, IsCompanyAdmin, IsCompanyMember
from .utils import get_active_company, get_active_company_member


# ── Company Bootstrap ─────────────────────────────────────────────────────────

class CompanyViewSet(viewsets.GenericViewSet):
    """
    POST /api/v1/companies/  — Create a new Company and become its admin.
    """
    serializer_class = CompanyCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        company = Company.objects.create(name=serializer.validated_data['name'])
        member = CompanyMember.objects.create(
            user=request.user,
            company=company,
            role='admin',
            is_active=True,
        )
        return Response(
            {
                "company": CompanySerializer(company).data,
                "membership": CompanyMemberSerializer(member).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ── Company Member Management ─────────────────────────────────────────────────

class CompanyMemberViewSet(viewsets.GenericViewSet):
    """
    GET  /api/v1/company/members/       — List members (admin-only)
    POST /api/v1/company/members/       — Add a member by username/email (admin-only)
    PATCH /api/v1/company/members/{id}/ — Update role / deactivate (admin-only)
    """
    permission_classes = [IsCompanyAdmin]

    def get_queryset(self):
        company = get_active_company(self.request.user)
        return CompanyMember.objects.filter(company=company).select_related('user')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return Response(CompanyMemberSerializer(qs, many=True).data)

    def create(self, request, *args, **kwargs):
        company = get_active_company(request.user)
        serializer = CompanyMemberAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        role = serializer.validated_data['role']

        member, created = CompanyMember.objects.get_or_create(
            user=user,
            company=company,
            defaults={'role': role, 'is_active': True},
        )
        if not created:
            if member.is_active:
                return Response(
                    {"detail": "This user is already an active member of your company."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Re-activate
            member.role = role
            member.is_active = True
            member.save()

        return Response(CompanyMemberSerializer(member).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        company = get_active_company(request.user)
        try:
            member = CompanyMember.objects.get(pk=kwargs['pk'], company=company)
        except CompanyMember.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CompanyMemberSerializer(member, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Guard: prevent deactivating the last active admin
        new_role = serializer.validated_data.get('role', member.role)
        new_is_active = serializer.validated_data.get('is_active', member.is_active)

        if member.role == 'admin' and (new_role != 'admin' or not new_is_active):
            active_admins = CompanyMember.objects.filter(
                company=company, role='admin', is_active=True
            ).count()
            if active_admins <= 1:
                return Response(
                    {"detail": "Cannot remove or demote the last active admin of the company."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer.save()
        return Response(serializer.data)


# ── Associate Company ─────────────────────────────────────────────────────────

class AssociateCompanyViewSet(viewsets.ModelViewSet):
    serializer_class = AssociateCompanySerializer
    permission_classes = [CompanyObjectPermission]
    admin_only_writes = True  # flag checked by CompanyObjectPermission

    def get_queryset(self):
        company = get_active_company(self.request.user)
        return AssociateCompany.objects.filter(company=company, is_active=True)

    def perform_create(self, serializer):
        company = get_active_company(self.request.user)
        serializer.save(company=company)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


# ── Office ────────────────────────────────────────────────────────────────────

class OfficeViewSet(viewsets.ModelViewSet):
    serializer_class = OfficeSerializer
    permission_classes = [CompanyObjectPermission]
    admin_only_writes = True

    def get_queryset(self):
        company = get_active_company(self.request.user)
        queryset = Office.objects.filter(
            Q(company=company) | Q(associate_company__company=company),
            is_active=True,
        )

        filter_type = self.request.query_params.get('type')
        if filter_type == 'own':
            queryset = queryset.filter(company=company)

        associate_id = self.request.query_params.get('associate_company_id')
        if associate_id:
            queryset = queryset.filter(associate_company_id=associate_id)

        return queryset

    def perform_create(self, serializer):
        company = get_active_company(self.request.user)

        associate_company_id = self.request.data.get('associate_company')
        if associate_company_id:
            try:
                assoc = AssociateCompany.objects.get(id=int(associate_company_id), company=company)
                serializer.save(associate_company=assoc, company=None)
            except (AssociateCompany.DoesNotExist, ValueError, TypeError):
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"associate_company": "Invalid associate company."})
        else:
            serializer.save(company=company, associate_company=None)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
