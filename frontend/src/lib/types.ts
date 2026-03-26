export interface SelectOption {
  id: number;
  name: string;
  rate: string;
  order: number;
}

export type CostUnit = "hours" | "currency";

export interface Attribute {
  id: number;
  name: string;
  attribute_type: "number" | "select" | "fixed";
  cost_unit: CostUnit;
  rate: string;
  fixed_price: string;
  unit: string;
  hint: string;
  is_cost_item: boolean;
  multiply_with_id: number | null;
  order: number;
  options: SelectOption[];
}

export type ModuleType = "default" | "qualitative" | "quantitative";
export type ModuleCategory = "method" | "report" | "work" | "other";

export interface Module {
  id: number;
  name: string;
  module_type: ModuleType;
  category: ModuleCategory;
  is_optional: boolean;
  order: number;
  attributes: Attribute[];
}

export interface Section {
  id: number;
  name: string;
  has_stage_toggle: boolean;
  order: number;
  modules: Module[];
}

export type ResearchStage = "qualitative" | "quantitative" | "both";

export interface RecruitRate {
  id: number;
  name: string;
  stage: "qualitative" | "quantitative";
  rate: string;
  order: number;
}

export interface CalculatorData {
  sections: Section[];
  recruit_rates: RecruitRate[];
}

export interface CostLineItem {
  attributeId: number;
  attributeName: string;
  moduleName: string;
  sectionName: string;
  inputValue: string;
  costUnit: CostUnit;
  value: number;
}

export interface ProjectInfo {
  name: string;
  client: string;
  description: string;
}

export interface CostBreakdown {
  projectInfo: ProjectInfo;
  items: CostLineItem[];
  totalHours: number;
  totalCurrency: number;
  hoursByModule: Record<string, number>;
  currencyByModule: Record<string, number>;
  hoursBySection: Record<string, number>;
  currencyBySection: Record<string, number>;
  pseEquivalent: number;
}

export const PSE_ANNUAL_HOURS = 1752;
