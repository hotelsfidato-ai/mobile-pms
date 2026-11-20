import { useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { outcomeUnknown } from "../../core/api";
import { c, face, t } from "../../core/theme";
import { Head, Screen, notKnown, useRead } from "../../core/ui";
import { Failed, Loading, Refused, Stale, Toast, body, type Said } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { stopKey, type Readout } from "./msgData";
import { refusedPage, refusedWrite, stops, type PageKey } from "./msgRules";

/* ══════════════════════════════════════════════════════════════════
   THE PIECES THE FOUR PAGES SHARE (lane m13-set-messages): the page with
   its four states (loading · failed or offline · refused · the page), the
   page's write with its stop kept outside React (msgRules `stops`,
   MEMORY 16, 22), the yellow "Nothing is sent yet" card, the grey
   "Last changed by" line. Built on the admin kit (src/modules/admin/kit.tsx).
   ══════════════════════════════════════════════════════════════════ */

/** The page's write: one at a time for the whole page (none of its routes reads a key), and none
    after an unknown outcome until a read that BEGAN after it has come back. Kept by hotel and page,
    so leaving and coming back keeps it; the page is drawn again whenever it changes. */
export function usePageWrite(code: string, page: PageKey) {
  const key = stopKey(code, page);
  const [, setTick] = useState(0);
  useEffect(() => stops.watch(() => setTick((n) => n + 1)), []);
  async function run<T>(fn: () => Promise<T>, on: { ok: (r: T) => void; no: (e: unknown) => void; unknown: (e: unknown) => void }) {
    /* The latch at the tap (MEMORY 8): the store answers at once, before any state reaches the button. */
    if (stops.flying(key) || stops.lost(key)) return;
    stops.begin(key);
    try {
      const r = await fn();
      stops.end(key);
      on.ok(r);
    } catch (e) {
      if (outcomeUnknown(e)) stops.lose(key);
      stops.end(key);
      if (outcomeUnknown(e)) on.unknown(e); else on.no(e);
    }
  }
  return { busy: stops.flying(key), stuck: stops.lost(key), run };
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

/** The stop's line under a page's controls, while its writes are grey. */
export const StuckLine = ({ stuck, where }: { stuck: boolean; where: string }) =>
  stuck ? <Text style={[t.caption, { color: c.red700, lineHeight: 17 }]} accessibilityRole="alert">{notKnown("saved", where).line}</Text> : null;
