import test from "node:test";
import assert from "node:assert/strict";
import { createInitialData } from "../domain/seed.js";
import { loadData } from "./localStore.js";

test("loadData translates legacy English default category names without changing expenses", () => {
  const data = createInitialData("2026-06-07T10:00:00.000Z");
  data.categories = data.categories.map((category) => ({
    ...category,
    name: {
      food: "Food",
      takeout: "Takeout",
      groceries: "Groceries"
    }[category.id] || category.name
  }));
  data.expenses = [{
    id: "expense-1",
    amount: 12,
    date: "2026-06-07",
    categoryId: "food",
    subcategoryId: "takeout",
    note: "lunch",
    createdAt: "2026-06-07T10:30:00.000Z",
    updatedAt: "2026-06-07T10:30:00.000Z"
  }];
  const storage = memoryStorage({ "budget-ledger:data": JSON.stringify(data) });

  const loaded = loadData(storage);

  assert.equal(loaded.categories.find((category) => category.id === "food").name, "餐饮");
  assert.equal(loaded.categories.find((category) => category.id === "takeout").name, "外卖");
  assert.equal(loaded.expenses[0].note, "lunch");
});

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}
