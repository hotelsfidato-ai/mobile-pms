/* keys.ts. Run: node --experimental-strip-types src/core/keys.check.ts */
import { keyKeeper, NOT_YET_MS } from "./keys.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
let n = 0, clock = 1000, person = "clerk-a";
const k = keyKeeper({ make: () => `k${++n}`, now: () => clock, who: () => person });
const PAY = "/api/hotels/5EL/stays/s1/payments", OUT = "/api/hotels/5EL/stays/s1/checkout";
const pay = (amount: number) => JSON.stringify({ method: "Cash", amount, businessDate: "2026-11-04" });
const P = (a: number) => ["POST", PAY, pay(a)] as const;
const tick = () => { clock += 1; };

/* A lost reply, tapped again with nothing known in between: the same key. */
let t = k.begin(...P(500)); eq(t.key, "k1", "the first tap");
k.failed(t, 0); tick();
t = k.begin(...P(500)); eq(t.key, "k1", "the same payment again after a lost reply: the same key");
k.failed(t, 0); tick();
const t600 = k.begin(...P(600)); eq(t600.key, "k2", "an edited amount: a new key");
k.failed(t600, 0); tick();
const out = k.begin("POST", OUT, undefined); eq(out.key, "k3", "another write: its own key");
k.failed(out, 503); tick();
t = k.begin(...P(500)); eq(t.key, "k1", "a check-out tried in between never costs the payment its key");

/* A read begun while the payment is on its way, or before it failed, proves nothing. */
const early = k.mark(); tick();
k.seen(early);
eq(k.begin(...P(500)).key, "k1", "a read while it is on its way keeps the key");
k.failed(t, 0); tick();
k.seen(early);
eq(k.begin(...P(500)).key, "k1", "a read begun before the failure keeps the key");
k.failed(t, 0); tick();

/* The bill read again after it failed: known now, so a repeat is on purpose. */
k.seen(k.mark()); tick();
t = k.begin(...P(500)); eq(t.key, "k4", "the guest pays the other ₹500 after the bill was read: a second payment");

/* The server's "not yet": kept against a read until NOT_YET_MS have passed. */
k.failed(t, 409); tick();
k.seen(k.mark());
eq(k.begin(...P(500)).key, "k4", "409 then the immediate re-read: the key is kept");
k.failed(t, 409); clock += NOT_YET_MS + 1;
k.seen(k.mark());
t = k.begin(...P(500)); eq(t.key, "k5", "a read long after the 409: forgotten");

/* Landed, or refused by the server itself: forgotten. */
k.landed(t);
t = k.begin(...P(500)); eq(t.key, "k6", "after it landed, the same payment is a new one");
k.failed(t, 422);
t = k.begin(...P(500)); eq(t.key, "k7", "refused by the server: a new key next time");

/* A ticket finds its own entry, whoever is signed in by then. */
person = "clerk-b";
const b = k.begin(...P(500)); eq(b.key, "k8", "another person: a new key");
person = "clerk-a";
k.landed(b);
person = "clerk-b";
eq(k.begin(...P(500)).key, "k9", "landed after a sign-out between: still forgotten");
console.log("core keys: all checks pass");
