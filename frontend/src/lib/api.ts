import { CalculatorData } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchStructure(): Promise<CalculatorData> {
  const url = typeof window === "undefined"
    ? `${process.env.INTERNAL_API_URL || API_BASE}/api/calculator/structure/`
    : `${API_BASE}/api/calculator/structure/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Не удалось загрузить структуру калькулятора");
  return res.json();
}
