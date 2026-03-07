from rest_framework import serializers
from company.models import AssociateCompany, Office
from .models import Consolidation


class ConsolidationSerializer(serializers.ModelSerializer):
    warehouse_receipts = serializers.ListField(
        child=serializers.IntegerField(), required=False, write_only=True
    )
    warehouse_receipt_ids = serializers.SerializerMethodField(read_only=True)

    # Read-only nested details for display
    associate_company_name = serializers.CharField(
        source='associate_company.name', read_only=True
    )
    sending_office_name = serializers.CharField(
        source='sending_office.name', read_only=True
    )
    receiving_office_name = serializers.CharField(
        source='receiving_office.name', read_only=True
    )
    ship_type_display = serializers.CharField(
        source='get_ship_type_display', read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )

    class Meta:
        model = Consolidation
        fields = [
            'id',
            'reference_code',
            'company',
            'associate_company',
            'associate_company_name',
            'ship_type',
            'ship_type_display',
            'consolidation_type',
            'sending_office',
            'sending_office_name',
            'receiving_office',
            'receiving_office_name',
            'alt_name',
            'note',
            'status_display',
            'created_at',
            'updated_at',
            'warehouse_receipts',
            'warehouse_receipt_ids',
        ]
        read_only_fields = ['id', 'reference_code', 'company', 'created_at', 'updated_at']

    def _get_company(self):
        request = self.context.get('request')
        if request:
            from company.utils import get_active_company
            return get_active_company(request.user)
        return None

    def validate(self, data):
        company = self._get_company()
        if not company:
            raise serializers.ValidationError("Could not determine active company.")

        associate_company = data.get('associate_company') or (
            self.instance.associate_company if self.instance else None
        )
        sending_office = data.get('sending_office') or (
            self.instance.sending_office if self.instance else None
        )
        receiving_office = data.get('receiving_office') or (
            self.instance.receiving_office if self.instance else None
        )

        errors = {}

        # Validate associate_company
        if associate_company:
            if associate_company.company_id != company.id:
                errors['associate_company'] = (
                    "This associate company does not belong to your company."
                )
            elif not associate_company.is_active:
                errors['associate_company'] = "This associate company is inactive."

        # Validate sending_office
        if sending_office:
            if sending_office.company_id != company.id:
                errors['sending_office'] = (
                    "Sending office must be an office belonging to your company."
                )
            elif not sending_office.is_active:
                errors['sending_office'] = "Sending office is inactive."

        # Validate receiving_office
        if receiving_office:
            own = (receiving_office.company_id == company.id)
            assoc = (
                associate_company and
                receiving_office.associate_company_id == associate_company.id
            )
            if not own and not assoc:
                errors['receiving_office'] = (
                    "Receiving office must be either an office of your company "
                    "or an office of the selected associate company."
                )
            elif not receiving_office.is_active:
                errors['receiving_office'] = "Receiving office is inactive."

        # Sending and receiving cannot be the same
        if (
            sending_office and receiving_office and
            sending_office.pk == receiving_office.pk
        ):
            errors['receiving_office'] = (
                "Sending office and receiving office cannot be the same."
            )

        # Validate warehouse_receipts
        warehouse_receipt_ids = data.get('warehouse_receipts')
        if warehouse_receipt_ids is not None:
            from receiving.models import WarehouseReceipt
            receipts = WarehouseReceipt.objects.filter(
                id__in=warehouse_receipt_ids,
                company_id=company.id
            )
            found_ids = set(receipts.values_list('id', flat=True))
            missing = set(warehouse_receipt_ids) - found_ids
            if missing:
                errors['warehouse_receipts'] = f"The following receipt IDs are invalid or not found in your company: {', '.join(map(str, missing))}"

            # Optional: ensure no receipt is already linked to another OPEN/DRAFT consolidation
            from consolidation.models import ConsolidationStatus, ConsolidationReceipt
            # Find any receipt already linked to a different consolidation that is not CLOSED
            existing_links = ConsolidationReceipt.objects.filter(
                warehouse_receipt_id__in=warehouse_receipt_ids,
                company_id=company.id
            ).exclude(
                consolidation__status=ConsolidationStatus.CLOSED
            ).select_related('consolidation')

            if self.instance:
                existing_links = existing_links.exclude(consolidation_id=self.instance.id)

            if existing_links.exists():
                already_linked = [
                    f"Receipt {link.warehouse_receipt_id} is linked to Consolidation {link.consolidation.reference_code}"
                    for link in existing_links
                ]
                errors['warehouse_receipts'] = "Some receipts are already linked to an active consolidation: " + "; ".join(already_linked)

        if errors:
            raise serializers.ValidationError(errors)

        return data

    def get_warehouse_receipt_ids(self, obj):
        return list(obj.receipt_links.values_list('warehouse_receipt_id', flat=True))

    def create(self, validated_data):
        warehouse_receipt_ids = validated_data.pop('warehouse_receipts', None)
        consolidation = super().create(validated_data)
        
        if warehouse_receipt_ids is not None:
            from consolidation.models import ConsolidationReceipt
            links = [
                ConsolidationReceipt(
                    company=consolidation.company,
                    consolidation=consolidation,
                    warehouse_receipt_id=wr_id
                ) for wr_id in warehouse_receipt_ids
            ]
            ConsolidationReceipt.objects.bulk_create(links)
            
        return consolidation

    def update(self, instance, validated_data):
        warehouse_receipt_ids = validated_data.pop('warehouse_receipts', None)
        consolidation = super().update(instance, validated_data)
        
        if warehouse_receipt_ids is not None:
            from consolidation.models import ConsolidationReceipt
            # Delete old links
            instance.receipt_links.all().delete()
            
            # Create new links
            links = [
                ConsolidationReceipt(
                    company=consolidation.company,
                    consolidation=consolidation,
                    warehouse_receipt_id=wr_id
                ) for wr_id in warehouse_receipt_ids
            ]
            ConsolidationReceipt.objects.bulk_create(links)
            
        return consolidation
