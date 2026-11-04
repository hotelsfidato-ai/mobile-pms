import { BedDouble } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ApiError, HeldError, type Hotel } from "../../core/api";
import { cash, dateLong } from "../../core/format";
import { c, face, t } from "../../core/theme";
import { useRead } from "../../core/ui";
import { assignRoom } from "../front-desk/data";
import { Button, Empty, Field, FormSheet, Pick, Pill, type Said } from "../front-desk/kit";
import { NotRead } from "../front-desk/StayList";
import { assignChoices, unplaced } from "./chart";
import { readToPlace } from "./data";

/* ══════════════════════════════════════════════════════════════════
   ASSIGN A ROOM — the Calendar's "Assign room" (src/modules/front-desk/
   flows/AssignRoomFlow.tsx): a confirmed booking with a room type and no
   room number is given one before the guest arrives. The refusals are the
   point: a room taken for part of the stay, one out of service, a guest who
   has one already, each comes back in the server's words. Front desk's own
   assign (held offline, warned: the web's tier). Not pictured: built from
   the web's code.
   ══════════════════════════════════════════════════════════════════ */

export function AssignRoom({ hotel, onClose, onDone }: { hotel: Hotel; onClose: () => void; onDone: (said: Said) => void }) {
  const code = hotel.code;
  const today = hotel.businessDate;
  const read = useRead(() => readToPlace(code, today), ["reservations", code, "assign", today]);
  const [stayId, setStayId] = useState("");
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  /* One tap, one write (MEMORY 8). */
  const latch = useRef(false);

  const waiting = unplaced(read.data?.stays ?? []);
  const chosen = waiting.find((s) => s.id === stayId) ?? null;
  const rooms = assignChoices(read.data?.rooms ?? [], read.data?.stays ?? [], chosen);

  const submit = async () => {
    if (!chosen || !room || latch.current) return;
    latch.current = true;
    setBusy(true);
    try {
      const res = await assignRoom(code, chosen.id, room);
      /* Said out loud: an upgrade nobody mentioned is one nobody charged for. */
      onDone({ title: `${res.guest} is in room ${res.room}`, ...(res.typeChanged ? { body: `Note: ${res.typeName} is not the room type they booked.` } : {}), tone: "ok" });
    } catch (e) {
      if (e instanceof HeldError) onDone({ title: "Held", body: e.message, tone: "held" });
      else setSaid({ title: "Not assigned", body: e instanceof ApiError || e instanceof Error ? e.message : String(e), tone: "bad" });
    } finally {
      latch.current = false;
      setBusy(false);
    }
  };

  return (
    <FormSheet
      title="Assign a room" description={`Give an arriving booking a room before they get here. As of ${dateLong(today)}.`} onClose={onClose} said={said} onSaid={setSaid}
      foot={(
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}><Button label="Cancel" kind="ghost" onPress={onClose} /></View>
          <View style={{ flex: 1 }}>
            <Button label="Assign the room" kind="primary" Icon={BedDouble} busy={busy}
              reason={!chosen ? "Choose the booking." : !room ? "Choose a room." : null} onRefused={(r) => setSaid({ title: r, tone: "held" })} onPress={() => void submit()} />
          </View>
        </View>
      )}
    >
      {!read.data ? (read.error ? <NotRead what="the bookings" error={read.error} onRetry={read.reload} plural /> : <Text style={[t.label, { textAlign: "center", paddingVertical: 24 }]}>Loading…</Text>)
        : waiting.length === 0 ? (
          <Empty Icon={BedDouble} title="Every arrival has a room" line="Nothing is waiting to be placed. A booking appears here when it is confirmed and has a room type but no room number." />
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Text style={[t.caption, { textTransform: "uppercase", letterSpacing: 0.3 }]}>{`Waiting for a room · ${waiting.length}`}</Text>
              {waiting.map((s) => {
                const on = s.id === stayId;
                return (
                  <Pressable key={s.id} onPress={() => { setStayId(s.id); setRoom(""); }} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${s.guest}, ${s.roomType}`}
                    style={{ minHeight: 56, borderRadius: 10, borderWidth: 1, padding: 12, gap: 2, borderColor: on ? c.orange : c.grey200, backgroundColor: on ? c.orange50 : c.white }}>
                    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <Text style={[t.label, face[500], { color: c.ink900 }]}>{s.guest}</Text>
                      <Pill tone="neutral" dot={false}>{s.roomType}</Pill>
                    </View>
                    <Text style={[t.caption, t.tab]}>{`${dateLong(s.arrival)} → ${dateLong(s.departure)}${s.reference ? ` · ${s.reference}` : ""}`}</Text>
                  </Pressable>
                );
              })}
            </View>
            {chosen ? (
              <Field label="Room" hint={`${chosen.guest} booked a ${chosen.roomType}. Another type is allowed - it will be noted on the assignment.`}>
                <Pick value={room} onChange={setRoom} title="Room" placeholder="Choose a room…" tall
                  options={rooms.map((r) => ({ value: r.number, label: `${r.number} · ${r.type}${r.rackRate === null ? "" : ` · ${cash(r.rackRate)}`}${r.type !== chosen.roomType ? "  (different type)" : ""}` }))} />
              </Field>
            ) : null}
          </>
        )}
    </FormSheet>
  );
}
