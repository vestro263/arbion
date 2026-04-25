from django.urls import path
from .views import get_balance

urlpatterns = [
    path('balance/', get_balance),
]