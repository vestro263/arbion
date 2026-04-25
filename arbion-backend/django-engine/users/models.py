from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db import models


class User(AbstractUser):
    avatar    = models.URLField(blank=True, null=True)
    google_id = models.CharField(max_length=128, blank=True, null=True, unique=True)

    def __str__(self):
        return self.username


class Wallet(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wallet',
    )
    balance = models.DecimalField(max_digits=20, decimal_places=2, default=10000)

    def __str__(self):
        return f"{self.user.username} — ${self.balance}"