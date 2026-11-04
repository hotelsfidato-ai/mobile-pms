/* ══════════════════════════════════════════════════════════════════
   THE COMING NIGHTS, IN WORDS — ported by hand from the PMS (a4527ea,
   2 Nov 2026; the page last changed 12 Oct, before the picture of 31 Oct):
     src/modules/revenue-management/logic/outlook.ts   THRESHOLDS, temperOf,
         suggest, datesAhead, nightsBetween, softestFirst, comparable,
         sameMonthLastYear, aheadBy (lines 26-189)
     src/modules/revenue-management/logic/pickup.ts    windowOpens, counted,
         pickupOn, onTheBooksAWeekAgo, whyNoPickup (lines 37-147)
     src/modules/revenue-management/data/outlook.ts    WINDOW_NIGHTS,
         plusDays, monthOfDate (lines 42-63)
     src/modules/revenue-management/pages/Outlook.tsx  TONE, WORD, orDash,
         the table's columns, Pace's notes, the Nearby line (50-309)
     src/modules/market-rates/data.ts                  Rival, CheckedNight,
         nearbySummary (lines 8-41)

   IT SHOWS AND IT SUGGESTS. IT NEVER CHANGES A PRICE (the owner's D18-15):
   nothing in this module writes. A suggestion never names a figure.

   EVERY FIGURE IS THE SERVER'S: available, sold, occupancy and the period
   are the reports service's (`dailyFigures()`), pickup is the server's own
   count over the same nights, rivals' prices are what the check found.
   This file turns them into words, as the web's files do; the only sums it
   makes are the web's own (rooms left, the week-ago count of rooms, the
   rivals' middle price), each named where it is made. A missing figure is
   a dash, never a zero; a price keeps its paise (MEMORY 9).

   Pure: no React Native here, so `outlook.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH, count, dateLong, dateShort, msAt } from "../../core/format.ts";
import type { PeriodStatistics } from "../../core/types.ts";
import { rupees } from "../inventory/rates.ts";
import type { DayStatistics } from "../reports/figures.ts";

export type { DayStatistics, PeriodStatistics };

/** How far ahead the outlook looks (data/outlook.ts 42). */
export const WINDOW_NIGHTS = 90;

/** GET /statistics/snapshot: the property's business date and its night. */
export interface Snapshot { date: string; available: number; sold: number; vacant: number; occupancyPct: number }

/** One night ahead, exactly as the reports service counts it. */
export interface OutlookDay { date: string; available: number; sold: number; occupancyPct: number }

/** A night with the two things a person asks next about it. */
export interface DateAhead extends OutlookDay {
  /** Rooms still sellable that night. Never below nil (the web's rule:
      an overbooked night has 0 left, as the picture's "0 of 17 rooms left"). */
  left: number;
  /** Nights from the property's business date. 0 is tonight. */
  daysOut: number;
}

export interface Outlook { today: string; days: DateAhead[] }

/* ── Dates: plain YYYY-MM-DD, compared at UTC midnight ───────────── */

export const plusDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** The calendar month a date falls in (data/outlook.ts monthOfDate). */
export function monthOfDate(date: string): { from: string; to: string } {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const mm = String(month).padStart(2, "0");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, "0")}` };
}

/** The same calendar month a year earlier; February is safe. */
export function sameMonthLastYear(from: string): { from: string; to: string } {
  return monthOfDate(`${Number(from.slice(0, 4)) - 1}${from.slice(4, 8)}01`);
}

/** Whole days between two plain dates. */
export const nightsBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** The web's dateShort, "17 Oct 2026" (the core's carries no year). */
export const dayYear = (date: string) => `${dateShort(date)} ${date.slice(0, 4)}`;

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** A server time's day as the web's dateShort writes a Date: on the
    device's own clock, as the browser does. Unreadable: a dash. */
export function dayOfInstant(text: string | null | undefined): string {
  const ms = msAt(text);
  if (ms === null) return DASH;
  const d = new Date(ms);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

/* ── Figures as the page writes them ─────────────────────────────── */

/** The web's percent(x): one decimal. Not sent: a dash. */
export const percent = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? DASH : `${n.toFixed(1)}%`;

/** Outlook.tsx orDash: a figure nobody can set is a dash, never a zero. */
export const orDash = (n: number | null | undefined) => count(n);

/* ── The nights ahead (logic/outlook.ts) ─────────────────────────── */

/** The window, with the two derived facts added, from GET /statistics/daily. */
export function datesAhead(rows: readonly DayStatistics[], today: string): DateAhead[] {
  return rows
    .filter((r) => r.date >= today)
    .map((r) => ({
      date: r.date, available: r.availableRooms, sold: r.roomsSold, occupancyPct: r.occupancyPct,
      left: Math.max(0, r.availableRooms - r.roomsSold),
      daysOut: nightsBetween(today, r.date),
    }));
}

/** ⚠ The owner's RM-Q3 is still open on the web: these are the figures
    put to them, in one place, as the web holds them. */
export const THRESHOLDS = { closeInDays: 14, softPct: 50, strongPct: 85 } as const;

export type Temper = "soft" | "strong" | "steady";

export function temperOf(day: DateAhead): Temper {
  if (day.available === 0) return "steady";
  if (day.occupancyPct >= THRESHOLDS.strongPct) return "strong";
  if (day.daysOut <= THRESHOLDS.closeInDays && day.occupancyPct <= THRESHOLDS.softPct) return "soft";
  return "steady";
}

/** Outlook.tsx TONE and WORD: the pill on each date. */
export const TONE = { soft: "warning", strong: "success", steady: "neutral" } as const;
export const WORD = { soft: "Soft", strong: "Filling well", steady: "On track" } as const;

export interface Suggestion { date: string; temper: Exclude<Temper, "steady">; text: string; reason: string }

const nightsOut = (n: number) => (n === 0 ? "tonight" : n === 1 ? "tomorrow" : `${n} days out`);

/** The sentence for one night, or null. NO PRICE IS NAMED (D18-15). The
    occupancy is written as the server sent it ("105.88% sold"), as the web. */
export function suggest(day: DateAhead): Suggestion | null {
  const temper = temperOf(day);
  if (temper === "steady") return null;
  const when = dateLong(day.date);
  const reason = `${nightsOut(day.daysOut)}, ${day.occupancyPct}% sold, ${day.left} of ${day.available} rooms left.`;
  return temper === "soft"
    ? { date: day.date, temper, reason, text: `Consider a lower rate for ${when}.` }
    : { date: day.date, temper, reason, text: `Consider holding or raising the rate for ${when}.` };
}

/** What to consider: the first five, in date order (Outlook.tsx 93, 179). */
export const suggestions = (days: readonly DateAhead[]) =>
  days.map(suggest).filter((x): x is Suggestion => x !== null).slice(0, 5);

/** The softest nights first, then the nearest. */
export const softestFirst = (days: readonly DateAhead[]) =>
  days.filter((d) => temperOf(d) === "soft")
    .sort((a, b) => a.occupancyPct - b.occupancyPct || a.daysOut - b.daysOut);

/** Dates worth a look: the soft ones, else every night (Outlook.tsx 213). */
export function datesWorthALook(days: readonly DateAhead[]): DateAhead[] {
  const soft = softestFirst(days);
  return soft.length ? soft : [...days];
}

/* ── Pace (logic/outlook.ts) ─────────────────────────────────────── */

export interface Pace { now: PeriodStatistics; lastYear: PeriodStatistics | null }

/** A month the property could not have traded in has nothing to compare (D17-93). */
export const comparable = (m: PeriodStatistics | null) => (m && m.availableRoomNights > 0 ? m : null);

/** Points of occupancy ahead or behind last year; null when there is no last year. */
export function aheadBy(pace: Pace): number | null {
  const then = comparable(pace.lastYear);
  return then ? Math.round((pace.now.occupancyPct - then.occupancyPct) * 100) / 100 : null;
}

/* ── Pickup (logic/pickup.ts) ────────────────────────────────────── */

export interface PickupNight { date: string; sold: number; last1: number; last7: number; last30: number }
export interface Pickup { from: string; to: string; businessDate: string; recordsFrom: string | null; nights: PickupNight[] }
export const WINDOWS = [1, 7, 30] as const;
export type Window = (typeof WINDOWS)[number];
export interface Picked { last1: number | null; last7: number | null; last30: number | null }

/** The first day a window covers: the business date, less the days before it. */
export const windowOpens = (businessDate: string, days: Window) => plusDays(businessDate, -(days - 1));

/** A window counts only if it opens on or after the property's first booking record. */
export const counted = (p: Pickup, days: Window) =>
  p.recordsFrom !== null && windowOpens(p.businessDate, days) >= p.recordsFrom;

const NOTHING: Picked = { last1: null, last7: null, last30: null };

/** What was picked up for one night; a dash wherever the records do not reach back. */
export function pickupOn(p: Pickup | null | undefined, date: string): Picked {
  const night = p?.nights.find((n) => n.date === date);
  if (!p || !night) return NOTHING;
  return {
    last1: counted(p, 1) ? night.last1 : null,
    last7: counted(p, 7) ? night.last7 : null,
    last30: counted(p, 30) ? night.last30 : null,
  };
}

/** Rooms on the books for this month a week ago: this month's rooms sold (the
    server's) less the server's own count of those booked in the last seven
    days (the web's sum, pickup.ts 117). Null where the records do not reach
    back a week: nought would read as a collapse. Not a snapshot (the note). */
export function onTheBooksAWeekAgo(month: { from: string; to: string; roomsSold: number }, p: Pickup | null | undefined): number | null {
  if (!p || !counted(p, 7)) return null;
  const since = p.nights.filter((n) => n.date >= month.from && n.date <= month.to).reduce((total, n) => total + n.last7, 0);
  return month.roomsSold - since;
}

/** Why a pickup figure is a dash, in one sentence for the screen, or null. */
export function whyNoPickup(p: Pickup | null | undefined): string | null {
  if (!p) return "Pickup could not be read, so it is left blank rather than guessed.";
  if (p.recordsFrom === null) return "No booking has been recorded at this property yet, so there is nothing to have picked up.";
  if (WINDOWS.every((w) => counted(p, w))) return null;
  return `Booking records here start on ${dateLong(p.recordsFrom)}, and this property's own day is ${dateLong(p.businessDate)}. `
    + "A window that opens before the records do is shown as a dash: it cannot tell what was picked up from everything on the books.";
}

/** The line under "Dates worth a look" (Outlook.tsx 205-209). `noPickup` is
    left out while pickup is still being read, as the web. */
export const pickupNote = (today: string, noPickup: string | null) =>
  "New 1 day, 7 days and 30 days: how many of the rooms sold for that night were booked in that long"
  + (today ? `, counted back from ${dayYear(today)}, the property's own day` : "")
  + `.${noPickup ? ` ${noPickup}` : ""}`;

/** One date's card: the web's columns after the first, in order, as
    DataTable writes them at 375 (labels in capitals there). */
export function dateLines(d: DateAhead, p: Pickup | null | undefined): Array<[string, string]> {
  const got = pickupOn(p, d.date);
  return [
    ["Days out", d.daysOut === 0 ? "Tonight" : String(d.daysOut)],
    ["Rooms left", String(d.left)],
    ["Of", String(d.available)],
    ["Sold", percent(d.occupancyPct)],
    ["New 1 day", orDash(got.last1)],
    ["New 7 days", orDash(got.last7)],
    ["New 30 days", orDash(got.last30)],
  ];
}

/** "This month, on the books": the five figures and their notes (Outlook.tsx Pace). */
export interface Tile { label: string; value: string; note?: string; wide?: boolean }
export function paceTiles(now: PeriodStatistics, ahead: number | null, weekAgo: number | null): Tile[] {
  return [
    { label: "Occupancy", value: percent(now.occupancyPct) },
    { label: "Rooms sold", value: count(now.roomsSold) },
    { label: "Room nights", value: count(now.availableRoomNights) },
    ahead === null
      ? { label: "Against last year", value: DASH, note: "The property was not selling then." }
      : { label: "Against last year", value: `${ahead > 0 ? "+" : ""}${percent(ahead)}` },
    weekAgo === null
      ? { label: "A week ago", value: DASH, note: "The records do not reach back a week.", wide: true }
      : { label: "A week ago", value: String(weekAgo), note: `${now.roomsSold - weekAgo} rooms booked since, still on the books.`, wide: true },
  ];
}

/* ── Rivals' prices (market-rates/data.ts) ───────────────────────── */

export interface Rival { name: string; price: number; source: string | null }
export interface CheckedNight { date: string; checkedAt: string; hotels: Rival[] }

/** The lowest, the middle (the median) and how many. Null for a night
    nobody checked: a dash, never a nought. ⚠ The web rounds the middle of
    an even count to the rupee; here it keeps its paise (MEMORY 9), so
    ₹3,499 and ₹3,500 have a middle of ₹3,499.50, not ₹3,500. */
export function nearbySummary(night: CheckedNight | null | undefined) {
  const prices = (night?.hotels ?? []).map((h) => h.price).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!night || prices.length === 0) return null;
  const mid = Math.floor(prices.length / 2);
  const middle = prices.length % 2 ? prices[mid]! : (prices[mid - 1]! + prices[mid]!) / 2;
  return { lowest: prices[0]!, middle, count: prices.length, checkedAt: night.checkedAt };
}

/** The Nearby line under a suggestion (Outlook.tsx Nearby). */
export function nearbyLine(night: CheckedNight | null | undefined, failed: boolean): string {
  if (failed) return "Nearby: could not be read.";
  const sum = nearbySummary(night);
  if (!sum) return "Nearby: -";
  return `Nearby: lowest ${rupees(sum.lowest)}, middle ${rupees(sum.middle)} `
    + `(${sum.count} ${sum.count === 1 ? "hotel" : "hotels"}, checked ${dayOfInstant(sum.checkedAt)})`;
}

/** One rival under the opened line: its price, and the site behind it when Google names one. */
export const rivalPrice = (h: Rival) => `${rupees(h.price)}${h.source ? ` on ${h.source}` : ""}`;
