import { isDateInPeriod } from "./dates.js";

export function getBudgetRows({ categories, expenses, budgetRules, period, today }) {
  const activeRules = budgetRules.filter((rule) => rule.active && rule.period === period);
  return activeRules.map((rule) => {
    const category = categories.find((item) => item.id === rule.categoryId);
    const spent = sumForCategory({ categories, expenses, categoryId: rule.categoryId, period, today });
    const ratio = rule.amount > 0 ? spent / rule.amount : 0;
    return {
      ruleId: rule.id,
      categoryId: rule.categoryId,
      categoryName: categoryLabel(categories, category),
      period,
      amount: rule.amount,
      spent,
      remaining: rule.amount - spent,
      ratio,
      state: budgetState(ratio)
    };
  });
}

export function getOverviewTotals(input) {
  const rows = getBudgetRows(input);
  const spent = roundMoney(rows.reduce((sum, row) => sum + row.spent, 0));
  const budgeted = roundMoney(rows.reduce((sum, row) => sum + row.amount, 0));
  const remaining = roundMoney(budgeted - spent);
  return {
    spent,
    budgeted,
    remaining,
    overage: Math.max(0, roundMoney(spent - budgeted))
  };
}

export function categoryLabel(categories, category) {
  if (!category) return "未知";
  if (!category.parentId) return category.name;
  const parent = categories.find((item) => item.id === category.parentId);
  return `${parent?.name || "未知"} / ${category.name}`;
}

export function sumForCategory({ categories, expenses, categoryId, period, today }) {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return 0;
  return roundMoney(expenses
    .filter((expense) => isDateInPeriod(expense.date, period, today))
    .filter((expense) => {
      if (category.parentId) return expense.subcategoryId === category.id;
      const childIds = categories.filter((item) => item.parentId === category.id).map((item) => item.id);
      return expense.categoryId === category.id || childIds.includes(expense.subcategoryId);
    })
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0));
}

function budgetState(ratio) {
  if (ratio >= 1) return "over";
  if (ratio >= 0.8) return "near";
  return "normal";
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
