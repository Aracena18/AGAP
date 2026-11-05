import type { Money } from './types';

export function money(value: Money): string {
  if (!Number.isSafeInteger(value)) throw new RangeError('Money requires safe integer centavos.');
  const amount = BigInt(value < 0 ? -value : value);
  const whole = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(amount / 100n);
  const remainder = amount % 100n;
  const fraction = remainder === 0n ? '' : `.${String(remainder).padStart(2, '0').replace(/0$/, '')}`;
  return `${value < 0 ? '−' : ''}₱${whole}${fraction}`;
}
export function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
