import { createDemoCases } from './cases';
import type { CaseRepository } from '../domain/types';
import { storedWorkspaceSchema } from './storageSchema';

export const STORAGE_KEY = 'agap.demo.v1';
export function createBrowserRepository(providedStorage?: Storage, onWarning: (message: string) => void = () => {}): CaseRepository {
  let records = createDemoCases();
  let storage: Storage | undefined;
  let preserveUnreadableData = false;
  const memoryWarning = () => onWarning('Browser storage is unavailable. Changes are kept in memory and will be lost on refresh.');
  try {
    storage = providedStorage ?? window.localStorage;
    const raw = storage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = storedWorkspaceSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) throw new Error('Incompatible workspace');
      records = parsed.data.records;
    }
  } catch {
    preserveUnreadableData = !!storage;
    onWarning(storage
      ? 'Saved demo data could not be loaded. It has been preserved; changes are memory-only until you reset the demo.'
      : 'Browser storage is unavailable. Changes are kept in memory and will be lost on refresh.');
  }
  function persist() {
    if (preserveUnreadableData) return;
    if (!storage) { memoryWarning(); return; }
    try { storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, records })); }
    catch { memoryWarning(); }
  }
  return {
    async list() { return structuredClone(records); },
    async load(id) { return structuredClone(records.find(record => record.id === id)); },
    async save(record) {
      if (!records.some(item => item.id === record.id)) throw new Error('Application not found');
      const updated = records.map(item => item.id === record.id ? structuredClone(record) : item);
      if (!storedWorkspaceSchema.safeParse({ schemaVersion: 1, records: updated }).success) throw new Error('The application contains invalid data. Your previous saved record is unchanged.');
      records = updated;
      persist();
    },
    async reset() { records = createDemoCases(); preserveUnreadableData = false; persist(); return structuredClone(records); },
  };
}
