import os
import django
import json

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()

from industries.models import Industry, IndustryWorkflow
from saas_billing.models import Plan
from platform_admin.models import PlanFeature

results = {}

# 1. Industry Workflow records
workflows_data = {}
for ind in Industry.objects.all():
    wfs = IndustryWorkflow.objects.filter(industry=ind)
    workflows_data[ind.name] = {
        'count': wfs.count(),
        'stages': [wf.stages for wf in wfs]  # stages is now a list of dicts
    }
results['IndustryWorkflows'] = workflows_data

# 2. Plans and counts
plans_data = {}
for plan in Plan.objects.all():
    features = PlanFeature.objects.filter(plan=plan)
    plans_data[plan.code] = {
        'enabled': features.filter(is_enabled=True).count(),
        'disabled': features.filter(is_enabled=False).count(),
    }
results['Plans'] = plans_data

# 3. ViewSet checks
import ast
checks = [
    ('jobs/views.py', 'JobViewSet', 'master-job-sheet'),
    ('designers/views.py', 'DesignerSheetViewSet', 'master-designer-sheet'),
    ('findings/views.py', 'FindingViewSet', 'master-finding-sheet'),
]

views_data = {}
for file_path, cls_name, expected_code in checks:
    full_path = os.path.join('d:/Janki/product-sheet-design/backend', file_path)
    status = 'Failed'
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef) and node.name == cls_name:
                    for item in node.body:
                        if isinstance(item, ast.Assign) and len(item.targets) == 1:
                            target = item.targets[0]
                            if isinstance(target, ast.Name) and target.id == 'required_feature_code':
                                if isinstance(item.value, ast.Constant) and item.value.value == expected_code:
                                    status = f'Correctly set to {expected_code}'
                                else:
                                    status = f'Incorrect value: {getattr(item.value, "value", "unknown")}'
    except Exception as e:
        status = f'Error: {e}'
    
    views_data[cls_name] = status

results['ViewSetMappings'] = views_data

print(json.dumps(results, indent=2))
