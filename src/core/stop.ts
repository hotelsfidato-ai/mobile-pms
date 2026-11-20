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
   A SERVER STILL COMMITTING (the review of 20 Nov): when nothing came back
   (0, or send()'s own 503 for a route refused offline) or a gateway gave up
   (502, 504), the request may still be running on the server - the phone's
   fetch gives up long before the database's statement timeout. A read begun
   at once could show the record without it, and then it lands. So such a
   loss is let go only by a read that began SETTLE_MS after it (`settleMs`).
   Pure: stop.check.ts runs it under node, `watched` (the read wrapper)
   included. ui.tsx's useScreenStop uses it.
   ══════════════════════════════════════════════════════════════════ */

/** A read's place: its turn in the one order, and when it began. */
export interface Ticket { readonly n: number; readonly at: number }

/** How long a read must wait after a loss before it can let it go. */
export const SETTLE_MS = 5_000;
/** The wait for a loss with this answer: nothing came back (0, or send()'s 503 when a route refused
    offline lost its request) or a gateway gave up (502, 504) - the server may still be committing. */
export const settleMs = (status: number) => ([0, 502, 503, 504].includes(status) ? SETTLE_MS : 0);

export interface StopBook {
  /** A write under `name` was lost: everything under it stops; a read must begin `wait` ms later to let it go. */
  lost(name: string, wait?: number): void;
  /** A write under `name` is on its way: stopped until the returned `done` is called (once). */
  sending(name: string): () => void;
  /** A read is beginning: its place in the order. */
  begin(): Ticket;
  /** The read that began at `ticket` came back good: a loss before it (and its wait) is let go. */
  good(name: string, ticket: Ticket): void;
  /** True while stopped: lost, or a write on its way. */
  stuck(name: string): boolean;
  /** True only while lost (not merely on its way): what a screen's "not known" line says. */
  unknown(name: string): boolean;
  /** Told after every change (for React's useSyncExternalStore). */
  subscribe(tell: () => void): () => void;
}

export function stopBook(opts: { now?: () => number } = {}): StopBook {
  const now = opts.now ?? Date.now;
  let n = 0;
  const lostAt = new Map<string, { n: number; notBefore: number }>();
  const going = new Map<string, number>();
  const told = new Set<() => void>();
  const tell = () => { for (const f of told) f(); };
  return {
    lost(name, wait = 0) { lostAt.set(name, { n: ++n, notBefore: now() + wait }); tell(); },
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
    begin: () => ({ n: ++n, at: now() }),
    good(name, ticket) {
      const at = lostAt.get(name);
      if (at !== undefined && ticket.n > at.n && ticket.at >= at.notBefore) { lostAt.delete(name); tell(); }
    },
    stuck: (name) => lostAt.has(name) || going.has(name),
    unknown: (name) => lostAt.has(name),
    subscribe(f) { told.add(f); return () => { told.delete(f); }; },
  };
}

/** A screen's read, wrapped: a read that came back good lets its loss go - unless react-query cancelled
    it (a newer read replaced it; its answer is thrown away), which lets nothing go. */
export function watched<T>(book: StopBook, name: string, read: (ctx?: { signal?: AbortSignal }) => Promise<T>) {
  return async (ctx?: { signal?: AbortSignal }): Promise<T> => {
    const ticket = book.begin();
    const got = await read(ctx);
    if (!ctx?.signal?.aborted) book.good(name, ticket);
    return got;
  };
}

/** The app's one book: every screen's stop, by name. */
export const stops = stopBook();
