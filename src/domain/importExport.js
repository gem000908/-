import { DATA_VERSION, isPeriod } from "./types.js";

export function parseBackupJson(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "JSON 无法解析" };
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
  return { ok: false, error: "导入模式必须是覆盖或合并", data: currentData, backup: null };
}

export function exportJson(data) {
  return JSON.stringify(data, null, 2);
}

export function exportCsv(data) {
  const categories = new Map(data.categories.map((category) => [category.id, category]));
  const rows = [["日期", "金额", "一级分类", "二级分类", "备注"]];
  for (const expense of [...data.expenses].sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([
      expense.date,
      Number(expense.amount).toFixed(2),
      categories.get(expense.categoryId)?.name || "未知",
      categories.get(expense.subcategoryId)?.name || "未知",
      expense.note || ""
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function validateAppData(data) {
  if (!data || typeof data !== "object") return "备份必须是一个对象";
  if (data.version !== DATA_VERSION) return "无法识别备份版本";
  if (!Array.isArray(data.expenses) || !Array.isArray(data.categories) || !Array.isArray(data.budgetRules)) {
    return "备份缺少必要数组";
  }
  if (!data.preferences || typeof data.preferences !== "object") return "备份缺少偏好设置";

  for (const category of data.categories) {
    if (!category.id || !category.name || typeof category.active !== "boolean" || !("parentId" in category)) {
      return "分类记录无效";
    }
  }
  for (const expense of data.expenses) {
    if (!expense.id || !(Number(expense.amount) > 0) || !validDate(expense.date) || !expense.categoryId || !expense.subcategoryId) {
      return "支出记录无效";
    }
  }
  for (const rule of data.budgetRules) {
    if (!rule.id || !rule.categoryId || !isPeriod(rule.period) || !(Number(rule.amount) > 0) || typeof rule.active !== "boolean") {
      return "预算规则记录无效";
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
