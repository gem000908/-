import test from "node:test";
import assert from "node:assert/strict";
import { createInitialData } from "./seed.js";

test("initial data uses Chinese default categories for local daily expense tracking", () => {
  const data = createInitialData("2026-06-07T10:00:00.000Z");
  const names = data.categories.map((category) => category.name);

  assert.deepEqual(names.slice(0, 4), ["餐饮", "外卖", "菜场超市", "交通"]);
});
