import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
import dj_database_url

# Load .env
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# 🔐 SECURITY
SECRET_KEY = "b1e982220f0465a229c04294ac75a9eef9da7d16663cc7f719c920cf47aa55e3"


SIMPLE_JWT = {
    "ALGORITHM": "HS256",
    "SIGNING_KEY": "b1e982220f0465a229c04294ac75a9eef9da7d16663cc7f719c920cf47aa55e3",  # 👈 FORCE SAME VALUE
}

DEBUG = False

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'https://arbion-jpg.onrender.com',
'arbion-jpg.onrender.com',
]

# replace CORS_ALLOW_ALL_ORIGINS = True with specific origins in production
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'https://arbion-jpg.onrender.com',
]

# One Tap specifically needs this — it sends cookies
CORS_ALLOW_CREDENTIALS = True

# One Tap sends a POST with a credential — needs these headers
CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'x-node-secret',
]


# ── Google OAuth ──────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')

# 📦 INSTALLED APPS
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # third-party
    'rest_framework',
    'corsheaders',

    # local apps
    'users',
    'trades',
]




# ⚙️ MIDDLEWARE
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',

    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',

'whitenoise.middleware.WhiteNoiseMiddleware',

    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',

    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# 🌐 URLS
ROOT_URLCONF = 'core.urls'


# 🎨 TEMPLATES (default)
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# 🚀 WSGI
WSGI_APPLICATION = 'core.wsgi.application'




DATABASES = {
    'default': dj_database_url.config(
        default=os.getenv('DATABASE_URL'),
        conn_max_age=600,
    )
}


# 🔑 PASSWORD VALIDATION
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# 🌍 INTERNATIONAL
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

AUTH_USER_MODEL = 'users.User'

# 🌐 CORS (for React + Node)
CORS_ALLOW_ALL_ORIGINS = True


# ⚡ DJANGO REST FRAMEWORK
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    )
}


# 🔑 JWT CONFIG (IMPORTANT FOR NODE INTEGRATION)
SIMPLE_JWT = {
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "AUTH_HEADER_TYPES": ("Bearer",),
}


# 🚀 REDIS (for later scaling)
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")


# 💰 TRADING CONFIG (you’ll use this soon)
MAX_TRADE_AMOUNT = 10000
MIN_TRADE_AMOUNT = 1


# 🔚 DEFAULT PK
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'