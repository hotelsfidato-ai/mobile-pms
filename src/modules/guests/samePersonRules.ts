import { stayedWords } from "../front-desk/desk.ts";
import { day } from "../reputation/rules.ts";
import type { ExportTable } from "../../core/exportDoc.ts";

/* ══════════════════════════════════════════════════════════════════
   POSSIBLE SAME PERSON — the shapes, the rules and the words
   (mobile/m13-sales, 19 Nov, lane S). Ported from the web's
   src/modules/crm/pages/SamePerson.tsx and data/crm.ts; the server is
   api/src/modules/guests/people.ts (GET /crm/same-person, /crm/joins,
   /crm/not-same; POST /crm/joins, /crm/joins/:id/undo, /crm/not-same,
   /crm/not-same/:id/undo), every one for the owner, an administrator or a
   GM (app.is_crm_manager, D21-4).

   The owner's rules (D21-2, D21-20, D22-8), as the web keeps them:
     · NEVER AUTOMATIC: a manager chooses the record that stands, then
       presses "Join into one" under the sentence that says what moves.
     · Every join can be undone, and so can "Not the same person".
     · When only one record has an ID on file, that record stands and the
       other cannot be chosen, so no ID is lost; the ID itself is never
       shown, only whether one is on file.
   ══════════════════════════════════════════════════════════════════ */

/** crm.ts GuestCard: what a manager needs to judge one side. */
export interface GuestCard {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  visits: number;
  hasId: boolean;
  isVip: boolean;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  lastStay: string | null;
}

export interface SamePersonPair { a: GuestCard; b: GuestCard; samePhone: boolean; sameEmail: boolean }

/** crm.ts GuestJoin. `by` is null where the viewer may not read that member of staff: a dash. */
export interface GuestJoin {
  id: string; keptId: string; keptName: string; joinedId: string; joinedName: string;
  stays: number; by: string | null; at: string;
}

/** crm.ts NotSameAnswer. */
export interface NotSameAnswer { id: string; aId: string; aName: string; bId: string; bName: string; by: string | null; at: string }

/* ── The rules ───────────────────────────────────────────────────── */

/** WHICH ID MAY GO: when exactly one record has one, it stands (SamePerson.tsx `onlyWithId`). */
export const onlyWithId = (p: Pick<SamePersonPair, "a" | "b">): GuestCard | null =>
  p.a.hasId !== p.b.hasId ? (p.a.hasId ? p.a : p.b) : null;

/** A side: chosen (ringed, "This record stands"), or locked (the other one holds the only ID). */
export function sideState(g: GuestCard, kept: GuestCard | null, only: GuestCard | null) {
  const chosen = kept?.id === g.id;
  return { chosen, locked: only !== null && only.id !== g.id, label: chosen ? "This record stands" : "Keep this record" };
}

/** The other side of the pair from the one kept; null until one is kept. */
export const otherOf = (p: Pick<SamePersonPair, "a" | "b">, kept: GuestCard | null) =>
  kept ? (kept.id === p.a.id ? p.b : p.a) : null;

/** "Same phone." / "Same email." / "Same phone and email." */
export const sharedWords = (p: Pick<SamePersonPair, "samePhone" | "sameEmail">) =>
  `Same ${[p.samePhone && "phone", p.sameEmail && "email"].filter(Boolean).join(" and ")}.`;

/** "9000000010 · -": a missing phone or email is a dash. */
export const contactLine = (g: Pick<GuestCard, "phone" | "email">) => `${g.phone ?? "-"} · ${g.email ?? "-"}`;

/** "Stayed with the group once · last 10 Oct 2026 · ID on file". */
export const sideLine = (g: Pick<GuestCard, "visits" | "lastStay" | "hasId">) =>
  `${stayedWords(g.visits)} · last ${g.lastStay ? day(g.lastStay) : "-"} · ${g.hasId ? "ID on file" : "no ID on file"}`;

export const onlyIdWords = (g: Pick<GuestCard, "name">) =>
  `Only ${g.name} has an ID on file, so that record stands and the ID stays with the guest.`;

/** The strip above "Join into one": what the join does, before it is pressed. */
export const joinStrip = (kept: Pick<GuestCard, "name">, other: Pick<GuestCard, "name">) =>
  `${other.name}'s stays move to ${kept.name}. Nothing is deleted, and it can be undone.`;

/** " · 3 stays moved · by Asha Rao · 18 Nov 2026" (the joined list's grey tail). */
export const joinTail = (j: Pick<GuestJoin, "stays" | "by" | "at">) =>
  ` · ${j.stays} ${j.stays === 1 ? "stay" : "stays"} moved · by ${j.by ?? "-"} · ${day(j.at.slice(0, 10))}`;
export const apartTail = (n: Pick<NotSameAnswer, "by" | "at">) => ` · by ${n.by ?? "-"} · ${day(n.at.slice(0, 10))}`;

export const countWords = (n: number) => `${n} to look at`;

/* ── The words (SamePerson.tsx) ──────────────────────────────────── */

export const TITLE = "Possible same person";
export const UNDER =
  "Guest records that share a phone number or an email, across every hotel. Join two that are one "
  + "person, or say they are not; either can be undone.";
export const EMPTY = {
  title: "No records share a phone or email",
  line: "When two guest records carry the same phone number or email, they are listed here for a manager to judge.",
};
export const NO_JOINS = "No joins stand. A join made above appears here, with its undo.";
export const NO_APART = "No answers stand. Two records answered \"Not the same person\" above appear here, with the undo.";

/** The web's toasts, word for word. */
export const joinedSaid = (kept: Pick<GuestCard, "name">, other: Pick<GuestCard, "name">) =>
  ({ title: "Joined", body: `${other.name}'s stays are now ${kept.name}'s. It can be undone below.` });
export const apartSaid = (p: Pick<SamePersonPair, "a" | "b">) =>
  ({ title: "Kept apart", body: `${p.a.name} and ${p.b.name} will not be listed again. It can be undone below.` });
export const UNDO_JOIN_SAID = "Every stay is back on the record it came from.";
export const UNDO_APART_SAID = "The two records are listed again.";

/** The phone's own (MEMORY 16): none of these routes reads a key, so a lost reply stops the screen until it is read again. */
export const unknownWords = (what: string) => ({
  title: `Not known whether ${what}`,
  body: "Read the list again and look at Joined and Not the same person before trying again.",
});

/** SamePerson.tsx PAIR_EXPORT: whether an ID is on file is not in it, and never the ID itself. */
export const pairsTable = (pairs: readonly SamePersonPair[]): ExportTable => {
  const side = (g: GuestCard) => [g.name, g.phone ?? "-", g.email ?? "-", String(g.visits), g.lastStay ? day(g.lastStay) : "-"];
  return {
    title: TITLE,
    columns: ["Guest 1", "Phone 1", "Email 1", "Stays 1", "Last stay 1", "Guest 2", "Phone 2", "Email 2", "Stays 2", "Last stay 2", "Share"],
    rows: pairs.map((p) => [...side(p.a), ...side(p.b), [p.samePhone && "phone", p.sameEmail && "email"].filter(Boolean).join(" and ")]),
  };
};
