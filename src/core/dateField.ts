/* ══════════════════════════════════════════════════════════════════
   A DAY AND A TIME AS THE API WANTS THEM (M-16, 20 Nov): "YYYY-MM-DD"
   and "HH:MM", the text of the web's <input type="date"> and
   <input type="time">. The phone's own pickers (DateField.tsx) work in
   `Date`s; this turns one into the other with NO time zone in between:
   the picker is told to show UTC, and a day is that day's UTC midnight,
   so a phone set to any zone picks the day it shows. Nothing here reads
   text with Date.parse (Hermes reads only ISO - MEMORY 7): the parts are
   cut out and checked by hand. The day a picker opens on, with nothing
   chosen, is the HOTEL's (GET /api/hotels' `today`, the property's own
   date, D27-237), never the phone's - at 2 a.m. in India the phone's UTC
   day is still yesterday.
   Pure: dateField.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

/** The zone every picker is shown in (DateField.tsx), so a Date's UTC parts are what the person saw.
    "GMT" (UTC's offset, no summer time): the name both pickers know by that spelling - Android's
    reads it first, and falls back to the PHONE's zone for a name it does not know. */
export const PICKER_ZONE = "GMT";

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{2}):(\d{2})$/;
const two = (n: number) => String(n).padStart(2, "0");

/** A real calendar day written as the API writes it ("2026-02-30" is not one). */
export function isDay(text: string | null | undefined): text is string {
  const m = DAY.exec(text ?? "");
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const at = new Date(Date.UTC(y, mo - 1, d));
  return at.getUTCFullYear() === y && at.getUTCMonth() === mo - 1 && at.getUTCDate() === d;
}

/** "HH:MM" on a 24-hour clock. */
export function isTime(text: string | null | undefined): text is string {
  const m = TIME.exec(text ?? "");
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}

/** The day as the picker's Date (its UTC midnight); null when the text is not a day. */
export function dayToDate(day: string): Date | null {
  if (!isDay(day)) return null;
  return new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))));
}

/** The picker's Date as the day it showed (shown in PICKER_ZONE, so its UTC parts). */
export const dateToDay = (d: Date) => `${d.getUTCFullYear()}-${two(d.getUTCMonth() + 1)}-${two(d.getUTCDate())}`;

/** A fixed day under every time, so a time never crosses a clock change. */
const TIME_DAY = Date.UTC(2000, 0, 1);
export function timeToDate(time: string): Date | null {
  if (!isTime(time)) return null;
  return new Date(TIME_DAY + (Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))) * 60_000);
}
export const dateToTime = (d: Date) => `${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;

/** The hotel's own day (`today`, D27-237), else its business date from an older server - as the
    app's screens already take it (`hotel.today ?? hotel.businessDate`). Never the phone's clock. */
export const hotelDay = (h: { today?: string; businessDate: string }) => h.today ?? h.businessDate;

/** The zone a hotel is in when the session does not say (every Fidato hotel today), and India's offset:
    +05:30 all year, no summer time. */
export const HOTEL_ZONE = "Asia/Kolkata";
const INDIA_MINUTES = 330;

/** The hotel's clock now, "HH:MM": where a time picker opens with nothing chosen (20 Nov). In the hotel's
    own zone (GET /api/hotels' `timezone`), else India's - +05:30 also when the phone cannot read that
    zone. Never the phone's own clock: a phone abroad, or set wrong, would open hours off. */
export function hotelClock(now: Date, zone?: string | null): string {
  if (zone && zone !== HOTEL_ZONE && zone !== "Asia/Calcutta") {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
        .formatToParts(now);
      const h = parts.find((p) => p.type === "hour")?.value ?? "", m = parts.find((p) => p.type === "minute")?.value ?? "";
      if (/^\d{1,2}$/.test(h) && /^\d{2}$/.test(m)) return `${two(Number(h) % 24)}:${m}`;
    } catch { /* a zone this phone does not know: India's */ }
  }
  const at = new Date(now.getTime() + INDIA_MINUTES * 60_000);
  return `${two(at.getUTCHours())}:${two(at.getUTCMinutes())}`;
}

/** The day a picker opens on: the value when it is a day, else the hotel's day, kept inside
    min..max (a bound that is not a day is no bound). Text compares as days do ("YYYY-MM-DD"). */
export function opensOn(value: string, today: string, min?: string, max?: string): string {
  let day = isDay(value) ? value : today;
  if (isDay(min) && day < min) day = min;
  if (isDay(max) && day > max && (!isDay(min) || max >= min)) day = max;
  return day;
}

/** Whether a picked day is inside min..max (the native pickers hold it; this is said again on send). */
export const inRange = (day: string, min?: string, max?: string) =>
  isDay(day) && !(isDay(min) && day < min) && !(isDay(max) && day > max);

/** The bounds the picker may be given: iOS throws when min is after max, so then neither is. */
export function bounds(min?: string, max?: string): { min?: string; max?: string } {
  const lo = isDay(min) ? min : undefined, hi = isDay(max) ? max : undefined;
  return lo && hi && lo > hi ? {} : { min: lo, max: hi };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** "Fri, 20 Nov 2026"; the text itself when it is not a day (never "NaN"). */
export function dayShown(day: string): string {
  const d = dayToDate(day);
  return d ? `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : day;
}
/** "7:05 AM" (the app's clock, Export.tsx's madeNow); the text itself when it is not a time. */
export function timeShown(time: string): string {
  if (!isTime(time)) return time;
  const h = Number(time.slice(0, 2));
  return `${h % 12 || 12}:${time.slice(3, 5)} ${h < 12 ? "AM" : "PM"}`;
}
