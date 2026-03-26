from rest_framework import serializers
from .models import Section, Module, Attribute, SelectOption, RecruitRate


class SelectOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SelectOption
        fields = ("id", "name", "rate", "order")


class AttributeSerializer(serializers.ModelSerializer):
    options = SelectOptionSerializer(many=True, read_only=True)
    multiply_with_id = serializers.PrimaryKeyRelatedField(
        source="multiply_with",
        read_only=True,
    )

    class Meta:
        model = Attribute
        fields = (
            "id",
            "name",
            "attribute_type",
            "cost_unit",
            "rate",
            "fixed_price",
            "unit",
            "hint",
            "is_cost_item",
            "multiply_with_id",
            "order",
            "options",
        )


class ModuleSerializer(serializers.ModelSerializer):
    attributes = AttributeSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ("id", "name", "module_type", "category", "is_optional", "order", "attributes")


class SectionSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ("id", "name", "has_stage_toggle", "order", "modules")


class RecruitRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecruitRate
        fields = ("id", "name", "stage", "rate", "order")
