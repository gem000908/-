import { getBudgetRows, getOverviewTotals, sumForCategory } from "./domain/budgets.js";
import { getCategoryFallbackText, getCategoryGlyph, getCategoryTone } from "./domain/categoryDisplay.js";
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
  ["overview", "总览"],
  ["add", "记一笔"],
  ["categories", "分类与预算"],
  ["details", "流水明细"],
  ["import", "导入导出"]
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
            <strong>每日记账</strong>
            <span>本地支出流水</span>
          </div>
        </div>
        <nav class="nav-list">${navItems.map(([id, label]) => navButton(id, label)).join("")}</nav>
        <div class="sidebar-footer">
          <span>数据保存在本机</span>
          <strong>${state.data.expenses.length} 条流水</strong>
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
      <header class="page-head overview-head">
        <div>
          <h1>总览</h1>
          <p>${rangeLabel(period, today)}</p>
        </div>
        <div class="segmented" role="group" aria-label="总览周期">
          ${["weekly", "monthly", "yearly"].map((item) => `
            <button class="${period === item ? "active" : ""}" data-period="${item}">${labelPeriod(item)}</button>
          `).join("")}
        </div>
      </header>
      <div class="metric-row">
        ${metricCard("spent", "已支出", money(totals.spent), "本周期已记录支出")}
        ${metricCard("remaining", "剩余", money(totals.remaining), totals.remaining < 0 ? `超出预算 ${money(totals.overage)}` : "可用预算")}
        ${metricCard("budgeted", "预算", money(totals.budgeted), `${rows.length} 条启用规则`)}
      </div>
      <aside class="quick-add-column">
        ${addExpenseView("compact")}
      </aside>
      <div class="main-column">
        <section class="panel budget-panel">
          <div class="panel-head">
            <h2>预算状态</h2>
            <span>${labelPeriod(period)}</span>
          </div>
          ${rows.length ? `
            <div class="budget-header">
              <span>分类</span>
              <span>已支出</span>
              <span>预算</span>
              <span>剩余</span>
              <span>进度</span>
            </div>
          ` : ""}
          <div class="budget-list">
            ${rows.length ? rows.map(budgetRow).join("") : emptyState("当前周期还没有启用的预算规则。")}
          </div>
        </section>
        <section class="panel">
          <div class="panel-head">
            <h2>最近流水</h2>
            <button class="text-btn" data-view="details">查看全部</button>
          </div>
          <div class="recent-list">${recent.length ? recent.map(expenseItem).join("") : emptyState("先记一笔支出，开始追踪日常花销。")}</div>
        </section>
      </div>
      <aside class="right-column">
        <section class="panel">
          <div class="panel-head">
            <h2>提醒</h2>
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
  const today = localIsoDate();
  return `
    <section class="panel add-panel ${mode === "compact" ? "compact-panel" : ""}">
      <div class="panel-head">
        <h2>${mode === "compact" ? "快速记账" : "记一笔支出"}</h2>
        ${mode === "compact" ? `<button class="text-btn" data-view="add">完整表单</button>` : ""}
      </div>
      <form id="${mode}-expense-form" class="form-grid expense-form">
        <label>
          <span>金额</span>
          <input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required autofocus>
        </label>
        <label class="default-date-field">
          <span>日期</span>
          <input name="date" type="date" value="${today}" data-default-date="today" required>
        </label>
        <label>
          <span>一级分类</span>
          <select name="categoryId" data-child-target="${mode}-child-select" required>
            ${parents.map((category) => option(category.id, category.name, category.id === selectedParent)).join("")}
          </select>
        </label>
        <label>
          <span>二级分类</span>
          <select id="${mode}-child-select" name="subcategoryId" required>
            ${children.map((category) => option(category.id, category.name, category.id === selectedChild)).join("")}
          </select>
        </label>
        <label class="wide">
          <span>备注</span>
          <input name="note" type="text" placeholder="可选备注">
        </label>
        <button class="primary-btn wide" type="submit">保存支出</button>
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
          <h2>分类树</h2>
        </div>
        <div class="category-tree">${parentCategories().map((parent) => categoryBranch(parent)).join("")}</div>
        <form id="parent-category-form" class="inline-form">
          <input name="name" placeholder="新增一级分类" required>
          <button type="submit">添加</button>
        </form>
      </div>
      <div class="panel detail-panel">
        <div class="panel-head">
          <h2>${escapeHtml(selected?.name || "分类")}</h2>
          <span>${selected?.parentId ? "二级分类" : "一级分类"}</span>
        </div>
        ${selected ? `
          <form id="rename-category-form" class="inline-form">
            <input name="name" value="${escapeAttr(selected.name)}" required>
            <button type="submit">重命名</button>
            <button type="button" class="danger-btn" data-disable-category="${selected.id}" ${selected.active ? "" : "disabled"}>停用</button>
          </form>
          ${!selected.parentId ? `
            <form id="child-category-form" class="inline-form">
              <input name="name" placeholder="新增二级分类" required>
              <button type="submit">添加子类</button>
            </form>
          ` : ""}
          <section class="rule-section">
            <h3>预算规则</h3>
            <div class="rule-list">${rules.length ? rules.map(ruleItem).join("") : emptyState("该分类还没有预算规则。")}</div>
            <form id="budget-rule-form" class="inline-form rule-form">
              <select name="period">
                <option value="weekly">每周</option>
                <option value="monthly" selected>每月</option>
                <option value="yearly">每年</option>
              </select>
              <input name="amount" type="number" min="0.01" step="0.01" placeholder="预算金额" required>
              <label class="check-label"><input name="active" type="checkbox" checked> 启用</label>
              <button type="submit">保存规则</button>
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
          <h2>流水明细</h2>
          <span>${expenses.length} 条匹配流水</span>
        </div>
      </div>
      <div class="filters">
        <select id="details-period">
          ${["weekly", "monthly", "yearly", "all"].map((period) => option(period, labelPeriod(period), period === state.detailsPeriod)).join("")}
        </select>
        <select id="details-parent">
          <option value="all">全部一级分类</option>
          ${parentCategories().map((category) => option(category.id, category.name, category.id === state.detailsParent)).join("")}
        </select>
        <select id="details-child">
          <option value="all">全部二级分类</option>
          ${childCategories(state.detailsParent === "all" ? null : state.detailsParent).map((category) => option(category.id, category.name, category.id === state.detailsChild)).join("")}
        </select>
        <input id="details-keyword" value="${escapeAttr(state.detailsKeyword)}" placeholder="搜索备注或分类">
      </div>
      ${editing ? editExpenseForm(editing) : ""}
      <div class="table-wrap">
        <table>
          <thead><tr><th>日期</th><th>金额</th><th>分类</th><th>备注</th><th></th></tr></thead>
          <tbody>${expenses.length ? expenses.map(expenseRow).join("") : `<tr><td colspan="5">${emptyState("没有符合筛选条件的流水。")}</td></tr>`}</tbody>
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
          <h2>导出</h2>
        </div>
        <div class="tool-list">
          <button class="primary-btn" data-export-json>导出 JSON 备份</button>
          <button data-export-csv>导出 CSV 流水</button>
          <p>JSON 备份会保留分类、预算规则、支出流水和偏好设置。</p>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <h2>导入</h2>
        </div>
        <form id="import-form" class="import-form">
          <div class="segmented">
            <button type="button" data-import-mode="overwrite" class="${state.importMode === "overwrite" ? "active" : ""}">覆盖</button>
            <button type="button" data-import-mode="merge" class="${state.importMode === "merge" ? "active" : ""}">合并</button>
          </div>
          <input id="backup-file" type="file" accept="application/json,.json">
          <textarea name="backup" rows="10" placeholder="在这里粘贴 JSON 备份">${escapeHtml(state.importText)}</textarea>
          <button class="primary-btn" type="submit">导入备份</button>
        </form>
      </div>
    </section>
  `;
}

function bindEvents() {
  initializeExpenseFormDates();
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      state.notice = "";
      render();
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  });
  document.querySelectorAll("[data-period]").forEach((button) => {
    button.addEventListener("click", () => {
      state.overviewPeriod = button.dataset.period;
      state.data.preferences.overviewPeriod = button.dataset.period;
        persist("周期已更新");
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
        persist("支出已保存");
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

function initializeExpenseFormDates() {
  const today = localIsoDate();
  document.querySelectorAll('.expense-form input[name="date"][data-default-date="today"]').forEach((input) => {
    input.defaultValue = today;
    input.value = today;
  });
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
      persist("一级分类已添加");
    } catch (error) {
      notify(error.message);
    }
  });
  document.getElementById("child-category-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      state.data = addCategory(state.data, { name: formData(event.currentTarget).name, parentId: state.selectedCategoryId });
      persist("二级分类已添加");
    } catch (error) {
      notify(error.message);
    }
  });
  document.getElementById("rename-category-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      state.data = renameCategory(state.data, state.selectedCategoryId || parentCategories()[0].id, formData(event.currentTarget).name);
      persist("分类已重命名");
    } catch (error) {
      notify(error.message);
    }
  });
  document.querySelector("[data-disable-category]")?.addEventListener("click", (event) => {
    state.data = disableCategory(state.data, event.currentTarget.dataset.disableCategory);
    persist("分类已停用");
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
      persist("预算规则已保存");
    } catch (error) {
      notify(error.message);
    }
  });
  document.querySelectorAll("[data-delete-rule]").forEach((button) => {
    button.addEventListener("click", () => {
      state.data = deleteBudgetRule(state.data, button.dataset.deleteRule);
      persist("预算规则已删除");
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
      persist("支出已删除");
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
      persist("支出已更新");
    } catch (error) {
      notify(error.message);
    }
  });
}

function bindImportExportEvents() {
  document.querySelector("[data-export-json]")?.addEventListener("click", () => download("记账备份.json", exportJson(state.data), "application/json"));
  document.querySelector("[data-export-csv]")?.addEventListener("click", () => download("支出流水.csv", exportCsv(state.data), "text/csv"));
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
      persist(`备份已${state.importMode === "merge" ? "合并" : "覆盖"}导入`);
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
  const tone = getCategoryTone(row.categoryId, row.categoryName);
  return `
    <button class="budget-row ${row.state}" data-filter-category="${row.categoryId}">
      <div class="budget-main">
        <span class="category-orb ${tone}" aria-hidden="true">${categoryIcon(row.categoryId, row.categoryName)}</span>
        <span>
          <strong>${escapeHtml(row.categoryName)}</strong>
          <em>${labelPeriod(row.period)}规则</em>
        </span>
      </div>
      <div class="budget-cell">
        <span>已支出</span>
        <b>${money(row.spent)}</b>
      </div>
      <div class="budget-cell">
        <span>预算</span>
        <b>${money(row.amount)}</b>
      </div>
      <div class="budget-cell ${row.remaining < 0 ? "negative" : "positive"}">
        <span>剩余</span>
        <b>${money(row.remaining)}</b>
      </div>
      <div class="progress-cell">
        <div class="progress"><i style="width:${pct}%"></i></div>
      </div>
      <strong class="budget-percent">${pct}%</strong>
    </button>
  `;
}

function metricCard(kind, label, value, caption) {
  return `
    <div class="metric metric-${kind}">
      <div>
        <span>${label}</span>
        <strong>${value}</strong>
        <em>${caption}</em>
      </div>
      <i class="metric-icon" aria-hidden="true">${metricIcon(kind)}</i>
    </div>
  `;
}

function metricIcon(kind) {
  return `<span class="metric-glyph metric-glyph-${escapeAttr(kind)}"></span>`;
}

function expenseItem(expense) {
  const label = categoryPath(expense);
  const iconCategoryId = expense.subcategoryId || expense.categoryId;
  const tone = getCategoryTone(iconCategoryId, label);
  return `
    <div class="expense-item">
      <span class="category-orb ${tone}" aria-hidden="true">${categoryIcon(iconCategoryId, label)}</span>
      <div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(expense.note || "无备注")}</span></div>
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
        <button data-edit-expense="${expense.id}">编辑</button>
        <button class="danger-btn" data-delete-expense="${expense.id}">删除</button>
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
      <button class="primary-btn" type="submit">更新</button>
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
      <div><strong>${labelPeriod(rule.period)}</strong><span>${rule.active ? "启用中" : "已暂停"}</span></div>
      <b>${money(rule.amount)}</b>
      <button class="danger-btn" data-delete-rule="${rule.id}">删除</button>
    </div>
  `;
}

function signalList(rows) {
  const signals = rows.filter((row) => row.state !== "normal");
  if (!signals.length) {
    return `
      <div class="signal signal-ok">
        <span class="signal-check" aria-hidden="true"></span>
        <div>
          <strong>预算状态良好</strong>
          <span>暂无接近或超出预算的分类。</span>
        </div>
      </div>
    `;
  }
  return `<div class="signal-list">${signals.map((row) => `
    <div class="signal ${row.state}">
      <strong>${escapeHtml(row.categoryName)}</strong>
      <span>${row.state === "over" ? `超出 ${money(Math.abs(row.remaining))}` : `已用 ${Math.round(row.ratio * 100)}%`}</span>
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
  return `${parent?.name || "未知"} / ${child?.name || "未知"}`;
}

function categoryIcon(categoryId, label) {
  const glyph = getCategoryGlyph(categoryId);
  const text = glyph === "glyph-text" ? escapeHtml(getCategoryFallbackText(label)) : "";
  return `<span class="category-glyph ${escapeAttr(glyph)}">${text}</span>`;
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
  return `${labelPeriod(period)}：${range.start} 至 ${range.end}`;
}

function labelPeriod(period) {
  return ({ weekly: "每周", monthly: "每月", yearly: "每年", all: "全部时间" })[period] || period;
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
  return label.replace("分类与预算", "预算").replace("导入导出", "导入");
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
