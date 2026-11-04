import { useQueryClient } from "@tanstack/react-query";
import { AlarmClock, Calendar, Check, Clock, Plus } from "lucide-react-native";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { Head, notKnown, Screen, useRead, useStuck } from "../../core/ui";
import { actOnWakeUp, listWakeUps, setWakeUp } from "./data";
import {
  Back, Box, Btn, body, Dialog, Empty, Failed, Field, Foot, IconChip, InDialog, Input, Loading, NotYours, Pill,
  Segmented, Select, Stale, Toast, roomChoices, saidOf, usePoll, type Said,
} from "./kit";
import { whyNotWakeUps } from "./roles";
import { daysFrom, timeOf, wakeLine, wakeWhen, type InHouse, type WakeUpCall } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   WAKE-UP CALLS on a phone — the web's /h/:code/wake-up-calls
   (src/modules/guest-services/pages/WakeUpCalls.tsx; picture
   pms-shots/new/n-h-wake-up-calls). The desk sets one; a guest may ask from
   their own page, and it waits here until the desk confirms it. Due from
   fifteen minutes before until marked done; no "missed" state. Every time
   is the hotel's own clock, as the server writes it.
   Where the phone differs (no date-picker package): the day is chosen from
   the next 31 days and the time is typed (rules.ts daysFrom, timeOf); the
   web has a date input and a time input, side by side, as here.
   ══════════════════════════════════════════════════════════════════ */

type View_ = "open" | "done";

export function WakeUpCalls({ hotel, role, onBack }: { hotel: Hotel; role: string | null; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotWakeUps(role);
  const [view, setView] = useState<View_>("open");
  const [setting, setSetting] = useState(false);
  const [cancelling, setCancelling] = useState<WakeUpCall | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const [pulled, setPulled] = useState(false);

  const list = useRead(() => (refused ? Promise.resolve(null) : listWakeUps(code, view)), ["guest-services", code, "wake-up-calls", view]);
  usePoll(["guest-services", code, "wake-up-calls"]);
  const refresh = () => void cache.invalidateQueries({ queryKey: ["guest-services", code, "wake-up-calls"] });

  async function act(w: WakeUpCall, action: "confirm" | "done") {
    setBusy(true);
    try {
      await actOnWakeUp(code, w.id, action);
      refresh();
    } catch (e) {
      setSaid(saidOf("Not changed", e));
    } finally {
      setBusy(false);
    }
  }

  const calls = list.data?.calls ?? [];

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && list.loading} onRefresh={() => { setPulled(true); list.reload(); }}>
        <Head title="Wake-up calls" under="Calls to make, on the hotel's clock. Due from fifteen minutes before." action={<Back onPress={onBack} />} />
        <View style={{ flexDirection: "row", marginTop: -4, marginBottom: 8 }}>
          <Btn label="Set a call" variant="primary" icon={Plus} disabled={refused != null} onPress={() => setSetting(true)} />
        </View>
        <View style={{ marginBottom: 8 }}>
          <Segmented<View_>
            label="To make or done" value={view} onChange={setView}
            options={[{ value: "open", label: "To make" }, { value: "done", label: "Done, last 24 h" }]}
          />
        </View>

        {refused ? <NotYours title="Wake-up calls" sentence={refused} />
          : list.data === undefined
            ? (list.error ? <Failed title="Wake-up calls did not load" error={list.error} onRetry={list.reload} /> : <Loading words="Reading the wake-up calls…" />)
            : calls.length === 0 ? (
              <Empty
                title={view === "open" ? "No calls to make" : "Nothing done in the last 24 hours"}
                description={view === "open"
                  ? "A call shows here when the desk sets one, or when a guest asks on their own page."
                  : "A call shows here once it is made or cancelled, with who and when."}
              />
            ) : (
              <>
                <Stale error={list.error} />
                {calls.map((w) => (
                  <Box key={w.id} style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>
                    <View style={{ flexDirection: "row", gap: 14 }}>
                      <IconChip Icon={AlarmClock} tone={w.due ? "orange" : "neutral"} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                          <Text style={[body, t.tab, { color: c.ink900 }]}>{wakeWhen(w.callAt)}</Text>
                          {w.due ? <Pill tone="warning">Due</Pill> : null}
                          {w.status === "asked" ? <Pill tone="info">Asked</Pill> : null}
                          {w.status === "done" ? <Pill tone="success">Done</Pill> : null}
                          {w.status === "cancelled" ? <Pill>Cancelled</Pill> : null}
                        </View>
                        <Text style={[body, { color: c.grey500, marginTop: 4 }]}>{wakeLine(w)}</Text>
                        {w.note ? <Text style={[body, { marginTop: 2 }]}>{w.note}</Text> : null}
                        {w.cancelReason ? <Text style={[body, { marginTop: 2 }]}>{w.cancelReason}</Text> : null}
                      </View>
                    </View>
                    {w.status === "asked" || w.status === "set" ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingLeft: 42 }}>
                        {w.status === "asked"
                          ? <Btn label="Confirm" a11y={`Confirm the call for room ${w.room ?? ""}`} disabled={busy} onPress={() => void act(w, "confirm")} />
                          : <Btn label="Done" a11y={`Done: the call for room ${w.room ?? ""}`} icon={Check} disabled={busy} onPress={() => void act(w, "done")} />}
                        <Btn label="Cancel it" a11y={`Cancel the call for room ${w.room ?? ""}`} variant="ghost" disabled={busy} onPress={() => setCancelling(w)} />
                      </View>
                    ) : null}
                  </Box>
                ))}
              </>
            )}
      </Screen>

      <Toast said={said} onClose={() => setSaid(null)} />
      {setting ? (
        <SetDialog code={code} rooms={list.data?.rooms ?? []} today={list.data?.today ?? hotel.today ?? hotel.businessDate} onClose={() => { setSetting(false); refresh(); }} onDone={refresh} />
      ) : null}
      {cancelling ? <CancelDialog code={code} w={cancelling} onClose={() => setCancelling(null)} onDone={refresh} /> : null}
    </View>
  );
}

function SetDialog({ code, rooms, today, onClose, onDone }: {
  code: string; rooms: InHouse[]; today: string; onClose: () => void; onDone: () => void;
}) {
  const [reservationId, setReservationId] = useState(rooms[0]?.reservationId ?? "");
  const [day, setDay] = useState(today);
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  /* A second tap is a second call, and the route reads no key: latched at
     the tap, and after an unknown outcome no more taps until this is closed
     and the calls read again (MGS-3). */
  const latch = useRef(false);
  const once = useStuck();
  const clock = timeOf(time);

  async function save() {
    if (latch.current || once.isStuck()) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await setWakeUp(code, { reservationId, day, time: clock!, note });
      onClose();
      onDone();
    } catch (e) {
      setSaid(once.stop(e) ? { ...notKnown("set", "the calls once this is closed", e), tone: "bad" } : saidOf("Not set", e));
      setBusy(false);
    } finally {
      latch.current = false;
    }
  }

  return (
    <Dialog title="Set a wake-up call" description="For a guest in house now, on the hotel's clock." onClose={onClose}>
      {rooms.length === 0 ? (
        <Text style={body}>Nobody is checked in, so there is nobody to call.</Text>
      ) : (
        <>
          <Field label="Room" required>
            <Select label="Room" value={reservationId} options={roomChoices(rooms)} onChange={setReservationId} />
          </Field>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Day" required>
                <Select label="Day" icon={Calendar} value={day} options={daysFrom(today, 31)} onChange={setDay} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Time" required>
                <Input label="Time" icon={Clock} value={time} onChangeText={setTime} maxLength={5} placeholder="--:--" keyboardType="numbers-and-punctuation" />
              </Field>
            </View>
          </View>
          {time && !clock ? <Text style={t.caption}>Type the time as 06:30, on the 24-hour clock.</Text> : null}
          <Field label="Note" hint="Only if there is something to say on the call.">
            <Input label="Note" maxLength={200} value={note} onChangeText={setNote} />
          </Field>
          <InDialog said={said} />
          <Foot>
            <Btn label="Cancel" tall grow onPress={onClose} />
            <Btn label="Set the call" variant="primary" tall grow disabled={busy || once.stuck || !reservationId || !day || !clock} onPress={() => void save()} />
          </Foot>
        </>
      )}
    </Dialog>
  );
}

function CancelDialog({ code, w, onClose, onDone }: { code: string; w: WakeUpCall; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);

  async function finish() {
    setBusy(true);
    setSaid(null);
    try {
      await actOnWakeUp(code, w.id, "cancel", reason.trim());
      onClose();
      onDone();
    } catch (e) {
      setSaid(saidOf("Not cancelled", e));
      setBusy(false);
    }
  }

  return (
    <Dialog title={wakeWhen(w.callAt)} {...(w.room ? { description: `Room ${w.room}` } : {})} onClose={onClose}>
      <Field label="Why it is cancelled" required>
        <Input label="Why it is cancelled" rows={2} maxLength={200} value={reason} onChangeText={setReason} autoFocus />
      </Field>
      <InDialog said={said} />
      <Foot>
        <Btn label="Back" tall grow onPress={onClose} />
        <Btn label="Cancel the call" variant="danger" tall grow disabled={busy || !reason.trim()} onPress={() => void finish()} />
      </Foot>
    </Dialog>
  );
}
