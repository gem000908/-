import { DATA_VERSION } from "./types.js";

export const defaultCategories = [
  parent("food", "Food", "2026-01-01T00:00:00.000Z"),
  child("takeout", "Takeout", "food", "2026-01-01T00:00:00.000Z"),
  child("groceries", "Groceries", "food", "2026-01-01T00:00:00.000Z"),
  parent("transport", "Transport", "2026-01-01T00:00:00.000Z"),
  child("subway", "Subway", "transport", "2026-01-01T00:00:00.000Z"),
  child("taxi", "Taxi", "transport", "2026-01-01T00:00:00.000Z"),
  parent("shopping", "Shopping", "2026-01-01T00:00:00.000Z"),
  child("daily-goods", "Daily Goods", "shopping", "2026-01-01T00:00:00.000Z"),
  parent("housing", "Housing", "2026-01-01T00:00:00.000Z"),
  child("rent", "Rent", "housing", "2026-01-01T00:00:00.000Z"),
  parent("entertainment", "Entertainment", "2026-01-01T00:00:00.000Z"),
  child("movies", "Movies", "entertainment", "2026-01-01T00:00:00.000Z"),
  parent("health", "Health", "2026-01-01T00:00:00.000Z"),
  child("medicine", "Medicine", "health", "2026-01-01T00:00:00.000Z"),
  parent("learning", "Learning", "2026-01-01T00:00:00.000Z"),
  child("books", "Books", "learning", "2026-01-01T00:00:00.000Z")
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
