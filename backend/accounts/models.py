import hashlib
import random
import secrets
import string

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# API Key — page scope identifiers
# ---------------------------------------------------------------------------

SCOPE_CHOICES = {
    'master_inventory': 'Master Inventory Sheet',
    'master_products': 'Master Product Sheet',
    'master_jobs': 'Master Job Sheet',
    'master_workforce': 'Master Workforce Sheet',
    'master_kyc': 'Master KYC Sheet',
    'master_customers': 'Master Customer Sheet',
    'master_designers': 'Master Designer Sheet',
    'orders': 'Orders',
    'drafts': 'Drafts',
    'findings': 'Finding Sheet',
    'product_inventory': 'Product Inventory',
    'accounting': 'Accounting',
    'hr': 'HR Section',
}


def generate_api_key():
    """Return a cryptographically secure random API key string."""
    return secrets.token_urlsafe(32)


from core_permissions.roles import UserRole


class User(AbstractUser):
	tenant = models.ForeignKey(
		'core_tenants.Tenant',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='users'
	)
	active_company = models.ForeignKey(
		'core_tenants.Company',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='+'
	)
	role = models.CharField(
		max_length=50,
		choices=UserRole.choices,
		default=UserRole.STAFF
	)
	accessible_companies = models.ManyToManyField(
		'core_tenants.Company',
		related_name='accessible_users',
		blank=True
	)
	is_approved = models.BooleanField(
		default=False,
		help_text='Approved users have full access. Unapproved users can only access their Profile page.',
	)
	is_email_verified = models.BooleanField(default=False)


class RoleDefaultPermissions(models.Model):
	role = models.CharField(max_length=100)  # designation, e.g. Director, Manager, Associate
	department = models.CharField(max_length=100, default='')  # e.g. Marketing, Finance; '' = all departments
	permissions = models.JSONField(default=dict, blank=True)

	class Meta:
		unique_together = [('role', 'department')]
		verbose_name = 'Role Default Permissions'
		verbose_name_plural = 'Role Default Permissions'

	def __str__(self):
		return f'Default permissions for {self.role} / {self.department or "all"}'


class EmailOTP(models.Model):
	email = models.EmailField(db_index=True)
	otp = models.CharField(max_length=4)
	created_at = models.DateTimeField(auto_now_add=True)
	used = models.BooleanField(default=False)

	class Meta:
		ordering = ['-created_at']

	def is_valid(self):
		age = (timezone.now() - self.created_at).total_seconds()
		return not self.used and age < 600  # 10 minutes

	@classmethod
	def generate_otp(cls):
		return ''.join(random.choices(string.digits, k=4))


class EmailVerificationToken(models.Model):
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_tokens')
	token = models.CharField(max_length=64, unique=True)
	created_at = models.DateTimeField(auto_now_add=True)
	expires_at = models.DateTimeField()
	used = models.BooleanField(default=False)

	class Meta:
		ordering = ['-created_at']

	def is_valid(self):
		from django.utils import timezone
		return not self.used and timezone.now() < self.expires_at

	@classmethod
	def generate_token(cls, user):
		from django.utils import timezone
		from datetime import timedelta
		import secrets
		import hashlib

		raw_token = secrets.token_urlsafe(32)
		token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
		expires = timezone.now() + timedelta(days=1)

		instance = cls.objects.create(
			user=user,
			token=token_hash,
			expires_at=expires
		)
		return instance, raw_token


class Permission(models.Model):
    identifier = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.CharField(max_length=255, blank=True, default='')

    def __str__(self):
        return self.identifier

class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    permissions = models.ManyToManyField(Permission, related_name='roles', blank=True)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# API Key model
# ---------------------------------------------------------------------------

class APIKey(models.Model):
    """A long-lived API key scoped to specific pages with read/write/comment permissions."""

    name = models.CharField(max_length=100, help_text='A human-readable label for this key.')
    description = models.TextField(blank=True, default='')
    tenant = models.ForeignKey(
        'core_tenants.Tenant',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='api_keys',
        help_text='Tenant this API Key is scoped to.',
    )
    given_to = models.CharField(
        max_length=150, blank=True, default='',
        help_text='Display name of the key recipient.',
    )
    given_to_workforce = models.ForeignKey(
        'workforce.WorkforceMember',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='api_keys',
        help_text='The workforce member this key is assigned to (tech dept).',
    )

    # Stored key material — raw key is shown once and never persisted
    key_prefix = models.CharField(max_length=8, help_text='First 8 characters of the raw key (display only).')
    key_hash = models.CharField(max_length=64, unique=True, db_index=True, help_text='SHA-256 hex of the raw key.')

    # Scope — list of keys from SCOPE_CHOICES
    page_scopes = models.JSONField(default=list, help_text='Which pages this key can access.')

    # Permission flags
    can_read = models.BooleanField(default=True)
    can_write = models.BooleanField(default=False, help_text='Allows POST, PUT, DELETE on scoped endpoints.')
    can_comment = models.BooleanField(default=False, help_text='Allows PATCH only (limited write).')

    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'accounts.User', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='created_api_keys',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'API Key'
        verbose_name_plural = 'API Keys'

    def __str__(self):
        return f'{self.name} ({self.key_prefix}…)'

    @classmethod
    def create_key(cls, name, page_scopes, can_read=True, can_write=False, can_comment=False,
                   description='', given_to='', given_to_workforce_id=None, created_by=None):
        """Generate a new API key, persist the hash, and return (instance, raw_key)."""
        raw_key = generate_api_key()
        prefix = raw_key[:8]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        
        tenant = getattr(created_by, 'tenant', None) if created_by else None
        
        instance = cls.objects.create(
            name=name,
            description=description,
            tenant=tenant,
            given_to=given_to,
            given_to_workforce_id=given_to_workforce_id,
            key_prefix=prefix,
            key_hash=key_hash,
            page_scopes=page_scopes,
            can_read=can_read,
            can_write=can_write,
            can_comment=can_comment,
            created_by=created_by,
        )
        return instance, raw_key

    def regenerate(self):
        """Replace the key material with a freshly generated key. Returns the new raw key."""
        raw_key = generate_api_key()
        self.key_prefix = raw_key[:8]
        self.key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        self.save(update_fields=['key_prefix', 'key_hash', 'updated_at'])
        return raw_key
