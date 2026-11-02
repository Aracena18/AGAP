import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { CommandSchema } from '../context.js';
import { prepareReleaseCommand, recordObservation, recoveryAdvice } from '../command-rules.js';
import { authorized, prepared, submitted, times } from './fixtures.js';
import { FictionalManualDriver } from './manual-simulation.js';
const event = (outcome: 'confirmed' | 'failed' | 'unknown' = 'confirmed') => ({ observationId: randomUUID(), movementId: randomUUID(), at: times.observe, outcome });
describe('Fictional manual driver — serialized test state, no real persistence or execution', () => {
  it('simulates one movement after a submitted intent without network/accounting activity', () => {
    const network = vi.spyOn(globalThis, 'fetch'), f = submitted(), driver = new FictionalManualDriver();
    try {
      const observation = driver.submit(f.command, event());
      expect(observation.mode).toBe('simulation'); expect(observation.providerReference).toMatch(/^SIMULATED-/); expect(driver.simulatedMovementCount).toBe(1);
      expect(network).not.toHaveBeenCalled(); expect(f.command.state).toBe('submitted'); expect(f.command.journalId).toBeNull();
    } finally { network.mockRestore(); }
  });
  it.each(['prepared', 'authorized'] as const)('does not simulate a movement before submission in state %s', state => {
    const f = state === 'prepared' ? prepared() : authorized(), driver = new FictionalManualDriver();
    expect(() => driver.submit(f.command, event())).toThrow(/submitted fictional intent/); expect(driver.snapshot().entries).toEqual([]);
  });
  it('returns the same fictional outcome across repeated keys and serialized fixture restoration', () => {
    const f = submitted(), driver = new FictionalManualDriver(), original = driver.submit(f.command, event());
    const restored = new FictionalManualDriver(JSON.parse(JSON.stringify(driver.snapshot())));
    expect(restored.submit(f.command, event())).toEqual(original); expect(restored.simulatedMovementCount).toBe(1);
  });
  it('recovers lost fictional response through explicit operator evidence without calling submit again', () => {
    const f = submitted(), driver = new FictionalManualDriver(); driver.submit(f.command, event());
    const restored = new FictionalManualDriver(JSON.parse(JSON.stringify(driver.snapshot())));
    // An operator-supplied serialized fixture is not an implemented provider-status endpoint.
    const evidence = restored.snapshot().entries[0].observation;
    expect(recoveryAdvice(f.command)).toMatchObject({ canResubmit: false, nextAction: 'operator_reconciliation_required' });
    const next = recordObservation(f.cashier, { authority: f.context.authority }, JSON.parse(JSON.stringify(f.command)), { id: f.command.id, expectedVersion: 3, at: times.later, action: 'reconcile', observation: evidence });
    expect(next.command.state).toBe('confirmed_unposted'); expect(restored.simulatedMovementCount).toBe(1); expect(next.command.origination.state).toBe('pending_release');
  });
  it('does not turn retrying an unknown fictional outcome into a new movement', () => {
    const f = submitted(), driver = new FictionalManualDriver(), original = driver.submit(f.command, event('unknown'));
    expect(original).toMatchObject({ state: 'unknown', movementId: null, amountMinorUnits: null, currency: null, effectiveDate: null, occurredAt: null });
    expect(driver.submit(f.command, event('confirmed'))).toEqual(original); expect(driver.simulatedMovementCount).toBe(0);
  });
  it('records a fictional verified no-movement result without claiming money received', () => {
    const f = submitted(), driver = new FictionalManualDriver(), o = driver.submit(f.command, event('failed'));
    expect(o).toMatchObject({ state: 'failed', verified: true, movementId: null, amountMinorUnits: null });
    expect(driver.simulatedMovementCount).toBe(0);
  });
  it('refuses real-mode or payload-tampered commands without any simulated movement', () => {
    const f = submitted(), c = CommandSchema.parse(f.command), driver = new FictionalManualDriver(); c.mode = 'actual';
    expect(() => driver.submit(c, event())).toThrow();
    c.mode = 'simulation'; c.payload.amountCentavos = 1;
    expect(() => driver.submit(c, event())).toThrow(/immutable command payload/); expect(driver.simulatedMovementCount).toBe(0);
  });
  it.each(['providerKey', 'businessEventId'] as const)('does not reuse %s for a different valid fictional command', field => {
    const f = submitted(), driver = new FictionalManualDriver(); driver.submit(f.command, event());
    const second = prepared();
    const command = prepareReleaseCommand(second.cashier, second.context, second.loan, { id: randomUUID(), businessEventId: field === 'businessEventId' ? f.command.businessEventId : randomUUID(),
      providerKey: field === 'providerKey' ? f.command.providerKey : randomUUID(), at: times.prepare, releaseClaim: 'none', request: second.command.payload });
    const later = submitted(authorized({ ...second, command }));
    expect(() => driver.submit(later.command, event())).toThrow(/key|release/); expect(driver.simulatedMovementCount).toBe(1);
  });
  it('rejects non-fictional, duplicate-key and inconsistent restored fixture state', () => {
    const f = submitted(), driver = new FictionalManualDriver(); driver.submit(f.command, event());
    expect(() => new FictionalManualDriver({ ...driver.snapshot(), purpose: 'actual-money' })).toThrow();
    const duplicate = driver.snapshot(); duplicate.entries.push(duplicate.entries[0]); expect(() => new FictionalManualDriver(duplicate)).toThrow(/Duplicate/);
    const inconsistent = driver.snapshot(); inconsistent.entries[0].observation.commandId = randomUUID(); expect(() => new FictionalManualDriver(inconsistent)).toThrow(/inconsistent/);
  });
});
