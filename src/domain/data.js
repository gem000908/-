import { isPeriod } from "./types.js";

export function addExpense(data, input, now = new Date().toISOString()) {
  validateExpenseInput(data, input);
  const expense = {
    id: createId("expense"),
    amount: Number(input.amount),
    date: input.date,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    note: input.note?.trim() || "",
    createdAt: now,
    updatedAt: now
  };
  return {
    ...data,
    expenses: [expense, ...data.expenses],
    preferences: {
      ...data.preferences,
      lastCategoryId: input.categoryId,
      lastSubcategoryId: input.subcategoryId
    }
  };
}

export function editExpense(data, expenseId, patch, now = new Date().toISOString()) {
  const current = data.expenses.find((expense) => expense.id === expenseId);
  if (!current) throw new Error("没有找到这条支出");
  const nextExpense = { ...current, ...patch, updatedAt: now };
  validateExpenseInput(data, nextExpense, { allowDisabled: true });
  return {
    ...data,
    expenses: data.expenses.map((expense) => expense.id === expenseId ? nextExpense : expense)
  };
}

export function deleteExpense(data, expenseId) {
  return {
    ...data,
    expenses: data.expenses.filter((expense) => expense.id !== expenseId)
  };
}

export function addCategory(data, { name, parentId = null }, now = new Date().toISOString()) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("分类名称不能为空");
  if (parentId && !data.categories.some((category) => category.id === parentId && !category.parentId)) {
    throw new Error("没有找到一级分类");
  }
  return {
    ...data,
    categories: [...data.categories, {
      id: createId("category"),
      name: trimmed,
      parentId,
      active: true,
      createdAt: now
    }]
  };
}

export function renameCategory(data, categoryId, name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("分类名称不能为空");
  return {
    ...data,
    categories: data.categories.map((category) => category.id === categoryId ? { ...category, name: trimmed } : category)
  };
}

export function disableCategory(data, categoryId) {
  return {
    ...data,
    categories: data.categories.map((category) => category.id === categoryId ? { ...category, active: false } : category)
  };
}

export function upsertBudgetRule(data, input) {
  validateBudgetInput(data, input);
  const existing = data.budgetRules.find((rule) => rule.id === input.id || (!input.id && rule.categoryId === input.categoryId && rule.period === input.period));
  const nextRule = {
    id: existing?.id || input.id || createId("budget"),
    categoryId: input.categoryId,
    period: input.period,
    amount: Number(input.amount),
    active: Boolean(input.active)
  };
  return {
    ...data,
    budgetRules: existing
      ? data.budgetRules.map((rule) => rule.id === existing.id ? nextRule : rule)
      : [...data.budgetRules, nextRule]
  };
}

export function deleteBudgetRule(data, budgetRuleId) {
  return {
    ...data,
    budgetRules: data.budgetRules.filter((rule) => rule.id !== budgetRuleId)
  };
}

function validateExpenseInput(data, input, options = {}) {
  if (!(Number(input.amount) > 0)) throw new Error("金额必须大于 0");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(new Date(`${input.date}T00:00:00.000Z`).getTime())) {
    throw new Error("日期无效");
  }
  const child = data.categories.find((category) => category.id === input.subcategoryId && category.parentId);
  if (!child) throw new Error("请选择二级分类");
  if (child.parentId !== input.categoryId) throw new Error("二级分类必须属于所选一级分类");
  if (!options.allowDisabled && !child.active) throw new Error("停用分类不建议用于新增支出");
}

function validateBudgetInput(data, input) {
  if (!(Number(input.amount) > 0)) throw new Error("预算金额必须大于 0");
  if (!isPeriod(input.period)) throw new Error("预算周期无效");
  if (!data.categories.some((category) => category.id === input.categoryId)) throw new Error("预算分类不存在");
}

function createId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
