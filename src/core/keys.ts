/* ══════════════════════════════════════════════════════════════════
   ONE KEY FOR ONE REQUEST WHILE ITS OUTCOME IS UNKNOWN (MFIN-1, 4 Nov).
   `send()` mints a new idempotency key per call, so a payment whose reply
   was lost, tapped again, reached the server as a second payment. A keeper
   (one per stay's bill, finance/data.ts) keeps the key of a request (who
   sent it, method, path, body) only while nobody can know whether it was
   made:
   - tried again unchanged before anything else is known: the SAME key, so
     the server makes it once;
   - anything in it changed (an edited amount): a new key, so it is never
     answered with the first one's stored reply;
   - it landed, or the server itself refused it (a 4xx other than 409, 425,
     429): forgotten;
   - the bill read again AFTER it failed: forgotten. The person now sees
     whether it was made, so a repeat is on purpose - a guest paying ₹500
     twice is two payments;
   - the server said "not yet" (409, 425, 429): kept until a read that
     begins NOT_YET_MS later, since the first may still be committing;
   - another person signed in: their requests never share a key.
   `begin` hands back a ticket, so the outcome always finds its own entry.
   One clock, the keeper's own (`mark`). Pure: keys.check.ts runs it.
   Two independent reviews on 4 Nov shaped it (MEMORY 13).
   ══════════════════════════════════════════════════════════════════ */

import { newKey } from "./offline.ts";

/** One request's key and the entry it belongs to. */
export interface Ticket { readonly key: string; readonly sig: string }

export interface KeyKeeper {
  /** This exact request's ticket: the key it had while its outcome is unknown, else a new one. */
  begin(method: string, path: string, body: string | undefined): Ticket;
  /** The server answered yes: forgotten. */
  landed(t: Ticket): void;
  /** No yes. `status`: the server's own answer, or 0 when nothing came back. */
  failed(t: Ticket, status: number): void;
  /** The keeper's clock, taken when a read BEGINS. */
  mark(): number;
  /** A read that began at `mark` came back: every request known by then is forgotten. */
  seen(mark: number): void;
}

/** The server's answers that say "not yet" rather than "no". */
const NOT_YET = new Set([409, 425, 429]);
/** How long a "not yet" keeps its key against a read: the first may still be committing. */
export const NOT_YET_MS = 30_000;

export function keyKeeper(opts: { make?: () => string; now?: () => number; who?: () => string } = {}): KeyKeeper {
  const make = opts.make ?? newKey, now = opts.now ?? Date.now, who = opts.who ?? (() => "");
  /* `known`: from when a read may forget it; null while it is on its way. */
  const kept = new Map<string, { key: string; known: number | null }>();
  return {
    begin(method, path, body) {
      const sig = `${who()} ${method} ${path} ${body ?? ""}`;
      const k = kept.get(sig);
      if (k) { k.known = null; return { key: k.key, sig }; }
      const key = make();
      kept.set(sig, { key, known: null });
      return { key, sig };
    },
    landed(t) { if (kept.get(t.sig)?.key === t.key) kept.delete(t.sig); },
    failed(t, status) {
      const k = kept.get(t.sig);
      if (!k || k.key !== t.key) return;
      if (status >= 400 && status < 500 && !NOT_YET.has(status)) { kept.delete(t.sig); return; }
      k.known = NOT_YET.has(status) ? now() + NOT_YET_MS : now();
    },
    mark: () => now(),
    seen(mark) {
      for (const [sig, k] of kept) if (k.known !== null && k.known <= mark) kept.delete(sig);
    },
  };
}
