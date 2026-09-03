/**
 * Quote estimator — the same math on the public booking page and in HQ.
 *
 *   estimate = base(configuration)              // a standard evening = STANDARD_HOURS
 *            + max(0, hours − STANDARD_HOURS) × base × EXTRA_HOUR_PCT
 *            + travel fee (band)
 *
 * All inputs are rate-card rows (HQ → Settings). These two constants are
 * the only non-table knobs; both are placeholders pending Winston + John.
 */

export const STANDARD_HOURS = 3;
export const EXTRA_HOUR_PCT = 0.25;
export const RANGE_PCT = 0.1; // show ±10% on the public page

export type TravelBand = { key: string; label: string; fee_cents: number; sort: number };

export function estimateCents(input: {
  baseCents: number;
  hours: number | null;
  travelFeeCents: number;
}): number {
  const hours = input.hours && input.hours > 0 ? input.hours : STANDARD_HOURS;
  const extra = Math.max(0, hours - STANDARD_HOURS) * input.baseCents * EXTRA_HOUR_PCT;
  return Math.round(input.baseCents + extra + input.travelFeeCents);
}

export function estimateRange(cents: number): { low: number; high: number } {
  const round = (n: number) => Math.round(n / 2500) * 2500; // to $25
  return { low: round(cents * (1 - RANGE_PCT)), high: round(cents * (1 + RANGE_PCT)) };
}

export function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}
