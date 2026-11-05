import { createHash } from 'node:crypto';
import { canonical } from '../../platform/commands.js';

/** Server-only commitment helper. Browser-consumed schema modules stay pure. */
export const workflowDigest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
