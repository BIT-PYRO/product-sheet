from django.contrib import admin
from .models import FeatureGroup, Feature, PlanFeature

@admin.register(FeatureGroup)
class FeatureGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'order')
    search_fields = ('name',)

@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'category', 'is_active')
    list_filter = ('category', 'is_active', 'is_beta')
    search_fields = ('name', 'code', 'category')
    filter_horizontal = ('industries',)

@admin.register(PlanFeature)
class PlanFeatureAdmin(admin.ModelAdmin):
    list_display = ('plan', 'feature', 'is_enabled')
    list_filter = ('plan', 'is_enabled')
    search_fields = ('plan__name', 'feature__name')
