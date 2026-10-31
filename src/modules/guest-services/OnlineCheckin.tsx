import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { confirmDetails, getDesk, handleRequest, setAsideDetails } from "./data";
import { Back, Box, Btn, Empty, Failed, Loading, NotYours, SectionHead, Stale, Toast, saidOf, type Said } from "./kit";
import { ON_THE_WEBSITE, whyNotDesk } from "./roles";
import {
  KIND_LABEL, dateShort, dateTime, detailLines, photoLine, type DeskView, type OpenRequest, type RoomCardRow, type WaitingDetails,
} from "./rules";

/* ══════════════════════════════════════════════════════════════════
   ONLINE CHECK-IN, THE DESK'S SIDE on a phone — the web's
   /h/:code/online-checkin (src/modules/online-checkin/pages/Desk.tsx;
   picture pms-shots/all/09-front-desk-online-check-in). What a guest's own
   page leaves for a person: details to check against the ID (only a
   clerk's Confirm reaches guest_documents, and so Form C), spa and laundry
   requests to mark, and the room cards.

   ON THE WEBSITE FOR NOW, shown grey with the reason:
   · printing a card: the phone has no QR library (the web's `qrcode`
     1.5.4), and a card is shown once and printing kills the old one, so
     the button must not go live until the QR can be drawn;
   · the ID photo: Show, Remove, and the kept photos (a question for the
     owner: should an ID's picture open on a phone at all?).
   The guest's own page stays on the web.
   ══════════════════════════════════════════════════════════════════ */

const CARD_NOTE = "One card per room. A guest scans it and a code goes to the phone on their booking. Printing a new card stops the old one at once.";
const REQUEST_NOTE = "Book them on the spa's or the laundry's own screen, then mark them done here.";

export function OnlineCheckin({ hotel, role, onBack }: { hotel: Hotel; role: string | null; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotDesk(role);
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const [pulled, setPulled] = useState(false);

  const desk = useRead(() => (refused ? Promise.resolve(null) : getDesk(code)), ["guest-services", code, "online-checkin"]);
  const data: DeskView | null | undefined = desk.data;

  async function run(write: () => Promise<unknown>, done?: Said) {
    setBusy(true);
    try {
      await write();
      if (done) setSaid(done);
      void cache.invalidateQueries({ queryKey: ["guest-services", code, "online-checkin"] });
    } catch (e) {
      setSaid(saidOf("Not changed", e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && desk.loading} onRefresh={() => { setPulled(true); desk.reload(); }}>
        <Head title="Online check-in" under="What guests sent from their own page, waiting for the desk." action={<Back onPress={onBack} />} />

        {refused ? <NotYours title="Online check-in" sentence={refused} />
          : data === undefined
            ? (desk.error ? <Failed title="Something went wrong" error={desk.error} onRetry={desk.reload} /> : <Loading words="Reading what guests sent…" />)
            : data ? (
              <View style={{ gap: 20 }}>
                <Stale error={desk.error} />
                <Waiting
                  rows={data.waiting} photosOff={data.idPhotos?.off ?? null} busy={busy}
                  onConfirm={(d) => void run(() => confirmDetails(code, d.id), { title: "Confirmed", body: d.guest, tone: "ok" })}
                  onAside={(d) => void run(() => setAsideDetails(code, d.id))}
                />
                {data.idPhotos?.keeper ? (
                  <Section title="ID photos kept"><Text style={t.label}>{ON_THE_WEBSITE}</Text></Section>
                ) : null}
                <Requests
                  rows={data.requests} busy={busy}
                  onHandle={(q, status) => void run(() => handleRequest(code, q.id, status))}
                />
                <RoomCards rooms={data.rooms} />
                <HotelCard name={hotel.name} />
              </View>
            ) : null}
      </Screen>
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

const Section = ({ title, note, action, children }: { title: string; note?: string; action?: ReactNode; children: ReactNode }) => (
  <View><SectionHead title={title} {...(note ? { note } : {})} action={action} />{children}</View>
);

function Waiting({ rows, photosOff, busy, onConfirm, onAside }: {
  rows: WaitingDetails[]; photosOff: string | null; busy: boolean;
  onConfirm: (d: WaitingDetails) => void; onAside: (d: WaitingDetails) => void;
}) {
  return (
    <Section title="Details waiting to be checked">
      {/* The server's own sentence where this hotel cannot keep ID photos. */}
      {photosOff ? <Text style={[t.label, { marginBottom: 12 }]}>{photosOff}</Text> : null}
      {rows.length === 0 ? (
        <Box><Empty compact title="Nothing waiting" description="When a guest sends their ID and address from their own page, it waits here until somebody checks it against the ID." /></Box>
      ) : (
        <View style={{ gap: 12 }}>
          {rows.map((d) => (
            <Box key={d.id} style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <Text style={[t.label, { color: c.ink900 }]}>{d.guest}</Text>
                <Text style={[t.label, t.tab]}>{d.reference} · sent {dateTime(d.submittedAt)}</Text>
              </View>
              {/* What they typed, under a hairline: label, then value. */}
              <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 10, gap: 6 }}>
                {detailLines(d).map(([label, value]) => (
                  <View key={label} style={{ flexDirection: "row", gap: 16 }}>
                    <Text style={[t.label, { color: c.grey500, width: 130 }]}>{label}</Text>
                    <Text style={[t.label, { flex: 1, color: c.ink900 }]}>{value}</Text>
                  </View>
                ))}
              </View>
              {photosOff ? null : d.photo ? (
                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 10, gap: 8 }}>
                  <Text style={t.label}>{photoLine(d.photo)} An Aadhaar must have its first 8 digits hidden.</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <Btn label="Show the photo" disabled onPress={() => undefined} />
                    <Btn label="Remove the photo" variant="ghost" disabled onPress={() => undefined} />
                  </View>
                  <Text style={[t.caption, { color: c.grey600 }]}>{ON_THE_WEBSITE}</Text>
                </View>
              ) : (
                <Text style={[t.label, { color: c.grey500, marginTop: 12 }]}>No ID photo was sent with these.</Text>
              )}
              <View style={{ marginTop: 14, gap: 8 }}>
                <Btn label="Confirm against the ID" a11y={`Confirm against the ID: ${d.guest}`} disabled={busy} onPress={() => onConfirm(d)} style={{ alignSelf: "flex-start" }} />
                <Btn label="Not right - take them at the desk" a11y={`Not right - take them at the desk: ${d.guest}`} variant="ghost" disabled={busy} onPress={() => onAside(d)} style={{ alignSelf: "flex-start" }} />
              </View>
            </Box>
          ))}
        </View>
      )}
    </Section>
  );
}

function Requests({ rows, busy, onHandle }: {
  rows: OpenRequest[]; busy: boolean; onHandle: (q: OpenRequest, status: "done" | "declined") => void;
}) {
  return (
    <Section title="Requests" note={REQUEST_NOTE}>
      {rows.length === 0 ? (
        <Box><Empty compact title="No requests" description="A guest can ask for the spa or laundry from their own page, where this property has them switched on." /></Box>
      ) : (
        <View style={{ gap: 12 }}>
          {rows.map((q) => (
            <Box key={q.id} style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY }}>
              <Text style={[t.label, { color: c.ink900, ...face[600] }]}>
                {KIND_LABEL[q.kind] ?? q.kind}: <Text style={[t.label, { color: c.ink900 }]}>{q.what}</Text>
              </Text>
              <Text style={[t.label, { marginTop: 2 }]}>
                {q.guest} · {q.reference}{q.wanted ? ` · wanted ${q.wanted}` : ""} · asked {dateTime(q.createdAt)}
              </Text>
              <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Btn label="Done" a11y={`Done: ${q.what}`} disabled={busy} onPress={() => onHandle(q, "done")} />
                <Btn label="Declined" a11y={`Declined: ${q.what}`} variant="ghost" disabled={busy} onPress={() => onHandle(q, "declined")} />
              </View>
            </Box>
          ))}
        </View>
      )}
    </Section>
  );
}

function RoomCards({ rooms }: { rooms: RoomCardRow[] }) {
  return (
    <View>
      <SectionHead title="Room cards" note={CARD_NOTE} />
      <View style={{ gap: 4, marginBottom: 12 }}>
        <Btn label="Print cards for every room" disabled onPress={() => undefined} style={{ alignSelf: "flex-start" }} />
        <Text style={[t.caption, { color: c.grey600 }]}>{ON_THE_WEBSITE}</Text>
      </View>
      <Box>
        {rooms.map((r, i) => (
          <View key={r.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey100 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[t.label, t.tab, { color: c.ink900 }]}>Room {r.number}</Text>
              <Text style={t.label}>{r.cardSince ? `Card printed ${dateShort(r.cardSince)}` : "No card yet"}</Text>
            </View>
            <Btn label={r.cardSince ? "Print a new card" : "Print a card"} a11y={`${r.cardSince ? "Print a new card" : "Print a card"} for room ${r.number}: ${ON_THE_WEBSITE}`} variant="ghost" disabled onPress={() => undefined} />
          </View>
        ))}
      </Box>
    </View>
  );
}

/** The hotel's own card (the web's HotelCard): no QR on the phone yet. */
function HotelCard({ name }: { name: string }) {
  return (
    <Box style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, alignItems: "center", gap: 12 }}>
      <Text style={t.label}>{name}</Text>
      <Text style={t.heading}>Your stay, by room and phone</Text>
      <Text style={[t.label, { textAlign: "center" }]}>Scan, then type your room number and phone number.</Text>
      <Btn label="Print the hotel's card" disabled onPress={() => undefined} />
      <Text style={[t.caption, { color: c.grey600 }]}>{ON_THE_WEBSITE}</Text>
    </Box>
  );
}
