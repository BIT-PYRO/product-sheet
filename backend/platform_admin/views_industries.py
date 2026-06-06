from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.permissions import IsSuperAdmin

from industries.models import Industry, IndustryWorkflow, IndustryTemplate, InventoryDefinition
from core_tenants.models import Tenant

class PlatformIndustryManagementView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        industries = Industry.objects.all().order_by('name')
        
        data = []
        for i in industries:
            active_tenants = Tenant.objects.filter(industry=i).count()
            workflows = IndustryWorkflow.objects.filter(industry=i).count()
            templates = IndustryTemplate.objects.filter(industry=i).count()
            inventory_defs = InventoryDefinition.objects.filter(industry=i).count()
            
            data.append({
                "id": i.id,
                "name": i.name,
                "code": i.code,
                "description": i.description,
                "active_tenants": active_tenants,
                "workflows": workflows,
                "templates": templates,
                "inventory_definitions": inventory_defs
            })
            
        return Response(data)
