/**
 * Currency formatting — determines $ or £ display for prices.
 *
 * Most instruments are USD-denominated. GBP pairs show £ for the base.
 * User can toggle their display preference.
 */

const CURRENCY_MAP: Record<string, { symbol: string; code: string }> = {
  "GBP-USD": { symbol: "£", code: "GBP" },
  "EUR-USD": { symbol: "€", code: "EUR" },
};

const DEFAULT_CURRENCY = { symbol: "$", code: "USD" };

export function getCurrencySymbol(instrumentSymbol: string): string {
  return CURRENCY_MAP[instrumentSymbol]?.symbol ?? DEFAULT_CURRENCY.symbol;
}

export function formatCurrencyPrice(price: number, instrumentSymbol: string): string {
  const cur = getCurrencySymbol(instrumentSymbol);
  if (price >= 1000) return `${cur}${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `${cur}${price.toFixed(2)}`;
  return `${cur}${price.toFixed(4)}`;
}
