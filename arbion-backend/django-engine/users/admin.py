from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import Wallet, KYC

User = get_user_model()


@admin.register(KYC)
class KYCAdmin(admin.ModelAdmin):
    list_display  = ['user', 'full_name', 'country', 'id_type', 'status', 'submitted_at']
    list_filter   = ['status', 'country', 'id_type']
    search_fields = ['user__username', 'full_name', 'id_number']
    readonly_fields = ['submitted_at']

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'email', 'google_id', 'is_active')
    search_fields = ('username', 'email', 'google_id')
    list_filter = ('is_active',)
    ordering = ('-id',)


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'balance')
    search_fields = ('user__username',)