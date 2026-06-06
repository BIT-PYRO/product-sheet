from core_permissions.roles import UserRole

class UserService:
    @staticmethod
    def add_company_to_user(user, company):
        """
        Grants a user access to a specific company.
        Verifies that the company belongs to the user's registered tenant.
        """
        if user.tenant != company.tenant:
            raise ValueError("Cannot assign a user to a company belonging to a different tenant.")
        
        user.accessible_companies.add(company)
        
        # Auto-set as active company if none is set
        if not user.active_company:
            user.active_company = company
            user.save(update_fields=['active_company'])

    @staticmethod
    def remove_company_from_user(user, company):
        """
        Removes a company from the user's accessible companies list.
        Auto-resolves a new active company if the removed one was active.
        """
        user.accessible_companies.remove(company)
        
        if user.active_company == company:
            user.active_company = user.accessible_companies.first()
            user.save(update_fields=['active_company'])

    @staticmethod
    def set_active_company(user, company):
        """
        Updates the user's default active company after verifying access constraints.
        """
        if not user.accessible_companies.filter(id=company.id).exists():
            raise ValueError("User does not have access to this company.")
        
        user.active_company = company
        user.save(update_fields=['active_company'])
        return user
