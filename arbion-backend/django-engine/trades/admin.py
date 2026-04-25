from django.contrib import admin
from .models import Trade

@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display  = [
        'node_id', 'username', 'symbol', 'side', 'size',
        'entry_price', 'exit_price', 'pnl',
        'status', 'closed_by', 'opened_at', 'closed_at',
    ]
    list_filter   = ['status', 'side', 'symbol', 'closed_by']
    search_fields = ['user__username', 'node_id', 'symbol']
    readonly_fields = [
        'node_id', 'user', 'symbol', 'side', 'size',
        'entry_price', 'exit_price', 'sl', 'tp', 'pnl',
        'status', 'closed_by', 'opened_at', 'closed_at',
    ]
    ordering = ['-opened_at']

    def username(self, obj):
        return obj.user.username
    username.short_description = 'User'