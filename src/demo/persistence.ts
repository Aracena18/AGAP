import { createDemoCases } from './cases';
import type { CaseRepository } from '../domain/types';
import { legacyWorkspaceSchema, storedWorkspaceSchema } from './storageSchema';
import { evidenceBasis, synchronizeReview } from '../domain/priorityReview';

export const STORAGE_KEY = 'agap.demo.v2';
export const LEGACY_STORAGE_KEY = 'agap.demo.v1';
export function createBrowserRepository(providedStorage?: Storage, onWarning: (message: string) => void = () => {}): CaseRepository {
  let records = createDemoCases();
  let storage: Storage | undefined;
  let preserveUnreadableData = false;
  const memoryWarning = () => onWarning('Browser storage is unavailable. Changes are kept in memory and will be lost on refresh.');
  try {
    storage = providedStorage ?? window.localStorage;
    const current = storage.getItem(STORAGE_KEY);
    const raw = current ?? storage.getItem(LEGACY_STORAGE_KEY);
    if (raw !== null) {
      const parsed = (current === null ? legacyWorkspaceSchema : storedWorkspaceSchema).safeParse(JSON.parse(raw));
      if (!parsed.success) throw new Error('Incompatible workspace');
      const seeds = createDemoCases();
      records = parsed.data.records.map(record => synchronizeReview(record, new Date().toISOString(), record.review ? undefined : seeds.find(seed => seed.id === record.id)?.review?.aiConcerns));
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
    try { storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 2, records })); }
    catch { memoryWarning(); }
  }
  return {
    async list() { return structuredClone(records); },
    async load(id) { return structuredClone(records.find(record => record.id === id)); },
    async save(record) {
      if (!records.some(item => item.id === record.id)) throw new Error('Application not found');
      const previous = records.find(item => item.id === record.id)!;
      const candidate = structuredClone(record);
      if (evidenceBasis(previous) !== evidenceBasis(candidate) && (previous.review?.evidenceRevision ?? 0) === (candidate.review?.evidenceRevision ?? 0)) {
        candidate.review ??= { aiConcerns: [], evidenceConfirmations: [], concernReviews: [] };
        candidate.review.evidenceRevision = (previous.review?.evidenceRevision ?? 0) + 1;
      }
      if (evidenceBasis(previous) !== evidenceBasis(candidate) && candidate.version <= previous.version) candidate.version = previous.version + 1;
      const updated = records.map(item => item.id === record.id ? synchronizeReview(candidate, new Date().toISOString()) : item);
      if (!storedWorkspaceSchema.safeParse({ schemaVersion: 2, records: updated }).success) throw new Error('The application contains invalid data. Your previous saved record is unchanged.');
      records = updated;
      persist();
    },
    async reset() { records = createDemoCases(); preserveUnreadableData = false; persist(); return structuredClone(records); },
  };
}
