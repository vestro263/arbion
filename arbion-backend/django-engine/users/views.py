from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
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


def ensure_wallet(user):
    Wallet.objects.get_or_create(user=user)


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    id_token = request.data.get('id_token')
    access_token = request.data.get('access_token')

    client_id = os.getenv('GOOGLE_CLIENT_ID')
    if not client_id:
        return Response({'error': 'Server misconfigured: missing GOOGLE_CLIENT_ID'}, status=500)

    try:
        # ── One Tap flow (ID token) ───────────────────────────────
        if id_token:
            info = google_id_token.verify_oauth2_token(
                id_token,
                google_requests.Request(),
                client_id,
            )

        # ── OAuth flow (access token) ─────────────────────────────
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

    # ── extract user data safely ──────────────────────────────────
    google_id = info.get('sub')
    email     = info.get('email')
    name      = info.get('name', '')
    avatar    = info.get('picture', '')

    if not google_id or not email:
        return Response({'error': 'Could not retrieve user info from Google'}, status=400)

    # ── create / get user ─────────────────────────────────────────
    username = email.split('@')[0]

    user, created = User.objects.get_or_create(
        google_id=google_id,
        defaults={
            'username': username,
            'email': email,
            'avatar': avatar,
        }
    )

    if not created:
        # update avatar if changed
        if avatar and user.avatar != avatar:
            user.avatar = avatar
            user.save(update_fields=['avatar'])

    # ── ensure wallet exists ──────────────────────────────────────
    ensure_wallet(user)

    # ── generate JWT tokens ───────────────────────────────────────
    tokens = get_tokens(user)

    return Response({
        'access': tokens['access'],
        'refresh': tokens['refresh'],
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'avatar': user.avatar,
        }
    })