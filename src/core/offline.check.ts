/* Run: node --experimental-strip-types mobile/src/core/offline.check.ts
   The offline tiers housekeeping relies on, and the drain's order rules. */
import { drain, isOnline, newKey, noteReachable, ruleFor, type OutboxEntry } from "./offline.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const tier = (method: string, path: string, body?: string) => ruleFor(`/api/hotels/5EL${path}`, method, body).tier;

/* ── Tiers (M-5's writes) ─────────────────────────────────────── */
eq(tier("PUT", "/rooms/204/housekeeping"), "queue", "mark a room");
eq(tier("PUT", "/housekeeping/assignments/204"), "queue", "give a room");
eq(tier("DELETE", "/housekeeping/assignments/204"), "queue", "take a room off the sheet");
eq(tier("POST", "/work-orders"), "queue", "report a repair");
eq(tier("POST", "/rooms/204/block"), "refuse", "take out of service");
eq(tier("DELETE", "/rooms/204/block/abc"), "refuse", "put back");
eq(tier("POST", "/repair-costs"), "refuse", "a repair cost");
eq(tier("POST", "/stays/x/payments"), "refuse", "a payment");
eq(tier("POST", "/till/orders/x/settle", JSON.stringify({ method: "room" })), "queue-warn", "a room charge");
eq(tier("POST", "/till/orders/x/settle", JSON.stringify({ method: "cash" })), "refuse", "a cash bill");
eq(ruleFor("/api/hotels/5EL/rooms/204/block", "POST").reason?.startsWith("This cannot be done offline yet."), true, "the refusal's words");

/* ── The drain ────────────────────────────────────────────────── */
let n = 0;
const entry = (subject: string, path: string): OutboxEntry => ({
  id: `e${++n}`, label: "Housekeeping", path, method: "PUT", idempotencyKey: newKey(),
  hotelId: "5EL", subject, queuedAt: n, attempts: 0, status: "waiting",
});
const memory = (entries: OutboxEntry[]) => ({
  entries,
  list: async () => [...entries].sort((a, b) => a.queuedAt - b.queuedAt),
  remove: async (id: string) => { entries.splice(entries.findIndex((e) => e.id === id), 1); },
  update: async (e: OutboxEntry) => { entries[entries.findIndex((x) => x.id === e.id)] = e; },
});
const answer = (status: number, body: object = {}) => new Response(JSON.stringify(body), { status });

// Oldest first; a refusal is kept with the server's words and the drain goes on; another person's waits.
{
  const store = memory([entry("hk", "/a"), entry("desk", "/b"), entry("hk", "/c"), entry("hk", "/d")]);
  const seen: string[] = [];
  const r = await drain(store, async (e) => {
    seen.push(e.path);
    return e.path === "/c" ? answer(409, { reason: "Room 204 needs cleaning first." }) : answer(200);
  }, "hk");
  eq(seen, ["/a", "/c", "/d"], "sent oldest first, skipping another person's");
  eq(r, { sent: 2, rejected: 1, heldForOthers: 1, stopped: false }, "drain result");
  eq(store.entries.map((e) => [e.path, e.status, e.error ?? null]),
    [["/b", "waiting", null], ["/c", "rejected", "Room 204 needs cleaning first."]], "what stays");
}

// A network failure stops the drain and keeps everything behind it, in order.
{
  const store = memory([entry("hk", "/a"), entry("hk", "/b"), entry("hk", "/c")]);
  const r = await drain(store, async (e) => {
    if (e.path === "/b") throw new TypeError("Network request failed");
    return answer(200);
  }, "hk");
  eq([r.sent, r.stopped, isOnline()], [1, true, false], "stops on the network");
  eq(store.entries.map((e) => e.path), ["/b", "/c"], "the rest kept in order");
  noteReachable();
}

// A 5xx stops too: the server is there and broken, nothing is settled.
{
  const store = memory([entry("hk", "/a"), entry("hk", "/b")]);
  const r = await drain(store, async () => answer(500), "hk");
  eq([r.sent, r.rejected, r.stopped, store.entries.length], [0, 0, true, 2], "stops on a 5xx");
}

/* ── The key: a v4 UUID (the API keeps it in a uuid column) ──── */
const shape = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const saved = globalThis.crypto;
Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
const keys = Array.from({ length: 2000 }, newKey); // the phone's way, without crypto
Object.defineProperty(globalThis, "crypto", { value: saved, configurable: true });
eq(keys.every((k) => shape.test(k)), true, "every key is a v4 UUID");
eq(new Set(keys).size, keys.length, "no two keys alike");

console.log("offline: all checks pass");
