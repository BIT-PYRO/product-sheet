from datetime import timedelta
import os
from pathlib import Path

import dj_database_url
import environ
from celery.schedules import crontab
from django.core.exceptions import ImproperlyConfigured

# Allow OAuth token scope changes (e.g. when include_granted_scopes returns extra scopes)
os.environ.setdefault('OAUTHLIB_RELAX_TOKEN_SCOPE', '1')
# Allow OAuth over HTTP in local development (google-auth-oauthlib requires HTTPS otherwise)
_debug_mode = os.environ.get('DEBUG', os.environ.get('DJANGO_DEBUG', 'false')).lower() not in ('false', '0', '')
if _debug_mode:
    os.environ.setdefault('OAUTHLIB_INSECURE_TRANSPORT', '1')


BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env')


SECRET_KEY = env('SECRET_KEY', default=env('DJANGO_SECRET_KEY', default='django-insecure-change-me'))
DEBUG = env.bool('DEBUG', default=env.bool('DJANGO_DEBUG', default=False))
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=env.list('DJANGO_ALLOWED_HOSTS', default=['127.0.0.1', 'localhost']))
RENDER_EXTERNAL_HOSTNAME = env('RENDER_EXTERNAL_HOSTNAME', default='').strip()
if RENDER_EXTERNAL_HOSTNAME and RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'django_filters',
    'drf_spectacular',
    'common',
    'core_permissions',
    'core_tenants',
    'platform_admin',
    'accounts',
    'products',
    'jobs',
    'inventory',
    'workforce',
    'kyc',
    'drafts',
    'orders',
    'customers',
    'designers',
    'saas_billing',
    'findings',
    'accounting',
    'core.mydesk',
    'calendar_integration',
    'hr',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core_tenants.middleware.TenantContextMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'saas_billing.middleware.SaaSEnforcementMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'


DATABASE_URL = env('DATABASE_URL', default='').strip()
DATABASE_CONN_MAX_AGE = env.int('POSTGRES_CONN_MAX_AGE', default=60)
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=DATABASE_CONN_MAX_AGE,
            ssl_require=env.bool('DATABASE_SSL_REQUIRE', default=not DEBUG),
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env('DB_NAME', default=env('POSTGRES_DB', default='product_sheet_design')),
            'USER': env('DB_USER', default=env('POSTGRES_USER', default='postgres')),
            'PASSWORD': env('DB_PASSWORD', default=env('POSTGRES_PASSWORD', default='postgres')),
            'HOST': env('DB_HOST', default=env('POSTGRES_HOST', default='127.0.0.1')),
            'PORT': env('DB_PORT', default=env('POSTGRES_PORT', default='5432')),
            'CONN_MAX_AGE': DATABASE_CONN_MAX_AGE,
        }
    }


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'accounts.api_key_auth.APIKeyAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
        'accounts.permissions.APIKeyScopePermission',
        'core_permissions.permissions.SaaSResourcePermission',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'core_permissions.filters.SaaSIsolationFilterBackend',
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'saas_billing.throttling.TenantGroupRateThrottle',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'common.api.exception_handler',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Product Sheet API',
    'VERSION': '1.0.0',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=env.int('ACCESS_TOKEN_MINUTES', default=30)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=env.int('REFRESH_TOKEN_DAYS', default=7)),
    'SIGNING_KEY': env('JWT_SIGNING_KEY', default='please-change-this-jwt-signing-key-32b'),
}

GOOGLE_CLIENT_ID = env('GOOGLE_CLIENT_ID', default='')
GOOGLE_CLIENT_SECRET = env('GOOGLE_CLIENT_SECRET', default='')
GOOGLE_CALENDAR_REDIRECT_URI = env('GOOGLE_CALENDAR_REDIRECT_URI', default='https://product-sheet-frontend.onrender.com/api/calendar/callback/')
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:3000')

# ── External Workforce Sync ──────────────────────────────────────────────────
EXTERNAL_WORKFORCE_WEBHOOK_SECRET = env('EXTERNAL_WORKFORCE_WEBHOOK_SECRET', default='')

# ── Production API (used in API key integration card) ────────────────────────
PRODUCTION_SOFTWARE_API_URL = env('PRODUCTION_SOFTWARE_API_URL', default='')

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=['http://localhost:3000'])


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'en-us'
TIME_ZONE = env('TIME_ZONE', default=env('DJANGO_TIME_ZONE', default='UTC'))
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'accounts.User'

# ── Email ───────────────────────────────────────────────────────────────────
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@productsheet.com')


CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default=CELERY_BROKER_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_BEAT_SCHEDULE = {
    'day10-ping-health-task': {
        'task': 'common.tasks.ping_task',
        'schedule': 300.0,
    },
    'day10-operations-summary-task': {
        'task': 'common.tasks.generate_operations_summary_task',
        'schedule': crontab(minute='0', hour='9'),
    },
}
