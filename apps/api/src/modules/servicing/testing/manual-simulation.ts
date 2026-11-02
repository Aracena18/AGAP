/** Test-only fictional driver. No network, cash, bank, journal or persistence implementation. */
import { z } from 'zod';
import { ObservationInputSchema, type ObservationInput } from '../context.js';
import { fingerprint, inspectCommand, ServicingRuleError } from '../command-rules.js';
import { Id, Instant } from '../../../../../../packages/contracts/src/schemas.js';
const Entry = z.strictObject({ commandId: Id, providerKey: Id, payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
  businessEventId: Id, observation: ObservationInputSchema });
const State = z.strictObject({ purpose: z.literal('fictional-test-only'), entries: z.array(Entry) });
export class FictionalManualDriver {
  private state: z.output<typeof State>;
  constructor(snapshot: unknown = { purpose: 'fictional-test-only', entries: [] }) {
    this.state = State.parse(snapshot);
    if (new Set(this.state.entries.map(e => e.providerKey)).size !== this.state.entries.length) throw new ServicingRuleError('simulation_state_conflict', 'Duplicate fictional driver keys.');
    if (this.state.entries.some(e => e.observation.mode !== 'simulation' || e.observation.commandId !== e.commandId || e.observation.providerKey !== e.providerKey || e.observation.businessEventId !== e.businessEventId)) throw new ServicingRuleError('simulation_state_conflict', 'The saved fictional state is inconsistent.');
  }
  snapshot() { return structuredClone(this.state); }
  get simulatedMovementCount() { return this.state.entries.filter(e => e.observation.state === 'confirmed').length; }
  submit(input: unknown, event: { observationId: string; movementId: string; at: string; outcome: 'confirmed' | 'failed' | 'unknown' }): ObservationInput {
    const c = inspectCommand(input);
    const p = z.strictObject({ observationId: Id, movementId: Id, at: Instant, outcome: z.enum(['confirmed', 'failed', 'unknown']) }).parse(event);
    if (c.mode !== 'simulation' || c.state !== 'submitted' || !c.submission) throw new ServicingRuleError('simulation_only', 'Only a submitted fictional intent can use this test driver.');
    const existing = this.state.entries.find(e => e.providerKey === c.providerKey);
    if (existing) {
      if (existing.payloadHash !== c.payloadHash || existing.commandId !== c.id || existing.businessEventId !== c.businessEventId) throw new ServicingRuleError('simulation_key_conflict', 'A fictional provider key already identifies another payload.');
      return structuredClone(existing.observation);
    }
    const sameEvent = this.state.entries.find(e => e.businessEventId === c.businessEventId || e.commandId === c.id);
    if (sameEvent) throw new ServicingRuleError('simulation_key_conflict', 'Changing a key cannot create another fictional release.');
    const observation = ObservationInputSchema.parse({ id: p.observationId, producer: 'fictional-manual-driver-v1', commandId: c.id, businessEventId: c.businessEventId, providerKey: c.providerKey,
      mode: 'simulation', state: p.outcome, movementId: p.outcome === 'confirmed' ? p.movementId : null,
      providerReference: p.outcome === 'unknown' ? null : `SIMULATED-${p.movementId}`, amountMinorUnits: p.outcome === 'confirmed' ? c.amountCentavos : null, currency: p.outcome === 'confirmed' ? c.currency : null,
      effectiveDate: p.outcome === 'confirmed' ? c.payload.effectiveDate : null, occurredAt: p.outcome === 'confirmed' ? p.at : null, verified: p.outcome !== 'unknown',
      evidence: p.outcome === 'unknown' ? null : { id: p.movementId, sha256: fingerprint({ purpose: 'fictional-test-only', commandId: c.id, outcome: p.outcome }) } });
    this.state.entries.push({ commandId: c.id, providerKey: c.providerKey, payloadHash: c.payloadHash, businessEventId: c.businessEventId, observation });
    return structuredClone(observation);
  }
}
