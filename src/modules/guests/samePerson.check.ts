/* Run: node --experimental-strip-types src/modules/guests/samePerson.check.ts
   Possible same person (SamePerson.tsx, mobile/m13-sales lane S): the record
   with the only ID stands, nothing is chosen for the manager, the words as
   the web's, and every write refused offline (none is held). */
import { ruleFor } from "../../core/offline.ts";
import {
  apartTail, contactLine, joinStrip, joinTail, onlyWithId, otherOf, sharedWords, sideLine, sideState, type GuestCard,
} from "./samePersonRules.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const card = (id: string, over: Partial<GuestCard> = {}): GuestCard => ({
  id, name: `Guest ${id}`, phone: "9000000010", email: null, visits: 0, hasId: false,
  isVip: false, isBlacklisted: false, blacklistReason: null, lastStay: null, ...over,
});

/* ── The ID stays with the guest ── */
const a = card("a", { hasId: true }), b = card("b");
eq(onlyWithId({ a, b })?.id, "a", "only a has an ID: a stands");
eq(onlyWithId({ a: b, b: a })?.id, "a", "whichever side it is on");
eq(onlyWithId({ a: card("x"), b: card("y") }), null, "neither has one: the manager chooses");
eq(onlyWithId({ a: card("x", { hasId: true }), b: card("y", { hasId: true }) }), null, "both have one: the manager chooses");
eq(sideState(b, a, a), { chosen: false, locked: true, label: "Keep this record" }, "the side without the ID cannot be kept");
eq(sideState(a, a, a), { chosen: true, locked: false, label: "This record stands" }, "the side with it stands");

/* ── Never automatic: nothing is kept until the manager chooses ── */
const x = card("x"), y = card("y");
eq(sideState(x, null, null), { chosen: false, locked: false, label: "Keep this record" }, "nothing chosen at first");
eq(otherOf({ a: x, b: y }, null), null, "no join is offered until one is kept");
eq(otherOf({ a: x, b: y }, y)?.id, "x", "keeping b joins a into it");
eq(joinStrip(y, x), "Guest x's stays move to Guest y. Nothing is deleted, and it can be undone.", "the strip says what moves");

/* ── The words ── */
eq(sharedWords({ samePhone: true, sameEmail: false }), "Same phone.", "a phone");
eq(sharedWords({ samePhone: true, sameEmail: true }), "Same phone and email.", "both");
eq(contactLine({ phone: "9000000010", email: null }), "9000000010 · -", "no email is a dash");
eq(sideLine({ visits: 1, lastStay: "2026-10-10", hasId: true }), "Stayed with the group once · last 10 Oct 2026 · ID on file", "the picture's line");
eq(sideLine({ visits: 0, lastStay: null, hasId: false }), "Has not stayed with the group yet · last - · no ID on file", "never stayed");
eq(joinTail({ stays: 1, by: null, at: "2026-11-18 10:05:00.123+05:30" }), " · 1 stay moved · by - · 18 Nov 2026", "a staff name not readable is a dash");
eq(apartTail({ by: "Asha Rao", at: "2026-11-02 09:00:00+05:30" }), " · by Asha Rao · 2 Nov 2026", "who said so and when");

/* ── Offline: every write refused, none held (the web's list has no /crm path) ── */
for (const [m, p] of [["POST", "/api/hotels/5EL/crm/joins"], ["POST", "/api/hotels/5EL/crm/joins/1/undo"],
  ["POST", "/api/hotels/5EL/crm/not-same"], ["POST", "/api/hotels/5EL/crm/not-same/1/undo"]] as const) {
  eq(ruleFor(p, m).tier, "refuse", `${m} ${p} is refused offline`);
}

console.log("samePerson: all checks pass");
