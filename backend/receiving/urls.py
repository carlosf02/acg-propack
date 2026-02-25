from django.urls import path
from .repack_api import ConsolidateWRAPIView

urlpatterns = [
    path('consolidate/', ConsolidateWRAPIView.as_view(), name='repack-consolidate'),
]
