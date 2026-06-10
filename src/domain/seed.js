import { DATA_VERSION } from "./types.js";

export const defaultCategories = [
  parent("food", "餐饮", "2026-01-01T00:00:00.000Z"),
  child("takeout", "外卖", "food", "2026-01-01T00:00:00.000Z"),
  child("groceries", "菜场超市", "food", "2026-01-01T00:00:00.000Z"),
  parent("transport", "交通", "2026-01-01T00:00:00.000Z"),
  child("subway", "地铁公交", "transport", "2026-01-01T00:00:00.000Z"),
  child("taxi", "打车", "transport", "2026-01-01T00:00:00.000Z"),
  parent("shopping", "购物", "2026-01-01T00:00:00.000Z"),
  child("daily-goods", "日用品", "shopping", "2026-01-01T00:00:00.000Z"),
  parent("housing", "居住", "2026-01-01T00:00:00.000Z"),
  child("rent", "房租", "housing", "2026-01-01T00:00:00.000Z"),
  parent("entertainment", "娱乐", "2026-01-01T00:00:00.000Z"),
  child("movies", "电影演出", "entertainment", "2026-01-01T00:00:00.000Z"),
  parent("health", "健康", "2026-01-01T00:00:00.000Z"),
  child("medicine", "药品医疗", "health", "2026-01-01T00:00:00.000Z"),
  parent("learning", "学习", "2026-01-01T00:00:00.000Z"),
  child("books", "书籍课程", "learning", "2026-01-01T00:00:00.000Z")
];

export const defaultBudgetRules = [
  { id: "budget-food-monthly", categoryId: "food", period: "monthly", amount: 2400, active: true },
  { id: "budget-transport-monthly", categoryId: "transport", period: "monthly", amount: 600, active: true },
  { id: "budget-entertainment-monthly", categoryId: "entertainment", period: "monthly", amount: 500, active: true },
  { id: "budget-learning-yearly", categoryId: "learning", period: "yearly", amount: 3000, active: true }
];

export function createInitialData(now = new Date().toISOString()) {
  return {
    version: DATA_VERSION,
    expenses: [],
    categories: defaultCategories.map((category) => ({ ...category, createdAt: category.createdAt || now })),
    budgetRules: defaultBudgetRules.map((rule) => ({ ...rule })),
    preferences: {
      currency: "CNY",
      overviewPeriod: "monthly",
      lastCategoryId: "food",
      lastSubcategoryId: "takeout"
    }
  };
}

function parent(id, name, createdAt) {
  return { id, name, parentId: null, active: true, createdAt };
}

function child(id, name, parentId, createdAt) {
  return { id, name, parentId, active: true, createdAt };
}
