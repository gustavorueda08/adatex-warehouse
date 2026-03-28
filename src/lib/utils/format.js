/**
 * @fileoverview Number formatting utilities using the Spanish (es-ES) locale.
 *
 * All functions produce strings suitable for display in the Colombian market
 * (period as thousands separator, comma as decimal separator).
 */

/**
 * Formats a number to 2 decimal places using the es-ES locale.
 *
 * Returns an empty string for non-numeric input (NaN, null, undefined) instead
 * of throwing, so it is safe to use directly in JSX.
 *
 * @param {number|string} number - Value to format.
 * @param {string|null} [symbol=null] - Optional currency symbol prepended with a space
 *   (e.g. `"$"` → `"$ 1.234,56"`).
 * @returns {string} Formatted string, or `""` for invalid input.
 *
 * @example
 * format(1234.5);       // "1.234,50"
 * format(1234.5, '$');  // "$ 1.234,50"
 * format(null);         // ""
 */
export default function format(number, symbol = null) {
  const formatted = Number(number).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (formatted === "NaN") return "";

  return symbol ? `${symbol} ${formatted}` : formatted || "";
}

/**
 * Rounds a number to 2 decimal places and formats it using es-ES locale.
 *
 * Uses multiply-then-divide rounding (`Math.round(n * 100) / 100`) which
 * avoids the floating-point drift of `toFixed`.
 *
 * @param {number|string} number - Value to round and format.
 * @returns {string} Formatted string, e.g. `"1.234,57"`.
 *
 * @example
 * format.roundNumber(1234.567);  // "1.234,57"
 */
format.roundNumber = function roundNumber(number) {
  const rounded = Math.round(Number(number) * 100) / 100;
  return Number(rounded).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
