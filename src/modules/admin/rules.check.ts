/* Run: node --experimental-strip-types src/modules/admin/rules.check.ts
   Administration's rules, on made-up rows chosen so that a wrong rule gives a different answer
   (MEMORY 11): the people's acts, the logs' pages, the server's health words, the tax line,
   the backfill trail. */
import {
  addReady, addedWords, auditDay, auditLag, boundary, bytes, chosenRole, dateTime, dayOrBlank, deviceInWords, entriesWords, grantable,
  integrationsOf, mayGrant, mayTake, ms, paged, peopleLine, placeLine, placesOf, precise, problemsOf, queryOf, removeWhy,
  signInNow, staffRecord, strandedOf, taxLine, taxOf, taxRows, trailWords, uptime, within, type AdminStaff, type RosterPlace,
} from "./rules.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
/* Hermes reads only ISO (MEMORY 7, 17): every time below is read as the phone reads it. */
const realParse = Date.parse;
Date.parse = (text: string) => (/^\d{4}-\d{2}-\d{2}(T|$)/.test(text) ? realParse(text) : NaN);

const person = (over: Partial<AdminStaff>): AdminStaff => ({
  id: "p1", email: "a@x.in", name: "Asha", phone: null, canSignIn: true, isGroupAdmin: false, isActive: true,
  homeScreen: "dashboard", mayEdit: true, maySwitch: true, maySetPassword: true, access: [], ...over,
});
const gmPlaces: RosterPlace[] = [{ code: "5EL", name: "5 Elements", roles: ["front_desk", "housekeeping", "gm"] }];

/* The ✕: a place I run, a role I could give there, never my own. */
const desk = person({ access: [{ code: "5EL", role: "front_desk" }] });
eq(mayTake(desk, desk.access[0]!, "me", gmPlaces), true, "a GM takes reception away");
eq(mayTake(person({ access: [{ code: "5EL", role: "admin" }] }), { code: "5EL", role: "admin" }, "me", gmPlaces), false, "never somebody above them");
eq(mayTake(desk, { code: "AGR", role: "front_desk" }, "me", gmPlaces), false, "not a hotel they do not run");
eq(mayTake(person({ id: "me", access: [{ code: "5EL", role: "front_desk" }] }), { code: "5EL", role: "front_desk" }, "me", gmPlaces), false, "never your own (D24-19)");

/* Give a property: only places they do not hold; a group administrator has no grants. */
eq(mayGrant(desk, gmPlaces), false, "already works at every place I run");
eq(mayGrant(person({}), gmPlaces), true, "nobody yet");
eq(mayGrant(person({ isGroupAdmin: true }), gmPlaces), false, "a group administrator");
const tests = new Set(["T5E"]);
const owned: RosterPlace[] = [...gmPlaces, { code: "AGR", name: "Agra", roles: ["front_desk"] }, { code: "T5E", name: "5 Elements TEST", roles: ["front_desk"] }];
eq(grantable(person({ access: [{ code: "T5E", role: "front_desk" }] }), owned, tests).places.map((p) => p.code), [], "test-only: only test hotels");
eq(grantable(desk, owned, tests).places.map((p) => p.code), ["AGR", "T5E"], "a real person may be given a test hotel too");
eq(placesOf(owned, tests, false).all.map((p) => p.code), ["5EL", "AGR"], "test hotels only for a group administrator");
eq(placesOf(owned, tests, true).all.map((p) => p.code), ["5EL", "AGR", "T5E"], "a group administrator's");

/* The head and the stranded. */
const rows = [person({ id: "a" }), person({ id: "b", isGroupAdmin: true }), person({ id: "c", isActive: false })];
eq(peopleLine(rows, true, true), "2 active · 1 can reach every property", "counted from the server's rows");
eq(peopleLine([], true, false), "Nobody yet.. Adding somebody is for a group administrator, or a property's general manager or Admin.", "the web's words, its double stop too");
eq(strandedOf(rows).map((p) => p.id), ["a"], "active, no property, not a group administrator");

/* Add somebody: Reception unless picked; 10 characters for a manager. */
eq(chosenRole(["gm", "front_desk"], ""), "front_desk", "Reception by default");
eq(chosenRole(["gm", "housekeeping"], ""), "gm", "else the first");
eq(chosenRole(["gm", "housekeeping"], "housekeeping"), "housekeeping", "the pick");
eq(addReady({ name: "A", email: "a@x", password: "123456789", needsPlace: true, place: gmPlaces[0], role: "gm" }), { min: 10, ready: false }, "a GM needs 10");
eq(addReady({ name: "A", email: "a@x", password: "12345678", needsPlace: true, place: gmPlaces[0], role: "front_desk" }).ready, true, "reception 8");
eq(addReady({ name: "A", email: "ax", password: "12345678", needsPlace: false, place: undefined, role: "" }).ready, false, "an email has an @");
eq(addedWords({ name: " Asha ", existed: false, test: false, placeRequired: true, code: "5EL", role: "front_desk" }),
  { title: "Asha added", body: "They can sign in now, and they work at 5EL as reception." }, "the toast");

/* Users: a group administrator holds no role; an unknown role is a viewer. */
const api = { id: "1", name: "A", email: "a", roles: [], properties: "5 Elements", status: "active" as const, lastSeen: null };
eq(staffRecord({ ...api, role: "nonsense", isGroupAdmin: false }).roleLabel, "Viewer", "the least");
eq(staffRecord({ ...api, role: null, isGroupAdmin: true }).roleLabel, "Group administrator", "QA AD-2");
eq(staffRecord({ ...api, role: "pos", isGroupAdmin: false }).roleLabel, "Waiter", "the matrix's word");

/* Sign-ins. */
eq(deviceInWords("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Version/17.0 Mobile Safari/604.1"), "Safari on iPhone", "Safari, not Mac");
eq(deviceInWords("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537 Edg/120"), "Edge on Windows", "Edge before Chrome");
eq(deviceInWords("okhttp/4.12"), null, "nothing known");
eq(deviceInWords(null), null, "none");
eq(signInNow({ id: "1", at: "x", device: null, signedOutAt: null, signedOutBy: null }), "Signed in", "still in");
eq(signInNow({ id: "1", at: "x", device: null, signedOutAt: "2026-10-31 07:35:58.215147+05:30", signedOutBy: null }).startsWith("Signed out 31 Oct 2026, "), true, "Postgres's text read");
eq(signInNow({ id: "1", at: "x", device: null, signedOutAt: "2026-10-31 07:35:58+05:30", signedOutBy: null }).endsWith(" by -"), true, "a dash for nobody");
eq(dateTime("2026-10-31 07:35:58.215147+05:30") === "-", false, "Hermes reads the converted time");

/* The logs: a page and one more; blank filters left out; a day typed as the API takes it. */
eq(paged([1, 2, 3], 2), { rows: [1, 2], older: true }, "one more means older");
eq(paged([1, 2], 2), { rows: [1, 2], older: false }, "no older page");
eq(paged(undefined, 2), { rows: [], older: false }, "not read yet");
eq(entriesWords(1, 100, 37), "Entries 101-137", "the badge");
eq(entriesWords(0, 100, 0), "No entries", "none");
eq(queryOf({ who: "", from: "2026-10-01", offset: 0, limit: 101 }), "?from=2026-10-01&offset=0&limit=101", "blank left out, zero kept");
eq(queryOf({ who: "Asha Rao" }), "?who=Asha%20Rao", "encoded");
eq(dayOrBlank(" 2026-10-01 "), "2026-10-01", "a day");
eq(dayOrBlank(""), "", "no filter");
eq(dayOrBlank("1 Oct"), null, "not a day the API takes");
eq(dayOrBlank("2026-13-45"), null, "no such day");

/* Integrations: the server's yes or no, never a secret. */
const ints = integrationsOf({ signIn: false, sending: true, sendingNote: null },
  { configured: true, environment: "live", reason: null, lastLogin: { ok: false, at: "2026-10-31T02:05:00Z", reason: "Wrong password" } });
eq(ints.map((i) => [i.id, i.setUp]), [["firebase", false], ["su", true], ["sending", true]], "set up as the server says");
eq(ints[1]!.detail.startsWith("SU's live account is set up on this server. Last login "), true, "SU's line");
eq(ints[1]!.detail.endsWith(": Wrong password."), true, "the server's reason");
eq(integrationsOf({ signIn: true, sending: false, sendingNote: "Not connected." }, { configured: false, environment: null, reason: null, lastLogin: null })[1]!.detail,
  "SU's settings are not on this server.", "not set up");

/* System health. */
eq([bytes(41 * 1024 ** 2), bytes(686 * 1024 ** 3)], ["41 MB", "686.0 GB"], "bytes");
eq([ms(250), ms(2500), within(null), within(-1), within(2500)], ["250 ms", "2.5 s", "-", "over 10 s", "within 2.5 s"], "speeds");
eq([uptime(75 * 60), uptime(3 * 86400 + 7200), uptime(59)], ["1 h 15 min", "3 d 2 h", "0 min"], "uptime");
eq(auditLag("2026-10-11", "2026-10-31"), 20, "days behind, read as Hermes reads a day");
eq([auditDay("2026-10-31", "2026-10-31").words, auditDay("2026-10-30", "2026-10-31").words, auditDay("2026-10-11", "2026-10-31").words],
  ["Up to date", "Yesterday not closed yet", "Behind by 20 days"], "the day's pill");
eq(problemsOf({ errors: [{ place: "GET /x", what: "500", count: 2, last: "t" }], slowQueries: [{ what: "select 1", count: 4, maxMs: 2972, last: "t" }] })
  .map((p) => [p.what, p.where]), [["Error 500", "GET /x"], ["select 1", "Slow query, up to 2.972 s"]], "errors, then slow queries");

/* Properties: the tax as the server set it, a boundary exactly. */
const tax = taxOf({ kinds: [{ kind: "room", slabs: [{ overAmount: "7500", rate: "18" }, { overAmount: "0", rate: "5" }] },
  { kind: "restaurant", slabs: [{ overAmount: 0, rate: 5 }] }, { kind: "spa", slabs: [] }] });
eq(taxLine(tax[0]!.slabs), "5% up to ₹7,500 · 18% above ₹7,500", "slabs, lowest first");
eq(taxLine([{ overAmount: 0, rate: 5 }, { overAmount: 7500.5, rate: 18 }]), "5% up to ₹7,500.50 · 18% above ₹7,500.50", "never rounded");
eq(taxRows(tax).map((r) => r.value), ["5% up to ₹7,500 · 18% above ₹7,500", "5%", "-", "-", "-", "-", "-"], "a dash where nobody set one; no alcohol row");
eq(taxRows(tax)[0]!.label, "GST on rooms", "the label");
eq(boundary(7500), "₹7,500", "whole");
eq(placeLine("Akkalkot, Solapur District, Maharashtra 413216", "Akkalkot", "MH"), "Akkalkot, Solapur District, Maharashtra 413216", "the place once");
eq(placeLine(null, "Agra", "UP"), "Agra, UP", "the place added");

/* Backfill: the server's figures with paise; who may remove. */
eq([precise(1234.5), precise(null), precise(0)], ["₹1,234.50", "-", "₹0.00"], "a dash only for not typed");
eq(removeWhy({ mayWrite: false }, { removedAt: null }), "Only the owner, an administrator or the general manager enters and corrects these.", "the Accountant");
eq(removeWhy({ mayWrite: true }, { removedAt: "x" }), "A removed line stays as it was.", "removed stays");
eq(removeWhy({ mayWrite: true }, { removedAt: null }), null, "may remove");
eq(trailWords({ changeReason: "typo", changedBy: null, removedReason: null, removedBy: null }), "Corrected by -: typo", "corrected");
eq(trailWords({ changeReason: "typo", changedBy: "A", removedReason: "twice", removedBy: "B" }), "Removed by B: twice", "removed wins");

Date.parse = realParse;
console.log("admin rules: ok");
