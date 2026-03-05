from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CurrentUserView
from .viewsets import CompanyViewSet, CompanyMemberViewSet

router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'company/members', CompanyMemberViewSet, basename='company-member')

urlpatterns = [
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('', include(router.urls)),
]
