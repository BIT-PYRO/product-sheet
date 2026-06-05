import re

def generate_sku(variant):
    """
    Generate a SKU for a product variant based on the Tenant's Industry Template.
    If no template is found, fallback to a default format.
    Format string example: "{CATEGORY}-{ATTR:Color}-{ATTR:Size}"
    """
    tenant = variant.tenant
    product = variant.product
    
    # Get Industry Template
    industry = tenant.industry
    sku_format = "{CATEGORY}-{ID}" # Default fallback
    if industry and hasattr(industry, 'template') and industry.template.default_sku_format:
        sku_format = industry.template.default_sku_format

    category = product.category or "GEN"
    sku = sku_format.replace("{CATEGORY}", category.upper())
    sku = sku.replace("{ID}", str(variant.id or "NEW"))

    # Replace attributes
    # Find all {ATTR:Name} in the format string
    attr_matches = re.findall(r"\{ATTR:(.*?)\}", sku)
    
    options = {opt.attribute.name: opt.value for opt in variant.options.select_related('attribute')}
    
    for attr_name in attr_matches:
        val = options.get(attr_name, "X").upper()
        sku = sku.replace(f"{{ATTR:{attr_name}}}", val[:3]) # Take first 3 chars or handle custom

    # Clean up any weird characters
    sku = re.sub(r'[^A-Z0-9\-]', '', sku)
    return sku
