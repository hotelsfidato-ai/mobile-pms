import * as SQLite from "expo-sqlite";
import { newKey, type OutboxEntry } from "./offline";

/* ══════════════════════════════════════════════════════════════════
   THE HELD CHANGES, ON THE PHONE — the web's src/lib/outbox.ts, on
   expo-sqlite (M-4) instead of IndexedDB: it survives the app being
   closed, the phone locking and a crash. Oldest first, always: the
   drain depends on it. The web preview uses outbox.web.ts instead.
   ══════════════════════════════════════════════════════════════════ */

/** Said only while offline, when nothing can be held. */
export const NO_STORE =
  "This phone could not open its store for held changes. Work done here "
  + "cannot be held until the line is back; close and open the app.";

let opened: Promise<SQLite.SQLiteDatabase> | null = null;
function db() {
  opened ??= SQLite.openDatabaseAsync("fidato-outbox.db")
    .then(async (d) => {
      await d.execAsync(
        "create table if not exists mutations (id text primary key, queued_at integer not null, entry text not null)",
      );
      return d;
    })
    .catch((e: unknown) => { opened = null; throw e; });
  return opened;
}

/** Holds a change. The key comes from the tap (M-5), never minted here. */
export async function enqueue(entry: Omit<OutboxEntry, "id" | "queuedAt" | "attempts" | "status">): Promise<OutboxEntry> {
  const full: OutboxEntry = { ...entry, id: newKey(), queuedAt: Date.now(), attempts: 0, status: "waiting" };
  await (await db()).runAsync("insert into mutations (id, queued_at, entry) values (?, ?, ?)", full.id, full.queuedAt, JSON.stringify(full));
  notify();
  return full;
}

export async function list(): Promise<OutboxEntry[]> {
  const rows = await (await db()).getAllAsync<{ entry: string }>("select entry from mutations order by queued_at, rowid");
  return rows.map((r) => JSON.parse(r.entry) as OutboxEntry);
}

export async function remove(id: string): Promise<void> {
  await (await db()).runAsync("delete from mutations where id = ?", id);
  notify();
}

export async function update(entry: OutboxEntry): Promise<void> {
  await (await db()).runAsync("update mutations set entry = ? where id = ?", JSON.stringify(entry), entry.id);
  notify();
}

/* Screens hear of a change without polling. */
const listeners = new Set<() => void>();
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
function notify() {
  for (const fn of listeners) {
    try { fn(); } catch { /* one listener must not stop the rest */ }
  }
}
