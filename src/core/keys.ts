/* ══════════════════════════════════════════════════════════════════
   ONE KEY FOR ONE REQUEST (MFIN-1, 4 Nov). `send()` mints a new
   idempotency key per call, so a payment whose reply was lost, tapped
   again, reached the server as a second payment. A keeper keeps the key
   for each request (method, path, body) until it lands, and gives a new
   one when anything in it changes (an edited amount must never be
   answered with the first one's stored reply) or once a write has landed
   (a deliberate second payment is a new one). Pure: keys.check.ts runs it.
   ══════════════════════════════════════════════════════════════════ */

import { newKey } from "./offline.ts";

export interface KeyKeeper {
  /** The key for this exact request: the one it had if it was tried before
      and has not landed, else a new one. */
  keyFor(method: string, path: string, body: string | undefined): string;
  /** This request landed (the server answered yes): tried again, it is a new one. */
  landed(method: string, path: string, body: string | undefined): void;
}

/** Each request remembered by itself until it lands, so trying another write
    in between (a refused check-out after a payment whose reply was lost)
    never costs the payment its key. */
export function keyKeeper(make: () => string = newKey): KeyKeeper {
  const keys = new Map<string, string>();
  const sig = (method: string, path: string, body: string | undefined) => `${method} ${path} ${body ?? ""}`;
  return {
    keyFor(method, path, body) {
      const s = sig(method, path, body);
      let key = keys.get(s);
      if (key === undefined) { key = make(); keys.set(s, key); }
      return key;
    },
    landed(method, path, body) { keys.delete(sig(method, path, body)); },
  };
}
