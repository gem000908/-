import test from "node:test";
import assert from "node:assert/strict";
import { getPeriodRange, isDateInPeriod } from "./dates.js";

test("weekly period starts on Monday and ends on Sunday", () => {
  const range = getPeriodRange("weekly", "2026-06-07");

  assert.deepEqual(range, {
    start: "2026-06-01",
    end: "2026-06-07"
  });
});

test("monthly period uses the current calendar month", () => {
  const range = getPeriodRange("monthly", "2026-02-14");

  assert.deepEqual(range, {
    start: "2026-02-01",
    end: "2026-02-28"
  });
});

test("yearly period uses the current calendar year", () => {
  const range = getPeriodRange("yearly", "2026-11-20");

  assert.deepEqual(range, {
    start: "2026-01-01",
    end: "2026-12-31"
  });
});

test("isDateInPeriod includes boundaries and excludes outside dates", () => {
  assert.equal(isDateInPeriod("2026-06-01", "weekly", "2026-06-07"), true);
  assert.equal(isDateInPeriod("2026-06-07", "weekly", "2026-06-07"), true);
  assert.equal(isDateInPeriod("2026-05-31", "weekly", "2026-06-07"), false);
});
