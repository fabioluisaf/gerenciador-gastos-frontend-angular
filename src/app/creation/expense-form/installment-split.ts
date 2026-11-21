export function splitEvenly(totalCents: number, count: number): number[] {
  const parcel = Math.trunc(totalCents / count);
  const first = totalCents - parcel * (count - 1);
  return Array.from({ length: count }, (_, index) => (index === 0 ? first : parcel));
}

export function isEvenSplit(cents: readonly number[]): boolean {
  const total = cents.reduce((sum, value) => sum + value, 0);
  const even = splitEvenly(total, cents.length);
  return cents.every((value, index) => value === even[index]);
}
