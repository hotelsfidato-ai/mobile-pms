/* Run: node --experimental-strip-types src/core/hotels.check.ts
   The session's hotels kept current from the frame's read (hotels.ts). */
import { freshHotels } from "./hotels.ts";
import type { HotelsResponse } from "./api.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const who = (staffId: string, hotels: object[]) =>
  ({ scope: { staffId, email: "a@x.in", fullName: "A", isGroupAdmin: false, hotels: [{ hotelId: "h1", role: "gm" }] }, hotels }) as HotelsResponse;
const h = (over: object = {}) => ({ id: "h1", code: "5EL", name: "5 Elements", businessDate: "2026-11-20", today: "2026-11-20", ...over });

const held = who("s1", [h()]);
eq(freshHotels(held, who("s1", [h()])), null, "nothing changed: nothing re-draws");
eq(freshHotels(held, who("s2", [h({ today: "2026-11-21" })])), null, "another person's answer is never taken");
const midnight = freshHotels(held, who("s1", [h({ today: "2026-11-21" })]));
eq([midnight?.who.hotels[0], midnight?.moved], [h({ today: "2026-11-21" }), false], "past midnight: today moves, the business date has not");
eq(midnight?.who.scope, held.scope, "the person's scope is kept as signed in");
const rules = freshHotels(held, who("s1", [h({ deskRules: { invoiceCopies: 1 } })]));
eq(rules?.who.hotels[0], h({ deskRules: { invoiceCopies: 1 } }), "the desk rules follow");
eq(freshHotels(held, who("s1", [h({ businessDate: "2026-11-21" })]))?.moved, true, "the night audit closed a day: moved");
eq(freshHotels(held, who("s1", [h(), h({ id: "h2", code: "AGR", businessDate: "2026-10-01" })]))?.moved, false, "a hotel new to the list has not moved");
eq(freshHotels(held, who("s1", [h({ businessDate: "" })]))?.moved, false, "an answer without a date is not a move");

console.log("hotels.check: ok");
