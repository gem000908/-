import test from "node:test";
import assert from "node:assert/strict";
import { getBudgetRows, getOverviewTotals } from "./budgets.js";

const categories = [
  { id: "food", name: "Food", parentId: null, active: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "takeout", name: "Takeout", parentId: "food", active: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "groceries", name: "Groceries", parentId: "food", active: true, createdAt: "2026-01-01T00:00:00.000Z" }
];

const expenses = [
  { id: "e1", amount: 120, date: "2026-06-03", categoryId: "food", subcategoryId: "takeout", note: "lunch", createdAt: "2026-06-03T08:00:00.000Z", updatedAt: "2026-06-03T08:00:00.000Z" },
  { id: "e2", amount: 80, date: "2026-06-04", categoryId: "food", subcategoryId: "groceries", note: "fruit", createdAt: "2026-06-04T08:00:00.000Z", updatedAt: "2026-06-04T08:00:00.000Z" },
  { id: "e3", amount: 50, date: "2026-05-30", categoryId: "food", subcategoryId: "takeout", note: "old", createdAt: "2026-05-30T08:00:00.000Z", updatedAt: "2026-05-30T08:00:00.000Z" }
];

test("parent budget spending includes child-category expenses in the current period", () => {
  const rows = getBudgetRows({
    categories,
    expenses,
    budgetRules: [{ id: "b1", categoryId: "food", period: "monthly", amount: 500, active: true }],
    period: "monthly",
    today: "2026-06-07"
  });

  assert.equal(rows[0].spent, 200);
  assert.equal(rows[0].remaining, 300);
  assert.equal(rows[0].state, "normal");
});

test("child and parent budgets are reported independently", () => {
  const rows = getBudgetRows({
    categories,
    expenses,
    budgetRules: [
      { id: "b1", categoryId: "food", period: "monthly", amount: 500, active: true },
      { id: "b2", categoryId: "takeout", period: "monthly", amount: 100, active: true }
    ],
    period: "monthly",
    today: "2026-06-07"
  });

  assert.deepEqual(rows.map((row) => [row.categoryName, row.spent, row.amount, row.state]), [
    ["Food", 200, 500, "normal"],
    ["Food / Takeout", 120, 100, "over"]
  ]);
});

test("budget state becomes near at 80 percent and over at 100 percent", () => {
  const rows = getBudgetRows({
    categories,
    expenses,
    budgetRules: [
      { id: "near", categoryId: "groceries", period: "monthly", amount: 100, active: true },
      { id: "over", categoryId: "takeout", period: "monthly", amount: 120, active: true }
    ],
    period: "monthly",
    today: "2026-06-07"
  });

  assert.deepEqual(rows.map((row) => row.state), ["near", "over"]);
});

test("overview totals include spent, budgeted, remaining, and overage", () => {
  const totals = getOverviewTotals({
    categories,
    expenses,
    budgetRules: [{ id: "b1", categoryId: "food", period: "monthly", amount: 180, active: true }],
    period: "monthly",
    today: "2026-06-07"
  });

  assert.deepEqual(totals, {
    spent: 200,
    budgeted: 180,
    remaining: -20,
    overage: 20
  });
});
