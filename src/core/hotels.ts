import type { HotelsResponse } from "./api";

/* ══════════════════════════════════════════════════════════════════
   THE SESSION'S HOTELS KEPT CURRENT (the web's lib/session.ts refreshDates,
   called by AppShell.tsx on every screen; the review of mobile/m13-set-
   property, 20 Nov). The session learned each property's today, business
   date and front desk rules at sign-in; the frame re-reads GET /api/hotels
   on every screen (Shell.tsx) and hands the answer here. The person's own
   answer only (the same staff id); null when nothing about the hotels has
   changed, so nothing re-draws. `moved`: a business date moved, and every
   list was read for the old day (the web then reads them all again).
   The web replaces its hotels only when a business date moved, so its own
   `today` and desk rules stay stale past midnight (said in the report);
   the phone takes any change. Pure: hotels.check.ts.
   ══════════════════════════════════════════════════════════════════ */

export function freshHotels(held: HotelsResponse, answer: HotelsResponse): { who: HotelsResponse; moved: boolean } | null {
  if (answer.scope.staffId !== held.scope.staffId) return null;
  if (JSON.stringify(answer.hotels) === JSON.stringify(held.hotels)) return null;
  const was = new Map(held.hotels.map((h) => [h.id, h.businessDate]));
  const moved = answer.hotels.some((h) => Boolean(h.businessDate) && was.has(h.id) && was.get(h.id) !== h.businessDate);
  return { who: { ...held, hotels: answer.hotels }, moved };
}
