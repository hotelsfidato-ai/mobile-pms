/* ══════════════════════════════════════════════════════════════════
   WHAT MAY HAPPEN WITH NO NETWORK — the web's src/lib/offline.ts, ported
   (M-1). Its long notes say WHY each tier is what it is; read them there.
   ONE LIST, the web's, copied whole and in order: a rule written in two
   places comes to be wrong in one (the PMS's defect 96). Change it in the
   PMS first, then here.

   queue       held, sent later; last writer wins is the right answer
   queue-warn  held, and the person told it is not confirmed yet
   refuse      not held: the sentence says why and what to do instead

   Pure: no React Native here, so `offline.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

export type Tier = "queue" | "queue-warn" | "refuse";

export interface Rule {
  test: RegExp;
  methods?: string[];
  tier: Tier;
  /** What a person would call it, for the held list. */
  label: string;
  /** Only for `refuse`: the sentence the person reads. */
  reason?: string;
}

/* First match wins: the specific refusals sit above the general queues. */
const RULES: Rule[] = [
  /* ── refuse ─────────────────────────────────────────────────── */
  {
    test: /\/invoices(\/|$)|\/(stays|groups)\/[^/]+\/invoice$/,
    tier: "refuse",
    label: "Invoice",
    reason:
      "An invoice cannot be raised offline. Its number comes from a "
      + "statutory series, and two desks offline would issue the same one "
      + "to different guests. Check the guest out and raise it when the "
      + "connection is back.",
  },
  {
    test: /\/night-audit(\/|$|\?)/,
    tier: "refuse",
    label: "Night audit",
    reason:
      "The night audit closes the day for the whole property and moves "
      + "the business date. It needs the server.",
  },
  {
    test: /\/(stays|groups)\/[^/]+\/payments$|^\/api\/hotels\/[^/]+\/payments$|\/cashier-shift(\/|$)/,
    tier: "refuse",
    label: "Payment",
    reason:
      "A receipt cannot be taken offline - the drawer is counted against "
      + "what the server knows, and money applied later moves the count "
      + "after it was made. Take it on paper and enter it when the "
      + "connection is back.",
  },
  {
    test: /\/till\/orders\/[^/]+\/settle$|\/till\/day-end/,
    tier: "refuse",
    label: "Bill settlement",
    reason:
      "A bill cannot be settled offline unless it is charged to a room; "
      + "a bill for a banquet function waits for the connection too. "
      + "The order is saved and the kitchen has it; take cash on paper "
      + "and enter it when the connection is back.",
  },
  {
    test: /\/banquet\/events\/[^/]+\/confirm$/,
    tier: "refuse",
    label: "Confirm a function",
    reason:
      "Confirming takes the hall, and two desks offline could both take "
      + "it for the same evening. The enquiry is saved. Confirm when the "
      + "connection is back.",
  },
  {
    test: /\/postings\/[^/]+\/transfer$|\/charges\/[^/]+\/reverse$|\/stays\/[^/]+\/charges$/,
    tier: "refuse",
    label: "Charge",
    reason:
      "The ledger is append-only and a correction has to land in the "
      + "right order. This one needs the server.",
  },
  {
    test: /\/stays\/[^/]+\/(check-out|void|move|folios|routing)$|\/form-c/,
    tier: "refuse",
    label: "This change",
    reason:
      "This settles or re-shapes a bill, which has to happen in the right "
      + "order against the server. It cannot be held.",
  },

  /* ── queue, and warn ────────────────────────────────────────── */
  { test: /\/stays\/[^/]+\/(check-in|assign|unassign)$/, tier: "queue-warn", label: "Check-in" },

  /* ── queue ──────────────────────────────────────────────────── */
  /* `(\/|$)`: /rooms/208/housekeeping ENDS with the word, the
     assignment path /housekeeping/assignments/208 continues past it. */
  { test: /\/housekeeping(\/|$)/, tier: "queue", label: "Housekeeping" },
  { test: /\/rooms\/[^/]+\/housekeeping$/, tier: "queue", label: "Housekeeping" },
  { test: /\/work-orders(\/|$)/, tier: "queue", label: "Work order" },
  { test: /\/guests\/[^/]+\/vip$/, tier: "queue", label: "VIP" },
  {
    test: /\/till\/orders\/[^/]+\/lines\/[^/]+\/(numbered-addons|extras)$/,
    tier: "refuse",
    label: "Customise",
    reason:
      "Add-ons are changed while connected: the dish could reach the kitchen "
      + "before a held change was sent. Customise again when the connection is back.",
  },
  {
    test: /\/till\/orders\/[^/]+\/bill-print(\/here)?$/,
    tier: "refuse",
    label: "Print the bill",
    reason: "The bill printer is reached through the server. Print it again when the connection is back.",
  },
  { test: /\/till\/orders(\/|$)/, tier: "queue", label: "Order" },
  { test: /\/till\/menu\/items\/[^/]+\/(on|off|toggle)$/, tier: "queue", label: "Menu availability" },
  { test: /\/till\/menu\/(items|categories)\/[^/]+\/prep$/, tier: "queue", label: "Preparation time" },
  { test: /\/kitchen(\/|$)/, tier: "queue", label: "Kitchen" },
  { test: /\/banquet\/events$/, methods: ["POST"], tier: "queue", label: "Function enquiry" },
];

/** Everything not named above is refused: queueing it would guess that
    replaying it later is safe. */
const UNLISTED: Rule = {
  test: /.*/,
  tier: "refuse",
  label: "This change",
  reason:
    "This cannot be done offline yet. It has not been checked as safe to "
    + "hold and send later, and guessing is how a guest gets charged twice.",
};

/** A bill settled wholly to a room moves no drawer and may be held (the
    owner, 8 September); cash, card and UPI may not. */
function isRoomCharge(body: string | undefined): boolean {
  if (!body) return false;
  try {
    const parsed = JSON.parse(body) as { method?: string; tenders?: { method?: string }[] };
    if (Array.isArray(parsed.tenders)) {
      return parsed.tenders.length > 0 && parsed.tenders.every((t) => t.method === "room");
    }
    return parsed.method === "room";
  } catch {
    return false;
  }
}

export function ruleFor(path: string, method: string, body?: string): Rule {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD") return { test: /.*/, tier: "queue", label: "Read" };
  if (/\/till\/orders\/[^/]+\/settle$/.test(path) && isRoomCharge(body)) {
    return { test: /.*/, tier: "queue-warn", label: "Room charge" };
  }
  for (const r of RULES) {
    if (!r.test.test(path)) continue;
    if (r.methods && !r.methods.includes(m)) continue;
    return r;
  }
  return UNLISTED;
}

/* ══════════════════════════════════════════════════════════════════
   IS THERE A CONNECTION? The last request is the truth (the web's
   defect 49: a wifi with no route out still says "online"). The phone
   has no "online" event without another package, so a held change is
   retried by the bar: on any answered request, on coming back to the
   app, on Send now, and every 30 seconds while something waits.
   ══════════════════════════════════════════════════════════════════ */

let lastFailed = false;
const watchers = new Set<() => void>();

export const isOnline = () => !lastFailed;

export function noteReachable() {
  if (lastFailed) { lastFailed = false; ping(); }
}

export function noteUnreachable() {
  if (!lastFailed) { lastFailed = true; ping(); }
}

export function watchConnection(fn: () => void): () => void {
  watchers.add(fn);
  return () => { watchers.delete(fn); };
}

function ping() {
  for (const fn of watchers) {
    try { fn(); } catch { /* one listener must not stop the rest */ }
  }
}

/* ══════════════════════════════════════════════════════════════════
   THE HELD CHANGE, AND THE DRAIN
   ══════════════════════════════════════════════════════════════════ */

export interface OutboxEntry {
  id: string;
  /** What a person would call it. */
  label: string;
  path: string;
  method: string;
  body?: string;
  /** Minted at the TAP (M-5: sent from the first attempt), reused on
      every retry. A fresh one per attempt is the same as having none. */
  idempotencyKey: string;
  hotelId: string;
  /** The person who acted, captured at the tap: sent as nobody else. */
  subject: string;
  queuedAt: number;
  attempts: number;
  status: "waiting" | "rejected";
  /** The server's own sentence when it refused, kept verbatim. */
  error?: string;
}

/** The store the drain works on: the phone's is `outbox.ts` (SQLite). */
export interface OutboxStore {
  list(): Promise<OutboxEntry[]>;
  remove(id: string): Promise<void>;
  update(entry: OutboxEntry): Promise<void>;
}

export interface DrainResult { sent: number; rejected: number; heldForOthers: number; stopped: boolean }

let draining = false;

/** Sends the held changes oldest first and STOPS at the first network
    failure or 5xx, so everything behind it stays in order. A 4xx is the
    server deciding: kept as refused with its sentence, for a person to
    see and discard; the drain goes on. Another person's changes wait
    for them to sign in again. */
export async function drain(
  store: OutboxStore,
  send: (entry: OutboxEntry) => Promise<Response>,
  subject: string,
): Promise<DrainResult> {
  const result: DrainResult = { sent: 0, rejected: 0, heldForOthers: 0, stopped: false };
  if (draining) return result;
  draining = true;
  try {
    for (const entry of await store.list()) {
      if (entry.status === "rejected") continue;
      if (subject && entry.subject && entry.subject !== subject) {
        result.heldForOthers += 1;
        continue;
      }
      let response: Response;
      try {
        response = await send(entry);
      } catch {
        noteUnreachable();
        result.stopped = true;
        return result;
      }
      noteReachable();
      if (response.ok) {
        await store.remove(entry.id);
        result.sent += 1;
        continue;
      }
      if (response.status >= 500) {
        result.stopped = true;
        return result;
      }
      const body = (await response.json().catch(() => null)) as { reason?: string; error?: string } | null;
      await store.update({
        ...entry,
        status: "rejected",
        attempts: entry.attempts + 1,
        error: body?.reason ?? body?.error ?? `Refused (${response.status}).`,
      });
      result.rejected += 1;
    }
  } finally {
    draining = false;
  }
  return result;
}

/** A v4 UUID: the API keeps the key in a `uuid` column. ponytail:
    Math.random where the phone has no crypto.randomUUID - a key only has
    to be unique, not secret; expo-crypto if it ever has to be. */
export function newKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 3) | 8).toString(16);
  });
}
