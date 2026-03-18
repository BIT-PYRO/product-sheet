from rest_framework import serializers
from django.db import transaction

from .models import InventoryTransaction, PicklistGroup, PicklistItem


class InventoryTransactionSerializer(serializers.ModelSerializer):
    def validate_quantity(self, value):
        if value == 0:
            raise serializers.ValidationError('Quantity cannot be zero.')
        return value

    def validate_remark(self, value):
        return value.strip()

    class Meta:
        model = InventoryTransaction
        fields = '__all__'


class PicklistItemSerializer(serializers.ModelSerializer):
    listingName = serializers.CharField(source='listing_name', required=False, allow_blank=True)

    class Meta:
        model = PicklistItem
        fields = ('sku', 'listingName', 'needed')


class PicklistGroupSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='group_id', required=False, allow_blank=True)
    uploadedBy = serializers.CharField(source='uploaded_by', required=False, allow_blank=True)
    date = serializers.DateTimeField(source='uploaded_at', required=False)
    dateFormatted = serializers.SerializerMethodField()
    items = PicklistItemSerializer(many=True)

    class Meta:
        model = PicklistGroup
        fields = ('id', 'number', 'name', 'uploadedBy', 'date', 'dateFormatted', 'items')

    def get_dateFormatted(self, obj):
        return obj.uploaded_at.astimezone().strftime('%Y-%m-%d %H:%M:%S')

    def _resolve_next_number(self, desired_number):
        if desired_number and not PicklistGroup.objects.filter(number=desired_number).exists():
            return desired_number
        last = PicklistGroup.objects.order_by('-number').first()
        return (last.number + 1) if last else 1

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        desired_number = validated_data.pop('number', None)

        group = PicklistGroup.objects.create(
            number=self._resolve_next_number(desired_number),
            **validated_data,
        )

        PicklistItem.objects.bulk_create([
            PicklistItem(
                group=group,
                sku=item.get('sku', '').strip().upper(),
                listing_name=item.get('listing_name', '').strip(),
                needed=max(0, int(item.get('needed') or 0)),
            )
            for item in items_data
            if str(item.get('sku', '')).strip()
        ])

        return group

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            PicklistItem.objects.bulk_create([
                PicklistItem(
                    group=instance,
                    sku=item.get('sku', '').strip().upper(),
                    listing_name=item.get('listing_name', '').strip(),
                    needed=max(0, int(item.get('needed') or 0)),
                )
                for item in items_data
                if str(item.get('sku', '')).strip()
            ])

        return instance
