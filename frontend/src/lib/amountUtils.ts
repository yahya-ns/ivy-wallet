/**
 * Utilities for formatting and parsing monetary amounts with dot thousand separators
 * (e.g. 1.000.000 or 1.250.000,50).
 */

/**
 * Formats a raw user input string as a dot-separated amount.
 * - Integer part uses dots (.) for thousands separator.
 * - Decimal part uses comma (,) for fractional amounts.
 * - If user types '.' or ',', it safely handles decimal input.
 */
export function formatAmountInput(val: string): string {
  if (!val) return "";

  const isNegative = val.startsWith("-");
  let cleanVal = val.replace(/^-/, "");

  let integerPart = "";
  let decimalPart: string | null = null;

  // Determine if there is a decimal separator entered
  if (cleanVal.includes(",")) {
    const parts = cleanVal.split(",");
    integerPart = parts[0].replace(/\D/g, "");
    decimalPart = parts.slice(1).join("").replace(/\D/g, "").slice(0, 4);
  } else if (
    cleanVal.includes(".") &&
    cleanVal.split(".").length === 2 &&
    cleanVal.split(".")[1].length <= 2 &&
    cleanVal.split(".")[0].length <= 3 &&
    !cleanVal.endsWith(".")
  ) {
    // e.g. "10.50" or "0.5" pasted
    const parts = cleanVal.split(".");
    integerPart = parts[0].replace(/\D/g, "");
    decimalPart = parts[1].replace(/\D/g, "").slice(0, 4);
  } else {
    // Treat any dots as thousand separators or clean them
    integerPart = cleanVal.replace(/\D/g, "");
    decimalPart = null;
  }

  if (!integerPart && decimalPart === null) {
    return isNegative ? "-" : "";
  }

  // Format integer part with dots every 3 digits
  const formattedInt = integerPart
    ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    : "0";

  let result = formattedInt;
  if (decimalPart !== null) {
    result += `,${decimalPart}`;
  } else if (cleanVal.endsWith(",") || cleanVal.endsWith(".")) {
    result += ",";
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Converts a numeric value (e.g. 1500000 or 1500000.5) into formatted input string (e.g. "1.500.000" or "1.500.000,5")
 */
export function numberToAmountInput(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return "";
  if (num === 0) return "0";

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const parts = absNum.toString().split(".");
  const intStr = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  let result = intStr;
  if (parts.length > 1 && parts[1]) {
    result += `,${parts[1]}`;
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Parses a formatted string (e.g. "1.500.000,50" or "1.000.000") into a standard float number.
 */
export function parseAmountInput(val: string): number {
  if (!val) return 0;
  const isNegative = val.startsWith("-");
  const clean = val.replace(/^-/, "");

  // Remove all thousand separator dots, replace comma with dot
  const normalized = clean.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) return 0;
  return isNegative ? -parsed : parsed;
}
