import { describe,expect,it } from 'vitest';
import { readFile } from 'node:fs/promises';
import SwaggerParser from '@apidevtools/swagger-parser';
import { randomUUID } from 'node:crypto';
import { CalendarDay,FactValueSchema,FinancialCommandCreateSchema,JournalLineSchema,MoneyAmount } from './schemas.js';
import { operations } from './operations.js';

describe('shared executable contracts',()=>{
  it('rejects invalid calendar dates, fractional/unsafe money and unknown-as-zero coercion',()=>{
    for(const date of ['2026-02-30','2026-11-31','21 October 2026'])expect(CalendarDay.safeParse(date).success).toBe(false);
    expect(CalendarDay.parse('2028-02-29')).toBe('2028-02-29');
    for(const amount of [null,undefined,'100',0.1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])expect(MoneyAmount.safeParse(amount).success).toBe(false);
    expect(FactValueSchema.parse({availability:'recorded',amountCentavos:0})).toEqual({availability:'recorded',amountCentavos:0});
    expect(FactValueSchema.safeParse({availability:'unavailable',amountCentavos:0}).success).toBe(false);
  });
  it('does not permit zero-value payment commands or journal lines',()=>{
    expect(JournalLineSchema.safeParse({accountId:randomUUID(),side:'debit',amountCentavos:0}).success).toBe(false);
    expect(FinancialCommandCreateSchema.safeParse({loanId:randomUUID(),amountCentavos:0,currency:'PHP',effectiveDate:'2026-11-01',method:'cash',instrumentReference:'FIC-1',reason:'Fictional payment'}).success).toBe(false);
  });
  it('publishes a structurally valid OpenAPI document with no ambiguous operation IDs',async()=>{
    const document=JSON.parse(await readFile('packages/contracts/openapi.json','utf8'));
    await expect(SwaggerParser.validate(document)).resolves.toBeDefined();
    expect(new Set(operations.map(op=>op.id)).size).toBe(operations.length);
    expect(document.paths['/api/v1/payments'].post['x-agap-state']).toBe('contract-only');
    expect(document.paths['/api/v1/members'].post.parameters).toEqual(expect.arrayContaining([expect.objectContaining({name:'Idempotency-Key',required:true})]));
  });
});
