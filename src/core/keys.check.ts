/* keys.ts. Run: node --experimental-strip-types src/core/keys.check.ts */
import { keyKeeper } from "./keys.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
let n = 0;
const k = keyKeeper(() => `k${++n}`);
const pay = (amount: number) => JSON.stringify({ method: "Cash", amount });

const PAY = "/api/hotels/5EL/stays/s1/payments", OUT = "/api/hotels/5EL/stays/s1/checkout";
eq(k.keyFor("POST", PAY, pay(500)), "k1", "the first tap");
eq(k.keyFor("POST", PAY, pay(500)), "k1", "the same payment again after a lost reply: the same key");
eq(k.keyFor("POST", PAY, pay(600)), "k2", "an edited amount: a new key");
eq(k.keyFor("POST", "/api/hotels/5EL/stays/s2/payments", pay(600)), "k3", "another stay: a new key");
eq(k.keyFor("POST", OUT, undefined), "k4", "another write: its own key");
eq(k.keyFor("POST", PAY, pay(500)), "k1", "a check-out tried in between never costs the payment its key");
k.landed("POST", PAY, pay(500));
eq(k.keyFor("POST", PAY, pay(500)), "k5", "after it landed, the same payment is a new one");
eq(k.keyFor("POST", OUT, undefined), "k4", "the check-out that did not land keeps its key");
console.log("core keys: all checks pass");
