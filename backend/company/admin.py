from django.contrib import admin
from .models import Company, CompanyMember, AssociateCompany, Office


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'member_count', 'created_at')
    search_fields = ('name',)

    def member_count(self, obj):
        return obj.members.filter(is_active=True).count()
    member_count.short_description = 'Active Members'


@admin.register(CompanyMember)
class CompanyMemberAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'company', 'role', 'is_active', 'created_at')
    list_filter = ('company', 'role', 'is_active')
    list_editable = ('role', 'is_active')
    search_fields = ('user__username', 'user__email', 'company__name')
    raw_id_fields = ('user',)


@admin.register(AssociateCompany)
class AssociateCompanyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'company', 'partner_type', 'is_active', 'created_at')
    list_filter = ('company', 'is_active', 'partner_type')
    list_editable = ('is_active',)
    search_fields = ('name', 'company__name')


@admin.register(Office)
class OfficeAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'owner_display', 'city', 'state', 'is_active')
    list_filter = ('is_active',)
    list_editable = ('is_active',)
    search_fields = ('name', 'company__name', 'associate_company__name', 'city')

    def owner_display(self, obj):
        if obj.company:
            return f"[Own] {obj.company.name}"
        if obj.associate_company:
            return f"[Associate] {obj.associate_company.name}"
        return "—"
    owner_display.short_description = 'Owner'
