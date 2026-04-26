from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views


urlpatterns = [
    path('signup/',         views.signup),
    path('auth/google/',    views.google_auth),
    path('me/',             views.me),
    path('switch-account/', views.switch_account),
    path('reset-demo/',     views.reset_demo),
    path('kyc/',            views.submit_kyc),
    path('kyc/status/',     views.kyc_status),
]