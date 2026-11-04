import { currentSubject, orNull, send } from "../../core/api";
import { keyKeeper, type KeyKeeper } from "../../core/keys";
import type { AuditUndoRecord, ClosedDay, NightAuditResult, NightAuditState } from "./audit";

/* ══════════════════════════════════════════════════════════════════
   THE NIGHT AUDIT'S READS AND ITS ONE WRITE — the web's
   src/modules/night-audit/data/nightAudit.ts, through the core only.
   Reads (roleGate REPORTS, `report` view):
     GET /api/hotels/:code/night-audit        the checklist and canRun
     GET /api/hotels/:code/night-audit/runs   Closed days, the last 60
     GET /api/hotels/:code/night-audit/undos  Cancelled audits
   The write (roleGate CLOSE_DAY, `invoice` create):
     POST /api/hotels/:code/night-audit/run   { businessDate, reason? }
   Refused offline by the web's tier (core offline.ts "Night audit"): `send`
   throws ApiError 503 with the web's sentence and nothing is held.
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${code}/night-audit`;

/** One keeper per property's close (core keys.ts, MFIN-1): the same close
    tapped again while its outcome is unknown carries the same key. The
    route itself keys nothing - what keeps a day from closing twice is the
    day Run names (NA-2), the run's lock (NA-3) and its "already closed"
    answer (D17-12) - so the key is for any idempotency the PMS adds. Read
    again (readChecklist), a failed close is known and a new tap is new. */
const keepers = new Map<string, KeyKeeper>();
const keysOf = (code: string) => {
  let k = keepers.get(code);
  if (!k) { k = keyKeeper({ who: currentSubject }); keepers.set(code, k); }
  return k;
};

/** The checklist, as at the day the server is on. The web adds ?asOn= with
    the date its session learned at sign-in; the server answers its own
    business date without it (checklist.ts 32), which is the day Run must
    name, so the phone leaves it out (MODULE.md, difference 1). A property
    the API does not list is null. */
export async function readChecklist(code: string) {
  const keys = keysOf(code);
  const started = keys.mark();
  const state = await orNull<NightAuditState>(at(code));
  keys.seen(started);
  return state;
}

/** The days this property has closed, newest first (the web's fetchOr: none on a 404). */
export const readClosedDays = async (code: string) => (await orNull<ClosedDay[]>(`${at(code)}/runs`)) ?? [];

/** Audits cancelled from the Admin section (D27-390), newest first. */
export const readUndos = async (code: string) => (await orNull<AuditUndoRecord[]>(`${at(code)}/undos`)) ?? [];

/** Close the day: the only call that MOVES a business date. `body` is
    audit.ts runBody - the day the screen shows. A refusal (409: blockers,
    already closed, another day, the 16 hours) comes back as an ApiError in
    the server's own words; offline, the web's sentence. */
export const closeDay = (code: string, body: { businessDate: string; reason?: string }) =>
  send<NightAuditResult>("POST", `${at(code)}/run`, body, keysOf(code));

