from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Wallet

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_balance(request):
    wallet = Wallet.objects.get(user=request.user)
    return Response({
        "balance": wallet.balance
    })