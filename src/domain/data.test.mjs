import test from "node:test";
import assert from "node:assert/strict";
import { addExpense, deleteExpense, editExpense, renameCategory, disableCategory, upsertBudgetRule } from "./data.js";
import { createInitialData } from "./seed.js";

test("addExpense appends an expense and remembers the selected category", () => {
  const data = createInitialData("2026-06-07T10:00:00.000Z");
  const next = addExpense(data, {
    amount: 36.5,
    date: "2026-06-07",
    categoryId: "food",
    subcategoryId: "takeout",
    note: "noodles"
  }, "2026-06-07T10:30:00.000Z");

  assert.equal(next.expenses.length, 1);
  assert.equal(next.expenses[0].amount, 36.5);
  assert.equal(next.expenses[0].createdAt, "2026-06-07T10:30:00.000Z");
  assert.equal(next.preferences.lastCategoryId, "food");
  assert.equal(next.preferences.lastSubcategoryId, "takeout");
});

test("editExpense updates fields and updatedAt without changing createdAt", () => {
  const data = addExpense(createInitialData("2026-06-07T10:00:00.000Z"), {
    amount: 20,
    date: "2026-06-07",
    categoryId: "food",
    subcategoryId: "takeout",
    note: "old"
  }, "2026-06-07T10:30:00.000Z");

  const next = editExpense(data, data.expenses[0].id, {
    amount: 25,
    note: "new"
  }, "2026-06-07T11:00:00.000Z");

  assert.equal(next.expenses[0].amount, 25);
  assert.equal(next.expenses[0].note, "new");
  assert.equal(next.expenses[0].createdAt, "2026-06-07T10:30:00.000Z");
  assert.equal(next.expenses[0].updatedAt, "2026-06-07T11:00:00.000Z");
});

test("deleteExpense removes the requested expense only", () => {
  let data = createInitialData("2026-06-07T10:00:00.000Z");
  data = addExpense(data, { amount: 10, date: "2026-06-07", categoryId: "food", subcategoryId: "takeout", note: "" }, "2026-06-07T10:01:00.000Z");
  const takeoutId = data.expenses[0].id;
  data = addExpense(data, { amount: 15, date: "2026-06-07", categoryId: "food", subcategoryId: "groceries", note: "" }, "2026-06-07T10:02:00.000Z");

  const next = deleteExpense(data, takeoutId);

  assert.equal(next.expenses.length, 1);
  assert.equal(next.expenses[0].subcategoryId, "groceries");
});

test("category rename, disable, and budget upsert are immutable", () => {
  const data = createInitialData("2026-06-07T10:00:00.000Z");
  const renamed = renameCategory(data, "food", "正餐");
  const disabled = disableCategory(renamed, "takeout");
  const budgeted = upsertBudgetRule(disabled, {
    categoryId: "food",
    period: "monthly",
    amount: 2000,
    active: true
  });

  assert.equal(data.categories.find((category) => category.id === "food").name, "餐饮");
  assert.equal(renamed.categories.find((category) => category.id === "food").name, "正餐");
  assert.equal(disabled.categories.find((category) => category.id === "takeout").active, false);
  assert.equal(budgeted.budgetRules.some((rule) => rule.categoryId === "food" && rule.amount === 2000), true);
});
