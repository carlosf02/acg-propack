from rest_framework import serializers
from .models import Invoice

class InvoiceSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    billing_email = serializers.SerializerMethodField()
    billing_name = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 
            'stripe_invoice_id', 
            'amount_paid', 
            'currency', 
            'status', 
            'hosted_invoice_url', 
            'plan_name',
            'payment_method_details',
            'period_start',
            'period_end',
            'is_archived',
            'created_at',
            'company_name',
            'billing_email',
            'billing_name'
        ]

    def get_billing_email(self, obj):
        admin = obj.company.members.filter(role='admin').first()
        return admin.user.email if admin else ""

    def get_billing_name(self, obj):
        admin = obj.company.members.filter(role='admin').first()
        if admin:
            return f"{admin.user.first_name} {admin.user.last_name}".strip() or admin.user.username
        return ""
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        
        # 1. Clean plan_name dynamically (handles existing raw Stripe strings)
        raw_plan = ret.get('plan_name')
        if raw_plan:
            if 'ProPack Basic' in raw_plan:
                ret['plan_name'] = 'Basic Plan'
            elif 'ProPack Pro' in raw_plan:
                ret['plan_name'] = 'Pro Plan'
            elif '1 ×' in raw_plan:
                # General fallback for Stripe quantities
                import re
                cleaned = re.sub(r'^\d+\s*×\s*', '', raw_plan)
                cleaned = re.sub(r'\s*\(at\s*.*$', '', cleaned).strip()
                cleaned = cleaned.replace("ACG ProPack ", "")
                ret['plan_name'] = cleaned or "Basic Plan"

        # 2. Format payment_method_details consistently
        pm = ret.get('payment_method_details')
        if pm and '••••' in pm:
            # Convert "Visa •••• 4242" to "Visa ending in 4242"
            ret['payment_method_details'] = pm.replace('••••', 'ending in').replace('  ', ' ')

        return ret
