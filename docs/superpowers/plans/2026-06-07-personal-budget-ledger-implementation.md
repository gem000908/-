# Personal Budget Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first version of a frontend-only personal expense tracker with local persistence, category budgets, detail filtering, and import/export.

**Architecture:** Use React + Vite for the app shell and view rendering. Keep business logic in small TypeScript modules for dates, categories, budgets, data mutation, validation, storage, and export so unit tests cover core behavior independently of UI.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, localStorage, CSS modules via plain CSS.

---

## File Structure

- Create `package.json`, `index.html`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.setup.ts`: project tooling and test configuration.
- Create `src/main.tsx`, `src/App.tsx`, `src/styles.css`: app bootstrap, view composition, responsive layout, and interaction wiring.
- Create `src/domain/types.ts`: shared `Expense`, `Category`, `BudgetRule`, `AppData`, and period types.
- Create `src/domain/seed.ts`: default categories, default budget rules, and default preferences.
- Create `src/domain/dates.ts`: weekly, monthly, and yearly natural period calculations.
- Create `src/domain/budgets.ts`: spending aggregation, budget progress rows, and overview totals.
- Create `src/domain/data.ts`: immutable add/edit/delete expense, category, and budget rule operations.
- Create `src/domain/importExport.ts`: JSON validation, overwrite/merge import, backup snapshot, and CSV export formatting.
- Create `src/storage/localStore.ts`: localStorage load/save/recovery helpers.
- Create `src/domain/*.test.ts`: Vitest coverage for the required business rules.

## Tasks

### Task 1: Tooling And Test Harness

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/main.tsx`

- [ ] **Step 1: Add project tooling**

Create a Vite React app configuration with scripts: `dev`, `build`, `test`, and `preview`.

- [ ] **Step 2: Install dependencies**

Run: `npm install`

- [ ] **Step 3: Verify empty harness**

Run: `npm test -- --run`

Expected: Vitest starts successfully and reports no tests or passes the placeholder harness.

### Task 2: Domain Types, Seed Data, And Date Periods

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/seed.ts`
- Create: `src/domain/dates.ts`
- Create: `src/domain/dates.test.ts`

- [ ] **Step 1: Write failing period tests**

Cover Monday-start weekly periods, calendar month periods, and calendar year periods.

- [ ] **Step 2: Run period tests and verify RED**

Run: `npm test -- --run src/domain/dates.test.ts`

Expected: FAIL because date helpers do not exist.

- [ ] **Step 3: Implement minimal date helpers and seed data**

Implement `getPeriodRange`, `isDateInPeriod`, and default categories matching the spec.

- [ ] **Step 4: Run period tests and verify GREEN**

Run: `npm test -- --run src/domain/dates.test.ts`

Expected: PASS.

### Task 3: Budget Aggregation

**Files:**
- Create: `src/domain/budgets.ts`
- Create: `src/domain/budgets.test.ts`

- [ ] **Step 1: Write failing budget tests**

Cover parent spending totals from child expenses, child budget calculations, independent parent and child budget rows, and budget states at 80 percent and 100 percent.

- [ ] **Step 2: Run budget tests and verify RED**

Run: `npm test -- --run src/domain/budgets.test.ts`

Expected: FAIL because budget helpers do not exist.

- [ ] **Step 3: Implement budget helpers**

Implement `getBudgetRows`, `getOverviewTotals`, and category name lookup helpers.

- [ ] **Step 4: Run budget tests and verify GREEN**

Run: `npm test -- --run src/domain/budgets.test.ts`

Expected: PASS.

### Task 4: Data Mutation And Import/Export

**Files:**
- Create: `src/domain/data.ts`
- Create: `src/domain/importExport.ts`
- Create: `src/domain/data.test.ts`
- Create: `src/domain/importExport.test.ts`
- Create: `src/storage/localStore.ts`

- [ ] **Step 1: Write failing mutation tests**

Cover expense add, edit, and delete state updates with timestamps and preference retention.

- [ ] **Step 2: Write failing import/export tests**

Cover JSON validation failure without mutation, overwrite import, merge import, and CSV formatting.

- [ ] **Step 3: Run tests and verify RED**

Run: `npm test -- --run src/domain/data.test.ts src/domain/importExport.test.ts`

Expected: FAIL because modules do not exist.

- [ ] **Step 4: Implement mutations, validation, import/export, and storage helpers**

Implement pure data functions first, then localStorage adapters around them.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test -- --run src/domain/data.test.ts src/domain/importExport.test.ts`

Expected: PASS.

### Task 5: App UI And Workflows

**Files:**
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Implement app shell**

Build responsive desktop side navigation and mobile bottom navigation for the five sections.

- [ ] **Step 2: Implement Overview and fast add**

Render period switcher, totals, budget rows, recent expenses, weekly summary, and quick add form.

- [ ] **Step 3: Implement Add Expense**

Render focused expense entry with parent and child category selection, validation, and save behavior.

- [ ] **Step 4: Implement Categories & Budgets**

Render category tree, add/rename/disable category actions, and budget rule CRUD.

- [ ] **Step 5: Implement Details**

Render filters, searchable expense table/list, edit, and delete actions.

- [ ] **Step 6: Implement Import & Export**

Render JSON export, JSON import with overwrite/merge mode, CSV export, and import error display.

- [ ] **Step 7: Run tests and build**

Run: `npm test -- --run`

Run: `npm run build`

Expected: PASS.

### Task 6: Browser Verification

**Files:**
- No source changes expected unless verification finds defects.

- [ ] **Step 1: Start dev server**

Run: `npm run dev -- --host 127.0.0.1`

- [ ] **Step 2: Verify desktop and mobile UI**

Open the local app in the in-app browser, inspect Overview, Add Expense, category/budget editing, details filtering, import failure handling, and exports.

- [ ] **Step 3: Compare against concept**

Use `view_image` on the generated concept and latest rendered screenshot. Check copy, layout, typography, palette, spacing, containers, and responsive behavior.

- [ ] **Step 4: Fix defects and rerun checks**

Repeat tests, build, and browser checks until no material mismatches remain.

## Self-Review

- Spec coverage: tasks cover local persistence, JSON backup/import, CSV export, two-level categories, weekly/monthly/yearly budgets, overview navigation, expense CRUD, category/budget management, details filtering, and recovery paths.
- Placeholder scan: no implementation task relies on unspecified future work.
- Type consistency: all domain modules use the shared types from `src/domain/types.ts`.
