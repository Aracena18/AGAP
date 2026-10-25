import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrowserRepository, STORAGE_KEY } from './persistence';

describe('fictional case repository', () => {
  beforeEach(() => localStorage.clear());
  it('preserves a saved correction after the repository is recreated', async () => {
    const repository = createBrowserRepository(localStorage);
    const ana = (await repository.load('AG-001'))!;
    ana.facts.find(fact => fact.id === 'income')!.value = 2400000;
    ana.version = 2;
    await repository.save(ana);
    expect((await createBrowserRepository(localStorage).load('AG-001'))?.version).toBe(2);
  });
  it('keeps returned records detached from stored state', async () => {
    const repository = createBrowserRepository(localStorage);
    const records = await repository.list();
    records[0].member.name = 'Changed outside save';
    expect((await repository.load('AG-001'))?.member.name).toBe('Ana Dela Cruz');
  });
  it('does not silently overwrite incompatible saved data', async () => {
    const original = JSON.stringify({ schemaVersion: 999, records: [] });
    localStorage.setItem(STORAGE_KEY, original);
    const warning = vi.fn();
    const repository = createBrowserRepository(localStorage, warning);
    const record = (await repository.list())[0];
    await repository.save(record);
    expect(warning).toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });
  it('preserves structurally incomplete offer data instead of loading it into the workspace', async () => {
    const records = await createBrowserRepository(localStorage).list();
    records[0].offers = [];
    const original = JSON.stringify({ schemaVersion: 1, records });
    localStorage.setItem(STORAGE_KEY, original);
    const warning = vi.fn();
    const restored = await createBrowserRepository(localStorage, warning).list();
    expect(warning).toHaveBeenCalled();
    expect(restored[0].offers).toHaveLength(2);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });
  it('recovers explicitly through reset after malformed data', async () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    const repository = createBrowserRepository(localStorage, () => {});
    expect(await repository.reset()).toHaveLength(3);
    expect((await createBrowserRepository(localStorage).list())[0].version).toBe(1);
  });
  it('continues in memory when writing fails and explains that progress will not survive refresh', async () => {
    const warning = vi.fn();
    const storage = { getItem: () => null, setItem: () => { throw new Error('Quota'); }, removeItem: () => {}, clear: () => {}, key: () => null, length: 0 };
    const repository = createBrowserRepository(storage, warning);
    const ana = (await repository.list())[0];
    ana.version = 2;
    await repository.save(ana);
    expect((await repository.load('AG-001'))?.version).toBe(2);
    expect(warning).toHaveBeenCalledWith(expect.stringMatching(/memory|refresh/i));
  });
});
