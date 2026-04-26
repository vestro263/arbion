from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db import models


class User(AbstractUser):
    avatar    = models.URLField(blank=True, null=True)
    google_id = models.CharField(max_length=128, blank=True, null=True, unique=True)

    active_account = models.CharField(
        max_length=10,
        choices=[('demo', 'Demo'), ('real', 'Real')],
        default='demo'
    )

    def __str__(self):
        return self.username

import random

class Wallet(models.Model):
    ACCOUNT_TYPES = [('demo', 'Demo'), ('real', 'Real')]

    user         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wallets',
    )
    account_type   = models.CharField(max_length=10, choices=ACCOUNT_TYPES, default='demo')
    balance        = models.DecimalField(max_digits=20, decimal_places=2, default=10000)
    account_number = models.CharField(max_length=20, unique=True, blank=True, null=True)

    class Meta:
        unique_together = ('user', 'account_type')

    def __str__(self):
        return f"{self.user.username} [{self.account_type}] — ${self.balance}"

class KYC(models.Model):
    ID_TYPES = [
        ('passport',    'Passport'),
        ('national_id', 'National ID'),
        ('drivers',     "Driver's License"),
    ]

    STATUS = [
        ('pending',  'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user        = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='kyc'
    )

    # personal
    full_name   = models.CharField(max_length=200)
    dob         = models.DateField()
    country     = models.CharField(max_length=100)
    phone       = models.CharField(max_length=30)

    # identity document
    id_type     = models.CharField(max_length=20, choices=ID_TYPES)
    id_number   = models.CharField(max_length=100)

    # address (optional)
    address     = models.CharField(max_length=255, blank=True, null=True)
    city        = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20,  blank=True, null=True)

    # status — admin can approve/reject from Django admin
    status      = models.CharField(max_length=10, choices=STATUS, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at  = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} — KYC [{self.status}]"