import { api, orNull } from "../../core/api";
import {
  WINDOW_NIGHTS, datesAhead, monthOfDate, plusDays, sameMonthLastYear,
  type CheckedNight, type DayStatistics, type Outlook, type Pace, type PeriodStatistics, type Pickup, type Snapshot,
} from "./outlook";

/* ══════════════════════════════════════════════════════════════════
   THE OUTLOOK'S READS — the web's src/modules/revenue-management/data/
   outlook.ts (getOutlook, getPace, getPickup), the reports door's
   data/statistics.ts (getTodaySnapshot, listDailyStatistics,
   getPeriodStatistics: a 404 is "not this person's property", not an
   error) and market-rates/data.ts getNearby. GETs only: this module never
   writes (D18-15). Every key names the hotel: ["revenue", code, …].
   ══════════════════════════════════════════════════════════════════ */

const H = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;
const range = (from: string, to: string) => `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

/** The nights ahead from the PROPERTY's business date (the snapshot's),
    never the phone's. Null when the property is not this person's. */
export async function readOutlook(code: string): Promise<Outlook | null> {
  const snapshot = await orNull<Snapshot>(`${H(code)}/statistics/snapshot`);
  if (!snapshot) return null;
  const today = snapshot.date;
  const rows = (await orNull<DayStatistics[]>(`${H(code)}/statistics/daily?${range(today, plusDays(today, WINDOW_NIGHTS))}`)) ?? [];
  return { today, days: datesAhead(rows, today) };
}

/** This month on the books, and the same month last year. */
export async function readPace(code: string, today: string): Promise<Pace | null> {
  const month = monthOfDate(today);
  const then = sameMonthLastYear(month.from);
  const [now, lastYear] = await Promise.all([
    orNull<PeriodStatistics>(`${H(code)}/statistics/period?${range(month.from, month.to)}`),
    orNull<PeriodStatistics>(`${H(code)}/statistics/period?${range(then.from, then.to)}`),
  ]);
  return now ? { now, lastYear } : null;
}

/** When each room-night was booked, from the first of the property's month
    to the end of the window: one fetch for pace and the table alike. */
export const readPickup = (code: string, today: string) =>
  api<Pickup>(`${H(code)}/revenue/pickup?${range(monthOfDate(today).from, plusDays(today, WINDOW_NIGHTS))}`);

/** Each night's latest check of the nearby hotels; a night nobody checked is absent. */
export const readNearby = (code: string, today: string) =>
  api<{ nights: CheckedNight[] }>(`${H(code)}/market-rates?${range(today, plusDays(today, WINDOW_NIGHTS))}`);
