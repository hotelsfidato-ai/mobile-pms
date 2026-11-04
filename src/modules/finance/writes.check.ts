/* Run: node --experimental-strip-types src/modules/finance/writes.check.ts
   Every write on a stay's bill is REFUSED offline by the web's tiers, in the
   web's own sentence: nothing that moves money is held on the phone. */
import { ruleFor } from "../../core/offline.ts";
import { WRITES } from "./writes.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const RECEIPT = "A receipt cannot be taken offline - the drawer is counted against what the server knows, and money applied later moves the count after it was made. Take it on paper and enter it when the connection is back.";
const RESHAPE = "This settles or re-shapes a bill, which has to happen in the right order against the server. It cannot be held.";
const INVOICE = "An invoice cannot be raised offline. Its number comes from a statutory series, and two desks offline would issue the same one to different guests. Check the guest out and raise it when the connection is back.";
const LEDGER = "The ledger is append-only and a correction has to land in the right order. This one needs the server.";
const UNLISTED = "This cannot be done offline yet. It has not been checked as safe to hold and send later, and guessing is how a guest gets charged twice.";

const want: Record<keyof typeof WRITES, string> = {
  payment: RECEIPT,
  checkOut: RESHAPE,
  secondBill: RESHAPE,
  invoice: INVOICE,
  charge: LEDGER,
  reverse: LEDGER,
  move: LEDGER,
  edit: UNLISTED,
  rate: UNLISTED,
};

for (const [name, path] of Object.entries(WRITES) as Array<[keyof typeof WRITES, (...a: string[]) => string]>) {
  const rule = ruleFor(path("5EL", "s-1", "l-1"), "POST", JSON.stringify({ method: "Cash", amount: 1 }));
  eq(rule.tier, "refuse", `${name} is refused offline, never held`);
  eq(rule.reason, want[name], `${name} says the web's sentence`);
}

/* Even a payment "to a room" is not the till's held room charge. */
eq(ruleFor(WRITES.payment("5EL", "s-1"), "POST", JSON.stringify({ method: "room" })).tier, "refuse", "a stay's payment is never held");

console.log("finance writes: all checks pass");
