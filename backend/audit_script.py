import os
import django
import json

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()

from core_tenants.models import Tenant, Company
from industries.models import Industry, IndustryWorkflow
from saas_billing.models import Plan
from platform_admin.models import Feature, PlanFeature
from platform_admin.services.feature_resolution import FeatureResolutionService

def run_audit():
    results = {}

    # Blocker 4: Industry Workflow Audit
    industries = Industry.objects.all()
    ind_data = []
    for ind in industries:
        workflows = IndustryWorkflow.objects.filter(industry=ind)
        ind_data.append({
            'industry': ind.name,
            'workflow_count': workflows.count(),
            'workflow_names': [wf.name for wf in workflows]
        })
    results['industries'] = ind_data

    # Blocker 5: Plan Seeding Audit
    plans = Plan.objects.all()
    plan_data = []
    for plan in plans:
        features = PlanFeature.objects.filter(plan=plan)
        plan_data.append({
            'plan_name': plan.name,
            'enabled_count': features.filter(is_enabled=True).count(),
            'disabled_count': features.filter(is_enabled=False).count()
        })
    results['plans'] = plan_data

    # Feature Resolution Verification
    tenant = Tenant.objects.filter(name='XYZ-FASHION').first()
    if tenant:
        features = Feature.objects.all()
        matrix = []
        for feature in features:
            final_access = FeatureResolutionService.has_feature(tenant.id, feature.code)
            # Need to figure out Plan Access and Override Access manually for the report
            plan_feature = PlanFeature.objects.filter(plan=tenant.plan, feature=feature).first()
            plan_access = plan_feature.is_enabled if plan_feature else False
            
            # Since FeatureResolutionService uses get_tenant_features which resolves everything, we can approximate overrides
            # if final_access != plan_access, there's an override (or industry default, but tenant overrides usually take precedence)
            
            matrix.append({
                'feature': feature.code,
                'plan_access': plan_access,
                'final_access': final_access
            })
        
        results['feature_resolution'] = {
            'tenant_name': tenant.name,
            'industry': tenant.industry.name if tenant.industry else 'None',
            'plan': tenant.plan.name if tenant.plan else 'None',
            'matrix': matrix
        }
    else:
        results['feature_resolution'] = None

    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    run_audit()
