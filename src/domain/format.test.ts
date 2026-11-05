import { expect, it } from 'vitest';
import { money } from './format';

const moneyCases=[[0,'₱0'],[1,'₱0.01'],[10,'₱0.1'],[105,'₱1.05'],[150,'₱1.5'],[100000,'₱1,000'],[-101,'−₱1.01'],
  [Number.MAX_SAFE_INTEGER,'₱90,071,992,547,409.91'],[Number.MIN_SAFE_INTEGER,'−₱90,071,992,547,409.91']] as const;
it.each(moneyCases)('preserves exact centavos in supplied financial displays: %s',(value,expected)=>{
  expect(money(value)).toBe(expected);
});
it.each([NaN,Infinity,-Infinity,1.5,Number.MAX_SAFE_INTEGER+1])('refuses an invalid monetary display instead of rounding it or showing zero: %s',value=>{
  expect(()=>money(value)).toThrow(RangeError);
});
