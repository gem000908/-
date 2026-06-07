import { getBudgetRows, getOverviewTotals, sumForCategory } from "./domain/budgets.js";
import { getNextExpandedParentId } from "./domain/categoryTree.js";
import { getPeriodRange, isDateInPeriod } from "./domain/dates.js";
import {
  addCategory,
  addExpense,
  deleteBudgetRule,
  deleteExpense,
  disableCategory,
  editExpense,
  renameCategory,
  upsertBudgetRule
} from "./domain/data.js";
import { exportCsv, exportJson } from "./domain/importExport.js";
import { applyImport, loadData, saveData } from "./storage/localStore.js";

const navItems = [
  ["overview", "Overview"],
  ["add", "Add Expense"],
  ["categories", "Categories & Budgets"],
  ["details", "Details"],
  ["import", "Import & Export"]
];

const state = {
  data: loadData(),
  view: "overview",
  overviewPeriod: null,
  detailsPeriod: "monthly",
  detailsParent: "all",
  detailsChild: "all",
  detailsKeyword: "",
  selectedCategoryId: null,
  expandedParentId: null,
  editingExpenseId: null,
  importMode: "overwrite",
  importText: "",
  notice: ""
};

const app = document.getElementById("app");
render();

function render() {
  const period = state.overviewPeriod || state.data.preferences.overviewPeriod || "monthly";
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">¥</div>
          <div>
            <strong>Budget Ledger</strong>
            <span>Local expense control</span>
          </div>
        </div>
        <nav class="nav-list">${navItems.map(([id, label]) => navButton(id, label)).join("")}</nav>
        <div class="sidebar-footer">
          <span>Stored locally</span>
          <strong>${state.data.expenses.length} expenses</strong>
        </div>
      </aside>
      <main class="content">
        ${state.notice ? `<div class="notice">${escapeHtml(state.notice)}</div>` : ""}
        ${state.view === "overview" ? overviewView(period) : ""}
        ${state.view === "add" ? addExpenseView("page") : ""}
        ${state.view === "categories" ? categoriesView() : ""}
        ${state.view === "details" ? detailsView() : ""}
        ${state.view === "import" ? importExportView() : ""}
      </main>
      <nav class="bottom-nav">${navItems.map(([id, label]) => navButton(id, label, true)).join("")}</nav>
    </div>
  `;
  bindEvents();
}

function overviewView(period) {
  const today = localIsoDate();
  const rows = getBudgetRows({
    categories: state.data.categories,
    expenses: state.data.expenses,
    budgetRules: state.data.budgetRules,
    period,
    today
  });
  const totals = getOverviewTotals({
    categories: state.data.categories,
    expenses: state.data.expenses,
    budgetRules: state.data.budgetRules,
    period,
    today
  });
  const recent = state.data.expenses.slice(0, 6);
  return `
    <section class="view-grid">
      <div class="main-column">
        <header class="page-head">
          <div>
            <h1>Overview</h1>
            <p>${rangeLabel(period, today)}</p>
          </div>
          <div class="segmented" role="group" aria-label="Overview period">
            ${["weekly", "monthly", "yearly"].map((item) => `
              <button class="${period === item ? "active" : ""}" data-period="${item}">${labelPeriod(item)}</button>
            `).join("")}
          </div>
        </header>
        <div class="metric-row">
          ${metricCard("Spent", money(totals.spent), "Total recorded expenses")}
          ${metricCard("Remaining", money(totals.remaining), totals.remaining < 0 ? `${money(totals.overage)} over budget` : "Available budget")}
          ${metricCard("Budgeted", money(totals.budgeted), `${rows.length} active rules`)}
        </div>
        <section class="panel budget-panel">
          <div class="panel-head">
            <h2>Budget Status</h2>
            <span>${labelPeriod(period)}</span>
          </div>
          <div class="budget-list">
            ${rows.length ? rows.map(budgetRow).join("") : emptyState("No active budget rules for this period.")}
          </div>
        </section>
        <section class="panel">
          <div class="panel-head">
            <h2>Recent Expenses</h2>
            <button class="text-btn" data-view="details">View all</button>
          </div>
          <div class="recent-list">${recent.length ? recent.map(expenseItem).join("") : emptyState("Add your first expense to start tracking usage.")}</div>
        </section>
      </div>
      <aside class="right-column">
        ${addExpenseView("compact")}
        <section class="panel">
          <div class="panel-head">
            <h2>Signals</h2>
          </div>
          ${signalList(rows)}
        </section>
      </aside>
    </section>
  `;
}

function addExpenseView(mode) {
  const parents = parentCategories().filter((category) => category.active);
  const selectedParent = state.data.preferences.lastCategoryId || parents[0]?.id || "";
  const children = childCategories(selectedParent).filter((category) => category.active);
  const selectedChild = children.some((child) => child.id === state.data.preferences.lastSubcategoryId)
    ? state.data.preferences.lastSubcategoryId
    : children[0]?.id || "";
  return `
    <section class="panel add-panel ${mode === "compact" ? "compact-panel" : ""}">
      <div class="panel-head">
        <h2>${mode === "compact" ? "Quick Add" : "Add Expense"}</h2>
        ${mode === "compact" ? `<button class="text-btn" data-view="add">Full form</button>` : ""}
      </div>
      <form id="${mode}-expense-form" class="form-grid expense-form">
        <label>
          <span>Amount</span>
          <input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required autofocus>
        </label>
        <label>
          <span>Date</span>
          <input name="date" type="date" value="${localIsoDate()}" required>
        </label>
        <label>
          <span>Parent Category</span>
          <select name="categoryId" data-child-target="${mode}-child-select" required>
            ${parents.map((category) => option(category.id, category.name, category.id === selectedParent)).join("")}
          </select>
        </label>
        <label>
          <span>Child Category</span>
          <select id="${mode}-child-select" name="subcategoryId" required>
            ${children.map((category) => option(category.id, category.name, category.id === selectedChild)).join("")}
          </select>
        </label>
        <label class="wide">
          <span>Note</span>
          <input name="note" type="text" placeholder="Optional note">
        </label>
        <button class="primary-btn wide" type="submit">Save Expense</button>
      </form>
    </section>
  `;
}

function categoriesView() {
  const selected = state.data.categories.find((category) => category.id === state.selectedCategoryId) || parentCategories()[0];
  const rules = state.data.budgetRules.filter((rule) => rule.categoryId === selected?.id);
  return `
    <section class="split-view">
      <div class="panel">
        <div class="panel-head">
          <h2>Category Tree</h2>
        </div>
        <div class="category-tree">${parentCategories().map((parent) => categoryBranch(parent)).join("")}</div>
        <form id="parent-category-form" class="inline-form">
          <input name="name" placeholder="New parent category" required>
          <button type="submit">Add</button>
        </form>
      </div>
      <div class="panel detail-panel">
        <div class="panel-head">
          <h2>${escapeHtml(selected?.name || "Category")}</h2>
          <span>${selected?.parentId ? "Child category" : "Parent category"}</span>
        </div>
        ${selected ? `
          <form id="rename-category-form" class="inline-form">
            <input name="name" value="${escapeAttr(selected.name)}" required>
            <button type="submit">Rename</button>
            <button type="button" class="danger-btn" data-disable-category="${selected.id}" ${selected.active ? "" : "disabled"}>Disable</button>
          </form>
          ${!selected.parentId ? `
            <form id="child-category-form" class="inline-form">
              <input name="name" placeholder="New child category" required>
              <button type="submit">Add child</button>
            </form>
          ` : ""}
          <section class="rule-section">
            <h3>Budget Rules</h3>
            <div class="rule-list">${rules.length ? rules.map(ruleItem).join("") : emptyState("No budget rules for this category.")}</div>
            <form id="budget-rule-form" class="inline-form rule-form">
              <select name="period">
                <option value="weekly">Weekly</option>
                <option value="monthly" selected>Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <input name="amount" type="number" min="0.01" step="0.01" placeholder="Budget amount" required>
              <label class="check-label"><input name="active" type="checkbox" checked> Active</label>
              <button type="submit">Save Rule</button>
            </form>
          </section>
        ` : ""}
      </div>
    </section>
  `;
}

function detailsView() {
  const expenses = filteredExpenses();
  const editing = state.data.expenses.find((expense) => expense.id === state.editingExpenseId);
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Details</h2>
          <span>${expenses.length} matching expenses</span>
        </div>
      </div>
      <div class="filters">
        <select id="details-period">
          ${["weekly", "monthly", "yearly", "all"].map((period) => option(period, labelPeriod(period), period === state.detailsPeriod)).join("")}
        </select>
        <select id="details-parent">
          <option value="all">All parent categories</option>
          ${parentCategories().map((category) => option(category.id, category.name, category.id === state.detailsParent)).join("")}
        </select>
        <select id="details-child">
          <option value="all">All child categories</option>
          ${childCategories(state.detailsParent === "all" ? null : state.detailsParent).map((category) => option(category.id, category.name, category.id === state.detailsChild)).join("")}
        </select>
        <input id="details-keyword" value="${escapeAttr(state.detailsKeyword)}" placeholder="Search notes or categories">
      </div>
      ${editing ? editExpenseForm(editing) : ""}
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Amount</th><th>Category</th><th>Note</th><th></th></tr></thead>
          <tbody>${expenses.length ? expenses.map(expenseRow).join("") : `<tr><td colspan="5">${emptyState("No expenses match the filters.")}</td></tr>`}</tbody>
        </table>
      </div>
    </section>
  `;
}

function importExportView() {
  return `
    <section class="split-view">
      <div class="panel">
        <div class="panel-head">
          <h2>Export</h2>
        </div>
        <div class="tool-list">
          <button class="primary-btn" data-export-json>Export JSON Backup</button>
          <button data-export-csv>Export Expense CSV</button>
          <p>JSON backups preserve categories, budget rules, expenses, and preferences.</p>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <h2>Import</h2>
        </div>
        <form id="import-form" class="import-form">
          <div class="segmented">
            <button type="button" data-import-mode="overwrite" class="${state.importMode === "overwrite" ? "active" : ""}">Overwrite</button>
            <button type="button" data-import-mode="merge" class="${state.importMode === "merge" ? "active" : ""}">Merge</button>
          </div>
          <input id="backup-file" type="file" accept="application/json,.json">
          <textarea name="backup" rows="10" placeholder="Paste JSON backup here">${escapeHtml(state.importText)}</textarea>
          <button class="primary-btn" type="submit">Import Backup</button>
        </form>
      </div>
    </section>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      state.notice = "";
      render();
    });
  });
  document.querySelectorAll("[data-period]").forEach((button) => {
    button.addEventListener("click", () => {
      state.overviewPeriod = button.dataset.period;
      state.data.preferences.overviewPeriod = button.dataset.period;
      persist("Period updated");
    });
  });
  document.querySelectorAll(".expense-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        const input = formData(form);
        state.data = addExpense(state.data, {
          amount: Number(input.amount),
          date: input.date,
          categoryId: input.categoryId,
          subcategoryId: input.subcategoryId,
          note: input.note
        });
        persist("Expense saved");
      } catch (error) {
        notify(error.message);
      }
    });
  });
  document.querySelectorAll("select[data-child-target]").forEach((select) => {
    select.addEventListener("change", () => updateChildSelect(select));
  });
  bindCategoryEvents();
  bindDetailsEvents();
  bindImportExportEvents();
}

function bindCategoryEvents() {
  document.querySelectorAll("[data-select-category]").forEach((button) => {
    button.addEventListener("click", () => {
      const categoryId = button.dataset.selectCategory;
      const category = state.data.categories.find((item) => item.id === categoryId);
      state.selectedCategoryId = categoryId;
      if (category && !category.parentId) {
        state.expandedParentId = getNextExpandedParentId(state.expandedParentId, categoryId);
      }
      render();
    });
  });
  document.getElementById("parent-category-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      state.data = addCategory(state.data, { name: formData(event.currentTarget).name });
      persist("Parent category added");
    } catch (error) {
      notify(error.message);
    }
  });
  document.getElementById("child-category-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      state.data = addCategory(state.data, { name: formData(event.currentTarget).name, parentId: state.selectedCategoryId });
      persist("Child category added");
    } catch (error) {
      notify(error.message);
    }
  });
  document.getElementById("rename-category-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      state.data = renameCategory(state.data, state.selectedCategoryId || parentCategories()[0].id, formData(event.currentTarget).name);
      persist("Category renamed");
    } catch (error) {
      notify(error.message);
    }
  });
  document.querySelector("[data-disable-category]")?.addEventListener("click", (event) => {
    state.data = disableCategory(state.data, event.currentTarget.dataset.disableCategory);
    persist("Category disabled");
  });
  document.getElementById("budget-rule-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const input = formData(event.currentTarget);
      state.data = upsertBudgetRule(state.data, {
        categoryId: state.selectedCategoryId || parentCategories()[0].id,
        period: input.period,
        amount: Number(input.amount),
        active: Boolean(input.active)
      });
      persist("Budget rule saved");
    } catch (error) {
      notify(error.message);
    }
  });
  document.querySelectorAll("[data-delete-rule]").forEach((button) => {
    button.addEventListener("click", () => {
      state.data = deleteBudgetRule(state.data, button.dataset.deleteRule);
      persist("Budget rule deleted");
    });
  });
}

function bindDetailsEvents() {
  document.querySelectorAll("[data-filter-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = "details";
      state.detailsPeriod = state.overviewPeriod || state.data.preferences.overviewPeriod || "monthly";
      state.detailsParent = button.dataset.filterCategory;
      state.detailsChild = "all";
      render();
    });
  });
  document.getElementById("details-period")?.addEventListener("change", (event) => {
    state.detailsPeriod = event.target.value;
    render();
  });
  document.getElementById("details-parent")?.addEventListener("change", (event) => {
    state.detailsParent = event.target.value;
    state.detailsChild = "all";
    render();
  });
  document.getElementById("details-child")?.addEventListener("change", (event) => {
    state.detailsChild = event.target.value;
    render();
  });
  document.getElementById("details-keyword")?.addEventListener("input", (event) => {
    state.detailsKeyword = event.target.value;
    render();
  });
  document.querySelectorAll("[data-edit-expense]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingExpenseId = button.dataset.editExpense;
      render();
    });
  });
  document.querySelectorAll("[data-delete-expense]").forEach((button) => {
    button.addEventListener("click", () => {
      state.data = deleteExpense(state.data, button.dataset.deleteExpense);
      persist("Expense deleted");
    });
  });
  document.getElementById("edit-expense-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const input = formData(event.currentTarget);
      state.data = editExpense(state.data, state.editingExpenseId, {
        amount: Number(input.amount),
        date: input.date,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId,
        note: input.note
      });
      state.editingExpenseId = null;
      persist("Expense updated");
    } catch (error) {
      notify(error.message);
    }
  });
}

function bindImportExportEvents() {
  document.querySelector("[data-export-json]")?.addEventListener("click", () => download("budget-ledger-backup.json", exportJson(state.data), "application/json"));
  document.querySelector("[data-export-csv]")?.addEventListener("click", () => download("budget-ledger-expenses.csv", exportCsv(state.data), "text/csv"));
  document.querySelectorAll("[data-import-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.importMode = button.dataset.importMode;
      render();
    });
  });
  document.getElementById("backup-file")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.importText = await file.text();
    render();
  });
  document.getElementById("import-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = formData(event.currentTarget);
    const result = applyImport(state.data, input.backup, state.importMode);
    if (result.ok) {
      state.data = result.data;
      state.importText = "";
      persist(`Backup imported with ${state.importMode}`);
    } else {
      notify(result.error);
    }
  });
}

function navButton(id, label, compact = false) {
  return `
    <button class="nav-btn ${state.view === id ? "active" : ""}" data-view="${id}">
      <span class="nav-icon icon-${id}" aria-hidden="true"></span>
      <em>${compact ? shortLabel(label) : label}</em>
    </button>
  `;
}

function budgetRow(row) {
  const pct = Math.min(100, Math.round(row.ratio * 100));
  return `
    <button class="budget-row ${row.state}" data-filter-category="${row.categoryId}">
      <div class="budget-main">
        <strong>${escapeHtml(row.categoryName)}</strong>
        <span>${labelPeriod(row.period)} rule</span>
      </div>
      <div class="budget-cell">
        <span>Spent</span>
        <b>${money(row.spent)}</b>
      </div>
      <div class="budget-cell">
        <span>Budget</span>
        <b>${money(row.amount)}</b>
      </div>
      <div class="budget-cell ${row.remaining < 0 ? "negative" : "positive"}">
        <span>Remaining</span>
        <b>${money(row.remaining)}</b>
      </div>
      <div class="progress-cell">
        <div class="progress"><i style="width:${pct}%"></i></div>
      </div>
      <strong class="budget-percent">${pct}%</strong>
    </button>
  `;
}

function metricCard(label, value, caption) {
  return `<div class="metric metric-${label.toLowerCase()}"><span>${label}</span><strong>${value}</strong><em>${caption}</em></div>`;
}

function expenseItem(expense) {
  return `
    <div class="expense-item">
      <div><strong>${escapeHtml(categoryPath(expense))}</strong><span>${escapeHtml(expense.note || "No note")}</span></div>
      <div><b>${money(expense.amount)}</b><span>${expense.date}</span></div>
    </div>
  `;
}

function expenseRow(expense) {
  return `
    <tr>
      <td>${expense.date}</td>
      <td>${money(expense.amount)}</td>
      <td>${escapeHtml(categoryPath(expense))}</td>
      <td>${escapeHtml(expense.note || "")}</td>
      <td class="actions">
        <button data-edit-expense="${expense.id}">Edit</button>
        <button class="danger-btn" data-delete-expense="${expense.id}">Delete</button>
      </td>
    </tr>
  `;
}

function editExpenseForm(expense) {
  const parents = parentCategories();
  const children = childCategories(expense.categoryId);
  return `
    <form id="edit-expense-form" class="edit-form">
      <input name="amount" type="number" min="0.01" step="0.01" value="${expense.amount}" required>
      <input name="date" type="date" value="${expense.date}" required>
      <select name="categoryId" data-child-target="edit-child-select">
        ${parents.map((category) => option(category.id, category.name, category.id === expense.categoryId)).join("")}
      </select>
      <select id="edit-child-select" name="subcategoryId">
        ${children.map((category) => option(category.id, category.name, category.id === expense.subcategoryId)).join("")}
      </select>
      <input name="note" value="${escapeAttr(expense.note)}">
      <button class="primary-btn" type="submit">Update</button>
    </form>
  `;
}

function categoryBranch(parent) {
  const isExpanded = state.expandedParentId === parent.id;
  const children = childCategories(parent.id);
  return `
    <div class="branch">
      <button class="category-node parent ${selectedClass(parent.id)} ${parent.active ? "" : "muted"}" data-select-category="${parent.id}" aria-expanded="${isExpanded}">
        <span class="tree-toggle">${isExpanded ? "-" : "+"}</span>
        ${escapeHtml(parent.name)}
      </button>
      ${isExpanded ? `<div class="children">${children.map((child) => `
        <button class="category-node ${selectedClass(child.id)} ${child.active ? "" : "muted"}" data-select-category="${child.id}">
          ${escapeHtml(child.name)}
        </button>
      `).join("")}</div>` : ""}
    </div>
  `;
}

function ruleItem(rule) {
  return `
    <div class="rule-item">
      <div><strong>${labelPeriod(rule.period)}</strong><span>${rule.active ? "Active" : "Paused"}</span></div>
      <b>${money(rule.amount)}</b>
      <button class="danger-btn" data-delete-rule="${rule.id}">Delete</button>
    </div>
  `;
}

function signalList(rows) {
  const signals = rows.filter((row) => row.state !== "normal");
  if (!signals.length) return emptyState("No categories near or over budget.");
  return `<div class="signal-list">${signals.map((row) => `
    <div class="signal ${row.state}">
      <strong>${escapeHtml(row.categoryName)}</strong>
      <span>${row.state === "over" ? `${money(Math.abs(row.remaining))} over` : `${Math.round(row.ratio * 100)}% used`}</span>
    </div>
  `).join("")}</div>`;
}

function filteredExpenses() {
  const keyword = state.detailsKeyword.trim().toLowerCase();
  return state.data.expenses.filter((expense) => {
    if (state.detailsPeriod !== "all" && !isDateInPeriod(expense.date, state.detailsPeriod, localIsoDate())) return false;
    if (state.detailsParent !== "all" && expense.categoryId !== state.detailsParent) return false;
    if (state.detailsChild !== "all" && expense.subcategoryId !== state.detailsChild) return false;
    if (!keyword) return true;
    return `${expense.note} ${categoryPath(expense)}`.toLowerCase().includes(keyword);
  });
}

function updateChildSelect(parentSelect) {
  const target = document.getElementById(parentSelect.dataset.childTarget);
  if (!target) return;
  target.innerHTML = childCategories(parentSelect.value)
    .filter((category) => category.active)
    .map((category) => option(category.id, category.name, false))
    .join("");
}

function parentCategories() {
  return state.data.categories.filter((category) => !category.parentId);
}

function childCategories(parentId) {
  return state.data.categories.filter((category) => parentId ? category.parentId === parentId : category.parentId);
}

function categoryPath(expense) {
  const parent = state.data.categories.find((category) => category.id === expense.categoryId);
  const child = state.data.categories.find((category) => category.id === expense.subcategoryId);
  return `${parent?.name || "Unknown"} / ${child?.name || "Unknown"}`;
}

function persist(message) {
  saveData(state.data);
  notify(message);
}

function notify(message) {
  state.notice = message;
  render();
}

function formData(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function money(value) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: state.data.preferences.currency || "CNY" }).format(value);
}

function rangeLabel(period, today) {
  const range = getPeriodRange(period, today);
  return `${labelPeriod(period)} · ${range.start} to ${range.end}`;
}

function labelPeriod(period) {
  return ({ weekly: "Weekly", monthly: "Monthly", yearly: "Yearly", all: "All time" })[period] || period;
}

function localIsoDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function emptyState(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function option(value, label, selected) {
  return `<option value="${escapeAttr(value)}" ${selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function selectedClass(id) {
  return (state.selectedCategoryId || parentCategories()[0]?.id) === id ? "selected" : "";
}

function shortLabel(label) {
  return label.replace("Categories & Budgets", "Budgets").replace("Import & Export", "Import");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
