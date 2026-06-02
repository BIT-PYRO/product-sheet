from contextvars import ContextVar

# Initialize ContextVars for thread/async-safe global context
_current_tenant = ContextVar('current_tenant', default=None)
_current_company = ContextVar('current_company', default=None)
_current_user = ContextVar('current_user', default=None)

def set_tenant(tenant):
    """Sets the current active tenant in the thread context."""
    return _current_tenant.set(tenant)

def get_current_tenant():
    """Retrieves the current active tenant from the thread context."""
    return _current_tenant.get()

def set_company(company):
    """Sets the current active company in the thread context."""
    return _current_company.set(company)

def get_current_company():
    """Retrieves the current active company from the thread context."""
    return _current_company.get()

def set_current_user(user):
    """Sets the current active user in the thread context."""
    return _current_user.set(user)

def get_current_user():
    """Retrieves the current active user from the thread context."""
    return _current_user.get()

def clear_tenant_context():
    """Clears tenant, company, and user from the thread context."""
    _current_tenant.set(None)
    _current_company.set(None)
    _current_user.set(None)
