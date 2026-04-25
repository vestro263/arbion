from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import requests as http_requests
import os

from .models import Wallet

User = get_user_model()


def get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def ensure_wallets(user):
    # create both demo and real wallets on signup
    Wallet.objects.get_or_create(user=user, account_type='demo',
                                 defaults={'balance': 10000})
    Wallet.objects.get_or_create(user=user, account_type='real',
                                 defaults={'balance': 0})


def user_payload(user):
    demo_wallet = user.wallets.filter(account_type='demo').first()
    real_wallet = user.wallets.filter(account_type='real').first()
    return {
        'id':             user.id,
        'username':       user.username,
        'email':          user.email,
        'avatar':         user.avatar,
        'active_account': user.active_account,
        'demo_balance':   str(demo_wallet.balance) if demo_wallet else '10000.00',
        'real_balance':   str(real_wallet.balance) if real_wallet else '0.00',
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    id_token    = request.data.get('id_token')
    access_token = request.data.get('access_token')

    client_id = os.getenv('GOOGLE_CLIENT_ID')
    if not client_id:
        return Response({'error': 'Server misconfigured: missing GOOGLE_CLIENT_ID'}, status=500)

    try:
        if id_token:
            info = google_id_token.verify_oauth2_token(
                id_token, google_requests.Request(), client_id)
        elif access_token:
            google_resp = http_requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            if google_resp.status_code != 200:
                return Response({'error': 'Invalid Google token'}, status=401)
            info = google_resp.json()
        else:
            return Response({'error': 'id_token or access_token required'}, status=400)
    except Exception as e:
        return Response({'error': str(e)}, status=401)

    google_id = info.get('sub')
    email     = info.get('email')
    avatar    = info.get('picture', '')

    if not google_id or not email:
        return Response({'error': 'Could not retrieve user info from Google'}, status=400)

    username = email.split('@')[0]
    user, created = User.objects.get_or_create(
        google_id=google_id,
        defaults={'username': username, 'email': email, 'avatar': avatar}
    )

    if not created and avatar and user.avatar != avatar:
        user.avatar = avatar
        user.save(update_fields=['avatar'])

    ensure_wallets(user)
    tokens = get_tokens(user)

    return Response({
        'access':  tokens['access'],
        'refresh': tokens['refresh'],
        'user':    user_payload(user),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    username = request.data.get('username', '').strip()
    email    = request.data.get('email', '').strip()
    password = request.data.get('password', '').strip()

    if not username or not password:
        return Response({"error": "Username and password are required"}, status=400)
    if len(password) < 6:
        return Response({"error": "Password must be at least 6 characters"}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already taken"}, status=400)
    if email and User.objects.filter(email=email).exists():
        return Response({"error": "Email already registered"}, status=400)

    try:
        user = User.objects.create_user(username=username, email=email, password=password)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

    ensure_wallets(user)
    tokens = get_tokens(user)

    return Response({
        "access":  tokens["access"],
        "refresh": tokens["refresh"],
        "user":    user_payload(user),
    }, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def switch_account(request):
    account_type = request.data.get('account_type')
    if account_type not in ('demo', 'real'):
        return Response({'error': 'Invalid account type'}, status=400)

    request.user.active_account = account_type
    request.user.save(update_fields=['active_account'])

    return Response({'active_account': account_type, 'user': user_payload(request.user)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(user_payload(request.user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_demo(request):
    wallet = request.user.wallets.filter(account_type='demo').first()
    if wallet:
        wallet.balance = 10000
        wallet.save()
    return Response({'demo_balance': '10000.00'})