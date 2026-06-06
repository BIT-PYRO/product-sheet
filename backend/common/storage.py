import os
import uuid

def tenant_directory_path(instance, filename):
    """
    Dynamic upload path generator for models.
    Format: tenant_<tenant_id>/company_<company_id>/<model_name>/<filename>
    Or legacy format: org_<org_id>/<model_name>/<filename>
    If tenant/company/org is missing, falls back to unscoped/<model_name>/<filename>
    """
    model_name = instance.__class__.__name__.lower()
    
    tenant_id = str(getattr(instance, 'tenant_id', '')) or 'unscoped'
    company_id = str(getattr(instance, 'company_id', '')) or 'unscoped'
    org_id = str(getattr(instance, 'org_id', '')) or ''
    
    # Clean the filename and add a short uuid to prevent overwrites
    ext = os.path.splitext(filename)[1]
    name = os.path.splitext(filename)[0]
    safe_name = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
    
    if org_id:
        return f"org_{org_id}/{model_name}/{safe_name}"
        
    if tenant_id == 'unscoped' and company_id == 'unscoped':
        return f"unscoped/{model_name}/{safe_name}"
        
    return f"tenant_{tenant_id}/company_{company_id}/{model_name}/{safe_name}"
