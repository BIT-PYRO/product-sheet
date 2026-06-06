import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number for display: strips trailing zeros.
 * 14.0000 → "14",  12.30 → "12.3",  0.5 → "0.5"
 * Pass null/undefined/'' → returns '' (not "0").
 * Non-numeric strings are returned as-is.
 */
export function fmtNum(val) {
  if (val === null || val === undefined || val === '') return '';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  // toFixed(10) then parseFloat removes trailing zeros without floating-point noise
  return String(parseFloat(n.toFixed(10)));
}
