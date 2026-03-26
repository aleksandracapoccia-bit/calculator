import {
  Section,
  Attribute,
  RecruitRate,
  CostBreakdown,
  CostLineItem,
  CostUnit,
  ProjectInfo,
  PSE_ANNUAL_HOURS,
} from "./types";

type FormValues = Record<number, string>;

function getNumericValue(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function computeAttributeResult(
  attr: Attribute,
  values: FormValues,
  allAttributes: Attribute[]
): { value: number; displayValue: string; costUnit: CostUnit } | null {
  if (!attr.is_cost_item) return null;

  const costUnit = attr.cost_unit;

  switch (attr.attribute_type) {
    case "number": {
      const qty = getNumericValue(values[attr.id]);
      if (qty === 0) return null;
      const rate = parseFloat(attr.rate);
      let value = rate * qty;

      if (attr.multiply_with_id) {
        const multiplierValue = getNumericValue(values[attr.multiply_with_id]);
        if (multiplierValue === 0) return null;
        value = rate * qty * multiplierValue;
        const unitLabel = costUnit === "hours" ? "ч" : "₽";
        return {
          value,
          displayValue: `${qty} × ${multiplierValue} = ${value.toLocaleString("ru-RU")} ${unitLabel}`,
          costUnit,
        };
      }

      const unitLabel = costUnit === "hours" ? "ч" : "₽";
      return {
        value,
        displayValue: `${qty} ${attr.unit} → ${value.toLocaleString("ru-RU")} ${unitLabel}`,
        costUnit,
      };
    }
    case "select": {
      const selectedOptionId = values[attr.id];
      if (!selectedOptionId) return null;
      const option = attr.options.find((o) => String(o.id) === selectedOptionId);
      if (!option) return null;
      const optionRate = parseFloat(option.rate);
      let value = optionRate;

      if (attr.multiply_with_id) {
        const multiplierValue = getNumericValue(values[attr.multiply_with_id]);
        if (multiplierValue === 0) return null;
        value = optionRate * multiplierValue;
        const multiplierAttr = allAttributes.find(
          (a) => a.id === attr.multiply_with_id
        );
        const unitLabel = costUnit === "hours" ? "ч" : "₽";
        return {
          value,
          displayValue: `${option.name} × ${multiplierValue} ${multiplierAttr?.unit || ""} = ${value.toLocaleString("ru-RU")} ${unitLabel}`,
          costUnit,
        };
      }
      const unitLabel = costUnit === "hours" ? "ч" : "₽";
      return {
        value,
        displayValue: `${option.name} = ${value.toLocaleString("ru-RU")} ${unitLabel}`,
        costUnit,
      };
    }
    case "fixed": {
      const enabled = values[attr.id] === "true";
      if (!enabled) return null;
      const price = parseFloat(attr.fixed_price);
      return {
        value: price,
        displayValue: `${price.toLocaleString("ru-RU")} ₽`,
        costUnit: "currency",
      };
    }
    default:
      return null;
  }
}

/**
 * For a given method module, find the respondent count from its attributes.
 */
function getRespondentsForModule(
  mod: { attributes: Attribute[] },
  values: FormValues
): number {
  for (const attr of mod.attributes) {
    if (attr.name.toLowerCase().includes("респондент")) {
      return getNumericValue(values[attr.id]);
    }
  }
  return 0;
}

export function calculateCosts(
  sections: Section[],
  values: FormValues,
  enabledModuleIds: Set<number>,
  projectInfo: ProjectInfo,
  recruitRates: RecruitRate[],
  selectedRecruitIds: Record<number, number | undefined>
): CostBreakdown {
  const items: CostLineItem[] = [];
  let totalHours = 0;
  let totalCurrency = 0;
  const hoursByModule: Record<string, number> = {};
  const currencyByModule: Record<string, number> = {};
  const hoursBySection: Record<string, number> = {};
  const currencyBySection: Record<string, number> = {};

  const allAttributes = sections.flatMap((s) =>
    s.modules.flatMap((m) => m.attributes)
  );

  for (const section of sections) {
    let sectionHours = 0;
    let sectionCurrency = 0;

    for (const mod of section.modules) {
      if (!enabledModuleIds.has(mod.id)) continue;
      let modHours = 0;
      let modCurrency = 0;

      for (const attr of mod.attributes) {
        const result = computeAttributeResult(attr, values, allAttributes);
        if (!result) continue;

        items.push({
          attributeId: attr.id,
          attributeName: attr.name,
          moduleName: mod.name,
          sectionName: section.name,
          inputValue: result.displayValue,
          costUnit: result.costUnit,
          value: result.value,
        });

        if (result.costUnit === "hours") {
          modHours += result.value;
        } else {
          modCurrency += result.value;
        }
      }

      if (modHours > 0) hoursByModule[mod.name] = modHours;
      if (modCurrency > 0) currencyByModule[mod.name] = modCurrency;
      sectionHours += modHours;
      sectionCurrency += modCurrency;
    }

    if (sectionHours > 0) hoursBySection[section.name] = sectionHours;
    if (sectionCurrency > 0) currencyBySection[section.name] = sectionCurrency;
    totalHours += sectionHours;
    totalCurrency += sectionCurrency;
  }

  // Recruit costs (per method)
  for (const section of sections) {
    for (const mod of section.modules) {
      if (!enabledModuleIds.has(mod.id)) continue;
      if (mod.category !== "method") continue;
      const rateId = selectedRecruitIds[mod.id];
      if (!rateId) continue;
      const respondents = getRespondentsForModule(mod, values);
      if (respondents === 0) continue;
      const rate = recruitRates.find((r) => r.id === rateId);
      if (!rate) continue;

      const rateValue = parseFloat(rate.rate);
      const cost = rateValue * respondents;

      items.push({
        attributeId: -(mod.id * 1000 + rateId),
        attributeName: `Рекрут (${rate.name})`,
        moduleName: mod.name,
        sectionName: section.name,
        inputValue: `${rate.name} ${rateValue.toLocaleString("ru-RU")} ₽ × ${respondents} чел. = ${cost.toLocaleString("ru-RU")} ₽`,
        costUnit: "currency",
        value: cost,
      });

      totalCurrency += cost;
      currencyByModule[mod.name] = (currencyByModule[mod.name] || 0) + cost;
      currencyBySection[section.name] = (currencyBySection[section.name] || 0) + cost;
    }
  }

  return {
    projectInfo,
    items,
    totalHours,
    totalCurrency,
    hoursByModule,
    currencyByModule,
    hoursBySection,
    currencyBySection,
    pseEquivalent: totalHours / PSE_ANNUAL_HOURS,
  };
}
