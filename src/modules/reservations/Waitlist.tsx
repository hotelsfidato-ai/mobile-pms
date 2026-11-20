import { useQueryClient } from "@tanstack/react-query";
import { ListOrdered, Phone, Plus } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import { type Hotel, outcomeUnknown } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import { c, face, space, t } from "../../core/theme";
import { Capsule, Card, notKnown, Screen, useRead, useScreenStop } from "../../core/ui";
import { dateDay } from "../finance/bill";
import { addDays } from "../front-desk/desk";
import { Choice } from "../finance/Kit";
import { body, Box, Button, Empty, Field, PageHead, Pill, Toast, WEBSITE, type Said } from "../front-desk/kit";
import { Kept, NotRead } from "../front-desk/StayList";
import { dateTime } from "../guest-services/rules";
import { Day } from "../housekeeping/DayStepper";
import { moveArrival } from "./book";
import { Panel, Said as SaidLine, Sheet } from "./GroupKit";
import { whyNotUnwaitlist, whyNotWaitlist } from "./groupRoles";
import { addToWaitlist, readTypes, readWaitlist, removeFromWaitlist } from "./groupsData";
import { bodyOf, freePill, nightsWord, PARTS, partsOf, typesOf, waitlistTable, wrongOf, type WaitlistEntry, type WaitlistInput } from "./waitlist";

/* ══════════════════════════════════════════════════════════════════
   THE WAITLIST — the web's /h/:code/waitlist (src/modules/reservations/
   pages/Waitlist.tsx, flows/WaitlistDialog.tsx; the 16 Nov release, D27-383
   item 8; not pictured): guests waiting for a room type on nights that
   were full, oldest first, with the rooms of their type free NOW on every
   one of their nights (the server's figure). Three parts: a room is free
   now, still full, arrival has passed. Nothing is booked or told by the
   system; the desk decides.
   Add and Remove: whoever may book (the API's sentence, greyed otherwise);
   refused offline in the web's sentence. Add reads no key: on an unknown
   outcome its button stops until the sheet is closed and the list read
   (MEMORY 16). Remove is safe to repeat. Book opens New booking from the
   entry on the web (?waitlist=): the phone's New booking does not take an
   entry yet, so it is "On the website for now" (MODULE.md).
   ══════════════════════════════════════════════════════════════════ */

export function Waitlist({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const qc = useQueryClient();
  /* AN ADD NOBODY KNOWS THE END OF (MRS-G3, MRS-U2): kept by name outside the sheet AND this screen (it was
     screen state, compared with a read's finish), stopped too while on its way; let go only by a read of
     the waitlist that BEGAN after the loss and came back good. */
  const stop = useScreenStop(`reservations/${code}/waitlist`);
  const read = useRead(stop.watch(() => readWaitlist(code)), ["reservations", code, "waitlist"]);
  const types = useRead(() => readTypes(code), ["reservations", code, "waitlist-types"]);
  const [pulled, setPulled] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<WaitlistEntry | null>(null);
  const [toast, setToast] = useState<Said | null>(null);
  useEffect(() => { if (!read.loading) setPulled(false); }, [read.loading]);
  const addStuck = stop.stuck;
  const stuckLine = notKnown("added", "the Waitlist").line;

  const list = read.data;
  const entries = list?.entries ?? [];
  const parts = partsOf(entries);
  const kinds = typesOf(types.data);
  const addWhy = whyNotWaitlist(role);
  const removeWhy = whyNotUnwaitlist(role);
  const why = (w: string) => { if (w) setToast({ title: w, tone: "bad" }); };
  const reread = () => { void qc.invalidateQueries({ queryKey: ["reservations", code, "waitlist"] }); };

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && read.loading} onRefresh={() => { setPulled(true); read.reload(); types.reload(); }}>
        <PageHead title="Waitlist" description="Guests waiting for a room type on nights that were full, oldest first. The desk decides; nobody is booked or told by the system.">
          <View style={{ gap: 12 }}>
            <ExportButtons table={list ? waitlistTable(entries, hotel.name, dateDay, dateTime) : null} />
            <View style={{ flexDirection: "row" }}>
              <Button label="Put a guest on the waitlist" kind="primary" Icon={Plus} reason={addWhy ?? (addStuck ? stuckLine : kinds.length === 0 ? "" : null)} onRefused={why} onPress={() => setAdding(true)} />
            </View>
            {stop.unknown ? (
              <View accessibilityRole="alert" style={{ gap: 8, padding: space.card, borderRadius: 12, backgroundColor: c.red50 }}>
                <Text style={[t.label, face[600], { color: c.red700 }]}>{stuckLine}</Text>
                <View style={{ flexDirection: "row" }}><Capsule label="Read the waitlist again" onPress={read.reload} /></View>
              </View>
            ) : null}
          </View>
        </PageHead>

        <Kept error={list ? read.error : undefined} what="the waitlist" />
        {!list ? (read.error ? <NotRead what="the waitlist" error={read.error} onRetry={read.reload} />
          : <View style={{ paddingVertical: 24 }}><ActivityIndicator color={c.orange} accessibilityLabel="Reading the waitlist" /></View>)
          : entries.length === 0 ? (
            <Card><Empty title="Nobody is waiting" line="When a room type is full for a guest's nights, put them here from New booking or with the button above." Icon={ListOrdered} /></Card>
          ) : PARTS.map((p) => parts[p.key].length === 0 ? null : (
            <Panel key={p.key} title={p.title} description={p.line}>
              {parts[p.key].map((e, i) => (
                <Row key={e.id} e={e} first={i === 0} canBook={p.book} bookWhy={addWhy ?? WEBSITE} removeWhy={removeWhy} onRefused={why} onRemove={() => setRemoving(e)} />
              ))}
            </Panel>
          ))}
      </Screen>

      {adding ? (
        <AddSheet
          code={code} today={hotel.businessDate} types={kinds} stuck={addStuck} stuckLine={stuckLine} onClose={() => { setAdding(false); reread(); }}
          onUnknown={() => reread()}
          onAdded={(name) => {
            setAdding(false);
            setToast({ title: `${name} is on the waitlist`, body: "When a room frees up for those nights, the Waitlist shows it. Nobody is told by the system.", tone: "ok" });
            reread();
          }}
        />
      ) : null}
      {removing ? (
        <RemoveSheet
          code={code} entry={removing} onClose={() => { setRemoving(null); reread(); }}
          onRemoved={() => {
            setToast({ title: `${removing.guestName} is off the waitlist`, body: "Kept in the record, with who and why.", tone: "ok" });
            setRemoving(null);
            reread();
          }}
        />
      ) : null}
      <Toast said={toast} onClose={() => setToast(null)} />
    </View>
  );
}

function Row({ e, first, canBook, bookWhy, removeWhy, onRefused, onRemove }: {
  e: WaitlistEntry; first: boolean; canBook: boolean; bookWhy: string; removeWhy: string | null; onRefused: (w: string) => void; onRemove: () => void;
}) {
  const pill = freePill(e.free);
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, minHeight: 56, gap: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8 }}>
          <Text style={[t.heading, face[500]]}>{e.guestName}</Text>
          {/* A phone on screen opens the dialler (NATIVE.md); withheld from a role that reads no guests. */}
          {e.phone ? (
            <Pressable onPress={() => void Linking.openURL(`tel:${e.phone}`)} accessibilityRole="link" accessibilityLabel={`Call ${e.guestName}, ${e.phone}`} hitSlop={8}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 }}>
              <Phone size={12} color={c.orange700} />
              <Text style={[t.label, t.tab, body, { color: c.orange700 }]}>{e.phone}</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>
          {`${e.roomType} · `}<Text style={t.tab}>{`${dateDay(e.arrival)} → ${dateDay(e.departure)}`}</Text>{` · ${nightsWord(e.arrival, e.departure)}`}
        </Text>
        {e.note ? <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>{e.note}</Text> : null}
        <Text style={t.caption}>{`Added ${dateTime(e.createdAt)}${e.addedBy ? ` by ${e.addedBy}` : ""}`}</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {pill ? <Pill tone={pill.tone}>{pill.label}</Pill> : null}
        <View style={{ flex: 1 }} />
        {canBook ? <Button label="Book" size="sm" reason={bookWhy} onRefused={onRefused} onPress={() => undefined} /> : null}
        <Button label="Remove" size="sm" reason={removeWhy} onRefused={onRefused} onPress={onRemove} />
      </View>
    </View>
  );
}

/** WaitlistDialog.tsx: name, phone, the nights, the room type, a note. */
function AddSheet({ code, today, types, stuck, stuckLine, onClose, onAdded, onUnknown }: {
  code: string; today: string; types: Array<{ id: string; name: string }>; stuck: boolean; stuckLine: string;
  onClose: () => void; onAdded: (name: string) => void;
  /** Told to the SCREEN, which keeps the moment whatever becomes of this sheet. */
  onUnknown: () => void;
}) {
  /* The web's date boxes start empty; a day stepper needs a day (M-7): the business date and one night. */
  const [form, setForm] = useState<WaitlistInput>({ guestName: "", phone: "", roomTypeId: types[0]?.id ?? "", arrival: today, departure: addDays(today, 1), note: "" });
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const adding = useScreenStop(`reservations/${code}/waitlist`);
  /* This sheet stays dead after an unknown add until it is closed, even if a read lets the screen go. */
  const [dead, setDead] = useState(false);
  const going = useRef(false);
  const set = (k: keyof WaitlistInput) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const wrong = wrongOf(form);

  async function save() {
    if (going.current || dead || stuck || adding.isStuck()) return;
    going.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await adding.guard(() => addToWaitlist(code, bodyOf(form)));
      onAdded(form.guestName.trim());
    } catch (e) {
      /* POST /waitlist reads no key: a second tap after a lost reply would put them on twice. */
      if (outcomeUnknown(e)) { setDead(true); onUnknown(); setSaid(notKnown("added", "the Waitlist", e).line); }
      else setSaid(`Not added. ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      going.current = false;
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Put on the waitlist" onClose={onClose} busy={busy}
      description="For nights and a room type that are full. When a room frees up, the Waitlist shows it; the desk decides."
      foot={(
        <>
          <Button label="Cancel" reason={busy ? "" : null} onPress={onClose} />
          <Button label="Add to the waitlist" kind="primary" busy={busy}
            reason={dead || stuck ? stuckLine : wrong}
            onRefused={(w) => { if (w) setSaid(w); }} onPress={() => void save()} />
        </>
      )}
    >
      <Field label="Guest's name">
        <Box label="Guest's name" value={form.guestName} max={120} tall onChange={set("guestName")} />
      </Field>
      <Field label="Phone">
        <Box label="Phone" value={form.phone} keyboard="phone-pad" tall onChange={set("phone")} />
      </Field>
      <Field label="Arrival">
        <Day label="Arrival" value={form.arrival} min={today} off={false}
          onChange={(v) => { const m = moveArrival(form.arrival, form.departure, v, addDays); setForm((f) => ({ ...f, arrival: m.from, departure: m.to })); }} />
      </Field>
      <Field label="Departure">
        <Day label="Departure" value={form.departure} min={addDays(form.arrival, 1)} off={false} onChange={set("departure")} />
      </Field>
      <Field label="Room type">
        {/* The web's NativeSelect as capsules: no sheet over the sheet. */}
        <Choice label="Room type" value={form.roomTypeId} onPick={set("roomTypeId")} options={types.map((x) => ({ value: x.id, label: x.name }))} />
      </Field>
      <Field label="Note">
        <Box label="Note" value={form.note} max={500} multiline placeholder="Would take another type; call after 6 pm" onChange={set("note")} />
      </Field>
      {wrong && form.guestName.trim() ? <SaidLine text={wrong} /> : null}
      <SaidLine text={said} />
    </Sheet>
  );
}

/** Waitlist.tsx's "Take off the waitlist" dialog, with its optional why. */
function RemoveSheet({ code, entry: e, onClose, onRemoved }: { code: string; entry: WaitlistEntry; onClose: () => void; onRemoved: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const going = useRef(false);

  async function remove() {
    if (going.current) return;
    going.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await removeFromWaitlist(code, e.id, reason.trim());
      onRemoved();
    } catch (x) {
      /* Safe to repeat (the server answers "no longer on the waitlist"), but said as unknown. */
      setSaid(outcomeUnknown(x) ? notKnown("removed", "the Waitlist", x).line : `Not removed. ${x instanceof Error ? x.message : String(x)}`);
    } finally {
      going.current = false;
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Take off the waitlist" onClose={onClose} busy={busy}
      description={`${e.guestName}, ${e.roomType}, ${dateDay(e.arrival)} → ${dateDay(e.departure)}. Kept in the record.`}
      foot={(
        <>
          <Button label="Cancel" reason={busy ? "" : null} onPress={onClose} />
          <Button label="Remove" kind="primary" busy={busy} onPress={() => void remove()} />
        </>
      )}
    >
      <Field label="Why (optional)">
        <Box label="Why (optional)" value={reason} max={200} tall placeholder="Booked elsewhere; no longer coming" onChange={setReason} />
      </Field>
      <SaidLine text={said} />
    </Sheet>
  );
}
