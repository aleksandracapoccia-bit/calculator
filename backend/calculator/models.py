from django.db import models


class Section(models.Model):
    name = models.CharField("Название", max_length=255)
    has_stage_toggle = models.BooleanField(
        "Переключатель этапов",
        default=False,
        help_text="Если включено — у секции появляется переключатель качественный/количественный/оба",
    )
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "Секция"
        verbose_name_plural = "Секции"

    def __str__(self):
        return self.name


class Module(models.Model):
    class ModuleType(models.TextChoices):
        DEFAULT = "default", "Обычный (всегда виден)"
        QUALITATIVE = "qualitative", "Качественный"
        QUANTITATIVE = "quantitative", "Количественный"

    class Category(models.TextChoices):
        METHOD = "method", "Метод"
        REPORT = "report", "Отчётность"
        WORK = "work", "Работы"
        OTHER = "other", "Прочее"

    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name="modules",
        verbose_name="Секция",
    )
    name = models.CharField("Название", max_length=255)
    module_type = models.CharField(
        "Тип модуля",
        max_length=20,
        choices=ModuleType.choices,
        default=ModuleType.DEFAULT,
        help_text="Влияет на видимость при переключении этапов в секции с переключателем",
    )
    category = models.CharField(
        "Категория",
        max_length=20,
        choices=Category.choices,
        default=Category.METHOD,
        help_text="method — метод (шаг 2), report — отчёт (шаг 3), work/other — работы",
    )
    is_optional = models.BooleanField(
        "Опциональный",
        default=False,
        help_text="Если включено — модуль отображается с чекбоксом, пользователь выбирает нужные",
    )
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "Модуль"
        verbose_name_plural = "Модули"

    def __str__(self):
        return f"{self.section.name} → {self.name}"


class Attribute(models.Model):
    class AttributeType(models.TextChoices):
        NUMBER = "number", "Числовой ввод"
        SELECT = "select", "Выбор из списка"
        FIXED = "fixed", "Фиксированная стоимость"

    class CostUnit(models.TextChoices):
        CURRENCY = "currency", "Рубли (₽)"
        HOURS = "hours", "Часы"

    module = models.ForeignKey(
        Module,
        on_delete=models.CASCADE,
        related_name="attributes",
        verbose_name="Модуль",
    )
    name = models.CharField("Название", max_length=255)
    attribute_type = models.CharField(
        "Тип",
        max_length=20,
        choices=AttributeType.choices,
        default=AttributeType.NUMBER,
    )
    cost_unit = models.CharField(
        "Единица стоимости",
        max_length=20,
        choices=CostUnit.choices,
        default=CostUnit.CURRENCY,
        help_text="Часы — значение считается в часах (для расчёта ПШЕ). Рубли — прямые денежные расходы.",
    )
    rate = models.DecimalField(
        "Ставка за единицу",
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Для числового ввода: результат = ставка × значение. Для часов ставка=1.",
    )
    fixed_price = models.DecimalField(
        "Фиксированная стоимость",
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Для типа 'Фиксированная стоимость'",
    )
    unit = models.CharField(
        "Единица измерения",
        max_length=50,
        blank=True,
        help_text="Подпись поля ввода: часов, респондентов, минут",
    )
    hint = models.CharField(
        "Подсказка",
        max_length=255,
        blank=True,
        help_text="Пояснение под полем ввода, видимое пользователю на фронтенде",
    )
    is_cost_item = models.BooleanField(
        "Участвует в расчёте",
        default=True,
        help_text="Если выключено — поле информационное, не влияет на стоимость",
    )
    multiply_with = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="multiplied_by",
        verbose_name="Умножить на атрибут",
        help_text="Результат этого атрибута будет умножен на значение указанного атрибута",
    )
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "Атрибут"
        verbose_name_plural = "Атрибуты"

    def __str__(self):
        return f"{self.module.name} → {self.name}"


class SelectOption(models.Model):
    attribute = models.ForeignKey(
        Attribute,
        on_delete=models.CASCADE,
        related_name="options",
        verbose_name="Атрибут",
    )
    name = models.CharField("Название", max_length=255)
    rate = models.DecimalField(
        "Ставка",
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Стоимость / ставка при выборе данной опции",
    )
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "Опция выбора"
        verbose_name_plural = "Опции выбора"

    def __str__(self):
        return f"{self.attribute.name}: {self.name}"


# ── Proxy models for admin ──

class MethodModule(Module):
    class Meta:
        proxy = True
        verbose_name = "Метод / методология"
        verbose_name_plural = "Методы и методологии"


class ReportModule(Module):
    class Meta:
        proxy = True
        verbose_name = "Тип отчёта"
        verbose_name_plural = "Отчётность"


class WorkModule(Module):
    class Meta:
        proxy = True
        verbose_name = "Блок работ"
        verbose_name_plural = "Работы и расходы"


class RecruitRate(models.Model):
    class Stage(models.TextChoices):
        QUALITATIVE = "qualitative", "Качественный"
        QUANTITATIVE = "quantitative", "Количественный"

    name = models.CharField("Название", max_length=255)
    stage = models.CharField("Этап", max_length=20, choices=Stage.choices)
    rate = models.DecimalField(
        "Ставка (₽ за респондента)",
        max_digits=12, decimal_places=2, default=0,
    )
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["stage", "order"]
        verbose_name = "Ставка рекрута"
        verbose_name_plural = "Рекрут"

    def __str__(self):
        stage_label = {"qualitative": "Кач", "quantitative": "Колич"}.get(self.stage, "")
        return f"[{stage_label}] {self.name} — {self.rate} ₽"
