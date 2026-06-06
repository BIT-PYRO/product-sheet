"""
Permissions for MyDesk.
`HasModulePermission` gates HR/Finance views to admin or manager users.
"""
from rest_framework.permissions import BasePermission


class HasModulePermission(BasePermission):
    """
    Allow access if the user is authenticated AND has role 'admin' or 'manager'.
    Falls back gracefully if the User model has no 'role' field.
    """
    message = 'You do not have permission to access this module.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Superusers always pass
        if request.user.is_superuser or request.user.is_staff:
            return True
        # Check 'role' field if it exists on the user model
        role = getattr(request.user, 'role', None)
        if role in ('admin', 'manager'):
            return True
        return False
