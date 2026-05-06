from .base import *
import os

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
