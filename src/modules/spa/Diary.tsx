import { CalendarDays, Plus, Settings2 } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { Btn, body, Empty, Loading, NotYours, Stale, Toast, type Said } from "../guest-services/kit";
import { LoadFailed, StatePill } from "../laundry/kit";
import { Book, Cancel, Charge } from "./Acts";
import { isRefused, readDiary } from "./data";
import {
  actsOf, bandWords, clockTime, countLine, rupees, shiftDay, UNPRICED_LINE,
  type SpaAppointment, type SpaDiaryTherapist,
} from "./diary";
import { ON_THE_WEBSITE, whyNotBook, whyNotRead, whyNotSetUp } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   THE SPA DIARY on a phone — the web's /h/:code/spa
   (src/modules/spa/pages/SpaDiary.tsx; picture pms-shots/new/n-h-spa).
   WHO IS FREE AT FOUR: the therapist is the band, the day's treatments sit
   under it, and a therapist with nothing booked is drawn "Free all day",
   never dropped. One day at a time: the first read asks for no date, so the
   diary opens on the PROPERTY's business date, which the server knows.

   A row's acts are its SERVER's facts (diary.ts actsOf): Cancel and Charge
   to room while it is booked, never Charge to room while it is unpriced
   (the web leaves it out, and the row says why). A role the API refuses
   sees them GREY with the API's sentence (roles.ts; AGENTS rule 1), where
   the web leaves them out. Treatments and therapists is desk set-up and
   stays on the website: its button is here, grey, with the reason.
   ══════════════════════════════════════════════════════════════════ */

export function Diary({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const refusedRead = whyNotRead(role);
  const mayBook = whyNotBook(role);
  const setUp = whyNotSetUp(role) ?? ON_THE_WEBSITE;
  const [day, setDay] = useState<string | null>(null);
  const [pulled, setPulled] = useState(false);
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState<SpaAppointment | null>(null);
  const [charging, setCharging] = useState<SpaAppointment | null>(null);
  const [said, setSaid] = useState<Said | null>(null);

  const q = useRead(() => (refusedRead ? Promise.resolve(null) : readDiary(code, day)), ["spa", code, "diary", day ?? ""]);
  const off = isRefused(q.data) ? q.data.refused : null;
  const d = q.data && !isRefused(q.data) ? q.data : null;
  const done = (s: Said) => { setBooking(false); setCancelling(null); setCharging(null); setSaid(s); };

  /* The read refused (the spa switched off, or the role): the server's one
     sentence, with no buttons above it that cannot work. */
  if (refusedRead || off) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title="Spa diary" />
        <NotYours title="Spa" sentence={refusedRead ?? off!} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Spa diary" {...(d ? { under: countLine(d) } : {})} />

        <View style={{ gap: 4, marginTop: -4 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Btn label="Treatments and therapists" icon={Settings2} disabled onPress={() => undefined} />
            <Btn label="Book a treatment" variant="primary" icon={Plus} disabled={mayBook != null || !d} onPress={() => setBooking(true)} />
          </View>
          <Text style={[t.caption, { color: c.grey600 }]}>Treatments and therapists: {setUp}</Text>
          {mayBook ? <Text style={[t.caption, { color: c.grey600 }]}>{mayBook}</Text> : null}
        </View>

        {d === null ? (
          q.error
            ? (
              <LoadFailed
                title="The spa diary did not load" error={q.error} onRetry={q.reload}
                offline="This device is offline, so the spa diary cannot load. It loads by itself as soon as the connection is back."
              />
            )
            : <Loading words="Reading the spa diary…" />
        ) : (
          <>
            <Stale error={q.error} />
            {/* One chart card: its toolbar moves the day; each therapist a band on grey-50, the treatments under it. */}
            <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden", marginTop: 8 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: space.cardX, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
                {/* "Today" is the PROPERTY's operating day, which the server sent. */}
                <Btn label="← Day before" a11y="Day before" onPress={() => setDay(shiftDay(d.from, -1))} />
                <Btn label="Today" icon={CalendarDays} onPress={() => setDay(d.businessDate)} />
                <Btn label="Day after →" a11y="Day after" onPress={() => setDay(shiftDay(d.from, 1))} />
              </View>
              {d.therapists.length === 0 ? (
                <View style={{ paddingBottom: 24, alignItems: "center", gap: 4 }}>
                  <Empty
                    compact title="No therapists yet"
                    description={"A booking is against a person, not a room, so the diary has nothing to draw until somebody "
                      + "enters who gives the treatments. Nothing is created for you."}
                  />
                  <Btn label="Add a therapist" disabled onPress={() => undefined} />
                  <Text style={[t.caption, { color: c.grey600, paddingHorizontal: 24, textAlign: "center" }]}>{setUp}</Text>
                </View>
              ) : (
                d.therapists.map((th, i) => (
                  <TherapistDay
                    key={th.id} therapist={th} last={i === d.therapists.length - 1} refused={mayBook}
                    onCancel={setCancelling} onCharge={setCharging}
                  />
                ))
              )}
            </View>
          </>
        )}
      </Screen>

      {booking && d ? <Book code={code} day={d.from} onClose={() => setBooking(false)} onDone={done} /> : null}
      {cancelling ? <Cancel code={code} appointment={cancelling} onClose={() => setCancelling(null)} onDone={done} /> : null}
      {charging ? <Charge code={code} appointment={charging} onClose={() => setCharging(null)} onDone={done} /> : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

function TherapistDay({ therapist, last, refused, onCancel, onCharge }: {
  therapist: SpaDiaryTherapist; last: boolean; refused: string | null;
  onCancel: (a: SpaAppointment) => void; onCharge: (a: SpaAppointment) => void;
}) {
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: c.grey200 }}>
      <View style={{
        flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 8, rowGap: 2,
        paddingHorizontal: space.cardX, paddingVertical: 10, backgroundColor: c.grey50, borderBottomWidth: 1, borderBottomColor: c.grey200,
      }}>
        <Text style={[body, { color: c.ink900, ...face[600] }]}>{therapist.name}</Text>
        <Text style={t.caption}>{bandWords(therapist)}</Text>
      </View>

      {therapist.appointments.length === 0 ? (
        <View style={{ minHeight: 56, justifyContent: "center", paddingHorizontal: space.cardX, paddingVertical: 12 }}>
          <Text style={[body, { color: c.grey500 }]}>Free all day.</Text>
        </View>
      ) : (
        therapist.appointments.map((a, i) => {
          const acts = actsOf(a);
          return (
            <View key={a.id} style={{ paddingHorizontal: space.cardX, paddingVertical: 12, minHeight: 56, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
              {/* The hour first and the amount level at the right, the way a diary is read down the day. */}
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <Text style={[body, t.tab, { color: c.ink900, ...face[600], flexShrink: 1 }]}>{clockTime(a.startsAt)} → {clockTime(a.endsAt)}</Text>
                <Text style={[body, t.tab, a.amount === null ? { color: c.grey500 } : { color: c.ink900 }]}>{rupees(a.amount)}</Text>
              </View>
              <Text style={[body, { color: c.ink900, marginTop: 2 }]}>{a.treatment ?? "-"}</Text>
              {/* A guest with no room assigned yet: no room, never a blank that reads as "no room needed". */}
              <Text style={[body, { color: c.grey500, marginTop: 2 }]}>{a.guestName ?? "-"}{a.room ? ` · Room ${a.room}` : ""}</Text>

              {acts.pill || acts.unpriced || acts.cancel ? (
                <View style={{ marginTop: 8, gap: 8 }}>
                  {acts.pill ? <StatePill tone={acts.pill.tone}>{acts.pill.label}</StatePill> : null}
                  {acts.unpriced ? <Text style={[t.caption, { lineHeight: 17 }]}>{UNPRICED_LINE}</Text> : null}
                  {acts.cancel ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
                      <Btn label="Cancel" a11y={`Cancel ${a.treatment ?? "the treatment"} at ${clockTime(a.startsAt)}`} disabled={refused != null} onPress={() => onCancel(a)} />
                      {acts.charge ? (
                        <Btn label="Charge to room" a11y={`Charge ${a.treatment ?? "the treatment"} at ${clockTime(a.startsAt)} to the room`} disabled={refused != null} onPress={() => onCharge(a)} />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}
