from django.contrib import admin
from .models import Industry, IndustryTemplate, IndustryWorkflow, InventoryDefinition

class IndustryTemplateInline(admin.StackedInline):
    model = IndustryTemplate
    extra = 0

class IndustryWorkflowInline(admin.TabularInline):
    model = IndustryWorkflow
    extra = 0

class InventoryDefinitionInline(admin.TabularInline):
    model = InventoryDefinition
    extra = 0

@admin.register(Industry)
class IndustryAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active', 'created_at')
    search_fields = ('name', 'code', 'description')
    list_filter = ('is_active',)
    inlines = [IndustryTemplateInline, IndustryWorkflowInline, InventoryDefinitionInline]

@admin.register(IndustryTemplate)
class IndustryTemplateAdmin(admin.ModelAdmin):
    list_display = ('industry', 'default_sku_format')
    search_fields = ('industry__name', 'default_sku_format')
    list_filter = ('industry',)

@admin.register(IndustryWorkflow)
class IndustryWorkflowAdmin(admin.ModelAdmin):
    list_display = ('industry', 'workflow_type')
    search_fields = ('industry__name', 'workflow_type')
    list_filter = ('industry', 'workflow_type')

@admin.register(InventoryDefinition)
class InventoryDefinitionAdmin(admin.ModelAdmin):
    list_display = ('industry', 'name', 'code')
    search_fields = ('industry__name', 'name', 'code')
    list_filter = ('industry',)
