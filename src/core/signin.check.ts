/// <reference types="node" />
/* Run: node --experimental-strip-types mobile/src/core/signin.check.ts
   Who a request says it is from, and what a kept session does on a refusal
   or a dead line. The REAL api.ts and firebase.ts: only Firebase, the phone
   and fetch are fakes, with a made-up token and no password anywhere. */
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── The fakes, and the hooks that put them where the app imports ─ */
type Headers = Record<string, string>;
const shelf = new Map<string, string>();
const fake = {
  platform: { OS: "android" },
  auth: { currentUser: null as null | { uid: string; getIdToken: () => Promise<string> } },
  inits: [] as unknown[],
  native: [] as unknown[],
  browser: 0,
  signedOut: 0,
  refuseStart: false,
  held: [] as Array<{ subject: string; idempotencyKey: string; body?: string }>,
  storage: {
    setItem: async (k: string, v: string) => { shelf.set(k, v); },
    getItem: async (k: string) => shelf.get(k) ?? null,
    removeItem: async (k: string) => { shelf.delete(k); },
  },
};
const g = globalThis as unknown as { __fake: typeof fake; __DEV__: boolean; fetch: unknown };
g.__fake = fake;
g.__DEV__ = false;

const stub = (code: string) => `data:text/javascript,${encodeURIComponent(code)}`;
const FAKES: Record<string, string> = {
  "firebase/app": stub("export const initializeApp = (c) => { __fake.inits.push(c); return {}; };"),
  "firebase/auth": stub(`
    export const getAuth = () => { __fake.browser += 1; return __fake.auth; };
    export const initializeAuth = (app, options) => {
      if (__fake.refuseStart) throw Object.assign(new Error("Firebase: Error (auth/invalid-api-key)."), { code: "auth/invalid-api-key" });
      __fake.native.push(options); return __fake.auth; };
    export const getReactNativePersistence = (store) => ({ on: store === __fake.storage ? "AsyncStorage" : "?" });
    export const signOut = async () => { __fake.signedOut += 1; __fake.auth.currentUser = null; };`),
  "react-native": stub("export const Platform = __fake.platform;"),
  "@react-native-async-storage/async-storage": stub("export default __fake.storage;"),
  "./outbox": stub("export const enqueue = async (e) => { __fake.held.push(e); return { ...e, id: 'held-1' }; };"),
};
registerHooks({
  resolve(spec, context, next) {
    if (FAKES[spec]) return { url: FAKES[spec]!, shortCircuit: true };
    return next(spec.startsWith("./") && !spec.includes(".ts") ? `${spec}.ts` : spec, context);
  },
  load(url, context, next) {
    /* `transform`, which @types/node 26 no longer lists and Node 22 has: api.ts's `constructor(readonly status …)` is more than stripping can take. */
    if (url.startsWith("file:") && new URL(url).pathname.endsWith(".ts") && !url.includes(".check.")) {
      return { format: "module", shortCircuit: true, source: stripTypeScriptTypes(readFileSync(fileURLToPath(url.split("?")[0]!), "utf8"), { mode: "transform" as "strip" }) };
    }
    return next(url, context);
  },
});

process.env.EXPO_PUBLIC_FIREBASE_API_KEY = "public-key";
process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = "example.firebaseapp.com";
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = "example";
process.env.EXPO_PUBLIC_FIREBASE_APP_ID = "1:2:web:3";

const { ApiError, HeldError, api, currentSubject, send, sendHeld, setDevSubject } = await import("./api.ts");
const { endSession, isConfigured, keptNotice, missing, notSetUp, remember, reopen, signInRefusal } = await import("./firebase.ts");
const { noteReachable } = await import("./offline.ts");

/* ── Firebase: the same project, kept on the phone ──────────────── */
eq(isConfigured, true, "every required value present");
eq(fake.inits, [{ apiKey: "public-key", authDomain: "example.firebaseapp.com", projectId: "example", appId: "1:2:web:3" }], "the public settings, and only those");
eq(fake.native, [{ persistence: { on: "AsyncStorage" } }], "the phone keeps the session in AsyncStorage");
eq(fake.browser, 0, "a phone does not use the browser's store");

fake.platform.OS = "web";
const webPreview = "./firebase.ts?web";
await import(webPreview);
eq([fake.browser, fake.native.length], [1, 1], "the web preview uses the browser's own store");
fake.platform.OS = "android";

eq([missing, notSetUp], [[], null], "nothing missing, nothing said");

type Started = { isConfigured: boolean; auth: unknown; missing: string[]; notSetUp: string | null };
const load = async (as: string) => (await import(`./firebase.ts?${as}`)) as Started;

/* The owner's settings not given yet: what is missing, by its name, and who sets it up. */
delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
let unset = await load("absent");
eq([unset.isConfigured, unset.auth, fake.inits.length], [false, null, 2], "no key: not set up, and nothing started");
eq(unset.missing, ["EXPO_PUBLIC_FIREBASE_API_KEY"], "the missing value by its name");
eq(unset.notSetUp, "Signing in with your email and password is not set up in this build yet. It was built without the sign-in setting EXPO_PUBLIC_FIREBASE_API_KEY. The owner sets it up.", "and the words say it");

for (const k of Object.keys(process.env)) if (k.startsWith("EXPO_PUBLIC_FIREBASE_")) delete process.env[k];
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = "  ";
unset = await load("none");
eq([unset.isConfigured, fake.inits.length], [false, 2], "none given (a blank is none): nothing started");
eq(unset.missing, ["EXPO_PUBLIC_FIREBASE_API_KEY", "EXPO_PUBLIC_FIREBASE_PROJECT_ID", "EXPO_PUBLIC_FIREBASE_APP_ID"], "every required one named");
eq(unset.notSetUp, "Signing in with your email and password is not set up in this build yet. It was built without the sign-in settings EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_PROJECT_ID and EXPO_PUBLIC_FIREBASE_APP_ID. The owner sets them up.", "all of them said");
const settings = () => Object.assign(process.env, {
  EXPO_PUBLIC_FIREBASE_API_KEY: "public-key", EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "example", EXPO_PUBLIC_FIREBASE_APP_ID: "1:2:web:3",
});
settings();

delete process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
unset = await load("no-domain");
eq([unset.isConfigured, unset.notSetUp], [true, null], "the domain is not needed for a password");
settings();

/* Settings Firebase will not start with: said, never a crash at start. */
fake.refuseStart = true;
unset = await load("refused");
fake.refuseStart = false;
eq([unset.isConfigured, unset.auth], [false, null], "a refused start leaves nobody able to sign in");
eq(unset.notSetUp, "Signing in is not set up correctly in this build: Firebase did not accept its settings (auth/invalid-api-key). The owner checks the sign-in settings.", "and says why");

/* ── The header on every request ────────────────────────────────── */
let line: "up" | "down" = "up";
let seen: Headers[] = [];
g.fetch = async (_url: string, init: { headers: Headers }) => {
  if (line === "down") throw new TypeError("Network request failed");
  seen.push(init.headers);
  return new Response("{}", { status: 200 });
};
const last = () => seen[seen.length - 1]!;
const held = { id: "1", label: "Room", path: "/api/hotels/5EL/rooms/204/housekeeping", method: "PUT", idempotencyKey: "key-from-the-tap", hotelId: "5EL", subject: "uid-1", queuedAt: 1, attempts: 0, status: "waiting" as const };

let token = "fake-token-1";
let refused: Error | null = null;
fake.auth.currentUser = { uid: "uid-1", getIdToken: async () => { if (refused) throw refused; return token; } };

await api("/api/hotels");
eq(last().authorization, "Bearer fake-token-1", "a read carries the token");
eq("x-dev-staff-id" in last(), false, "and no development header");
await send("POST", "/api/hotels/5EL/x", {});
eq(last().authorization, "Bearer fake-token-1", "a write carries the token");
eq(typeof last()["idempotency-key"], "string", "and its key from the tap");
await sendHeld(held);
eq([last().authorization, last()["idempotency-key"]], ["Bearer fake-token-1", "key-from-the-tap"], "a held change goes with the token and its own key");
token = "fake-token-2";
await api("/api/hotels");
eq(last().authorization, "Bearer fake-token-2", "asked afresh each time, so a refreshed token is the one sent");
eq(currentSubject(), "uid-1", "a held change is this person's");

/* A development name: only on a development run, and it wins there. */
g.__DEV__ = true;
setDevSubject("dev-gm");
await api("/api/hotels");
eq([last()["x-dev-staff-id"], "authorization" in last(), currentSubject()], ["dev-gm", false, "dev-gm"], "a development run names the test person");
setDevSubject(null);
g.__DEV__ = false;
setDevSubject("dev-gm");
await api("/api/hotels");
eq(["x-dev-staff-id" in last(), last().authorization, currentSubject()], [false, "Bearer fake-token-2", "uid-1"], "a release build cannot name one");

/* Offline with an expired token: Firebase cannot refresh it. */
const expired = Object.assign(new Error("offline"), { code: "auth/network-request-failed" });
refused = expired;
const thrown = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as Error & { status?: number });
let e = await thrown(api("/api/hotels"));
eq([e instanceof ApiError, e?.status], [true, 0], "a read says the line is down");
e = await thrown(send("PUT", held.path, { state: "clean" }));
eq(e instanceof HeldError, true, "a write the web holds is held, not lost, when the token cannot refresh");
eq(fake.held.map((h) => h.subject), ["uid-1"], "under the person who acted");
refused = null;

line = "down";
e = await thrown(send("POST", "/api/admin/staff/abc/password", { password: "made-up" }));
eq([e instanceof ApiError, e?.status, fake.held.length], [true, 503, 1], "a new password is refused offline and never put in the outbox");
line = "up";
noteReachable();

/* Signed out: nothing says who. */
fake.auth.currentUser = null;
await api("/api/hotels");
eq(["authorization" in last(), currentSubject()], [false, ""], "nobody signed in, no header");

/* ── The session Firebase kept, read again at start ─────────────── */
const who = { scope: { staffId: "s1", email: "a@b", fullName: "A", isGroupAdmin: false, hotels: [] }, hotels: [] };
const person = { uid: "uid-1", getIdToken: async () => "t" };
const dead = async () => { throw new ApiError(0, "Could not reach the server."); };
const kept = () => JSON.parse(shelf.get("fidato-last-session")!) as { who: typeof who; at: number };

fake.auth.currentUser = person;
eq(await reopen(async () => who), who, "the server answers");

remember(who);
await new Promise((r) => setTimeout(r));
eq(await reopen(dead), who, "a dead line keeps the last good session");
eq(fake.signedOut, 0, "and does not sign anybody out");

shelf.set("fidato-last-session", JSON.stringify({ ...kept(), at: Date.now() - 8 * 24 * 60 * 60 * 1000 }));
eq(await reopen(dead), null, "not older than a week");
eq(fake.signedOut, 0, "(still nobody signed out by a dead line)");

remember(who);
await new Promise((r) => setTimeout(r));
fake.auth.currentUser = null;
eq(await reopen(dead), null, "Firebase ended the session while refreshing: nobody to put back");
eq(shelf.has("fidato-last-session"), false, "and what was remembered goes");

remember(who);
await new Promise((r) => setTimeout(r));
fake.auth.currentUser = person;
eq(await reopen(async () => { throw new ApiError(401, "No active staff record for this account."); }), null, "a refusal is believed");
eq([fake.signedOut, fake.auth.currentUser, shelf.has("fidato-last-session")], [1, null, false], "and ends the session on this phone");

await endSession();
eq(fake.signedOut, 1, "nobody to sign out: Firebase is not asked");

/* ── The words ──────────────────────────────────────────────────── */
const NO_MATCH = "That email and password do not match.";
for (const code of ["auth/wrong-password", "auth/user-not-found", "auth/invalid-credential", "auth/too-many-requests"]) {
  eq(signInRefusal(Object.assign(new Error("x"), { code })), NO_MATCH, `the web's one sentence for ${code}`);
}
for (const code of ["auth/invalid-api-key", "auth/api-key-not-valid.-please-pass-a-valid-api-key.", "auth/configuration-not-found", "auth/operation-not-allowed"]) {
  eq(signInRefusal(Object.assign(new Error("x"), { code })), `Signing in is not set up correctly in this build: Firebase did not accept its settings (${code}). The owner checks the sign-in settings.`, `${code} is the settings, not a wrong password`);
}
eq(signInRefusal(expired), "Could not reach the server. Check the connection and try again.", "no line is not a wrong password");
eq(signInRefusal(new ApiError(401, "No active staff record for this account.")), "No active staff record for this account.", "the API's own words");
eq(keptNotice(0), null, "nothing kept, nothing said");
eq(keptNotice(1), "1 change is kept on this device and will be sent when you sign in here again.", "one held");
eq(keptNotice(3), "3 changes are kept on this device and will be sent when you sign in here again.", "several held");

console.log("signin ok");
