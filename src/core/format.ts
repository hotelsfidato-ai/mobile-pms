/* ══════════════════════════════════════════════════════════════════
   FIGURES AND DATES AS EVERY SCREEN WRITES THEM — after the web's
   src/lib/format.ts and src/components/app/BusinessDateBehind.tsx.
   A figure not held is a dash, never a zero.
   ══════════════════════════════════════════════════════════════════ */

export const DASH = "-";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const cash = (n: number | null | undefined) => (n == null ? DASH : inr.format(n));
export const pct = (n: number | null | undefined) => (n == null ? DASH : `${n}%`);
/** A count is a real zero when nothing is there; unknown is a dash. */
export const count = (n: number | null | undefined) => (n == null ? DASH : String(n));

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const at = (date: string) => new Date(`${date}T00:00:00Z`);
/** "Tuesday, 14 October 2026" (the web's dateLong). */
export const dateLong = (date: string) =>
  `${DAYS[at(date).getUTCDay()]}, ${Number(date.slice(8))} ${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
/** "14 Oct" (the web's dateShort). */
export const dateShort = (date: string) => `${Number(date.slice(8))} ${MONTHS[Number(date.slice(5, 7)) - 1]!.slice(0, 3)}`;

export const monthStart = (date: string) => `${date.slice(0, 7)}-01`;
/** The same day a year back; 29 February becomes the 28th. */
export const yearBack = (date: string) =>
  `${Number(date.slice(0, 4)) - 1}${date.slice(4) === "-02-29" ? "-02-28" : date.slice(4)}`;

/** Days the business date is behind the property's real date (the web's daysBehind). */
export function daysBehind(h: { today?: string; businessDate?: string }): number {
  if (!h.today || !h.businessDate || h.businessDate >= h.today) return 0;
  return Math.round((Date.parse(`${h.today}T00:00:00Z`) - Date.parse(`${h.businessDate}T00:00:00Z`)) / 86_400_000);
}
