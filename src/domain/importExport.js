import { DATA_VERSION, isPeriod } from "./types.js";

export function parseBackupJson(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "JSON could not be parsed" };
  }
  const error = validateAppData(parsed);
  if (error) return { ok: false, error };
  return { ok: true, data: parsed };
}

export function importJsonBackup(currentData, json, mode = "overwrite", now = new Date().toISOString()) {
  const parsed = parseBackupJson(json);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, data: currentData, backup: null };
  }
  const backup = { ...currentData, backupCreatedAt: now };
  if (mode === "overwrite") {
    return { ok: true, data: parsed.data, backup };
  }
  if (mode === "merge") {
    return { ok: true, data: mergeData(currentData, parsed.data), backup };
  }
  return { ok: false, error: "Import mode must be overwrite or merge", data: currentData, backup: null };
}

export function exportJson(data) {
  return JSON.stringify(data, null, 2);
}

export function exportCsv(data) {
  const categories = new Map(data.categories.map((category) => [category.id, category]));
  const rows = [["Date", "Amount", "Parent Category", "Child Category", "Note"]];
  for (const expense of [...data.expenses].sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([
      expense.date,
      Number(expense.amount).toFixed(2),
      categories.get(expense.categoryId)?.name || "Unknown",
      categories.get(expense.subcategoryId)?.name || "Unknown",
      expense.note || ""
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function validateAppData(data) {
  if (!data || typeof data !== "object") return "Backup must be an object";
  if (data.version !== DATA_VERSION) return "Backup version is not recognized";
  if (!Array.isArray(data.expenses) || !Array.isArray(data.categories) || !Array.isArray(data.budgetRules)) {
    return "Backup arrays are missing";
  }
  if (!data.preferences || typeof data.preferences !== "object") return "Preferences are missing";

  for (const category of data.categories) {
    if (!category.id || !category.name || typeof category.active !== "boolean" || !("parentId" in category)) {
      return "Category records are invalid";
    }
  }
  for (const expense of data.expenses) {
    if (!expense.id || !(Number(expense.amount) > 0) || !validDate(expense.date) || !expense.categoryId || !expense.subcategoryId) {
      return "Expense records are invalid";
    }
  }
  for (const rule of data.budgetRules) {
    if (!rule.id || !rule.categoryId || !isPeriod(rule.period) || !(Number(rule.amount) > 0) || typeof rule.active !== "boolean") {
      return "Budget rule records are invalid";
    }
  }
  return null;
}

function mergeData(current, incoming) {
  return {
    ...current,
    version: DATA_VERSION,
    expenses: mergeById(current.expenses, incoming.expenses),
    categories: mergeById(current.categories, incoming.categories),
    budgetRules: mergeById(current.budgetRules, incoming.budgetRules),
    preferences: { ...current.preferences, ...incoming.preferences }
  };
}

function mergeById(left, right) {
  const map = new Map(left.map((item) => [item.id, item]));
  for (const item of right) map.set(item.id, item);
  return Array.from(map.values());
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll("\"", "\"\"")}"`;
  return text;
}
