from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import Wallet

User = get_user_model()


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