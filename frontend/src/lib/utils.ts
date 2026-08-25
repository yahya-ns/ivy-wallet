import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isYesterday } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

export const DATE_FORMAT_PATTERN_MAP: Record<string, string> = {
  "YYYY-MM-DD": "yyyy-MM-dd",
  "DD/MM/YYYY": "dd/MM/yyyy",
  "MM/DD/YYYY": "MM/dd/yyyy",
  "DD-MM-YYYY": "dd-MM-yyyy",
  "DD.MM.YYYY": "dd.MM.yyyy",
  "d MMM yyyy": "d MMM yyyy",
  "MMM d, yyyy": "MMM d, yyyy",
  "EEEE, d MMMM yyyy": "EEEE, d MMMM yyyy",
};

export const TIME_FORMAT_PATTERN_MAP: Record<string, string> = {
  "24_HOUR": "HH:mm",
  "12_HOUR": "hh:mm a",
};

export function getDateFormatPattern(dateFormat?: string): string {
  if (!dateFormat) return "yyyy-MM-dd";
  return DATE_FORMAT_PATTERN_MAP[dateFormat] || dateFormat;
}

export function getTimeFormatPattern(timeFormat?: string): string {
  if (!timeFormat) return "HH:mm";
  return TIME_FORMAT_PATTERN_MAP[timeFormat] || timeFormat;
}

export function formatDate(dateStr: string | Date, dateFormat?: string): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";
  try {
    return format(d, getDateFormatPattern(dateFormat));
  } catch {
    return format(d, "yyyy-MM-dd");
  }
}

export function formatTimeOnly(dateStr: string | Date, timeFormat?: string): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";
  try {
    return format(d, getTimeFormatPattern(timeFormat));
  } catch {
    return format(d, "HH:mm");
  }
}

export function formatDateTime(
  dateStr: string | Date,
  dateFormat?: string,
  timeFormat?: string
): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";
  return `${formatDate(d, dateFormat)} ${formatTimeOnly(d, timeFormat)}`;
}

export function formatRelativeDate(
  dateStr: string | Date,
  dateFormat?: string
): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";

  if (isToday(d)) {
    return "Today";
  }
  if (isYesterday(d)) {
    return "Yesterday";
  }
  return formatDate(d, dateFormat);
}

