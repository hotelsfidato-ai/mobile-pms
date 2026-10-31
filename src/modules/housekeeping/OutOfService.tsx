import { useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Wrench } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Room } from "../../core/types";
import { api, orNull, send, type Hotel } from "../../core/api";
import { isOnline } from "../../core/offline";
import { c, t } from "../../core/theme";
import { Capsule, ReadFailed, s, useRead } from "../../core/ui";
import {
  addDays, BLOCK_REASONS, blockBody, blockSpan, ended, reasonLabel, statusWord, takenOut, whyNotTake, type BlockForm,
} from "./block";
import { Day } from "./DayStepper";
import { Button, Field, Input, Select, Sheet } from "./Form";
import { whyNotBlock } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   OUT OF SERVICE on a phone — the web's OutOfOrderFlow
   (src/modules/housekeeping/flows/OutOfOrderFlow.tsx) as a screen: what
   already holds the room out, each with Put back; then why, from, until
   and a note, with the hotel's ready reasons. ONLINE ONLY (M-5): `send`
   refuses it offline with the web's sentence (src/core/offline.ts,
   unlisted), and nothing is held.
   Differences from the web: a day stepper for the dates (no date-picker
   package); a block starting after the business date is said as "goes
   out on", and Put back says the status the room was read back with,
   not "It returns as dirty." (a hotel may take it back as it was).
   ══════════════════════════════════════════════════════════════════ */

/** /house-now, the field read here: somebody is in the room (the board's rule). */
interface HouseNow { rooms: Array<{ number: string; inHouse: boolean }> }
/** src/modules/front-desk/data/lists.ts ListItem, the fields read here. */
interface ReadyReason { id: string; label: string; active: boolean }

async function readRoom(code: string, n: string) {
  const [rooms, house, ready] = await Promise.all([
    api<Room[]>(`/api/hotels/${code}/rooms`),
    api<HouseNow>(`/api/hotels/${code}/house-now`),
    /* The hotel's ready reasons (D27-260): a help, never worth failing the form for. */
    orNull<ReadyReason[]>(`/api/hotels/${code}/lists/reason_block`).catch(() => null),
  ]);
  return {
    room: rooms.find((r) => r.number === n) ?? null,
    occupied: house.rooms.find((r) => r.number === n)?.inHouse ?? false,
    ready: (ready ?? []).filter((r) => r.active),
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
    <Sheet
      title={n ? `Room ${n}` : "No room"} under="Out of service, and for how long." onClose={onBack}
      refreshing={read.loading && Boolean(read.data)} onRefresh={read.reload}
    >
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
        <Text style={t.heading}>{n ? `There is no room ${n} here.` : "Open a room from the Rooms board."}</Text>
      ) : null}

      {room ? (
        <>
          <Text style={t.caption}>{room.type} · now {statusWord(room.status)}</Text>

          {forbidden ? (
            <View style={[s.card, { backgroundColor: c.grey50 }]} accessibilityRole="text">
              <Text style={[t.label, { color: c.grey700 }]}>{forbidden}</Text>
            </View>
          ) : null}

          {/* What already holds the room out, each with its way back (the web's "Already out"). */}
          {room.blocks.length > 0 ? (
            <View style={{ borderWidth: 1, borderColor: c.grey200, borderRadius: 10, backgroundColor: c.grey50, padding: 12, gap: 8 }}>
              <Text style={[t.caption, { textTransform: "uppercase", letterSpacing: 0.3 }]}>Already out</Text>
              {room.blocks.map((b) => (
                <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[t.label, { color: c.ink900 }]}>{reasonLabel(b.reason)}</Text>
                    <Text style={[t.label, t.tab, { color: c.grey500 }]}>{blockSpan(b)}</Text>
                  </View>
                  {ended(b, hotel.businessDate) ? (
                    <Text style={[t.caption, { color: c.grey600 }]}>Ended</Text>
                  ) : (
                    <Button
                      label="Put back" icon={RotateCcw} disabled={off} onPress={() => void putBack(b.id)}
                      a11y={`Put room ${n} back: ${reasonLabel(b.reason)}, ${blockSpan(b)}`} hint={forbidden ?? undefined}
                    />
                  )}
                </View>
              ))}
            </View>
          ) : null}

          {read.data?.occupied ? (
            /* No form: the web's own words (OutOfOrderFlow 154-165); the server refuses it too. */
            <View style={{ borderWidth: 1, borderColor: c.red100, borderRadius: 10, backgroundColor: c.red50, padding: 12, gap: 2 }}>
              <Text style={[t.label, { color: c.ink900 }]}>Somebody is in this room.</Text>
              <Text style={[t.label, { color: c.grey600 }]}>Move them out before taking it off sale.</Text>
            </View>
          ) : (
            <>
              <Field label="Why is it coming out?" required>
                <Select label="Why is it coming out?" value={form.reason} options={BLOCK_REASONS} onChange={(reason) => set({ reason })} off={off} />
              </Field>

              <Field label="From" required>
                <Day label="From" value={form.from} off={off} onChange={(from) => set({ from, to: form.to && form.to <= from ? addDays(from, 1) : form.to })} />
              </Field>

              <Field label="Until" hint="Leave empty if unknown">
                {form.to === null ? (
                  <View style={{ flexDirection: "row" }}>
                    <Button label="Set an end date" icon={Plus} disabled={off} onPress={() => set({ to: addDays(form.from, 1) })} />
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    <Day label="Until" value={form.to} min={addDays(form.from, 1)} off={off} onChange={(to) => set({ to })} />
                    <View style={{ flexDirection: "row" }}>
                      <Button label="No end date" disabled={off} onPress={() => set({ to: null })} />
                    </View>
                  </View>
                )}
              </Field>

              <View style={{ gap: 6 }}>
                <Field label="Note" hint="What is actually wrong">
                  <Input value={form.note} onChangeText={(note) => set({ note })} label="Note" placeholder="Shower mixer leaking" multiline off={off} />
                </Field>
                {read.data?.ready.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {read.data.ready.map((r) => (
                      <Pressable
                        key={r.id} onPress={() => set({ note: r.label })} disabled={off} accessibilityRole="button" accessibilityLabel={r.label}
                        style={{ minHeight: 44, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.white, justifyContent: "center" }}
                      >
                        <Text style={[t.label, { color: c.ink900 }]}>{r.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={{ gap: 8 }}>
                <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: c.grey100 }}>
                  <Text style={[t.caption, t.tab, { color: c.grey600 }]}>{form.to ? blockSpan(form) : "No end date"}</Text>
                </View>
                <Button kind="primary" label="Take out of service" icon={Wrench} disabled={off || invalid != null} onPress={() => void take()} hint={forbidden ?? invalid ?? undefined} />
                {forbidden ?? invalid ? <Text style={[t.caption, { color: c.grey600 }]}>{forbidden ?? invalid}</Text> : null}
              </View>
            </>
          )}
        </>
      ) : null}
    </Sheet>
  );
}
