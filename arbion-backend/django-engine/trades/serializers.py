from rest_framework import serializers
from .models import Trade

class TradeSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model  = Trade
        fields = [
            'id', 'node_id', 'username',
            'symbol', 'side', 'size',
            'entry_price', 'exit_price',
            'sl', 'tp', 'pnl',
            'status', 'closed_by',
            'opened_at', 'closed_at',
        ]