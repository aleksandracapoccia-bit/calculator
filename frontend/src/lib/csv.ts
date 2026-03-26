import ExcelJS from "exceljs";
import { CostBreakdown } from "./types";

export async function generateExcel(breakdown: CostBreakdown): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Расчёт проекта");

  const { projectInfo } = breakdown;

  ws.columns = [
    { width: 28 },
    { width: 28 },
    { width: 32 },
    { width: 36 },
    { width: 14 },
    { width: 20 },
  ];

  const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 12 };
  const titleFont: Partial<ExcelJS.Font> = { bold: true, size: 14 };

  // --- Project header ---
  let row = 1;

  const titleRow = ws.getRow(row);
  titleRow.getCell(1).value = "Проект:";
  titleRow.getCell(1).font = headerFont;
  titleRow.getCell(2).value = projectInfo.name || "—";
  titleRow.getCell(2).font = titleFont;
  ws.mergeCells(row, 2, row, 6);
  row++;

  const clientRow = ws.getRow(row);
  clientRow.getCell(1).value = "Заказчик:";
  clientRow.getCell(1).font = headerFont;
  clientRow.getCell(2).value = projectInfo.client || "—";
  ws.mergeCells(row, 2, row, 6);
  row++;

  if (projectInfo.description) {
    const descRow = ws.getRow(row);
    descRow.getCell(1).value = "Описание:";
    descRow.getCell(1).font = headerFont;
    descRow.getCell(2).value = projectInfo.description;
    descRow.getCell(2).alignment = { wrapText: true };
    ws.mergeCells(row, 2, row, 6);
    row++;
  }

  row++;

  // --- Table header ---
  const thBg: ExcelJS.FillPattern = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" },
  };
  const thFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  const thAlign: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "center" };

  const headers = ["Секция", "Модуль", "Атрибут", "Значение", "Часы", "Прямые расходы (₽)"];
  const headerRow = ws.getRow(row);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = thFont;
    cell.fill = thBg;
    cell.alignment = thAlign;
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF4F46E5" } },
    };
  });
  headerRow.height = 28;
  row++;

  // --- Data rows ---
  let currentSection = "";
  let currentModule = "";

  for (const item of breakdown.items) {
    const r = ws.getRow(row);

    const sectionCol = item.sectionName !== currentSection ? item.sectionName : "";
    const moduleCol = item.moduleName !== currentModule ? item.moduleName : "";
    currentSection = item.sectionName;
    currentModule = item.moduleName;

    r.getCell(1).value = sectionCol;
    if (sectionCol) r.getCell(1).font = { bold: true };
    r.getCell(2).value = moduleCol;
    if (moduleCol) r.getCell(2).font = { bold: true, color: { argb: "FF4F46E5" } };
    r.getCell(3).value = item.attributeName;
    r.getCell(4).value = item.inputValue;
    r.getCell(4).font = { color: { argb: "FF888888" } };

    if (item.costUnit === "hours") {
      r.getCell(5).value = parseFloat(item.value.toFixed(1));
      r.getCell(5).numFmt = "0.0";
    }
    if (item.costUnit === "currency") {
      r.getCell(6).value = parseFloat(item.value.toFixed(2));
      r.getCell(6).numFmt = '#,##0.00" ₽"';
    }

    for (let c = 1; c <= 6; c++) {
      r.getCell(c).border = {
        bottom: { style: "hair", color: { argb: "FFE5E7EB" } },
      };
    }

    row++;
  }

  row++;

  // --- Totals ---
  const totalStyle: Partial<ExcelJS.Font> = { bold: true, size: 12 };
  const blueFont: Partial<ExcelJS.Font> = { bold: true, size: 12, color: { argb: "FF2563EB" } };
  const amberFont: Partial<ExcelJS.Font> = { bold: true, size: 12, color: { argb: "FFD97706" } };

  const hoursRow = ws.getRow(row);
  hoursRow.getCell(1).value = "ИТОГО ТРУДОЗАТРАТЫ";
  hoursRow.getCell(1).font = totalStyle;
  hoursRow.getCell(5).value = parseFloat(breakdown.totalHours.toFixed(1));
  hoursRow.getCell(5).font = blueFont;
  hoursRow.getCell(5).numFmt = "0.0";
  row++;

  const pseRow = ws.getRow(row);
  pseRow.getCell(1).value = "ПШЕ";
  pseRow.getCell(1).font = totalStyle;
  pseRow.getCell(4).value = `${breakdown.totalHours.toFixed(1)} ч / 1752 ч`;
  pseRow.getCell(4).font = { color: { argb: "FF888888" } };
  pseRow.getCell(5).value = parseFloat(breakdown.pseEquivalent.toFixed(2));
  pseRow.getCell(5).font = blueFont;
  pseRow.getCell(5).numFmt = "0.00";
  row++;

  row++;
  const currencyRow = ws.getRow(row);
  currencyRow.getCell(1).value = "ИТОГО ПРЯМЫЕ РАСХОДЫ";
  currencyRow.getCell(1).font = totalStyle;
  currencyRow.getCell(6).value = parseFloat(breakdown.totalCurrency.toFixed(2));
  currencyRow.getCell(6).font = amberFont;
  currencyRow.getCell(6).numFmt = '#,##0.00" ₽"';

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function downloadExcel(breakdown: CostBreakdown) {
  const blob = await generateExcel(breakdown);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = breakdown.projectInfo.name
    ? breakdown.projectInfo.name.replace(/[^a-zA-Zа-яА-ЯёЁ0-9 _-]/g, "").trim().replace(/\s+/g, "_")
    : "research_cost";
  link.download = `${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
