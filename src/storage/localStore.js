import { createInitialData } from "../domain/seed.js";
import { importJsonBackup, parseBackupJson } from "../domain/importExport.js";

const DATA_KEY = "budget-ledger:data";
const BACKUP_KEY = "budget-ledger:last-backup";

export function loadData(storage = globalThis.localStorage) {
  if (!storage) return createInitialData();
  const raw = storage.getItem(DATA_KEY);
  if (!raw) return createInitialData();
  const parsed = parseBackupJson(raw);
  return parsed.ok ? parsed.data : { ...createInitialData(), recovery: { corruptData: raw } };
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
    saveBackup(result.backup, storage);
    saveData(result.data, storage);
  }
  return result;
}
