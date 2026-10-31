import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { CloudOff, Square, SquareCheck } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ApiError, HeldError, api, send, type Hotel } from "../../core/api";
import { dateLong } from "../../core/format";
import { isOnline } from "../../core/offline";
import { c, space, t } from "../../core/theme";
import { ReadFailed, s, useRead } from "../../core/ui";
import {
  BLOCK_REASONS, PRIORITIES, REPAIR_KINDS, blankForm, blockBody, heldSentence, needsLine, offerTakeOut,
  whyNotRaise, workOrderBody, type HouseNow, type RepairForm,
} from "./repair";
import { addDays } from "./block";
import { Day } from "./DayStepper";
import { Button, Field, Input, Select, Sheet } from "./Form";
import { whyNotBlock } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   REPORT A REPAIR on a phone — the web's RepairFlow
   (src/modules/housekeeping/flows/RepairFlow.tsx), its words, order and
   rules (./repair.ts). From a room's card the room is filled in and fixed,
   as on the web; without one, Room is asked. The foot offers "Out of service
   without a repair", shown only from a room.
   Where the phone differs (MODULE.md): a role the API refuses sees
   "Raise it" disabled with the API's sentence (difference 1), and the
   idempotency key goes from the first tap (difference 3, in send()).
   Equipment is greyed: its repairs stay on the website for now (M-5).
   ══════════════════════════════════════════════════════════════════ */

type Said = { tone: "done" | "held" | "warn"; title: string; text: string };

const KINDS = REPAIR_KINDS.map((k) => ({ value: k, label: k }));
const NO_EQUIPMENT = [{ value: "", label: "Not a piece of equipment" }];

async function readRooms(code: string) {
  const [rooms, house] = await Promise.all([
    api<Array<{ number: string }>>(`/api/hotels/${code}/rooms`),
    api<HouseNow>(`/api/hotels/${code}/house-now`),
  ]);
  return { rooms, house };
}

export function ReportRepair({ hotel, room, role, onDone }: {
  hotel: Hotel; room: string; role: string | null; onDone: () => void;
}) {
  const code = hotel.code;
  const cache = useQueryClient();
  const read = useRead(() => readRooms(code), ["housekeeping", code, "repair", "rooms"]);
  const [f, setF] = useState(() => blankForm(room, hotel.businessDate));
  const set = (patch: Partial<RepairForm>) => setF((x) => ({ ...x, ...patch }));
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [said, setSaid] = useState<Said | null>(null);

  const here = f.room.trim();
  const offered = offerTakeOut(here, read.data?.house);
  const occupied = read.data?.house.rooms.find((r) => r.number === here)?.inHouse === true;
  const out = f.takeOut && offered;
  const why = whyNotRaise(f, role, offered);
  const blockRefused = whyNotBlock(role);

  async function raise() {
    setBusy(true);
    setRefusal(null);
    try {
      let raised: { id: string };
      try {
        raised = await send<{ id: string }>("POST", `/api/hotels/${code}/work-orders`, workOrderBody(f));
      } catch (error) {
        if (!(error instanceof HeldError)) throw error;
        /* Held: never a failure. Taking the room out cannot be held, so it is said out loud. */
        setSaid({ tone: "held", title: "Saved on this phone", text: heldSentence(error.message, f, out) });
        return;
      }
      let next: Said = { tone: "done", title: "Repair raised", text: f.what.trim() };
      if (out) {
        try {
          await send("POST", `/api/hotels/${code}/rooms/${encodeURIComponent(here)}/block`, blockBody(f, raised.id));
          next.text = `Room ${here} is out of service${f.until ? ` until ${dateLong(f.until)}` : ", no return date set"}.`;
        } catch (error) {
          /* The repair exists; the room is still on sale. Both said. */
          next = {
            tone: "warn",
            title: `Repair raised - room ${here} was not taken out`,
            text: error instanceof ApiError && error.status === 503 ? needsLine(here) : error instanceof Error ? error.message : String(error),
          };
        }
      }
      void cache.invalidateQueries({ queryKey: ["housekeeping", code] });
      setSaid(next);
    } catch (error) {
      /* The server's sentence, kept on the form. */
      setRefusal(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const title = room ? `Report a repair · Room ${room}` : "Report a repair";
  const under = "Most repairs do not take the room out of service. If this one does, say so below.";

  if (said) {
    const tone = { done: [c.white, c.grey200, c.ink900], held: [c.yellow50, c.yellow100, c.yellow800], warn: [c.red50, c.red100, c.red700] }[said.tone];
    return (
      <ScrollView style={{ backgroundColor: c.grey50 }} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: space.card }}>
        <Text style={t.title}>Report a repair</Text>
        <View style={[s.card, { backgroundColor: tone[0], borderColor: tone[1], gap: 8 }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Text style={[t.heading, { color: tone[2] }]}>{said.title}</Text>
          <Text style={[t.label, { color: c.grey700 }]}>{said.text}</Text>
        </View>
        <Button kind="primary" tall label="Done" onPress={onDone} />
      </ScrollView>
    );
  }

  return (
    <Sheet title={title} under={under} onClose={onDone} refreshing={read.loading && Boolean(read.data)} onRefresh={read.reload}>
      <Field label="What needs fixing" required>
        <Input value={f.what} onChangeText={(what) => set({ what })} label="What needs fixing" placeholder="Dripping tap in the bathroom" autoFocus />
      </Field>

      {room ? null : (
        <Field label="Room" hint="Leave empty for anything that is not a room - a lift, the lobby.">
          <Input value={f.room} onChangeText={(x) => set({ room: x })} label="Room" placeholder="204" />
        </Field>
      )}

      <Field label="Equipment" hint="On the website for now">
        <Select label="Equipment" value="" options={NO_EQUIPMENT} off />
      </Field>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Kind"><Select label="Kind" value={f.kind} options={KINDS} onChange={(kind) => set({ kind })} /></Field></View>
        <View style={{ flex: 1 }}><Field label="Priority"><Select label="Priority" value={f.priority} options={PRIORITIES} onChange={(priority) => set({ priority })} /></Field></View>
      </View>

      <Field label="Anything else" hint="Optional.">
        <Input value={f.detail} onChangeText={(detail) => set({ detail })} label="Anything else" multiline />
      </Field>

      {/* ── Taking the room out, as a second choice ─────────────── */}
      {here && occupied ? (
        <Text style={t.label}>Somebody is in room {here}, so it cannot be taken out of service now.</Text>
      ) : null}
      {offered ? (
        <View style={{ borderWidth: 1, borderColor: c.grey200, borderRadius: 10, padding: 12, gap: 12 }}>
          <Pressable
            onPress={() => set({ takeOut: !f.takeOut })}
            disabled={blockRefused != null}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: f.takeOut, disabled: blockRefused != null }}
            accessibilityLabel={`Take room ${here} out of service too`}
            style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, opacity: blockRefused ? 0.5 : 1 }}
          >
            {f.takeOut ? <SquareCheck size={22} color={c.orange} /> : <Square size={22} color={c.grey500} />}
            <Text style={[t.label, { flex: 1, color: c.ink900 }]}>Take room {here} out of service too</Text>
          </Pressable>
          {blockRefused ? <Text style={t.caption}>{blockRefused}</Text> : null}
          {f.takeOut && !blockRefused ? (
            <>
              <Field label="Why is it coming out?" required>
                <Select label="Why is it coming out?" value={f.reason} options={BLOCK_REASONS} onChange={(reason) => set({ reason })} />
              </Field>
              <Field label="From" required>
                <Day label="From" value={f.from} off={false} onChange={(from) => set({ from, until: f.until && f.until <= from ? addDays(from, 1) : f.until })} />
              </Field>
              <Field label="Until" hint="Leave empty if unknown">
                {f.until ? (
                  <View style={{ gap: 8 }}>
                    <Day label="Until" value={f.until} min={addDays(f.from, 1)} off={false} onChange={(until) => set({ until })} />
                    <View style={{ flexDirection: "row" }}><Button label="No end date" onPress={() => set({ until: "" })} /></View>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row" }}><Button label="Set an end date" onPress={() => set({ until: addDays(f.from, 1) })} /></View>
                )}
              </Field>
            </>
          ) : null}
        </View>
      ) : null}
      <RoomsState read={read} />

      {refusal ? (
        <View style={[s.card, { backgroundColor: c.red50, borderColor: c.red100, gap: 4 }]} accessibilityRole="alert">
          <Text style={[t.heading, { color: c.red700 }]}>Not raised</Text>
          <Text style={[t.label, { color: c.grey700 }]}>{refusal}</Text>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}><Button tall label="Cancel" onPress={onDone} /></View>
          <View style={{ flex: 1 }}><Button kind="primary" tall label={busy ? "Raising…" : "Raise it"} onPress={() => void raise()} disabled={busy || why != null} /></View>
        </View>
        {why && !busy ? <Text style={[t.caption, { color: c.grey600 }]}>{why}</Text> : null}
      </View>

      {room ? (
        <View style={{ borderTopWidth: 1, borderTopColor: c.grey200, paddingTop: 12, gap: 4 }}>
          <Button
            kind="ghost" label="Out of service without a repair" disabled={blockRefused != null} hint={blockRefused ?? undefined}
            onPress={() => router.replace(`/housekeeping/${code}/out-of-service?room=${encodeURIComponent(room)}`)}
          />
          {blockRefused ? <Text style={t.caption}>{blockRefused}</Text> : null}
        </View>
      ) : null}
    </Sheet>
  );
}

/** The rooms' read, its four states in words; the form works in all of them. */
function RoomsState({ read }: { read: ReturnType<typeof useRead<Awaited<ReturnType<typeof readRooms>>>> }) {
  if (read.data && read.data.rooms.length === 0 && !read.error) {
    return <Text style={t.caption}>This property has no rooms set up yet. A repair to the building needs none.</Text>;
  }
  if (read.error && !isOnline()) {
    return (
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
        <CloudOff size={16} color={c.yellow800} />
        <Text style={[t.caption, { flex: 1, color: c.yellow800 }]}>
          No connection: the room list cannot be read now. A repair reported here is held on this phone and sent when the line is back.
        </Text>
      </View>
    );
  }
  if (read.error) return <ReadFailed what="the rooms" error={read.error} onRetry={read.reload} />;
  if (!read.data) return <Text style={t.caption}>Reading the rooms…</Text>;
  return null;
}
