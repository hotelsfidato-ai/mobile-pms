import { dateLong } from "../../core/format.ts";

/* ══════════════════════════════════════════════════════════════════
   TAKING A ROOM OUT OF SERVICE, AND PUTTING IT BACK — the web's rules,
   ported: src/modules/housekeeping/flows/OutOfOrderFlow.tsx (the form,
   its disabled rule, its words), src/data/repositories/rooms.ts
   (BLOCK_REASONS, the body), and the API's own refusals
   (api/src/modules/housekeeping/roomStatus.ts, POST …/block).
   Pure: no React Native here, so `block.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

/** src/data/repositories/rooms.ts BLOCK_REASONS, in its order (the
    API's REASONS list). "NC" is the owner's word (16 September). */
export const BLOCK_REASONS = [
  { value: "out_of_order", label: "Out of order - something is broken" },
  { value: "out_of_service", label: "Out of service - held back deliberately" },
  { value: "refurbishment", label: "Refurbishment" },
  { value: "house_use", label: "NC - not for sale (house use: staff, storage, an office)" },
  { value: "owner_occupied", label: "Owner occupied" },
] as const;

/** A block's short name, the web's `label()`: the words before " - ". */
export const reasonLabel = (value: string | null) =>
  BLOCK_REASONS.find((r) => r.value === value)?.label.split(" - ")[0] ?? value ?? "Out";

/** A day later or earlier on a YYYY-MM-DD, counted in UTC so no time
    zone or clock change can make a day 23 hours long. */
export const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export interface BlockForm { reason: string; from: string; to: string | null; note: string }

/** Null when the form may be sent, else why not, in the API's words.
    The web's rule (OutOfOrderFlow 226): disabled while `!from` or
    `to < from`; the API refuses the same three (roomStatus.ts). */
export function whyNotTake(f: BlockForm): string | null {
  if (!BLOCK_REASONS.some((r) => r.value === f.reason)) return "Why is the room coming out?";
  if (!f.from) return "From which date?";
  if (f.to && f.to < f.from) return "A block cannot end before it starts.";
  return null;
}

/** What POST …/rooms/:n/block is sent: the web's blockRoom input. */
export const blockBody = (f: BlockForm) => ({
  reason: f.reason, from: f.from, to: f.to || null, note: f.note.trim() || undefined,
});

/** "Tuesday, 14 October 2026 – no end date", the web's block row. */
export const blockSpan = (b: { from: string; to: string | null }) =>
  `${dateLong(b.from)}${b.to ? ` – ${dateLong(b.to)}` : " – no end date"}`;

/** What is said once a room is taken out. The web's toast ("Room N is
    out" / "Back on sale …" / "No return date set."), except a block that
    starts after the business date: the API leaves the room as it is
    until then (roomStatus.ts), so "is out" would be untrue today. */
export function takenOut(room: string, f: BlockForm, businessDate: string) {
  return {
    title: f.from <= businessDate ? `Room ${room} is out` : `Room ${room} goes out on ${dateLong(f.from)}`,
    body: f.to ? `Back on sale ${dateLong(f.to)}.` : "No return date set.",
  };
}

/** The API's room status as words: "out-of-service" -> "out of service". */
export const statusWord = (status: string) => status.replace(/-/g, " ");
