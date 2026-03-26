from django.core.management.base import BaseCommand
from calculator.models import Section, Module, Attribute, SelectOption, RecruitRate


def make_method_module(section, name, module_type, module_order,
                       has_duration=False, has_sample=True):
    """Create an optional method module."""
    mod = Module.objects.create(
        section=section, name=name,
        module_type=module_type, category="method",
        is_optional=True, order=module_order,
    )

    if has_sample:
        sample = Attribute.objects.create(
            module=mod, name="Количество респондентов", attribute_type="number",
            cost_unit="currency", rate=0, unit="чел.",
            is_cost_item=False, order=1,
        )

        if has_duration:
            Attribute.objects.create(
                module=mod, name="Длительность модерации", attribute_type="number",
                cost_unit="hours", rate=1, unit="часов",
                hint="За 1 сессию",
                is_cost_item=True, multiply_with=sample, order=2,
            )

    return mod


def make_report_module(section, name, module_type, order):
    """Create an optional report module with a single hours attribute."""
    mod = Module.objects.create(
        section=section, name=name,
        module_type=module_type, category="report",
        is_optional=True, order=order,
    )
    Attribute.objects.create(
        module=mod, name="Написание", attribute_type="number",
        cost_unit="hours", rate=1, unit="часов",
        is_cost_item=True, order=1,
    )
    return mod


class Command(BaseCommand):
    help = "Создаёт структуру калькулятора на основе базы знаний"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force", action="store_true",
            help="Удалить существующие данные и пересоздать",
        )

    def handle(self, *args, **options):
        if Section.objects.exists() or RecruitRate.objects.exists():
            if options["force"]:
                Section.objects.all().delete()
                RecruitRate.objects.all().delete()
                self.stdout.write(self.style.WARNING("Старые данные удалены."))
            else:
                self.stdout.write(self.style.WARNING(
                    "Данные уже существуют. Используйте --force для пересоздания."
                ))
                return

        # ╔══════════════════════════════════════════════════╗
        # ║  РЕКРУТ (сквозная таблица ставок)               ║
        # ╚══════════════════════════════════════════════════╝
        RecruitRate.objects.bulk_create([
            RecruitRate(name="B2C", stage="qualitative", rate=5000, order=1),
            RecruitRate(name="B2B", stage="qualitative", rate=10000, order=2),
            RecruitRate(name="B2C", stage="quantitative", rate=300, order=1),
            RecruitRate(name="B2B", stage="quantitative", rate=700, order=2),
        ])

        # ╔══════════════════════════════════════════════════╗
        # ║  СЕКЦИЯ: ДИЗАЙН ИССЛЕДОВАНИЯ                     ║
        # ╚══════════════════════════════════════════════════╝
        s_design = Section.objects.create(
            name="Дизайн исследования", has_stage_toggle=True, order=1,
        )

        # ── Качественные методы (стандартные: респонденты + длительность × респонденты) ──
        standard_qual = [
            ("ФГД",                1),
            ("Глубинное интервью", 2),
            ("Диада / триада",     3),
            ("UX-тестирование",    4),
            ("CJM",                5),
            ("Этнография",         6),
            ("Домашний визит",     7),
        ]
        for name, order in standard_qual:
            make_method_module(
                s_design, name, "qualitative", order,
                has_duration=True, has_sample=True,
            )

        # ── Онлайн-форум (часы в день × дни + респонденты для рекрута) ──
        m_forum = Module.objects.create(
            section=s_design, name="Онлайн-форум",
            module_type="qualitative", category="method",
            is_optional=True, order=8,
        )
        forum_days = Attribute.objects.create(
            module=m_forum, name="Количество дней форума",
            attribute_type="number", cost_unit="currency", rate=0,
            unit="дней", hint="Длительность проведения форума",
            is_cost_item=False, order=1,
        )
        Attribute.objects.create(
            module=m_forum, name="Часы модерации в день",
            attribute_type="number", cost_unit="hours", rate=1,
            unit="часов",
            is_cost_item=True, multiply_with=forum_days, order=2,
        )
        Attribute.objects.create(
            module=m_forum, name="Количество респондентов",
            attribute_type="number", cost_unit="currency", rate=0,
            unit="чел.", hint="Для расчёта стоимости рекрута",
            is_cost_item=False, order=3,
        )

        # ── Воркшоп, Деск, SML (итоговые часы, без респондентов) ──
        for name, order in [
            ("Воркшоп", 9),
            ("Деск-исследование", 10),
            ("SML (мониторинг соцсетей)", 11),
        ]:
            m = Module.objects.create(
                section=s_design, name=name,
                module_type="qualitative", category="method",
                is_optional=True, order=order,
            )
            Attribute.objects.create(
                module=m, name="Количество часов", attribute_type="number",
                cost_unit="hours", rate=1, unit="часов",
                hint="Итоговое количество часов на весь проект",
                is_cost_item=True, order=1,
            )

        # ── Работы: качественный этап ──
        m_qual_work = Module.objects.create(
            section=s_design, name="Работы: качественный этап",
            module_type="qualitative", category="work",
            is_optional=False, order=20,
        )
        for task_name, order in [
            ("Менеджмент качественного этапа", 1),
            ("Разработка гайда", 2),
            ("Аналитика текстового массива", 3),
        ]:
            Attribute.objects.create(
                module=m_qual_work, name=task_name, attribute_type="number",
                cost_unit="hours", rate=1, unit="часов",
                is_cost_item=True, order=order,
            )

        # ── Отчёты: качественный этап ──
        for name, order in [
            ("Полный отчёт в ppt", 40),
            ("Доска (miro, figma)", 41),
            ("Саммари", 42),
            ("Топлайн", 43),
        ]:
            make_report_module(s_design, name, "qualitative", order)

        # ── Количественные методы (респонденты, без длительности) ──
        for name, order in [
            ("PAPI", 30),
            ("CAPI", 31),
            ("CATI", 32),
            ("Online / CAWI", 33),
        ]:
            make_method_module(
                s_design, name, "quantitative", order,
                has_duration=False, has_sample=True,
            )

        # ── Работы: количественный этап ──
        m_quant_work = Module.objects.create(
            section=s_design, name="Работы: количественный этап",
            module_type="quantitative", category="work",
            is_optional=False, order=35,
        )
        for task_name, order in [
            ("Менеджмент количественного этапа", 1),
            ("Разработка анкеты", 2),
            ("Программирование анкеты", 3),
            ("Аналитика количественного массива", 4),
        ]:
            Attribute.objects.create(
                module=m_quant_work, name=task_name, attribute_type="number",
                cost_unit="hours", rate=1, unit="часов",
                is_cost_item=True, order=order,
            )

        # ── Отчёты: количественный этап ──
        for name, order in [
            ("Полный отчёт в ppt", 50),
            ("Аналитика в excel", 51),
            ("Саммари", 52),
            ("Топлайн", 53),
        ]:
            make_report_module(s_design, name, "quantitative", order)

        # ── Презентация (обязательный, default) ──
        m_pres = Module.objects.create(
            section=s_design, name="Презентация результатов",
            module_type="default", category="work",
            is_optional=False, order=55,
        )
        Attribute.objects.create(
            module=m_pres, name="Презентация результатов",
            attribute_type="number", cost_unit="hours", rate=1,
            unit="часов", is_cost_item=True, order=1,
        )

        # ── Дизайн и редактура ──
        m_design_edit = Module.objects.create(
            section=s_design, name="Дизайн и редактура",
            module_type="default", category="work",
            is_optional=False, order=57,
        )
        for task_name, order in [
            ("Редактор / корректор", 1),
            ("Дизайнер", 2),
        ]:
            Attribute.objects.create(
                module=m_design_edit, name=task_name, attribute_type="number",
                cost_unit="hours", rate=1, unit="часов",
                is_cost_item=True, order=order,
            )

        # ── Общие работы проекта ──
        m_common = Module.objects.create(
            section=s_design, name="Общие работы проекта",
            module_type="default", category="work",
            is_optional=False, order=60,
        )
        for task_name, order in [
            ("Разработка дизайна исследования", 1),
            ("Разработка брифа", 2),
            ("Разработка ТЗ на рекрут", 3),
        ]:
            Attribute.objects.create(
                module=m_common, name=task_name, attribute_type="number",
                cost_unit="hours", rate=1, unit="часов",
                is_cost_item=True, order=order,
            )

        # ╔══════════════════════════════════════════════════╗
        # ║  СЕКЦИЯ: АДМИН БЛОК                              ║
        # ╚══════════════════════════════════════════════════╝
        s_admin = Section.objects.create(name="Админ блок", order=2)

        m_admin = Module.objects.create(
            section=s_admin, name="Прямые расходы", category="other", order=1,
        )
        for i, name in enumerate([
            "Внешний консалтинг",
            "Закупка данных (готовых отчётов)",
            "ГПХ",
            "Аренда платформы для форума",
        ], start=1):
            Attribute.objects.create(
                module=m_admin, name=name, attribute_type="number",
                cost_unit="currency", rate=1, unit="₽",
                is_cost_item=True, order=i,
            )

        self.stdout.write(self.style.SUCCESS("Данные созданы!"))
