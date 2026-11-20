import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { outcomeUnknown } from "../../core/api";
import { c, face, t } from "../../core/theme";
import { Head, Screen, Stopped, notKnown, useRead, useScreenStop } from "../../core/ui";
import { Failed, Loading, Refused, Stale, Toast, body, type Said } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import type { Readout } from "./msgData";
import { refusedPage, refusedWrite, stopName, type PageKey } from "./msgRules";

/* ══════════════════════════════════════════════════════════════════
   THE PIECES THE FOUR PAGES SHARE (lane m13-set-messages): the page with
   its four states (loading · failed or offline · refused · the page), the
   page's write with its stop in the core's book (src/core/stop.ts
   useScreenStop, MEMORY 16, 22), the yellow "Nothing is sent yet" card, the grey
   "Last changed by" line. Built on the admin kit (src/modules/admin/kit.tsx).
   ══════════════════════════════════════════════════════════════════ */

/** The page's write: one at a time for the whole page (none of its routes reads a key), and none
    after an unknown outcome until a read that BEGAN after it (5 s after, when nothing came back) has
    come back good. The core's stop book keeps it by hotel and page ("settings/<code>/<page>"), so
    leaving and coming back keeps it. `watch` wraps the page's read: the read that lets it go. */
export function usePageWrite(code: string, page: PageKey) {
  const stop = useScreenStop(stopName(code, page));
  async function run<T>(fn: () => Promise<T>, on: { ok: (r: T) => void; no: (e: unknown) => void; unknown: (e: unknown) => void }) {
    /* The latch at the tap (MEMORY 8): the book answers at once, before any state reaches the button. */
    if (stop.isStuck()) return;
    let r: T;
    try {
      r = await stop.guard(fn);
    } catch (e) {
      if (outcomeUnknown(e)) on.unknown(e); else on.no(e);
      return;
    }
    on.ok(r);
  }
  /* `busy`: on its way; `stuck`: lost, not known (the Stopped line). Either greys the page's writes. */
  return { busy: stop.stuck && !stop.unknown, stuck: stop.unknown, run, watch: stop.watch };
}

/** The unknown outcome's toast: what was not known, where to look (core ui.tsx notKnown). */
export const unknownSaid = (done: string, where: string, e: unknown): Said => ({ ...notKnown(done, where, e), tone: "bad" });

/** One of the four pages: the console's door (RequireAccess), the read with its states, the page. */
export function MsgPage<T>({ props, page, title, under, what, read, said, onSaid, action, children }: {
  props: AdminProps; page: PageKey; title: string; under: string; what: string;
  read: ReturnType<typeof useRead<Readout<T> | null>>;
  said: Said | null; onSaid: () => void; action?: (data: T) => ReactNode;
  children: (data: T, writeRefused: string | null) => ReactNode;
}) {
  const [pulled, setPulled] = useState(false);
  const refused = refusedPage(props.role, page);
  const writeRefused = refusedWrite(props.role, page);
  const data = read.data && "ok" in read.data ? read.data.ok : undefined;
  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && read.loading} onRefresh={() => { setPulled(true); read.reload(); }}>
        <Head eyebrow={props.hotel.name} title={title} under={under} action={data !== undefined && action ? action(data) : undefined} />
        {refused ? <Refused sentence={refused} />
          : read.data === undefined ? (read.error ? <Failed error={read.error} onRetry={read.reload} /> : <Loading what={what} />)
            : read.data === null ? null
              : "refused" in read.data ? <Refused title="Not open to you here" sentence={read.data.refused} />
                : (
                  <>
                    <Stale error={read.error} />
                    {writeRefused ? <Text style={[body, { color: c.grey600 }]}>{writeRefused}</Text> : null}
                    {children(read.data.ok, writeRefused)}
                  </>
                )}
      </Screen>
      <Toast said={said} onClose={onSaid} />
    </View>
  );
}

/** The sender is not connected: the web's yellow card, in its words. */
export function NotSent({ sentence }: { sentence: string | null }) {
  if (!sentence) return null;
  return (
    <View style={{ backgroundColor: c.yellow50, borderColor: c.yellow100, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 }} accessibilityRole="alert">
      <Text style={[body, { color: c.ink900 }]}><Text style={face[600]}>Nothing is sent yet</Text>{" - "}{sentence}</Text>
    </View>
  );
}

/** "Last changed by …", the web's text-xs grey-500 line; nothing when nobody has. */
export const ChangedBy = ({ who }: { who: string | null }) =>
  who ? <Text style={[t.caption, { lineHeight: 17 }]}>Last changed by {who}</Text> : null;

/** The stop's card while the page's writes are grey: why, and the read that lets it go. */
export const StuckLine = ({ stuck, where, onRead }: { stuck: boolean; where: string; onRead: () => void }) =>
  stuck ? <Stopped line={notKnown("saved", where).line} onRead={onRead} /> : null;
