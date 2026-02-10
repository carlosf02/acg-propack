from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Client, UserProfile

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("client_code", "name", "is_active", "created_at")
    search_fields = ("client_code", "name", "email")
    list_filter = ("is_active",)
    ordering = ("client_code",)

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = "User Profile"

# Re-register UserAdmin to include UserProfile inline
class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)

# Unregister originally registered User and register our customized UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "client", "is_active")
    list_filter = ("role", "is_active", "client")
    search_fields = ("user__username", "user__email", "client__name")
