"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Section, Module, RecruitRate, ResearchStage, CostBreakdown, ProjectInfo } from "@/lib/types";
import { fetchStructure } from "@/lib/api";
import { calculateCosts } from "@/lib/calculate";
import StageToggle from "./StageToggle";
import ModuleCard from "./ModuleCard";
import ResultsPanel from "./ResultsPanel";

const STEPS = [
  { id: 1, title: "Дизайн" },
  { id: 2, title: "Методы" },
  { id: 3, title: "Отчётность" },
  { id: 4, title: "Параметры" },
  { id: 5, title: "Админ блок" },
  { id: 6, title: "Результаты" },
];

function isModuleVisibleByStage(
  moduleType: string,
  stage: ResearchStage,
  sectionHasToggle: boolean
): boolean {
  if (!sectionHasToggle || moduleType === "default") return true;
  if (stage === "both") return true;
  return moduleType === stage;
}

function CheckboxButton({ isOn, label, onClick }: { isOn: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 px-4 py-3 text-sm font-medium text-left
                  transition-all duration-150 cursor-pointer ${
        isOn
          ? "border-indigo-400 bg-indigo-50 text-indigo-700"
          : "border-gray-150 bg-white text-gray-500 hover:border-gray-300"
      }`}
    >
      <span className={`inline-block w-4 h-4 rounded mr-2 border-2 align-text-bottom transition-colors ${
        isOn ? "bg-indigo-500 border-indigo-500" : "border-gray-300 bg-white"
      }`}>
        {isOn && (
          <svg viewBox="0 0 16 16" fill="white" className="w-full h-full">
            <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2.5-2.5a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

export default function Calculator() {
  const [sections, setSections] = useState<Section[]>([]);
  const [recruitRates, setRecruitRates] = useState<RecruitRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [stage, setStage] = useState<ResearchStage>("both");
  const [values, setValues] = useState<Record<number, string>>({});
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);
  const [enabledOptional, setEnabledOptional] = useState<Set<number>>(new Set());
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    name: "", client: "", description: "",
  });
  const [selectedRecruit, setSelectedRecruit] = useState<Record<number, number | undefined>>({});
  const [recruitEnabled, setRecruitEnabled] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchStructure()
      .then((data) => {
        setSections(data.sections);
        setRecruitRates(data.recruit_rates);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = useCallback((attrId: number, value: string) => {
    setValues((prev) => ({ ...prev, [attrId]: value }));
  }, []);

  const toggleOptionalModule = useCallback((moduleId: number) => {
    setEnabledOptional((prev) => {
      const next = new Set(prev);
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
      return next;
    });
  }, []);

  const designSection = sections.find((s) => s.has_stage_toggle);
  const adminSection = sections.find((s) => !s.has_stage_toggle);

  const stageVisible = useCallback(
    (m: Module) => isModuleVisibleByStage(m.module_type, stage, true),
    [stage]
  );

  const enabledModuleIds = useMemo(() => {
    const ids = new Set<number>();
    for (const section of sections) {
      for (const mod of section.modules) {
        const hasToggle = section.has_stage_toggle;
        if (!isModuleVisibleByStage(mod.module_type, stage, hasToggle)) continue;
        if (mod.is_optional && !enabledOptional.has(mod.id)) continue;
        ids.add(mod.id);
      }
    }
    return ids;
  }, [sections, stage, enabledOptional]);

  const handleCalculate = () => {
    setBreakdown(calculateCosts(sections, values, enabledModuleIds, projectInfo, recruitRates, selectedRecruit));
    setStep(6);
  };

  const recruitRatesByStage = useMemo(() => ({
    qualitative: recruitRates.filter((r) => r.stage === "qualitative"),
    quantitative: recruitRates.filter((r) => r.stage === "quantitative"),
  }), [recruitRates]);

  const getRecruitForModule = useCallback((mod: Module) => {
    const stageKey = mod.module_type as "qualitative" | "quantitative";
    const rates = recruitRatesByStage[stageKey] || [];
    if (rates.length === 0) return undefined;
    const hasRespondents = mod.attributes.some(
      (a) => a.name.toLowerCase().includes("респондент")
    );
    if (!hasRespondents) return undefined;
    return {
      rates,
      enabled: !!recruitEnabled[mod.id],
      selectedId: selectedRecruit[mod.id],
      onToggle: (on: boolean) =>
        setRecruitEnabled((prev) => ({ ...prev, [mod.id]: on })),
      onSelect: (rateId: number | undefined) =>
        setSelectedRecruit((prev) => ({ ...prev, [mod.id]: rateId })),
    };
  }, [recruitRatesByStage, selectedRecruit, recruitEnabled]);

  // --- Derived data for steps ---
  const qualMethods = designSection?.modules.filter(
    (m) => m.is_optional && m.category === "method" && m.module_type === "qualitative"
  ) || [];
  const quantMethods = designSection?.modules.filter(
    (m) => m.is_optional && m.category === "method" && m.module_type === "quantitative"
  ) || [];
  const qualReports = designSection?.modules.filter(
    (m) => m.is_optional && m.category === "report" && m.module_type === "qualitative"
  ) || [];
  const quantReports = designSection?.modules.filter(
    (m) => m.is_optional && m.category === "report" && m.module_type === "quantitative"
  ) || [];
  const qualWorkModule = designSection?.modules.find(
    (m) => m.category === "work" && m.module_type === "qualitative"
  ) || null;
  const quantWorkModule = designSection?.modules.find(
    (m) => m.category === "work" && m.module_type === "quantitative"
  ) || null;
  const presentationModule = designSection?.modules.find(
    (m) => m.category === "work" && m.module_type === "default" && m.name.toLowerCase().includes("презентация")
  ) || null;
  const commonWorkModules = designSection?.modules.filter(
    (m) => m.category === "work" && m.module_type === "default" && m !== presentationModule
  ) || [];
  const enabledMethodModules = designSection?.modules.filter(
    (m) => m.is_optional && m.category === "method" && enabledOptional.has(m.id) && stageVisible(m)
  ) || [];
  const enabledQualReports = designSection?.modules.filter(
    (m) => m.is_optional && m.category === "report" && m.module_type === "qualitative" && enabledOptional.has(m.id)
  ) || [];
  const enabledQuantReports = designSection?.modules.filter(
    (m) => m.is_optional && m.category === "report" && m.module_type === "quantitative" && enabledOptional.has(m.id)
  ) || [];

  const hasMethodsSelected = enabledMethodModules.length > 0;

  const presentationAttrs = presentationModule?.attributes || [];

  const qualWorkAppend = useMemo(() => {
    const sections: { label: string; attributes: typeof presentationAttrs }[] = [];
    const reportAttrs = enabledQualReports.flatMap((m) =>
      m.attributes.map((a) => ({ ...a, name: m.name }))
    );
    if (reportAttrs.length > 0) sections.push({ label: "Отчётность", attributes: reportAttrs });
    if (presentationAttrs.length > 0) sections.push({ label: "Презентация", attributes: presentationAttrs });
    return sections;
  }, [enabledQualReports, presentationAttrs]);

  const quantWorkAppend = useMemo(() => {
    const sections: { label: string; attributes: typeof presentationAttrs }[] = [];
    const reportAttrs = enabledQuantReports.flatMap((m) =>
      m.attributes.map((a) => ({ ...a, name: m.name }))
    );
    if (reportAttrs.length > 0) sections.push({ label: "Отчётность", attributes: reportAttrs });
    if (presentationAttrs.length > 0) sections.push({ label: "Презентация", attributes: presentationAttrs });
    return sections;
  }, [enabledQuantReports, presentationAttrs]);

  // --- Rendering ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-indigo-500" />
          <span className="text-sm text-gray-400">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <nav className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s) => {
          const isCurrent = s.id === step;
          const isPast = s.id < step;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (s.id === 6) return;
                setStep(s.id);
                setBreakdown(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                          transition-colors cursor-pointer ${
                isCurrent
                  ? "bg-indigo-500 text-white"
                  : isPast
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                isCurrent ? "bg-white/20" : isPast ? "bg-indigo-100" : "bg-gray-100"
              }`}>
                {isPast ? "✓" : s.id}
              </span>
              <span className="hidden sm:inline">{s.title}</span>
            </button>
          );
        })}
      </nav>

      {/* Step 1: Project Info & Research Design */}
      {step === 1 && (
        <div className="animate-in space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">О проекте</h2>
            <p className="text-sm text-gray-400">Заполните информацию о проекте и выберите дизайн исследования</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="project-name" className="text-sm font-medium text-gray-700">
                Название проекта
              </label>
              <input
                id="project-name"
                type="text"
                value={projectInfo.name}
                onChange={(e) => setProjectInfo((p) => ({ ...p, name: e.target.value }))}
                placeholder="Например: Исследование удовлетворённости клиентов"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm
                           focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                           outline-none transition-all placeholder:text-gray-300"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="project-client" className="text-sm font-medium text-gray-700">
                Заказчик
                <span className="text-gray-400 ml-1">(блок, подразделение, ФИО)</span>
              </label>
              <input
                id="project-client"
                type="text"
                value={projectInfo.client}
                onChange={(e) => setProjectInfo((p) => ({ ...p, client: e.target.value }))}
                placeholder="Например: Департамент маркетинга, Иванов И.И."
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm
                           focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                           outline-none transition-all placeholder:text-gray-300"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="project-desc" className="text-sm font-medium text-gray-700">
                Описание проекта
              </label>
              <textarea
                id="project-desc"
                value={projectInfo.description}
                onChange={(e) => setProjectInfo((p) => ({ ...p, description: e.target.value }))}
                placeholder="Краткое описание целей и задач исследования"
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm
                           focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                           outline-none transition-all placeholder:text-gray-300 resize-y"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
              Дизайн исследования
            </p>
            <StageToggle value={stage} onChange={setStage} />
          </div>

          <div className="flex justify-end">
            <NextButton onClick={() => setStep(2)} />
          </div>
        </div>
      )}

      {/* Step 2: Method Selection */}
      {step === 2 && (
        <div className="animate-in space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Выберите методы</h2>
            <p className="text-sm text-gray-400">Отметьте все методы, которые нужны в проекте</p>
          </div>

          {(stage === "qualitative" || stage === "both") && qualMethods.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                Качественные методы
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {qualMethods.map((mod) => (
                  <CheckboxButton
                    key={mod.id}
                    isOn={enabledOptional.has(mod.id)}
                    label={mod.name}
                    onClick={() => toggleOptionalModule(mod.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {(stage === "quantitative" || stage === "both") && quantMethods.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                Количественные методы
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quantMethods.map((mod) => (
                  <CheckboxButton
                    key={mod.id}
                    isOn={enabledOptional.has(mod.id)}
                    label={mod.name}
                    onClick={() => toggleOptionalModule(mod.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <BackButton onClick={() => setStep(1)} />
            <NextButton onClick={() => setStep(3)} disabled={!hasMethodsSelected} />
          </div>
        </div>
      )}

      {/* Step 3: Report Selection */}
      {step === 3 && (
        <div className="animate-in space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Отчётность</h2>
            <p className="text-sm text-gray-400">Какие отчёты потребуются на проекте?</p>
          </div>

          {(stage === "qualitative" || stage === "both") && qualReports.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                Качественный этап
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {qualReports.map((mod) => (
                  <CheckboxButton
                    key={mod.id}
                    isOn={enabledOptional.has(mod.id)}
                    label={mod.name}
                    onClick={() => toggleOptionalModule(mod.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {(stage === "quantitative" || stage === "both") && quantReports.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                Количественный этап
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quantReports.map((mod) => (
                  <CheckboxButton
                    key={mod.id}
                    isOn={enabledOptional.has(mod.id)}
                    label={mod.name}
                    onClick={() => toggleOptionalModule(mod.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <BackButton onClick={() => setStep(2)} />
            <NextButton onClick={() => setStep(4)} />
          </div>
        </div>
      )}

      {/* Step 4: Parameters */}
      {step === 4 && (
        <div className="animate-in space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Заполните параметры</h2>
            <p className="text-sm text-gray-400">
              Укажите выборку, часы и другие данные для выбранных методов и отчётов
            </p>
          </div>

          {enabledMethodModules.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {enabledMethodModules.map((mod) => (
                <ModuleCard
                  key={mod.id}
                  module={mod}
                  values={values}
                  onChange={handleChange}
                  recruit={getRecruitForModule(mod)}
                />
              ))}
            </div>
          )}

          {/* Composite work cards: work + reports + presentation */}
          <div className={`grid gap-6 ${
            (qualWorkModule && stageVisible(qualWorkModule) ? 1 : 0) +
            (quantWorkModule && stageVisible(quantWorkModule) ? 1 : 0) >= 2
              ? "md:grid-cols-2" : "max-w-2xl"
          }`}>
            {qualWorkModule && stageVisible(qualWorkModule) && (
              <ModuleCard
                module={qualWorkModule}
                values={values}
                onChange={handleChange}
                appendSections={qualWorkAppend}
              />
            )}
            {quantWorkModule && stageVisible(quantWorkModule) && (
              <ModuleCard
                module={quantWorkModule}
                values={values}
                onChange={handleChange}
                appendSections={quantWorkAppend}
              />
            )}
          </div>

          {commonWorkModules.length > 0 && (
            <div className={`grid gap-6 ${
              commonWorkModules.length >= 2 ? "md:grid-cols-2" : "max-w-lg"
            }`}>
              {commonWorkModules.map((mod) => (
                <ModuleCard key={mod.id} module={mod} values={values} onChange={handleChange} />
              ))}
            </div>
          )}

          <div className="flex justify-between">
            <BackButton onClick={() => setStep(3)} />
            <NextButton onClick={() => setStep(5)} />
          </div>
        </div>
      )}

      {/* Step 5: Admin block */}
      {step === 5 && adminSection && (
        <div className="animate-in space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Админ блок</h2>
            <p className="text-sm text-gray-400">Аренда, ГПХ, подписки и другие расходы</p>
          </div>

          <div className={`grid gap-6 ${
            adminSection.modules.length <= 1 ? "max-w-lg"
              : adminSection.modules.length === 2 ? "md:grid-cols-2"
                : "md:grid-cols-3"
          }`}>
            {adminSection.modules.map((mod) => (
              <ModuleCard key={mod.id} module={mod} values={values} onChange={handleChange} />
            ))}
          </div>

          <div className="flex justify-between">
            <BackButton onClick={() => setStep(4)} />
            <button
              type="button"
              onClick={handleCalculate}
              className="rounded-xl bg-indigo-500 px-8 py-3 text-sm font-semibold
                         text-white hover:bg-indigo-600 active:bg-indigo-700
                         transition-all shadow-lg shadow-indigo-200 cursor-pointer"
            >
              Рассчитать стоимость
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Results */}
      {step === 6 && breakdown && (
        <ResultsPanel
          breakdown={breakdown}
          onBack={() => {
            setBreakdown(null);
            setStep(5);
          }}
        />
      )}
    </div>
  );
}

function NextButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white
                 hover:bg-indigo-600 transition-all shadow-sm cursor-pointer
                 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Далее →
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium
                 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      ← Назад
    </button>
  );
}
