import os
import sys
import logging
from django.conf import settings
from django.db import connections
from django.core.cache import cache
from celery import Celery

logger = logging.getLogger(__name__)

class StartupValidationService:
    @classmethod
    def check_health(cls):
        """
        Runs all health checks and returns a dictionary of statuses.
        Does not crash the application. Used by /api/v1/platform/health/
        """
        return {
            "database": cls._check_database(),
            "redis": cls._check_redis(),
            "celery": cls._check_celery(),
            "keys": cls._check_keys(),
            "payment_providers": cls._check_payment_providers(),
            "email": cls._check_email(),
        }

    @classmethod
    def validate_production_startup(cls):
        """
        Aggressive startup validator for production.
        Fails fast if critical infrastructure is missing.
        """
        if settings.DEBUG:
            logger.info("Running in DEBUG mode. Skipping strict startup validation.")
            return

        logger.info("Running production startup validation...")
        health = cls.check_health()
        
        critical_failures = []
        if health["database"]["status"] != "healthy":
            critical_failures.append(f"Database Error: {health['database']['message']}")
            
        if health["redis"]["status"] != "healthy":
            critical_failures.append(f"Redis Error: {health['redis']['message']}")
            
        if health["celery"]["status"] != "healthy":
            critical_failures.append(f"Celery Error: {health['celery']['message']}")
            
        if health["keys"]["status"] != "healthy":
            critical_failures.append(f"Security Keys Error: {health['keys']['message']}")

        if critical_failures:
            error_msg = "STARTUP VALIDATION FAILED:\n" + "\n".join(critical_failures)
            logger.critical(error_msg)
            # Fail fast
            sys.exit(1)
            
        logger.info("Startup validation passed. System is fully operational.")

    @classmethod
    def _check_database(cls):
        try:
            conn = connections['default']
            conn.ensure_connection()
            return {"status": "healthy", "message": "Connected to default database"}
        except Exception as e:
            return {"status": "unhealthy", "message": str(e)}

    @classmethod
    def _check_redis(cls):
        try:
            # Check if cache is actually working (ping)
            cache.set('health_check', 'ok', timeout=10)
            if cache.get('health_check') == 'ok':
                return {"status": "healthy", "message": "Redis Cache is operational"}
            else:
                return {"status": "unhealthy", "message": "Cache is returning None unexpectedly"}
        except Exception as e:
            return {"status": "unhealthy", "message": str(e)}

    @classmethod
    def _check_celery(cls):
        try:
            from config.celery import app as celery_app
            conn = celery_app.connection()
            conn.ensure_connection(max_retries=1)
            return {"status": "healthy", "message": "Celery Broker is reachable"}
        except Exception as e:
            return {"status": "unhealthy", "message": str(e)}

    @classmethod
    def _check_keys(cls):
        try:
            if getattr(settings, 'SECRET_KEY', 'django-insecure-change-me') == 'django-insecure-change-me':
                return {"status": "unhealthy", "message": "Insecure SECRET_KEY detected"}
                
            jwt_key = getattr(settings, 'SIMPLE_JWT', {}).get('SIGNING_KEY', 'please-change-this-jwt-signing-key-32b')
            if jwt_key == 'please-change-this-jwt-signing-key-32b':
                return {"status": "unhealthy", "message": "Insecure JWT_SIGNING_KEY detected"}
                
            return {"status": "healthy", "message": "Security keys are configured securely"}
        except Exception as e:
            return {"status": "unhealthy", "message": str(e)}

    @classmethod
    def _check_payment_providers(cls):
        stripe_key = getattr(settings, 'STRIPE_SECRET_KEY', None)
        razorpay_key = getattr(settings, 'RAZORPAY_KEY_SECRET', None)
        
        status = "healthy" if (stripe_key or razorpay_key) else "warning"
        message = []
        if stripe_key:
            message.append("Stripe configured")
        if razorpay_key:
            message.append("Razorpay configured")
        if not message:
            message.append("No payment provider configured")
            
        return {"status": status, "message": ", ".join(message)}

    @classmethod
    def _check_email(cls):
        email_host = getattr(settings, 'EMAIL_HOST', None)
        email_user = getattr(settings, 'EMAIL_HOST_USER', None)
        
        if email_host and email_user:
            return {"status": "healthy", "message": f"Email configured via {email_host}"}
        return {"status": "warning", "message": "Email credentials missing"}
