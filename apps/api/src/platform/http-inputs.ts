import { z } from 'zod';
import { Id } from '../../../../packages/contracts/src/schemas.js';
export const pageInput = z.object({cursor:Id.optional(),limit:z.coerce.number().int().min(1).max(100).default(25)});
