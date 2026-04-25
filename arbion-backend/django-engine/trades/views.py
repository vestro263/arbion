from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Trade
from .serializers import TradeSerializer
import os

User = get_user_model()

NODE_SECRET = os.getenv('NODE_SECRET', 'node_internal_secret')

def verify_node(request):
    return request.headers.get('X-Node-Secret') == NODE_SECRET


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
        node_id      = d['tradeId'],
        user         = user,
        account_type = d.get('account_type', user.active_account),  # ← from Node
        symbol       = d['symbol'],
        side         = d['side'],
        size         = d['size'],
        entry_price  = d['entryPrice'],
        sl           = d.get('sl'),
        tp           = d.get('tp'),
        status       = 'open',
    )

    return Response(TradeSerializer(trade).data, status=201)


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

    # ── update wallet balance ──────────────────────────────────────
    pnl = float(d['pnl'])
    wallet = trade.user.wallets.filter(account_type=trade.account_type).first()
    if wallet:
        wallet.balance = float(wallet.balance) + pnl
        wallet.save()

    return Response(TradeSerializer(trade).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_trades(request):
    account_type = request.query_params.get('account', request.user.active_account)
    trades = Trade.objects.filter(user=request.user, account_type=account_type)
    return Response(TradeSerializer(trades, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_open_trade(request):
    account_type = request.query_params.get('account', request.user.active_account)
    trade = Trade.objects.filter(
        user=request.user, status='open', account_type=account_type
    ).first()
    if not trade:
        return Response(None)
    return Response(TradeSerializer(trade).data)