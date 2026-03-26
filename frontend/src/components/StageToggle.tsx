"use client";

import { ResearchStage } from "@/lib/types";

const OPTIONS: { value: ResearchStage; label: string }[] = [
  { value: "qualitative", label: "Только качественный" },
  { value: "both", label: "Оба этапа" },
  { value: "quantitative", label: "Только количественный" },
];

interface Props {
  value: ResearchStage;
  onChange: (v: ResearchStage) => void;
}

export default function StageToggle({ value, onChange }: Props) {
  return (
    <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
            value === opt.value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
