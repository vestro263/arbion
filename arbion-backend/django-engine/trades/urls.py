from django.urls import path
from . import views

urlpatterns = [
    path('open/',       views.trade_open),
    path('close/',      views.trade_close),
    path('my/',         views.my_trades),
    path('my/open/',    views.my_open_trade),
]