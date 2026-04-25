from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Trade
from .serializers import TradeSerializer
import os

User = get_user_model()

NODE_SECRET = os.getenv('NODE_SECRET', 'node_internal_secret')

def verify_node(request):
    return request.headers.get('X-Node-Secret') == NODE_SECRET


# ── called by Node when trade opens ──────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def trade_open(request):
    if not verify_node(request):
        return Response({'error': 'Forbidden'}, status=403)

    d = request.data
    try:
        user = User.objects.get(id=d['userId'])
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    trade = Trade.objects.create(
        node_id     = d['tradeId'],
        user        = user,
        symbol      = d['symbol'],
        side        = d['side'],
        size        = d['size'],
        entry_price = d['entryPrice'],
        sl          = d.get('sl'),
        tp          = d.get('tp'),
        status      = 'open',
    )

    return Response(TradeSerializer(trade).data, status=201)


# ── called by Node when trade closes ─────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def trade_close(request):
    if not verify_node(request):
        return Response({'error': 'Forbidden'}, status=403)

    d = request.data
    try:
        trade = Trade.objects.get(node_id=d['tradeId'])
    except Trade.DoesNotExist:
        return Response({'error': 'Trade not found'}, status=404)

    trade.exit_price = d['exitPrice']
    trade.pnl        = d['pnl']
    trade.status     = 'closed'
    trade.closed_by  = d.get('closedBy', 'manual')
    trade.closed_at  = timezone.now()
    trade.save()

    return Response(TradeSerializer(trade).data)


# ── user fetches their own trades ─────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_trades(request):
    trades = Trade.objects.filter(user=request.user)
    return Response(TradeSerializer(trades, many=True).data)


# ── user fetches open trade ───────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_open_trade(request):
    trade = Trade.objects.filter(user=request.user, status='open').first()
    if not trade:
        return Response(None)
    return Response(TradeSerializer(trade).data)