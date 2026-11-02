import { isCalendarDate } from '../../../src/domain/format.js';
import type { CashMovement } from '../../../src/domain/types.js';
export function sumMoney(values: readonly number[]): number {
  if (!values.every(Number.isSafeInteger)) throw new RangeError('Invalid integer money.');
  const result = Number(values.reduce((n, value) => n + BigInt(value), 0n));
  if (!Number.isSafeInteger(result)) throw new RangeError('Money exceeds the supported integer range.');
  return result;
}
export function cashFlow(opening: number, start: string, end: string, movements: ReadonlyMap<string, CashMovement[]>) {
  if (!isCalendarDate(start) || !isCalendarDate(end) || start > end || !Number.isSafeInteger(opening)) throw new RangeError('Invalid cash-flow period.');
  let balance = opening, remaining = 0, lowest = opening;
  const months = new Map<string, number>();
  const daily: { date: string; balance: number; movements: CashMovement[] }[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  while (cursor.toISOString().slice(0, 10) <= end) {
    if (daily.length >= 366) throw new RangeError('Choose a review horizon of at most 366 days.');
    const date = cursor.toISOString().slice(0, 10), today = movements.get(date) ?? [], net = sumMoney(today.map(x => x.amount));
    remaining = sumMoney([remaining, net]); balance = sumMoney([balance, net]); lowest = Math.min(lowest, balance);
    const month = date.slice(0, 7); months.set(month, sumMoney([months.get(month) ?? 0, net]));
    daily.push({ date, balance, movements: today }); cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return { remaining, lowest, closing: balance, daily, months: [...months].map(([month, amount]) => ({ month, remainingCentavos: amount })) };
}
