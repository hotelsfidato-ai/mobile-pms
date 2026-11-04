/* keys.ts. Run: node --experimental-strip-types src/core/keys.check.ts */
import { keyKeeper } from "./keys.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
let n = 0, clock = 1000, person = "clerk-a";
const k = keyKeeper({ make: () => `k${++n}`, now: () => clock, who: () => person });
const PAY = "/api/hotels/5EL/stays/s1/payments", OUT = "/api/hotels/5EL/stays/s1/checkout";
const pay = (amount: number) => JSON.stringify({ method: "Cash", amount, businessDate: "2026-11-04" });
const P = (a: number) => ["POST", PAY, pay(a)] as const;

/* A lost reply, tapped again with nothing known in between: the same key. */
eq(k.keyFor(...P(500)), "k1", "the first tap");
k.failed(...P(500), 0); clock = 1001;
eq(k.keyFor(...P(500)), "k1", "the same payment again after a lost reply: the same key");
k.failed(...P(500), 0); clock = 1002;
eq(k.keyFor(...P(600)), "k2", "an edited amount: a new key");
k.failed(...P(600), 0); clock = 1003;
eq(k.keyFor("POST", OUT, undefined), "k3", "another write: its own key");
k.failed("POST", OUT, undefined, 503); clock = 1004;
eq(k.keyFor(...P(500)), "k1", "a check-out tried in between never costs the payment its key");
k.failed(...P(500), 0); clock = 1005;

/* The bill read again after it failed: known now, so a repeat is on purpose. */
k.seen(1005); clock = 1006;
eq(k.keyFor(...P(500)), "k4", "the guest pays the other ₹500 after the bill was read: a second payment");
/* A read that started BEFORE the failure proves nothing. */
k.failed(...P(500), 0); clock = 1007;
k.seen(1005);
eq(k.keyFor(...P(500)), "k4", "a read begun before the failure keeps the key");
/* Landed: forgotten. */
k.landed(...P(500));
eq(k.keyFor(...P(500)), "k5", "after it landed, the same payment is a new one");
/* The server's own refusal: forgotten; its "not yet": kept. */
k.failed(...P(500), 422);
eq(k.keyFor(...P(500)), "k6", "refused by the server: a new key next time");
k.failed(...P(500), 409);
eq(k.keyFor(...P(500)), "k6", "409 (in progress): the key is kept");
/* Another person on the same phone never shares a key. */
person = "clerk-b";
eq(k.keyFor(...P(500)), "k7", "another person: a new key");
console.log("core keys: all checks pass");
