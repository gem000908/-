import test from "node:test";
import assert from "node:assert/strict";
import { addExpense } from "./data.js";
import { createInitialData } from "./seed.js";
import { exportCsv, importJsonBackup, parseBackupJson } from "./importExport.js";

test("invalid import fails before current data is changed", () => {
  const current = createInitialData("2026-06-07T10:00:00.000Z");
  const result = importJsonBackup(current, "{\"version\":1,\"expenses\":[]}", "overwrite", "2026-06-07T11:00:00.000Z");

  assert.equal(result.ok, false);
  assert.equal(result.data, current);
});

test("overwrite import replaces current arrays after validation", () => {
  const current = addExpense(createInitialData("2026-06-07T10:00:00.000Z"), {
    amount: 10,
    date: "2026-06-07",
    categoryId: "food",
    subcategoryId: "takeout",
    note: "old"
  }, "2026-06-07T10:30:00.000Z");
  const incoming = createInitialData("2026-06-07T12:00:00.000Z");
  const json = JSON.stringify(incoming);

  const result = importJsonBackup(current, json, "overwrite", "2026-06-07T12:30:00.000Z");

  assert.equal(result.ok, true);
  assert.equal(result.data.expenses.length, 0);
  assert.equal(result.backup.expenses.length, 1);
});

test("merge import combines records by stable id", () => {
  const current = addExpense(createInitialData("2026-06-07T10:00:00.000Z"), {
    amount: 10,
    date: "2026-06-07",
    categoryId: "food",
    subcategoryId: "takeout",
    note: "current"
  }, "2026-06-07T10:30:00.000Z");
  const incoming = addExpense(createInitialData("2026-06-07T10:00:00.000Z"), {
    amount: 15,
    date: "2026-06-08",
    categoryId: "food",
    subcategoryId: "groceries",
    note: "incoming"
  }, "2026-06-08T10:30:00.000Z");

  const result = importJsonBackup(current, JSON.stringify(incoming), "merge", "2026-06-08T11:00:00.000Z");

  assert.equal(result.ok, true);
  assert.equal(result.data.expenses.length, 2);
});

test("CSV export includes readable category names and escaped notes", () => {
  const data = addExpense(createInitialData("2026-06-07T10:00:00.000Z"), {
    amount: 12.5,
    date: "2026-06-07",
    categoryId: "food",
    subcategoryId: "takeout",
    note: "lunch, spicy"
  }, "2026-06-07T10:30:00.000Z");

  const csv = exportCsv(data);

  assert.equal(csv.split("\n")[0], "Date,Amount,Parent Category,Child Category,Note");
  assert.match(csv, /2026-06-07,12.50,Food,Takeout,"lunch, spicy"/);
});

test("parseBackupJson rejects malformed records", () => {
  const result = parseBackupJson(JSON.stringify({
    version: 1,
    expenses: [{ id: "bad" }],
    categories: [],
    budgetRules: [],
    preferences: {}
  }));

  assert.equal(result.ok, false);
});
