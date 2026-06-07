# Personal Budget Ledger Design

## Goal

Build a personal expense-tracking web app for local use. The app should have a clean interface and prioritize flexible category-based budget control. It does not require accounts, backend services, income tracking, transfers, or account balances in the first version.

## Product Scope

The first version includes:

- Expense-only bookkeeping.
- Local browser persistence.
- Full JSON backup export and restore import.
- CSV export for expense details.
- Two-level expense categories.
- Budget rules for categories with weekly, monthly, and yearly periods.
- Overview-first navigation focused on budget usage.

The first version excludes:

- Income records.
- Account-to-account transfers.
- Cloud sync.
- Multi-user support.
- Bank or payment-provider integrations.

## Information Architecture

The app has five primary sections:

- Overview: budget status, remaining budget, overspending signals, and recent expenses.
- Add Expense: fast expense entry.
- Categories & Budgets: category tree management and budget rule management.
- Details: searchable and filterable expense list with edit and delete actions.
- Import & Export: backup, restore, and CSV export tools.

The desktop layout uses a narrow left navigation rail and a main content area. The mobile layout uses bottom navigation and single-column content.

## Category Model

Categories use two levels:

- Parent categories, such as Food, Transport, Shopping, Housing, Entertainment, Health, and Learning.
- Child categories, such as Food > Takeout, Food > Groceries, and Transport > Subway.

Expenses must be assigned to a child category. Parent categories are used for grouping, budget summaries, and filtering.

Categories can be added, renamed, and disabled. A category with historical expenses is disabled rather than hard-deleted, so old records remain readable and filterable.

## Budget Rules

Budget rules can be attached to either a parent category or a child category.

Each budget rule contains:

- Category reference.
- Period: weekly, monthly, or yearly.
- Amount.
- Active state.

The same category can have multiple active budget rules if their periods differ. For example, Food can have both a monthly and yearly budget.

If both a parent category and a child category have budgets, the app displays and calculates both independently. Child spending still contributes to parent-category spending summaries, but parent and child budget limits are not treated as nested deductions. This keeps the rules understandable and avoids hidden double-counting behavior.

Budget progress is calculated against the current natural period:

- Weekly: current week, starting on Monday.
- Monthly: current calendar month.
- Yearly: current calendar year.

Budget states:

- Normal: below 80 percent used.
- Near limit: at least 80 percent and below 100 percent used.
- Over budget: 100 percent or more used.

## Core Workflows

### Overview

The Overview section opens by default. It answers:

- How much has been spent in the selected period?
- How much budget remains?
- Which categories are close to or over budget?
- What were the most recent expenses?

The user can switch between weekly, monthly, and yearly views. Category budget rows use progress bars and status color. Clicking a category budget row opens Details filtered to that category and period.

Amounts are stored as plain numbers. The interface displays amounts with a currency preference that defaults to CNY.

### Add Expense

The Add Expense section supports fast entry with:

- Amount.
- Date, defaulting to today.
- Parent category.
- Child category filtered by the selected parent category.
- Optional note.

The amount field is focused first. After saving, the form clears amount and note, keeps the last selected category, and immediately updates budget totals.

### Categories & Budgets

The Categories & Budgets section shows a category tree and budget rules for the selected category.

It supports:

- Adding parent categories.
- Adding child categories.
- Renaming categories.
- Disabling categories.
- Adding budget rules.
- Editing budget rule period, amount, and active state.
- Deleting budget rules.

Disabled categories are visually muted and are not preferred in new expense entry, but existing records continue to display their names.

### Details

The Details section displays expenses in a compact table or list depending on viewport width.

Filters include:

- Period.
- Parent category.
- Child category.
- Keyword search against notes and category names.

Each expense can be edited or deleted. Editing an expense recalculates affected budget summaries immediately.

### Import & Export

The Import & Export section supports:

- Export full JSON backup.
- Import JSON backup.
- Export expense details as CSV.

JSON import validates structure before changing current data. The import flow offers overwrite or merge behavior. Before import, the current app data is saved as a local backup snapshot.

CSV export is for external review or analysis and does not need to preserve every internal field.

## Data Model

### Expense

- `id`: stable unique identifier.
- `amount`: positive number.
- `date`: ISO date string.
- `categoryId`: parent category identifier.
- `subcategoryId`: child category identifier.
- `note`: optional text.
- `createdAt`: ISO timestamp.
- `updatedAt`: ISO timestamp.

### Category

- `id`: stable unique identifier.
- `name`: display name.
- `parentId`: parent category identifier, or null for parent categories.
- `active`: boolean.
- `createdAt`: ISO timestamp.

### BudgetRule

- `id`: stable unique identifier.
- `categoryId`: parent or child category identifier.
- `period`: weekly, monthly, or yearly.
- `amount`: positive number.
- `active`: boolean.

### AppData

- `version`: app data schema version.
- `expenses`: expense array.
- `categories`: category array.
- `budgetRules`: budget rule array.
- `preferences`: lightweight user preferences such as last selected category and default overview period.

## Persistence

The app stores primary data in `localStorage`.

Data is written after each successful mutation. Import creates a backup snapshot in `localStorage` before applying imported data. JSON export is the recommended backup and device-transfer path.

The app should tolerate missing data by seeding default categories and an empty expense list.

## Validation And Error Handling

Expense validation:

- Amount must be greater than 0.
- Date must be present and parseable.
- A child category must be selected.
- Disabled categories are allowed for editing old records but should be discouraged for new records.

Budget validation:

- Amount must be greater than 0.
- Period must be weekly, monthly, or yearly.
- Category must exist.

Import validation:

- JSON must parse successfully.
- Data must include a recognized version.
- Required arrays must exist.
- Records with invalid required fields cause the import to fail before current data is overwritten.

If saved local data is corrupt, the app shows a recovery path to restore the last local backup, import a JSON backup, or reset to empty seeded data.

## Testing Plan

Unit-level tests should cover:

- Weekly, monthly, and yearly period boundary calculations.
- Parent category spending totals from child-category expenses.
- Child category budget calculations.
- Independent parent and child budget rule reporting.
- Expense add, edit, and delete state updates.
- JSON import validation failure behavior.
- JSON import overwrite and merge behavior.
- CSV export formatting.

Manual UI checks should cover:

- Desktop layout.
- Mobile layout.
- Fast add-expense workflow.
- Category and budget editing.
- Details filtering.
- Import failure without data loss.
- Exported JSON can be re-imported.

## Implementation Notes

Use a frontend-only implementation unless an existing project framework requires otherwise. For a new app, React with Vite is appropriate because the interface has multiple views, local state, forms, derived summaries, and responsive layouts.

Keep implementation units small:

- Storage helpers own local persistence and import/export serialization.
- Date helpers own period calculations.
- Budget helpers own category aggregation and budget status.
- UI components own view rendering and form state.
- Seed data lives separately from application logic.

The visual direction should be clean, compact, and tool-focused. Avoid marketing-style pages, oversized hero sections, decorative card-heavy layouts, and unnecessary explanatory copy inside the app.
