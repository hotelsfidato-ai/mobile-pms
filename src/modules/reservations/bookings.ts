import type { Stay } from "../../core/types.ts";

/* ══════════════════════════════════════════════════════════════════
   ALL BOOKINGS' RULES — the web's src/modules/reservations/pages/
   Reservations.tsx: the whole book, filtered rather than scoped. It opens
   on the bookings leaving in the last 90 days and everything ahead (the
   owner's D27-387, 2 Nov: every booking ever was 64 s and 3.7 MB); a
   search of three letters or more asks the server through every booking.
   The tiles filter on the phone, so their counts stay live.
   Pure: no React Native here, so `bookings.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

export type Chip = "neutral" | "orange" | "blue";
export interface Filter { key: string; label: string; status?: readonly string[]; chip: Chip }

/** The chips are the key, in each state's own colour (D27-48). A void
    booking was in All and in no tab (QA BK-10): "void" is in the last. */
export const FILTERS: readonly Filter[] = [
  { key: "all", label: "All", chip: "neutral" },
  { key: "due-in", label: "Due in", status: ["due-in"], chip: "orange" },
  { key: "in-house", label: "In house", status: ["in-house", "due-out"], chip: "blue" },
  { key: "checked-out", label: "Checked out", status: ["checked-out"], chip: "neutral" },
  { key: "lost", label: "Cancelled, void & no-show", status: ["cancelled", "void", "no-show"], chip: "neutral" },
];

const inFilter = (f: Filter, s: { status: string }) => !f.status || f.status.includes(s.status);
export const countFor = (rows: readonly Stay[], f: Filter) => rows.filter((s) => inFilter(f, s)).length;

/** What is asked of the server: three letters or more, else nothing. */
export const askedOf = (search: string) => {
  const q = search.trim().toLowerCase();
  return q.length >= 3 ? q : "";
};

/** The rows of a tile and a search, newest arrival first. A phone is found
    by its digits, however it was typed (QA BK-10). */
export function shown(rows: readonly Stay[], filterKey: string, search: string): Stay[] {
  const f = FILTERS.find((x) => x.key === filterKey) ?? FILTERS[0]!;
  const q = search.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  return rows
    .filter((s) => inFilter(f, s))
    .filter((s) => !q || s.guest.toLowerCase().includes(q) || s.reference.toLowerCase().includes(q) || s.roomNumber.toLowerCase().includes(q)
      || (digits.length >= 3 && (s.phone ?? "").replace(/\D/g, "").includes(digits)))
    .sort((a, b) => b.arrival.localeCompare(a.arrival));
}

/** The query the screen sends (fetchStaysWhere): a search, else the window. */
export const queryOf = (asked: string, since: string) => (asked ? `q=${encodeURIComponent(asked)}` : `since=${since}`);

/** The page's line under the title (Reservations.tsx PageHeader). */
export const descriptionOf = (asked: string, since: string, businessDate: string, dateLong: (d: string) => string) =>
  asked
    ? "Every booking ever made that matches the search, in any state."
    : `Bookings leaving from ${dateLong(since)} on, and everything ahead, in any state. A search looks through every booking. Business date ${dateLong(businessDate)}.`;

/** The empty list's words (Reservations.tsx). */
export const emptyOf = (searching: boolean) =>
  searching
    ? { title: "Nothing matches that", line: "Try a shorter search - a surname, or the last few digits of a reference." }
    : { title: "No bookings in this state", line: "Bookings move between these states as the day runs. Nothing here is missing; there is simply nothing in this state." };
