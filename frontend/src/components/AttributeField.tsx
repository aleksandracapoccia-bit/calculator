"use client";

import { Attribute } from "@/lib/types";

interface Props {
  attribute: Attribute;
  value: string;
  onChange: (attrId: number, value: string) => void;
}

export default function AttributeField({ attribute, value, onChange }: Props) {
  const { id, name, attribute_type, cost_unit, unit, hint, options, fixed_price } = attribute;

  switch (attribute_type) {
    case "number":
      return (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`attr-${id}`} className="text-sm font-medium text-gray-700">
            {name}
            {unit && <span className="text-gray-400 ml-1">({unit})</span>}
          </label>
          <input
            id={`attr-${id}`}
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(e) => onChange(id, e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm
                       focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                       outline-none transition-all placeholder:text-gray-300"
          />
          {hint && <p className="text-xs text-gray-400">{hint}</p>}
        </div>
      );

    case "select":
      return (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`attr-${id}`} className="text-sm font-medium text-gray-700">
            {name}
          </label>
          <div className="relative">
            <select
              id={`attr-${id}`}
              value={value}
              onChange={(e) => onChange(id, e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 pr-10 text-sm
                         focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                         outline-none transition-all bg-white appearance-none
                         cursor-pointer"
            >
              <option value="">Выберите...</option>
              {options.map((opt) => {
                const rateNum = parseFloat(opt.rate);
                const suffix = cost_unit === "hours"
                  ? ""
                  : ` — ${rateNum.toLocaleString("ru-RU")} ₽`;
                return (
                  <option key={opt.id} value={String(opt.id)}>
                    {opt.name}{suffix}
                  </option>
                );
              })}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {hint && <p className="text-xs text-gray-400">{hint}</p>}
        </div>
      );

    case "fixed":
      return (
        <label
          htmlFor={`attr-${id}`}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <input
            id={`attr-${id}`}
            type="checkbox"
            checked={value === "true"}
            onChange={(e) => onChange(id, e.target.checked ? "true" : "false")}
            className="h-5 w-5 rounded border-gray-300 text-indigo-500
                       focus:ring-indigo-400 focus:ring-2 cursor-pointer"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
            {name}
            <span className="text-gray-400 ml-2">
              {parseFloat(fixed_price).toLocaleString("ru-RU")} ₽
            </span>
          </span>
        </label>
      );
  }
}
