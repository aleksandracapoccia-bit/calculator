from django.contrib import admin
from .models import (
    Section, Module, Attribute, SelectOption, RecruitRate,
    MethodModule, ReportModule, WorkModule,
)


# ══════════════════════════════════════════
#  Inlines
# ══════════════════════════════════════════

class AttributeInline(admin.TabularInline):
    model = Attribute
    extra = 0
    ordering = ("order",)
    fields = ("order", "name", "attribute_type", "cost_unit", "rate", "unit", "hint", "is_cost_item")


class SelectOptionInline(admin.TabularInline):
    model = SelectOption
    extra = 1
    ordering = ("order",)
    fields = ("order", "name", "rate")


# ══════════════════════════════════════════
#  1. МЕТОДЫ И МЕТОДОЛОГИИ
# ══════════════════════════════════════════

@admin.register(MethodModule)
class MethodModuleAdmin(admin.ModelAdmin):
    list_display = ("name", "stage", "order")
    list_editable = ("order",)
    list_filter = ("module_type",)
    ordering = ("module_type", "order")
    inlines = [AttributeInline]

    fieldsets = (
        (None, {"fields": ("name", "section", "module_type", "order")}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(category="method")

    def save_model(self, request, obj, form, change):
        obj.category = "method"
        obj.is_optional = True
        super().save_model(request, obj, form, change)

    @admin.display(description="Этап")
    def stage(self, obj):
        return {"qualitative": "Качественный", "quantitative": "Количественный"}.get(
            obj.module_type, "Общий"
        )


# ══════════════════════════════════════════
#  2. РЕКРУТ
# ══════════════════════════════════════════

@admin.register(RecruitRate)
class RecruitRateAdmin(admin.ModelAdmin):
    list_display = ("name", "stage_label", "rate", "order")
    list_editable = ("rate", "order")
    list_filter = ("stage",)
    ordering = ("stage", "order")

    @admin.display(description="Этап")
    def stage_label(self, obj):
        return {"qualitative": "Качественный", "quantitative": "Количественный"}.get(
            obj.stage, "—"
        )


# ══════════════════════════════════════════
#  3. ОТЧЁТНОСТЬ
# ══════════════════════════════════════════

@admin.register(ReportModule)
class ReportModuleAdmin(admin.ModelAdmin):
    list_display = ("name", "stage", "order")
    list_editable = ("order",)
    list_filter = ("module_type",)
    ordering = ("module_type", "order")
    inlines = [AttributeInline]

    fieldsets = (
        (None, {"fields": ("name", "section", "module_type", "order")}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(category="report")

    def save_model(self, request, obj, form, change):
        obj.category = "report"
        obj.is_optional = True
        super().save_model(request, obj, form, change)

    @admin.display(description="Этап")
    def stage(self, obj):
        return {"qualitative": "Качественный", "quantitative": "Количественный"}.get(
            obj.module_type, "Общий"
        )


# ══════════════════════════════════════════
#  4. РАБОТЫ И РАСХОДЫ
# ══════════════════════════════════════════

@admin.register(WorkModule)
class WorkModuleAdmin(admin.ModelAdmin):
    list_display = ("name", "stage", "category", "order")
    list_editable = ("order",)
    list_filter = ("module_type", "category")
    ordering = ("section__order", "order")
    inlines = [AttributeInline]

    fieldsets = (
        (None, {"fields": ("name", "section", "module_type", "category", "order")}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(category__in=["work", "other"])

    @admin.display(description="Этап")
    def stage(self, obj):
        return {"qualitative": "Качественный", "quantitative": "Количественный"}.get(
            obj.module_type, "Общий"
        )


# ══════════════════════════════════════════
#  Hide internal models from admin index
# ══════════════════════════════════════════

admin.site.site_header = "Калькулятор исследований"
admin.site.site_title = "Калькулятор"
admin.site.index_title = "Управление калькулятором"
