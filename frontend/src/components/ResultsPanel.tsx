"use client";

import { CostBreakdown } from "@/lib/types";
import { downloadExcel } from "@/lib/csv";

interface Props {
  breakdown: CostBreakdown;
  onBack: () => void;
}

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtHours(n: number): string {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
}

export default function ResultsPanel({ breakdown, onBack }: Props) {
  const sectionNames = [...new Set(breakdown.items.map((i) => i.sectionName))];
  const { projectInfo } = breakdown;

  const handleDownload = () => { downloadExcel(breakdown); };

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Результаты расчёта</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium
                       text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Назад
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium
                       text-white hover:bg-emerald-600 transition-colors
                       shadow-sm shadow-emerald-200 cursor-pointer"
          >
            Скачать Excel
          </button>
        </div>
      </div>

      {/* Project info */}
      {(projectInfo.name || projectInfo.client) && (
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5">
          {projectInfo.name && (
            <p className="text-lg font-semibold text-gray-900">{projectInfo.name}</p>
          )}
          {projectInfo.client && (
            <p className="text-sm text-gray-500 mt-1">Заказчик: {projectInfo.client}</p>
          )}
          {projectInfo.description && (
            <p className="text-sm text-gray-400 mt-2">{projectInfo.description}</p>
          )}
        </div>
      )}

      {/* Detail by section */}
      {sectionNames.map((sectionName) => {
        const sectionItems = breakdown.items.filter(
          (i) => i.sectionName === sectionName
        );
        const moduleNames = [...new Set(sectionItems.map((i) => i.moduleName))];
        const sectionHours = breakdown.hoursBySection[sectionName] || 0;
        const sectionCurrency = breakdown.currencyBySection[sectionName] || 0;

        return (
          <div key={sectionName} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">{sectionName}</h3>
                <div className="flex gap-4 text-sm">
                  {sectionHours > 0 && (
                    <span className="font-semibold text-blue-600">
                      {fmtHours(sectionHours)} ч
                    </span>
                  )}
                  {sectionCurrency > 0 && (
                    <span className="font-semibold text-gray-900">
                      {fmt(sectionCurrency)} ₽
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {moduleNames.map((moduleName) => {
                const moduleItems = sectionItems.filter(
                  (i) => i.moduleName === moduleName
                );
                if (moduleItems.length === 0) return null;
                const modHours = breakdown.hoursByModule[moduleName] || 0;
                const modCurrency = breakdown.currencyByModule[moduleName] || 0;

                return (
                  <div key={moduleName} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">
                        {moduleName}
                      </h4>
                      <div className="flex gap-3 text-sm">
                        {modHours > 0 && (
                          <span className="font-medium text-blue-500">{fmtHours(modHours)} ч</span>
                        )}
                        {modCurrency > 0 && (
                          <span className="font-medium text-gray-600">{fmt(modCurrency)} ₽</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {moduleItems.map((item) => (
                        <div
                          key={item.attributeId}
                          className="flex items-center justify-between text-sm py-1"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-gray-600 shrink-0">{item.attributeName}</span>
                            <span className="text-gray-400 truncate">{item.inputValue}</span>
                          </div>
                          <span className={`font-medium shrink-0 ml-4 ${
                            item.costUnit === "hours" ? "text-blue-600" : "text-gray-900"
                          }`}>
                            {item.costUnit === "hours"
                              ? `${fmtHours(item.value)} ч`
                              : `${fmt(item.value)} ₽`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Summary cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {breakdown.totalHours > 0 && (
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Трудозатраты</h3>
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">{fmtHours(breakdown.totalHours)}</div>
                <div className="text-sm text-blue-400 mt-1">часов</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">{breakdown.pseEquivalent.toFixed(2)}</div>
                <div className="text-sm text-blue-400 mt-1">ПШЕ</div>
              </div>
            </div>
            <p className="text-xs text-blue-400 mt-4 text-center">Стоимость 1 ПШЕ определяется отдельно</p>
          </div>
        )}

        {breakdown.totalCurrency > 0 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-6">
            <h3 className="text-lg font-semibold text-amber-900 mb-4">Прямые расходы</h3>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600">{fmt(breakdown.totalCurrency)} ₽</div>
              <div className="text-sm text-amber-400 mt-1">рекрут, аренда, ГПХ, консалтинг</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-xl bg-emerald-500 px-8 py-3 text-base font-medium
                     text-white hover:bg-emerald-600 transition-colors
                     shadow-md shadow-emerald-200 cursor-pointer"
        >
          Скачать Excel
        </button>
      </div>
    </div>
  );
}
