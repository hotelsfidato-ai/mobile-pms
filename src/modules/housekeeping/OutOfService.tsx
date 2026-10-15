import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Circle, CircleCheck, Minus, Plus, RotateCcw, Wrench } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { Room } from "../../../../src/data/repositories/types";
import { api, send, type Hotel } from "../../core/api";
import { dateLong } from "../../core/format";
import { isOnline } from "../../core/offline";
import { c, face, t } from "../../core/theme";
import { Capsule, Card, Head, ReadFailed, Screen, s, useRead } from "../../core/ui";
import {
  addDays, BLOCK_REASONS, blockBody, blockSpan, reasonLabel, statusWord, takenOut, whyNotTake, type BlockForm,
} from "./block";
import { whyNotBlock } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   OUT OF SERVICE on a phone — the web's OutOfOrderFlow
   (src/modules/housekeeping/flows/OutOfOrderFlow.tsx) as a screen: what
   already holds the room out, each with Put back; then why, from, until
   and a note. ONLINE ONLY (M-5): `send` refuses it offline with the web's
   sentence (src/core/offline.ts, unlisted), and nothing is held.
   Differences from the web: a day stepper for the dates (no date-picker
   package); a block starting after the business date is said as "goes
   out on", and Put back says the status the room was read back with,
   not "It returns as dirty." (a hotel may take it back as it was).
   ══════════════════════════════════════════════════════════════════ */

/** /house-now, the field read here: somebody is in the room (the board's rule). */
interface HouseNow { rooms: Array<{ number: string; inHouse: boolean }> }

async function readRoom(code: string, n: string) {
  const [rooms, house] = await Promise.all([
    api<Room[]>(`/api/hotels/${code}/rooms`),
    api<HouseNow>(`/api/hotels/${code}/house-now`),
  ]);
  return {
    room: rooms.find((r) => r.number === n) ?? null,
    occupied: house.rooms.find((r) => r.number === n)?.inHouse ?? false,
  };
}

type Said = { ok: boolean; title: string; body: string; back?: boolean };

export function OutOfService({ hotel, room: n, role, onBack }: {
  hotel: Hotel; room: string; role: string | null; onBack: () => void;
}) {
  const cache = useQueryClient();
  const read = useRead(() => readRoom(hotel.code, n), ["housekeeping", hotel.code, "block", n]);
  const [form, setForm] = useState<BlockForm>({ reason: BLOCK_REASONS[0].value, from: hotel.businessDate, to: null, note: "" });
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const set = (change: Partial<BlockForm>) => setForm((f) => ({ ...f, ...change }));

  const room = read.data?.room ?? null;
  const forbidden = whyNotBlock(role);
  const off = busy || forbidden != null;
  const invalid = whyNotTake(form);

  /* The server's or the phone's refusal is said as it is; on success every
     housekeeping read of this hotel is read again before anything is said. */
  async function write(run: () => Promise<unknown>, failed: string, ok: Said): Promise<boolean> {
    setBusy(true);
    setSaid(null);
    try {
      await run();
    } catch (e) {
      setSaid({ ok: false, title: failed, body: e instanceof Error ? e.message : `${failed}.` });
      setBusy(false);
      return false;
    }
    await cache.invalidateQueries({ queryKey: ["housekeeping", hotel.code] });
    setSaid(ok);
    setBusy(false);
    return true;
  }

  /* The note goes once the room is out (the web keeps the rest of the form). */
  const take = async () => (await write(
    () => send("POST", `/api/hotels/${hotel.code}/rooms/${encodeURIComponent(n)}/block`, blockBody(form)),
    "Room not taken out",
    { ok: true, ...takenOut(n, form, hotel.businessDate) },
  )) && set({ note: "" });

  const putBack = (id: string) => write(
    () => send("DELETE", `/api/hotels/${hotel.code}/rooms/${encodeURIComponent(n)}/block/${id}`),
    "Room not put back",
    { ok: true, title: `Room ${n} is back`, body: "", back: true },
  );

  /* What the room came back as, only once it has been read back. */
  const backAs = said?.back && room && !read.loading && !read.error ? `It is ${statusWord(room.status)} now.` : "";

  return (
    <Screen refreshing={read.loading && Boolean(read.data)} onRefresh={read.reload}>
      <Head
        eyebrow="Out of service"
        title={n ? `Room ${n}` : "No room"}
        under={room ? `${room.type} · now ${statusWord(room.status)}` : hotel.name}
        action={<Capsule label="Back" icon={<ChevronLeft size={16} color={c.grey700} />} onPress={onBack} />}
      />

      {said ? (
        <View style={[s.card, { gap: 2 }, said.ok ? { borderColor: c.grey200 } : { backgroundColor: c.red50, borderColor: c.red100 }]} accessibilityRole="alert">
          <Text style={[t.heading, !said.ok && { color: c.red700 }]}>{said.title}</Text>
          {said.body || backAs ? <Text style={[t.label, { color: c.grey700 }]}>{said.body || backAs}</Text> : null}
        </View>
      ) : null}

      {read.error && !isOnline() ? (
        <View style={[s.card, { backgroundColor: c.yellow50, borderColor: c.yellow100, gap: 8 }]} accessibilityRole="alert">
          <Text style={[t.heading, { color: c.yellow800 }]}>No connection</Text>
          <Text style={[t.label, { color: c.grey700 }]}>
            Room {n} cannot be read, and taking a room out of service or back needs the connection. Try again when it is back.
          </Text>
          <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={read.reload} /></View>
        </View>
      ) : read.error ? (
        <ReadFailed what={`room ${n}`} error={read.error} onRetry={read.reload} />
      ) : null}

      {!read.data && read.loading ? <Text style={t.label}>Reading room {n}…</Text> : null}

      {read.data && !room ? (
        <Card><Text style={t.heading}>{n ? `There is no room ${n} here.` : "Open a room from the Rooms board."}</Text></Card>
      ) : null}

      {room ? (
        <>
          {forbidden ? (
            <View style={[s.card, { backgroundColor: c.grey50 }]} accessibilityRole="text">
              <Text style={[t.label, { color: c.grey700 }]}>{forbidden}</Text>
            </View>
          ) : null}

          {/* What already holds the room out, each with its way back (the web's "Already out"). */}
          <Card style={{ gap: 8 }}>
            <Text style={t.eyebrow}>Already out</Text>
            {room.blocks.length === 0 ? <Text style={t.label}>Room {n} is not held out of service.</Text> : null}
            {room.blocks.map((b) => (
              <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={t.heading}>{reasonLabel(b.reason)}</Text>
                  <Text style={[t.caption, t.tab]}>{blockSpan(b)}</Text>
                </View>
                <Button
                  label="Put back" icon={RotateCcw} disabled={off} onPress={() => void putBack(b.id)}
                  a11y={`Put room ${n} back: ${reasonLabel(b.reason)}, ${blockSpan(b)}`} hint={forbidden ?? undefined}
                />
              </View>
            ))}
          </Card>

          {read.data?.occupied ? (
            /* No form: the web's own words (OutOfOrderFlow 154-165); the server refuses it too. */
            <View style={[s.card, { backgroundColor: c.red50, borderColor: c.red100, gap: 2 }]}>
              <Text style={t.heading}>Somebody is in this room.</Text>
              <Text style={[t.label, { color: c.grey600 }]}>Move them out before taking it off sale.</Text>
            </View>
          ) : (
            <Card style={{ gap: 16 }}>
              <Field label="Why is it coming out?">
                <View accessibilityRole="radiogroup" accessibilityLabel="Why is it coming out?">
                  {BLOCK_REASONS.map((r) => {
                    const on = form.reason === r.value;
                    const Mark = on ? CircleCheck : Circle;
                    return (
                      <Pressable
                        key={r.value} onPress={() => set({ reason: r.value })} disabled={off}
                        accessibilityRole="radio" accessibilityLabel={r.label} aria-checked={on}
                        style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 }}
                      >
                        <Mark size={20} color={off ? c.grey300 : on ? c.orange600 : c.grey500} />
                        <Text style={[t.label, { flex: 1, color: off ? c.grey500 : c.ink900 }]}>{r.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              <Field label="From">
                <Day label="From" value={form.from} off={off} onChange={(from) => set({ from })} />
              </Field>

              <Field label="Until" hint="Leave empty if unknown">
                {form.to === null ? (
                  <View style={{ flexDirection: "row" }}>
                    <Button label="Set an end date" icon={Plus} disabled={off} onPress={() => set({ to: addDays(form.from, 1) })} />
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    <Day label="Until" value={form.to} min={form.from} off={off} onChange={(to) => set({ to })} />
                    <View style={{ flexDirection: "row" }}>
                      <Button label="No end date" disabled={off} onPress={() => set({ to: null })} />
                    </View>
                  </View>
                )}
              </Field>

              <Field label="Note" hint="What is actually wrong">
                <TextInput
                  value={form.note} onChangeText={(note) => set({ note })} editable={!off} multiline
                  placeholder="Shower mixer leaking" placeholderTextColor={c.grey500} accessibilityLabel="Note"
                  style={[t.label, { color: c.ink900, minHeight: 64, borderWidth: 1, borderColor: c.grey300, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: "top" }]}
                />
              </Field>

              <View style={{ gap: 8 }}>
                <Text style={[t.label, t.tab]}>{form.to ? blockSpan(form) : "No end date"}</Text>
                <Button primary label="Take out of service" icon={Wrench} disabled={off || invalid != null} onPress={() => void take()} hint={forbidden ?? invalid ?? undefined} />
                {forbidden ?? invalid ? <Text style={[t.caption, { color: c.grey600 }]}>{forbidden ?? invalid}</Text> : null}
              </View>
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.ink900, ...face[600] }]}>{label}</Text>
      {children}
      {hint ? <Text style={t.caption}>{hint}</Text> : null}
    </View>
  );
}

/** The day stepper: no date-picker package (ponytail; the web uses its
    date input). Never below `min`. */
function Day({ label, value, min, off, onChange }: {
  label: string; value: string; min?: string; off: boolean; onChange: (date: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Step icon={Minus} a11y={`${label}: a day earlier`} disabled={off || (min != null && value <= min)} onPress={() => onChange(addDays(value, -1))} />
      <Text style={[t.label, t.tab, { flex: 1, textAlign: "center", color: off ? c.grey500 : c.ink900 }]} accessibilityLiveRegion="polite">
        {dateLong(value)}
      </Text>
      <Step icon={Plus} a11y={`${label}: a day later`} disabled={off} onPress={() => onChange(addDays(value, 1))} />
    </View>
  );
}

function Step({ icon: Icon, a11y, disabled, onPress }: { icon: typeof Plus; a11y: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y}
      style={({ pressed }) => [s.capsule, { width: 44, paddingHorizontal: 0 }, disabled ? { backgroundColor: c.grey50, borderColor: c.grey200 } : pressed && { backgroundColor: c.grey100 }]}
    >
      <Icon size={18} color={disabled ? c.grey300 : c.grey700} />
    </Pressable>
  );
}

/** The web's Button, primary or secondary, its disabled colours (src/components/ui/Button.tsx). */
function Button({ label, icon: Icon, primary, disabled, onPress, a11y, hint }: {
  label: string; icon?: typeof Plus; primary?: boolean; disabled: boolean; onPress: () => void; a11y?: string; hint?: string;
}) {
  const fg = primary ? (disabled ? c.grey600 : c.white) : disabled ? c.grey500 : c.ink900;
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      accessibilityHint={hint}
      style={({ pressed }) => [
        s.capsule, { flexDirection: "row", gap: 6 },
        primary ? { backgroundColor: disabled ? c.grey300 : pressed ? c.orange700 : c.orange600, borderColor: "transparent" }
          : disabled ? { backgroundColor: c.grey50 } : pressed && { backgroundColor: c.grey100 },
      ]}
    >
      {Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[t.label, { color: fg, ...face[600] }]}>{label}</Text>
    </Pressable>
  );
}
