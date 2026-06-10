import { createInitialData } from "../domain/seed.js";
import { importJsonBackup, parseBackupJson } from "../domain/importExport.js";

const DATA_KEY = "budget-ledger:data";
const BACKUP_KEY = "budget-ledger:last-backup";
const legacyCategoryNames = new Map([
  ["food", ["Food", "餐饮"]],
  ["takeout", ["Takeout", "外卖"]],
  ["groceries", ["Groceries", "菜场超市"]],
  ["transport", ["Transport", "交通"]],
  ["subway", ["Subway", "地铁公交"]],
  ["taxi", ["Taxi", "打车"]],
  ["shopping", ["Shopping", "购物"]],
  ["daily-goods", ["Daily Goods", "日用品"]],
  ["housing", ["Housing", "居住"]],
  ["rent", ["Rent", "房租"]],
  ["entertainment", ["Entertainment", "娱乐"]],
  ["movies", ["Movies", "电影演出"]],
  ["health", ["Health", "健康"]],
  ["medicine", ["Medicine", "药品医疗"]],
  ["learning", ["Learning", "学习"]],
  ["books", ["Books", "书籍课程"]]
]);

export function loadData(storage = globalThis.localStorage) {
  if (!storage) return createInitialData();
  const raw = storage.getItem(DATA_KEY);
  if (!raw) return createInitialData();
  const parsed = parseBackupJson(raw);
  if (!parsed.ok) return { ...createInitialData(), recovery: { corruptData: raw } };
  const migrated = migrateLegacyChineseLabels(parsed.data);
  if (migrated.changed) saveData(migrated.data, storage);
  return migrated.data;
}

export function saveData(data, storage = globalThis.localStorage) {
  storage?.setItem(DATA_KEY, JSON.stringify(data));
}

export function saveBackup(data, storage = globalThis.localStorage) {
  storage?.setItem(BACKUP_KEY, JSON.stringify(data));
}

export function loadBackup(storage = globalThis.localStorage) {
  const raw = storage?.getItem(BACKUP_KEY);
  if (!raw) return null;
  const parsed = parseBackupJson(raw);
  return parsed.ok ? parsed.data : null;
}

export function applyImport(currentData, json, mode, storage = globalThis.localStorage) {
  const result = importJsonBackup(currentData, json, mode);
  if (result.ok) {
    const migrated = migrateLegacyChineseLabels(result.data);
    saveBackup(result.backup, storage);
    saveData(migrated.data, storage);
    return { ...result, data: migrated.data };
  }
  return result;
}

function migrateLegacyChineseLabels(data) {
  let changed = false;
  const categories = data.categories.map((category) => {
    const legacy = legacyCategoryNames.get(category.id);
    if (!legacy || category.name !== legacy[0]) return category;
    changed = true;
    return { ...category, name: legacy[1] };
  });
  return { changed, data: changed ? { ...data, categories } : data };
}
