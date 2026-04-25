from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import requests as http_requests
import os

from .models import Wallet

@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    id_token     = request.data.get('id_token')
    access_token = request.data.get('access_token')

    if id_token:
        # verify ID token (from One Tap)
        try:
            info = google_id_token.verify_oauth2_token(
                id_token,
                google_requests.Request(),
                os.getenv('GOOGLE_CLIENT_ID'),
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=401)

        google_id = info['sub']
        email     = info['email']
        name      = info.get('name', '')
        avatar    = info.get('picture', '')

    elif access_token:
        # verify access token (from OAuth flow)
        google_resp = http_requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        if google_resp.status_code != 200:
            return Response({'error': 'Invalid Google token'}, status=401)

        info      = google_resp.json()
        google_id = info.get('sub')
        email     = info.get('email')
        name      = info.get('name', '')
        avatar    = info.get('picture', '')

    else:
        return Response({'error': 'id_token or access_token required'}, status=400)

    if not google_id or not email:
        return Response({'error': 'Could not get user info'}, status=400)

    user, created = User.objects.get_or_create(
        google_id=google_id,
        defaults={
            'username': email.split('@')[0],
            'email':    email,
            'avatar':   avatar,
        }
    )
    if not created:
        user.avatar = avatar
        user.save(update_fields=['avatar'])

    ensure_wallet(user)
    tokens = get_tokens(user)

    return Response({
        'access':  tokens['access'],
        'refresh': tokens['refresh'],
        'user': {
            'id':       user.id,
            'username': user.username,
            'email':    user.email,
            'avatar':   user.avatar,
        }
    })