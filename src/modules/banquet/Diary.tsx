import { router } from "expo-router";
import { CalendarDays, ChevronRight, Clock, Plus, Settings2, Users } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { Pill } from "../finance/Kit";
import { Back, Box, Btn, body, Empty, Loading, Stale, Toast, type Said } from "../guest-services/kit";
import { LoadFailed } from "../laundry/kit";
import { isRefused, readDiary } from "./data";
import { NotAvailable } from "./kit";
import { Register } from "./Register";
import { ON_THE_WEBSITE, whyNotBook, whyNotRead } from "./roles";
import {
  confirmedWords, fromToday, hallCount, rupees, shift, statusOf, whenLabel, type DiaryEvent, type DiaryHall, type Window,
} from "./rules";

/* ══════════════════════════════════════════════════════════════════
   THE DIARY on a phone — the web's /h/:code/banquet
   (src/modules/banquet/pages/Banquet.tsx; picture pms-shots/new/n-h-banquet).
   One question, asked of it more than any other: IS THE HALL FREE ON THE
   FOURTEENTH. So the hall is the row and its functions sit inside it; an
   EMPTY hall is drawn ("Free for the whole window."), never left out; an
   enquiry never shares a booking's colour; an unpriced function is a dash.
   The window moves 30 days a step (Earlier, From today, Later), as the web.
   Register a function opens the web's dialog (Register.tsx); Halls and
   packages is desk set-up and stays on the website (grey, with the reason).
   ══════════════════════════════════════════════════════════════════ */

export function Diary({ hotel, role, onBack }: { hotel: Hotel; role: string | null; onBack: () => void }) {
  const code = hotel.code;
  const refusedRead = whyNotRead(role);
  const mayBook = whyNotBook(role);
  const [win, setWin] = useState<Window | null>(null);
  const [registering, setRegistering] = useState(false);
  const [pulled, setPulled] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);

  const q = useRead(
    () => (refusedRead ? Promise.resolve(null) : readDiary(code, win)),
    ["banquet", code, "diary", win?.from ?? "", win?.to ?? ""],
  );
  const off = isRefused(q.data) ? q.data.refused : null;
  const d = q.data && !isRefused(q.data) ? q.data : null;

  /* The read refused (banquet switched off here, or the gate): the server's
     sentence and nothing that cannot work above it (BQ-3). */
  if (refusedRead || off) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title="Diary" action={<Back onPress={onBack} />} />
        <NotAvailable what="The diary" sentence={refusedRead ?? off!} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Diary" {...(d ? { under: confirmedWords(d) } : {})} action={<Back onPress={onBack} />} />

        {d === null ? (
          q.error
            ? (
              <LoadFailed
                title="The diary did not load" onRetry={q.reload}
                error={`${q.error} Try again, and tell the manager if it keeps happening.`}
                offline="The server could not be reached, and this device has no saved copy to show. Check the connection, then try again."
              />
            )
            : <Loading words="Reading the diary…" />
        ) : (
          <>
            <View style={{ gap: 4, marginTop: -4 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Btn label="Halls and packages" icon={Settings2} disabled onPress={() => undefined} />
                <Btn label="Register a function" variant="primary" icon={Plus} disabled={mayBook != null} onPress={() => setRegistering(true)} />
              </View>
              <Text style={[t.caption, { color: c.grey600 }]}>Halls and packages: {ON_THE_WEBSITE}</Text>
              {mayBook ? <Text style={[t.caption, { color: c.grey600 }]}>{mayBook}</Text> : null}
            </View>
            <Stale error={q.error} />

            {/* One chart card, the Calendar's way: its own toolbar moves the window; each hall a grey-50 row. */}
            <Box style={{ overflow: "hidden" }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: space.cardX, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
                <Btn label="← Earlier" onPress={() => setWin(shift(d, -30))} />
                <Btn label="From today" icon={CalendarDays} onPress={() => setWin(fromToday(d.businessDate))} />
                <Btn label="Later →" onPress={() => setWin(shift(d, 30))} />
              </View>

              {d.venues.length === 0 ? (
                <View style={{ alignItems: "center", paddingBottom: 24 }}>
                  <Empty
                    compact title="No halls yet"
                    description="A property with a banquet hall has somebody enter it, the same way rooms are entered. Nothing is created for you."
                  />
                  <Btn label="Add a hall" disabled onPress={() => undefined} />
                  <Text style={[t.caption, { color: c.grey600, marginTop: 4 }]}>Add a hall: {ON_THE_WEBSITE}</Text>
                </View>
              ) : (
                d.venues.map((v, i) => <HallRows key={v.id} v={v} last={i === d.venues.length - 1} open={(e) => router.push(`/banquet/${code}/${e.id}`)} />)
              )}
            </Box>
          </>
        )}
      </Screen>

      {registering ? (
        <Register
          code={code} businessDate={d?.businessDate ?? hotel.businessDate}
          onClose={() => setRegistering(false)}
          onHeld={(s) => { setRegistering(false); setSaid(s); }}
          onDone={(id, reference, warning) => {
            setRegistering(false);
            /* The end of the act is the function itself (the web's navigate), which says it was registered. */
            router.push(`/banquet/${code}/${id}?registered=${encodeURIComponent(reference)}${warning ? `&warning=${encodeURIComponent(warning)}` : ""}`);
          }}
        />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

/** A hall: its name and count on grey-50, then its functions, or "Free for the whole window." */
function HallRows({ v, last, open }: { v: DiaryHall; last: boolean; open: (e: DiaryEvent) => void }) {
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: c.grey200 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 8, rowGap: 2, paddingHorizontal: space.cardX, paddingVertical: 10, backgroundColor: c.grey50, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
        <Text style={[body, { color: c.ink900, ...face[600] }]} accessibilityRole="header">{v.name}</Text>
        <Text style={t.caption}>{hallCount(v)}</Text>
      </View>
      {v.events.length === 0 ? (
        <View style={{ minHeight: 56, justifyContent: "center", paddingHorizontal: space.cardX, paddingVertical: 12 }}>
          <Text style={[body, { color: c.grey500 }]}>Free for the whole window.</Text>
        </View>
      ) : (
        v.events.map((e, i) => <EventRow key={e.id} e={e} first={i === 0} onPress={() => open(e)} />)
      )}
    </View>
  );
}

/** A function is a row that opens it, so it ends in an arrow; its amount level at the right, a dash when unpriced. */
function EventRow({ e, first, onPress }: { e: DiaryEvent; first: boolean; onPress: () => void }) {
  const s = statusOf(e.status);
  return (
    <Pressable
      onPress={onPress} accessibilityRole="button" accessibilityLabel={`${e.title}, ${s.label}, ${e.reference}`}
      style={({ pressed }) => ({
        minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.cardX, paddingVertical: 12,
        borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100, backgroundColor: pressed ? c.grey50 : "transparent",
      })}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 4 }}>
          <Text style={[body, { color: c.ink900 }]}>{e.title}</Text>
          <Pill tone={s.tone} label={s.label} />
          <Text style={[t.caption, t.tab]}>{e.reference}</Text>
        </View>
        <View style={{ marginTop: 4, flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, maxWidth: "100%" }}>
            <View style={{ paddingTop: 3 }}><Clock size={14} color={c.grey400} /></View>
            <Text style={[body, { color: c.grey600, flexShrink: 1 }]}>{whenLabel(e.startsAt, e.endsAt)}</Text>
          </View>
          <Text style={[body, { color: c.grey600 }]}>{e.hostName}</Text>
          {e.pax !== null ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Users size={14} color={c.grey400} />
              <Text style={[body, t.tab, { color: c.grey600 }]}>{e.pax}</Text>
            </View>
          ) : null}
        </View>
        {e.registeredBy ? <Text style={[t.caption, { marginTop: 2 }]}>Registered by {e.registeredBy}</Text> : null}
      </View>
      {/* A DASH, never ₹0: nobody has priced this yet. */}
      <Text style={[body, t.tab, { color: e.agreedAmount === null ? c.grey500 : c.ink900 }]}>{rupees(e.agreedAmount)}</Text>
      <ChevronRight size={16} color={c.grey400} />
    </Pressable>
  );
}
