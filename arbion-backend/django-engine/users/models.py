from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db import models


class User(AbstractUser):
    pass


class Wallet(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,   # ✅ THIS FIXES IT
        on_delete=models.CASCADE
    )
    balance = models.DecimalField(max_digits=20, decimal_places=2, default=10000)

    def __str__(self):
        return f"{self.user.username} - {self.balance}"