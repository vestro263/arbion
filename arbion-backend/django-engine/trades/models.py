from django.db import models
from django.conf import settings

class Trade(models.Model):
    SIDE_CHOICES    = [('buy', 'Buy'), ('sell', 'Sell')]
    STATUS_CHOICES  = [('open', 'Open'), ('closed', 'Closed')]
    CLOSED_BY       = [('manual', 'Manual'), ('sl', 'Stop Loss'), ('tp', 'Take Profit')]

    # identity
    node_id     = models.CharField(max_length=64, unique=True)  # UUID from Node
    user        = models.ForeignKey(
                    settings.AUTH_USER_MODEL,
                    on_delete=models.CASCADE,
                    related_name='trades'
                  )

    # trade details
    symbol      = models.CharField(max_length=20)
    side        = models.CharField(max_length=4,  choices=SIDE_CHOICES)
    size        = models.DecimalField(max_digits=20, decimal_places=4)
    entry_price = models.DecimalField(max_digits=20, decimal_places=8)
    exit_price  = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    sl          = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    tp          = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    pnl         = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)

    # state
    status      = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    closed_by   = models.CharField(max_length=10, choices=CLOSED_BY,      null=True, blank=True)

    # timestamps
    opened_at   = models.DateTimeField(auto_now_add=True)
    closed_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-opened_at']

    def __str__(self):
        return f"{self.user.username} {self.side} {self.symbol} @ {self.entry_price}"