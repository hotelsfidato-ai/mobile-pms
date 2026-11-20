/* stop.ts. Run: node --experimental-strip-types src/core/stop.check.ts */
import { stopBook } from "./stop.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const b = stopBook();
let told = 0;
const off = b.subscribe(() => { told += 1; });
const S = "stores/5EL", B = "banquet/5EL/ev1";

eq(b.stuck(S), false, "nothing lost: free");

/* A read on its way when the reply was lost proves nothing, even if it lands good after. */
const early = b.begin();
b.lost(S);
eq(told, 1, "a loss is told");
eq(b.stuck(S), true, "lost: stopped");
b.good(S, early);
eq(b.stuck(S), true, "a read begun BEFORE the loss, landing good after it, lets nothing go");

/* A read begun after the loss that failed: never reported good, so still stopped. */
b.begin();
eq(b.stuck(S), true, "a read begun after it that failed lets nothing go");

/* Another record's good read is not this one's. */
const other = b.begin();
b.good(B, other);
eq(b.stuck(S), true, "a good read of another record lets nothing go");

/* Closing the sheet and reopening it: the book is outside every sheet, so still stopped. */
eq(b.stuck(S), true, "still stopped while nothing was read again");

/* A read begun after the loss, back good: let go, and told. */
const fresh = b.begin();
const before = told;
b.good(S, fresh);
eq(b.stuck(S), false, "a good read begun after the loss lets it go");
eq(told, before + 1, "the release is told");

/* A second loss after that read began: the read that began before it lets nothing go. */
const r2 = b.begin();
b.lost(S);
b.good(S, r2);
eq(b.stuck(S), true, "a later loss is not let go by a read begun before it");
const r3 = b.begin();
b.good(S, r3);
eq(b.stuck(S), false, "and a read begun after it lets it go");

/* Two names stay apart. */
b.lost(B);
eq([b.stuck(S), b.stuck(B)], [false, true], "one record's loss stops only its own name");

/* While a write is on its way: stopped, so a closed and reopened sheet cannot send a second. */
const W = "spa/5EL/book";
const done = b.sending(W);
eq(b.stuck(W), true, "a write on its way stops its name");
eq(b.unknown(W), false, "on its way is not yet unknown: no \"not known\" line");
b.good(W, b.begin());
eq(b.stuck(W), true, "a good read while it is on its way lets nothing go");
b.lost(W);
done();
eq(b.stuck(W), true, "lost, then done: still stopped by the loss");
eq(b.unknown(W), true, "lost: unknown");
done();
eq(b.stuck(W), true, "a second done changes nothing");
const two = b.sending(B); const twoB = b.sending(B);
two();
eq(b.stuck(B), true, "one of two writes done: still stopped (B also lost above)");
twoB();
b.good(B, b.begin());
eq(b.stuck(B), false, "both done and a good read after the loss: free");
const ok = b.sending(B); ok();
eq(b.stuck(B), false, "a write that landed leaves nothing stopped");

/* Leaving the screen and coming back: the book outlives the screen; a failed opening read and
   the cached answer from before the loss let nothing go. */
const cached = b.begin();
b.lost(W);
b.begin(); /* the remounted screen's opening read, which failed */
b.good(W, cached);
eq(b.stuck(W), true, "remounted: the failed opening read and the cached read from before let nothing go");

off();
const quiet = told;
b.lost(S);
eq(told, quiet, "an unsubscribed listener is not told");

console.log("stop.check: ok");
