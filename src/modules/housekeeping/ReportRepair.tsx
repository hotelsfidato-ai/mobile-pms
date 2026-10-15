import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, CloudOff, Square, SquareCheck } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View,
} from "react-native";
import { ApiError, HeldError, api, send, type Hotel } from "../../core/api";
import { dateLong } from "../../core/format";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Capsule, Card, Head, ReadFailed, s, useRead } from "../../core/ui";
import {
  BLOCK_REASONS, PRIORITIES, REPAIR_KINDS, blankForm, blockBody, heldSentence, needsLine, offerTakeOut,
  whyNotRaise, workOrderBody, type HouseNow, type RepairForm,
} from "./repair";
import { addDays } from "./block";
import { Day } from "./DayStepper";
import { whyNotBlock } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   REPORT A REPAIR on a phone — the web's RepairFlow
   (src/modules/housekeeping/flows/RepairFlow.tsx), its words and rules
   (./repair.ts). The room comes from the Rooms card (?room=) and can be
   changed; "Not a room" is a repair to the building.
   Where the phone differs (MODULE.md): a role the API refuses sees
   "Raise it" disabled with the API's sentence (difference 1), and the
   idempotency key goes from the first tap (difference 3, in send()).
   Not here (M-5): equipment repairs, which stay on the web.
   ══════════════════════════════════════════════════════════════════ */

type Said = { tone: "done" | "held" | "warn"; title: string; text: string };

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

  /* The rooms the API lists, and the one asked for even if they did not load. */
  const numbers = [...new Set([...(read.data?.rooms ?? []).map((r) => r.number), ...(room ? [room] : [])])];

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

  const head = (
    <Head
      eyebrow={hotel.name}
      title="Report a repair"
      under="Most repairs do not take the room out of service. If this one does, say so below."
      action={<Capsule label="Back" icon={<ChevronLeft size={16} color={c.grey700} />} onPress={onDone} />}
    />
  );

  if (said) {
    const tone = { done: [c.white, c.grey200, c.ink900], held: [c.yellow50, c.yellow100, c.yellow800], warn: [c.red50, c.red100, c.red700] }[said.tone];
    return (
      <ScrollView style={{ backgroundColor: c.grey50 }} contentContainerStyle={pad}>
        {head}
        <View style={[s.card, { backgroundColor: tone[0], borderColor: tone[1], gap: 8 }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Text style={[t.heading, { color: tone[2] }]}>{said.title}</Text>
          <Text style={[t.label, { color: c.grey700 }]}>{said.text}</Text>
        </View>
        <Primary label="Done" onPress={onDone} />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ backgroundColor: c.grey50 }}
        contentContainerStyle={pad}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={read.loading && Boolean(read.data)} onRefresh={read.reload} tintColor={c.orange} colors={[c.orange]} />}
      >
        {head}

        <Card style={{ gap: 16 }}>
          <Field label="What needs fixing" required>
            <Input value={f.what} onChangeText={(what) => set({ what })} label="What needs fixing" placeholder="Dripping tap in the bathroom" autoFocus />
          </Field>

          <Field label="Room" hint="“Not a room” for anything else - a lift, the lobby.">
            <Chips>
              <Chip label="Not a room" on={!here} onPress={() => set({ room: "" })} />
              {numbers.map((n) => <Chip key={n} label={n} a11y={`Room ${n}`} on={here === n} onPress={() => set({ room: n })} />)}
            </Chips>
            <RoomsState read={read} />
          </Field>

          <Field label="Kind">
            <Chips>{REPAIR_KINDS.map((k) => <Chip key={k} label={k} on={f.kind === k} onPress={() => set({ kind: k })} />)}</Chips>
          </Field>

          <Field label="Priority">
            <Chips>{PRIORITIES.map((p) => <Chip key={p.value} label={p.label} on={f.priority === p.value} onPress={() => set({ priority: p.value })} />)}</Chips>
          </Field>

          <Field label="Anything else" hint="Optional.">
            <Input value={f.detail} onChangeText={(detail) => set({ detail })} label="Anything else" multiline />
          </Field>
        </Card>

        {/* ── Taking the room out, as a second choice ─────────────── */}
        {here && occupied ? (
          <Text style={t.label}>Somebody is in room {here}, so it cannot be taken out of service now.</Text>
        ) : null}
        {offered ? (
          <Card style={{ gap: 16 }}>
            <Pressable
              onPress={() => set({ takeOut: !f.takeOut })}
              disabled={blockRefused != null}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: f.takeOut, disabled: blockRefused != null }}
              accessibilityLabel={`Take room ${here} out of service too`}
              style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, opacity: blockRefused ? 0.5 : 1 }}
            >
              {f.takeOut ? <SquareCheck size={22} color={c.orange} /> : <Square size={22} color={c.grey500} />}
              <Text style={[t.heading, { flex: 1, ...face[500] }]}>Take room {here} out of service too</Text>
            </Pressable>
            {blockRefused ? <Text style={t.caption}>{blockRefused}</Text> : null}
            {f.takeOut && !blockRefused ? (
              <>
                <Field label="Why is it coming out?" required>
                  <View style={{ gap: 6 }}>
                    {BLOCK_REASONS.map((r) => <Chip key={r.value} label={r.label} on={f.reason === r.value} onPress={() => set({ reason: r.value })} wide />)}
                  </View>
                </Field>
                <Field label="From" required>
                  <Day label="From" value={f.from} off={false} onChange={(from) => set({ from, until: f.until && f.until <= from ? addDays(from, 1) : f.until })} />
                </Field>
                <Field label="Until" hint="Leave empty if unknown">
                  {f.until ? (
                    <View style={{ gap: 8 }}>
                      <Day label="Until" value={f.until} min={addDays(f.from, 1)} off={false} onChange={(until) => set({ until })} />
                      <Chips><Chip label="No end date" on={false} onPress={() => set({ until: "" })} /></Chips>
                    </View>
                  ) : (
                    <Chips><Chip label="Set an end date" on={false} onPress={() => set({ until: addDays(f.from, 1) })} /></Chips>
                  )}
                </Field>
              </>
            ) : null}
          </Card>
        ) : null}

        {refusal ? (
          <View style={[s.card, { backgroundColor: c.red50, borderColor: c.red100, gap: 4 }]} accessibilityRole="alert">
            <Text style={[t.heading, { color: c.red700 }]}>Not raised</Text>
            <Text style={[t.label, { color: c.grey700 }]}>{refusal}</Text>
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <Primary label={busy ? "Raising…" : "Raise it"} onPress={() => void raise()} disabled={busy || why != null} />
          {why && !busy ? <Text style={[t.caption, { color: c.grey600 }]}>{why}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const pad = { paddingTop: 16, paddingHorizontal: space.side, paddingBottom: 40, gap: space.card };

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

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.ink900, ...face[600] }]}>
        {label}{required ? <Text style={{ color: c.red700 }}> *</Text> : null}
      </Text>
      {children}
      {hint ? <Text style={t.caption}>{hint}</Text> : null}
    </View>
  );
}

function Input({ label, date, multiline, ...props }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; autoFocus?: boolean; date?: boolean; multiline?: boolean;
}) {
  return (
    <TextInput
      {...props}
      accessibilityLabel={label}
      multiline={multiline}
      keyboardType={date ? "numbers-and-punctuation" : "default"}
      autoCapitalize={date ? "none" : "sentences"}
      placeholderTextColor={c.grey500}
      style={{
        minHeight: multiline ? 72 : 48, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1,
        borderColor: c.grey300, backgroundColor: c.white, fontSize: 16, color: c.ink900, ...face[500],
        textAlignVertical: multiline ? "top" : "center",
      }}
    />
  );
}

function Chips({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup">{children}</View>;
}

/** One choice of several: 44px to the touch, navy when chosen. */
function Chip({ label, a11y, on, onPress, wide }: { label: string; a11y?: string; on: boolean; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={a11y ?? label}
      style={({ pressed }) => ({
        minHeight: 44, minWidth: 44, paddingHorizontal: 14, justifyContent: "center", alignItems: wide ? "flex-start" : "center",
        borderRadius: wide ? 8 : 999, borderWidth: 1, borderColor: on ? c.ink900 : c.grey300,
        backgroundColor: on ? c.ink900 : pressed ? c.grey100 : c.white,
      })}
    >
      <Text style={[t.label, { color: on ? c.white : c.grey700 }, t.tab]}>{label}</Text>
    </Pressable>
  );
}

function Primary({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => ({
        minHeight: 48, borderRadius: 999, alignItems: "center", justifyContent: "center",
        backgroundColor: disabled ? c.grey200 : pressed ? c.orange600 : c.orange,
      })}
    >
      <Text style={[t.heading, { color: disabled ? c.grey500 : c.white }]}>{label}</Text>
    </Pressable>
  );
}
