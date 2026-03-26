"use client";

import { Module, Attribute, RecruitRate } from "@/lib/types";
import AttributeField from "./AttributeField";

interface RecruitConfig {
  rates: RecruitRate[];
  enabled: boolean;
  selectedId?: number;
  onToggle: (on: boolean) => void;
  onSelect: (rateId: number | undefined) => void;
}

interface Props {
  module: Module;
  values: Record<number, string>;
  onChange: (attrId: number, value: string) => void;
  appendSections?: { label: string; attributes: Attribute[] }[];
  recruit?: RecruitConfig;
}

export default function ModuleCard({ module, values, onChange, appendSections, recruit }: Props) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-5">{module.name}</h3>
      <div className="flex flex-col gap-4">
        {module.attributes.map((attr) => (
          <AttributeField
            key={attr.id}
            attribute={attr}
            value={values[attr.id] || ""}
            onChange={onChange}
          />
        ))}

        {recruit && recruit.rates.length > 0 && (
          <div className="flex flex-col gap-3 pt-3 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700">Нужен рекрут?</p>
            <div className="flex gap-3">
              {["yes", "no"].map((opt) => {
                const isActive = opt === "yes" ? recruit.enabled : !recruit.enabled;
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium
                                cursor-pointer transition-all ${
                      isActive
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`recruit-toggle-${module.id}`}
                      checked={isActive}
                      onChange={() => {
                        if (opt === "yes") {
                          recruit.onToggle(true);
                        } else {
                          recruit.onToggle(false);
                          recruit.onSelect(undefined);
                        }
                      }}
                      className="sr-only"
                    />
                    {opt === "yes" ? "Да" : "Нет"}
                  </label>
                );
              })}
            </div>

            {recruit.enabled && (
              <div className="flex flex-col gap-1.5 animate-in">
                <label className="text-sm font-medium text-gray-700">Выберите ЦА</label>
                <select
                  value={recruit.selectedId ?? ""}
                  onChange={(e) =>
                    recruit.onSelect(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm
                             focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                             outline-none transition-all bg-white"
                >
                  <option value="">— выберите —</option>
                  {recruit.rates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {parseFloat(r.rate).toLocaleString("ru-RU")} ₽ / респондент
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">Стоимость за 1 респондента × количество респондентов</p>
              </div>
            )}
          </div>
        )}

        {appendSections?.map((section) =>
          section.attributes.length > 0 ? (
            <div key={section.label} className="flex flex-col gap-4 pt-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-t border-gray-100 pt-4">
                {section.label}
              </p>
              {section.attributes.map((attr) => (
                <AttributeField
                  key={attr.id}
                  attribute={attr}
                  value={values[attr.id] || ""}
                  onChange={onChange}
                />
              ))}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
