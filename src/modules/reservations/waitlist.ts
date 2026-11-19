/* ══════════════════════════════════════════════════════════════════
   THE WAITLIST ON A PHONE — the pure rules, ported from the web's
     src/modules/reservations/pages/Waitlist.tsx       the three parts, a row
     src/modules/reservations/flows/WaitlistDialog.tsx  what Add asks first
     src/modules/reservations/data/waitlist.ts          the shapes
     api/src/modules/reservations/waitlist.ts           GET, POST, /:id/remove
   (D27-383 item 8, migration 268, the 16 Nov release.) Nothing is booked or
   sent by the system: the list shows who waits and the rooms free now, the
   desk decides. Pure: waitlist.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

export interface WaitlistEntry {
  id: string;
  guestName: string;
  /** Null for a role that does not read guests' details (D27-143). */
  phone: string | null;
  roomTypeId: string;
  roomType: string;
  arrival: string;
  departure: string;
  note: string | null;
  createdAt: string;
  addedBy: string | null;
  /** The fewest rooms of the type free on any of their nights, now (the
      inventory grid's own figure); null once the arrival has passed. */
  free: number | null;
}

export interface Waitlist { today: string; entries: WaitlistEntry[] }

export interface WaitlistInput {
  guestName: string; phone: string; roomTypeId: string; arrival: string; departure: string; note: string;
}

/** The three parts, in the server's order (oldest first) within each. */
export function partsOf(entries: readonly WaitlistEntry[]) {
  return {
    free: entries.filter((e) => (e.free ?? 0) > 0),
    full: entries.filter((e) => e.free === 0),
    passed: entries.filter((e) => e.free === null),
  };
}

/** Each part's head, its line, and whether its rows offer Book. */
export const PARTS = [
  { key: "free", title: "A room is free now", line: "Rooms of their type free on every one of their nights. Oldest first.", book: true },
  { key: "full", title: "Still full", line: "Shown here as soon as a room frees up.", book: true },
  { key: "passed", title: "Arrival has passed", line: "Remove them, with a word on what happened.", book: false },
] as const;

/** A row's pill: the server's free count, or "Still full"; none once the arrival has passed. */
export function freePill(free: number | null): { tone: "success" | "neutral"; label: string } | null {
  if (free === null) return null;
  return free > 0 ? { tone: "success", label: `${free} ${free === 1 ? "room" : "rooms"} free now` } : { tone: "neutral", label: "Still full" };
}

/** The nights between two dates (the web's `nights`, ISO only for the phone's engine, MEMORY 7). */
export const nights = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
export const nightsWord = (a: string, b: string) => { const n = nights(a, b); return `${n} ${n === 1 ? "night" : "nights"}`; };

/** What Add to the waitlist asks first (WaitlistDialog `wrong`); null when it may be sent. */
export function wrongOf(f: WaitlistInput): string | null {
  return (!f.guestName.trim() ? "Whose name goes on the waitlist?" : null)
    ?? (!f.arrival || !f.departure ? "Choose the arrival and the departure." : null)
    ?? (f.departure <= f.arrival ? "The departure is after the arrival." : null)
    ?? (!f.roomTypeId ? "Which room type are they waiting for?" : null);
}

/** What is sent: trimmed, as the web's save. */
export const bodyOf = (f: WaitlistInput): WaitlistInput =>
  ({ ...f, guestName: f.guestName.trim(), phone: f.phone.trim(), note: f.note.trim() });

/** The room types the inventory answered, once each, in its order (Waitlist.tsx `types`). */
export function typesOf(cells: ReadonlyArray<{ roomTypeId: string; roomType: string }> | null | undefined) {
  const seen = new Map<string, { id: string; name: string }>();
  for (const c of cells ?? []) seen.set(c.roomTypeId, { id: c.roomTypeId, name: c.roomType });
  return [...seen.values()];
}
