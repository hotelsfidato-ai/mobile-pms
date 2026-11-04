import { useQueryClient } from "@tanstack/react-query";
import { Network } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import { ApiError, outcomeUnknown, type Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { Pill } from "../front-desk/kit";
import { Box, Btn, Failed, Loading, NotYours, Refused, Stale, Toast, body, type Said } from "../guest-services/kit";
import { Fact } from "../laundry/kit";
import {
  connectionOf, failedWords, noteOf, outcomeOf, stayLines, stayOf, toldOf, type CrsBooking, type CrsConnection,
} from "./bookings";
import { listCrsBookings, markNoteDone } from "./data";
import { maySetUp, whyNotDone, whyNotRead } from "./roles";
import { Setup } from "./Setup";

/* ══════════════════════════════════════════════════════════════════
   CRS BOOKINGS on a phone — the web's /h/:code/crs-bookings (the PMS's
   src/modules/crs/pages/CrsBookings.tsx 198-312; picture pms-shots/new/
   n-h-crs-bookings, as dev-gm). Every booking the CRS sold for this hotel
   that the reader acted on: the waiting booking it became, or why it did
   not become one; what the CRS's register was told; and a change made in
   the CRS afterwards, as a note with Done.

   THE WEB'S ONLY ACT ON A BOOKING HERE IS DONE. It accepts, declines and
   opens nothing: a waiting booking is confirmed where every booking is (the
   front desk), and the web draws each booking it became as words, not a
   link. The phone does the same (MODULE.md, "Left out"). The owner and an
   administrator also get the connection card (Setup.tsx), as on the web.

   At phone width the web's DataTable is one card per row: the first
   column its heading, every other column a labelled line (DataTable.tsx
   111-222), the columns hidden on a narrow table included.
   ══════════════════════════════════════════════════════════════════ */

export function CrsBookingsScreen({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotRead(role);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  /* One function, so a re-read does not restart the toast's clock. */
  const unsay = useCallback(() => setSaid(null), []);

  const list = useRead(() => (refused ? Promise.resolve(null) : listCrsBookings(code)), ["crs", code]);
  const refresh = () => void cache.invalidateQueries({ queryKey: ["crs", code] });

  /* The web's done.isPending: one Done on its way greys every Done (CrsBookings.tsx 271);
     the latch holds it at the tap, before the state reaches the buttons (MEMORY 8). */
  const latch = useRef(false);
  const [busy, setBusy] = useState(false);
  async function done(crsId: string) {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    try {
      await markNoteDone(code, crsId);
    } catch (e) {
      /* The server's sentence (a 409: already done); offline, the web's refusal; nothing back, not known. */
      const words = failedWords("done", e instanceof Error ? e : null, outcomeUnknown(e), e instanceof ApiError);
      setSaid({ ...words, tone: "bad" });
    } finally {
      latch.current = false;
      setBusy(false);
      /* Read again either way: a reply lost after the server marked it shows it done. */
      refresh();
    }
  }

  const rows = list.data?.bookings ?? [];
  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && list.loading} onRefresh={() => { setPulled(true); list.reload(); }}>
        <Head title="CRS bookings" under="Bookings the CRS sold for this hotel, and what became of each" />

        {refused ? <NotYours title="CRS bookings" sentence={refused} /> : (
          <>
            {maySetUp(role) ? <Setup code={code} onSaid={setSaid} /> : null}
            {list.data ? <Connection c={list.data.connection} /> : null}
            {list.data === undefined || list.data === null
              ? (list.error ? <Failed title="CRS bookings did not load" error={list.error} onRetry={list.reload} />
                : list.data === undefined ? <Loading words="Reading the CRS bookings…" /> : null)
              : (
                <>
                  <Stale error={list.error} />
                  {rows.length === 0 ? <NoneYet /> : (
                    <Box style={{ overflow: "hidden" }}>
                      {rows.map((b, i) => (
                        <Row key={b.crsId} b={b} last={i === rows.length - 1} role={role} busy={busy} onDone={(id) => void done(id)} />
                      ))}
                    </Box>
                  )}
                </>
              )}
          </>
        )}
      </Screen>
      <Toast said={said} onClose={unsay} />
    </View>
  );
}

/** Connection (55-75): the yellow card when nothing is read, else the last read in grey, else nothing. */
function Connection({ c: conn }: { c: CrsConnection }) {
  const line = connectionOf(conn);
  if (!line) return null;
  if (!line.warn) return <Text style={[body, { color: c.grey600, marginBottom: 8 }]}>{line.text}</Text>;
  return (
    <View style={{
      backgroundColor: c.yellow50, borderColor: c.yellow100, borderWidth: 1, borderRadius: 12,
      paddingHorizontal: space.cardX, paddingVertical: space.cardY, marginBottom: 8,
    }}>
      {/* text-sm text-ink-900 leading-relaxed */}
      <Text style={[t.label, { color: c.ink900, lineHeight: 23 }]}>{line.text}</Text>
    </View>
  );
}

/** The web's EmptyState (States.tsx 22-43, not compact) with its Network icon, in a card. */
function NoneYet() {
  return (
    <Box>
      <View style={{ alignItems: "center", paddingVertical: 64, paddingHorizontal: 24 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Network size={20} color={c.grey400} />
        </View>
        <Text style={[t.heading, { textAlign: "center" }]}>No CRS booking has arrived yet</Text>
        <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 23 }]}>
          A booking a salesperson makes in the CRS for this hotel arrives here within five minutes as a waiting booking,
          with the room held, for the hotel to confirm.
        </Text>
      </View>
    </Box>
  );
}

const small = { fontSize: 12, lineHeight: 17, color: c.grey600, ...face[500] } as const;

/** One CRS booking: the web's columns in its order (214-280), as the phone card. */
function Row({ b, last, role, busy, onDone }: {
  b: CrsBooking; last: boolean; role: string | null; busy: boolean; onDone: (crsId: string) => void;
}) {
  const here = outcomeOf(b.outcome);
  const told = toldOf(b);
  const note = noteOf(b);
  const refusedDone = whyNotDone(role);
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.grey100 }}>
      {/* CRS booking: its number, the guest under it */}
      <Text style={[body, t.tab, { color: c.ink900 }]}>{b.crsReference}</Text>
      <Text style={small}>{b.guestName ?? "-"}</Text>

      <View style={{ marginTop: 6, gap: 4 }}>
        <Fact label="Stay">{stayOf(b)}</Fact>
        <Fact label="Sold by">
          <Text style={[body, { color: c.ink900 }]}>{b.salesperson ?? "-"}</Text>
          <Text style={small}>{b.company ?? "-"}</Text>
        </Fact>
        <Fact label="Here">
          <View style={{ gap: 4 }}>
            <View style={{ alignSelf: "flex-start" }}><Pill tone={here.tone}>{here.words}</Pill></View>
            {stayLines(b).map((line, i) => <Text key={b.bookings[i]!.id} style={[small, t.tab]}>{line}</Text>)}
            {b.reason ? <Text style={small}>{b.reason}</Text> : null}
          </View>
        </Fact>
        <Fact label="The CRS register">
          <Text style={[body, { color: told.bad ? c.red : c.ink900 }]}>{told.text}</Text>
        </Fact>
        <Fact label="Changed in the CRS">
          {note.kind === "none" ? <Text style={[body, { color: c.ink900 }]}>-</Text> : (
            <View style={{ gap: 6 }}>
              <Text style={[body, { color: note.kind === "done" ? c.grey500 : c.ink900 }]}>{note.note}</Text>
              {note.kind === "done" ? <Text style={[small, { color: c.grey500 }]}>Done</Text>
                : refusedDone ? <Refused label="Done" reason={refusedDone} />
                : (
                  <Btn
                    label="Done" a11y={`Done: the change to ${b.crsReference} is dealt with`} disabled={busy}
                    onPress={() => onDone(b.crsId)} style={{ alignSelf: "flex-start" }}
                  />
                )}
            </View>
          )}
        </Fact>
      </View>
    </View>
  );
}
