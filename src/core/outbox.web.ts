import { newKey, type OutboxEntry } from "./offline";

/* THE WEB PREVIEW'S HELD CHANGES (Metro picks this file for web only).
   expo-sqlite on the web needs WebAssembly and special server headers;
   the preview is for looking at screens, so it keeps the same queue in
   localStorage. The phone's real store is outbox.ts. */

export const NO_STORE =
  "This browser will not keep a queue - a private window, or site data "
  + "turned off. Work done here cannot be held until the line is back.";

const KEY = "fidato-outbox";
const read = (): OutboxEntry[] => JSON.parse(localStorage.getItem(KEY) ?? "[]") as OutboxEntry[];
const write = (all: OutboxEntry[]) => { localStorage.setItem(KEY, JSON.stringify(all)); notify(); };

export async function enqueue(entry: Omit<OutboxEntry, "id" | "queuedAt" | "attempts" | "status">): Promise<OutboxEntry> {
  const full: OutboxEntry = { ...entry, id: newKey(), queuedAt: Date.now(), attempts: 0, status: "waiting" };
  write([...read(), full]);
  return full;
}
export async function list(): Promise<OutboxEntry[]> {
  return read().sort((a, b) => a.queuedAt - b.queuedAt);
}
export async function remove(id: string): Promise<void> {
  write(read().filter((e) => e.id !== id));
}
export async function update(entry: OutboxEntry): Promise<void> {
  write(read().map((e) => (e.id === entry.id ? entry : e)));
}

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
