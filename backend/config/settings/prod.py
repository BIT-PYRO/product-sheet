from .base import *
import os
import os
from django.core.exceptions import ImproperlyConfigured

# 1. Security Enforcements
if not os.environ.get('SECRET_KEY') or os.environ.get('SECRET_KEY') == 'django-insecure-change-me':
    raise ImproperlyConfigured("SECRET_KEY environment variable must be explicitly set and secure in production.")

if not os.environ.get('JWT_SIGNING_KEY') or os.environ.get('JWT_SIGNING_KEY') == 'please-change-this-jwt-signing-key-32b':
    raise ImproperlyConfigured("JWT_SIGNING_KEY environment variable must be explicitly set and secure in production.")

# 2. Redis Caching
REDIS_URL = os.environ.get('REDIS_URL')
if not REDIS_URL:
    raise ImproperlyConfigured("REDIS_URL must be explicitly set for production caching.")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}

DEBUG = False

# Tell Django it's behind an HTTPS-terminating proxy (Render's load balancer).
# Without this, SECURE_SSL_REDIRECT sees every forwarded request as plain HTTP
# and causes an infinite redirect loop → 500.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Whitenoise for static files
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Render-specific settings
ALLOWED_HOSTS = ['*']  # Will be restricted by RENDER_EXTERNAL_HOSTNAME in base

# Allow the production frontend origin in addition to any CORS_ALLOWED_ORIGINS from env
import environ as _environ
_prod_env = _environ.Env()
_extra_cors = _prod_env.list('CORS_ALLOWED_ORIGINS_EXTRA', default=[])
CORS_ALLOWED_ORIGINS = list(CORS_ALLOWED_ORIGINS) + _extra_cors

# If GOOGLE_CALENDAR_REDIRECT_URI was not set in the environment (or fell back to the
# localhost default from base.py), derive it from FRONTEND_URL so Google always
# redirects back to the production frontend, never to localhost.
_redirect_uri = str(GOOGLE_CALENDAR_REDIRECT_URI)
if 'localhost' in _redirect_uri or '127.0.0.1' in _redirect_uri:
    GOOGLE_CALENDAR_REDIRECT_URI = FRONTEND_URL.rstrip('/') + '/api/calendar/callback/'
