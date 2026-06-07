import test from "node:test";
import assert from "node:assert/strict";
import { getNextExpandedParentId, getVisibleCategoryIds } from "./categoryTree.js";

const categories = [
  { id: "food", name: "Food", parentId: null, active: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "takeout", name: "Takeout", parentId: "food", active: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "groceries", name: "Groceries", parentId: "food", active: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "transport", name: "Transport", parentId: null, active: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "subway", name: "Subway", parentId: "transport", active: true, createdAt: "2026-01-01T00:00:00.000Z" }
];

test("category tree shows only parent categories before a parent is expanded", () => {
  assert.deepEqual(getVisibleCategoryIds(categories, null), ["food", "transport"]);
});

test("category tree shows children only for the expanded parent", () => {
  assert.deepEqual(getVisibleCategoryIds(categories, "food"), ["food", "takeout", "groceries", "transport"]);
});

test("clicking a parent toggles it, clicking another parent switches expansion", () => {
  assert.equal(getNextExpandedParentId(null, "food"), "food");
  assert.equal(getNextExpandedParentId("food", "food"), null);
  assert.equal(getNextExpandedParentId("food", "transport"), "transport");
});
