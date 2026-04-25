from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db import models


class User(AbstractUser):
    avatar    = models.URLField(blank=True, null=True)
    google_id = models.CharField(max_length=128, blank=True, null=True, unique=True)

    # active account type — what the user is currently trading on
    active_account = models.CharField(
        max_length=10,
        choices=[('demo', 'Demo'), ('real', 'Real')],
        default='demo'
    )

    def __str__(self):
        return self.username


class Wallet(models.Model):
    ACCOUNT_TYPES = [('demo', 'Demo'), ('real', 'Real')]

    user         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wallets',
    )
    account_type = models.CharField(max_length=10, choices=ACCOUNT_TYPES, default='demo')
    balance      = models.DecimalField(max_digits=20, decimal_places=2, default=10000)

    class Meta:
        unique_together = ('user', 'account_type')  # one demo + one real per user

    def __str__(self):
        return f"{self.user.username} [{self.account_type}] — ${self.balance}"