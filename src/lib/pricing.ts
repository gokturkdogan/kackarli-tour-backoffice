type PriceInput = number | string | { toString(): string } | null | undefined;

function toPriceNumber(value: PriceInput): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/** Schedule price → tour list price */
export function resolveAdultPrice(
  schedulePrice: PriceInput,
  tourPrice: PriceInput
): number {
  return toPriceNumber(schedulePrice) ?? toPriceNumber(tourPrice) ?? 0;
}

/**
 * Schedule child price → tour child price → adult price (same as yetişkin when unset).
 */
export function resolveChildPrice(
  scheduleChildPrice: PriceInput,
  tourChildPrice: PriceInput,
  adultPrice: number
): number {
  return (
    toPriceNumber(scheduleChildPrice) ??
    toPriceNumber(tourChildPrice) ??
    adultPrice
  );
}

/** True only when an explicit child price differs from the adult price. */
export function hasDistinctChildPrice(
  tourChildPrice: PriceInput,
  adultPrice: number
): boolean {
  const child = toPriceNumber(tourChildPrice);
  return child != null && child !== adultPrice;
}
