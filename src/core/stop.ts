/* ══════════════════════════════════════════════════════════════════
   A SCREEN'S STOP WHILE A WRITE'S OUTCOME IS NOT KNOWN (MEMORY 16; m13-stops, 20 Nov).
   On a route that reads no idempotency key, a write whose reply was lost
   (or that met a 5xx) may or may not have been made, and a repeat is a
   second real write. The stop used to live inside the sheet that sent it,
   so closing and reopening the sheet let the person send it again. Here it
   is kept by NAME (the hotel and the record the screen reads, e.g.
   "stores/5EL"), outside every sheet and screen, so a reopen or even
   leaving the screen and coming back lets nothing go.

   It is let go only by a read of that record that BEGAN after the loss and
   came back good: then the screen shows whether it was made. A read already
   on its way at the loss, a read that failed, or one from before, lets
   nothing go. One counter orders every loss and every read's start, so two
   moments in the same millisecond are never confused.
   WHILE A WRITE IS ON ITS WAY the name is stopped too (`sending`): closing
   the sheet and reopening it before the first fails must not send a second.
   Pure: stop.check.ts runs it under node. ui.tsx's useScreenStop uses it.
   ══════════════════════════════════════════════════════════════════ */

export interface StopBook {
  /** A write under `name` was lost: everything under it stops. */
  lost(name: string): void;
  /** A write under `name` is on its way: stopped until the returned `done` is called (once). */
  sending(name: string): () => void;
  /** A read is beginning: its place in the order. */
  begin(): number;
  /** The read that began at `ticket` came back good: a loss before it is let go. */
  good(name: string, ticket: number): void;
  /** True while stopped. */
  stuck(name: string): boolean;
  /** Told after every change (for React's useSyncExternalStore). */
  subscribe(tell: () => void): () => void;
}

export function stopBook(): StopBook {
  let n = 0;
  const lostAt = new Map<string, number>();
  const going = new Map<string, number>();
  const told = new Set<() => void>();
  const tell = () => { for (const f of told) f(); };
  return {
    lost(name) { lostAt.set(name, ++n); tell(); },
    sending(name) {
      going.set(name, (going.get(name) ?? 0) + 1); tell();
      let open = true;
      return () => {
        if (!open) return;
        open = false;
        const left = (going.get(name) ?? 1) - 1;
        if (left > 0) going.set(name, left); else going.delete(name);
        tell();
      };
    },
    begin: () => ++n,
    good(name, ticket) {
      const at = lostAt.get(name);
      if (at !== undefined && ticket > at) { lostAt.delete(name); tell(); }
    },
    stuck: (name) => lostAt.has(name) || going.has(name),
    subscribe(f) { told.add(f); return () => { told.delete(f); }; },
  };
}

/** The app's one book: every screen's stop, by name. */
export const stops = stopBook();
