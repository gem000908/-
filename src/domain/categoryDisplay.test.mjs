import test from "node:test";
import assert from "node:assert/strict";
import { getCategoryFallbackText, getCategoryGlyph, getCategoryTone } from "./categoryDisplay.js";

test("getCategoryGlyph returns simple graphical glyph classes for default categories", () => {
  assert.equal(getCategoryGlyph("food"), "glyph-food");
  assert.equal(getCategoryGlyph("transport"), "glyph-route");
  assert.equal(getCategoryGlyph("entertainment"), "glyph-play");
});

test("getCategoryFallbackText falls back to the first Chinese character instead of question mark", () => {
  assert.equal(getCategoryGlyph("custom"), "glyph-text");
  assert.equal(getCategoryFallbackText("宠物"), "宠");
});

test("getCategoryTone recognizes Chinese and legacy English category labels", () => {
  assert.equal(getCategoryTone("food", "餐饮"), "tone-mint");
  assert.equal(getCategoryTone("transport", "Transport"), "tone-blue");
  assert.equal(getCategoryTone("health", "健康"), "tone-rose");
});
