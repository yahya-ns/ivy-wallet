import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isYesterday, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number, currencyCode: string = "USD"): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  // Pick currency format
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absAmount);

    return isNegative ? `-${formatted}` : formatted;
  } catch {
    const formatted = absAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${isNegative ? "-" : ""}${currencyCode} ${formatted}`;
  }
}

export function formatRelativeDate(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  if (isToday(date)) {
    return "Today";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  return format(date, "d MMM yyyy");
}

export function formatTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  return format(date, "HH:mm");
}

export function formatFullDateTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  return format(date, "d MMM yyyy, HH:mm");
}
