/* ══════════════════════════════════════════════════════════════════
   ONE KEY FOR ONE REQUEST WHILE ITS OUTCOME IS UNKNOWN (MFIN-1, 4 Nov).
   `send()` mints a new idempotency key per call, so a payment whose reply
   was lost, tapped again, reached the server as a second payment. A keeper
   keeps the key of a request (who sent it, method, path, body) only while
   nobody can know whether it was made:
   - tried again unchanged before anything else is known: the SAME key, so
     the server makes it once;
   - anything in it changed (an edited amount): a new key, so it is never
     answered with the first one's stored reply;
   - it landed, or the server itself refused it (a 4xx other than 409, 425,
     429): forgotten;
   - the bill was read again AFTER it failed: forgotten. The person now sees
     whether it was made, so a repeat is on purpose - a guest paying ₹500
     twice is two payments (the review of 4 Nov);
   - another person signed in: their requests never share a key.
   Pure: keys.check.ts runs it.
   ══════════════════════════════════════════════════════════════════ */

import { newKey } from "./offline.ts";

export interface KeyKeeper {
  /** The key for this exact request: the one it had while its outcome is unknown, else a new one. */
  keyFor(method: string, path: string, body: string | undefined): string;
  /** The server answered yes: forgotten. */
  landed(method: string, path: string, body: string | undefined): void;
  /** No yes. `status`: the server's own refusal, or 0 when nothing came back. */
  failed(method: string, path: string, body: string | undefined, status: number): void;
  /** A read that STARTED at `startedAt` came back: every request that had
      failed by then is known now, and forgotten. */
  seen(startedAt: number): void;
}

/** The server's answers that say "not yet" rather than "no": the key is kept. */
const NOT_YET = new Set([409, 425, 429]);

export function keyKeeper(opts: { make?: () => string; now?: () => number; who?: () => string } = {}): KeyKeeper {
  const make = opts.make ?? newKey, now = opts.now ?? Date.now, who = opts.who ?? (() => "");
  const kept = new Map<string, { key: string; failedAt: number | null }>();
  const sig = (method: string, path: string, body: string | undefined) => `${who()} ${method} ${path} ${body ?? ""}`;
  return {
    keyFor(method, path, body) {
      const s = sig(method, path, body);
      const k = kept.get(s);
      if (k) { k.failedAt = null; return k.key; }
      const key = make();
      kept.set(s, { key, failedAt: null });
      return key;
    },
    landed(method, path, body) { kept.delete(sig(method, path, body)); },
    failed(method, path, body, status) {
      const s = sig(method, path, body);
      if (status >= 400 && status < 500 && !NOT_YET.has(status)) { kept.delete(s); return; }
      const k = kept.get(s);
      if (k) k.failedAt = now();
    },
    seen(startedAt) {
      for (const [s, k] of kept) if (k.failedAt !== null && k.failedAt <= startedAt) kept.delete(s);
    },
  };
}
