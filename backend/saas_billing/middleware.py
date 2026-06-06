class SaaSEnforcementMiddleware:
    """
    Middleware to inject X-Entitlement-Warning headers into the response 
    if a view or permission flagged the request.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Check if any permission or throttle attached a warning to the request
        warning_msg = getattr(request, '_entitlement_warning', None)
        if warning_msg:
            response['X-Entitlement-Warning'] = warning_msg
            
        return response
