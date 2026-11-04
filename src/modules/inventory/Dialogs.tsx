import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { c } from "../../core/theme";
import { setBase, setRestriction } from "./data";
import { Btn, DayStep, Dialog, Field, InDialog, Input, Select, Tick, Toggle, body, saidOf, type Said } from "./kit";
import {
  addDays, baseBody, baseDone, dateShort, daysThrough, priceOf, restrictionBody, spanWords, typedNights, typedPrice,
  type Restriction,
} from "./rates";

/* ══════════════════════════════════════════════════════════════════
   THE QUICK CHANGE — Rates.tsx BaseDialog (837-947) and RestrictionDialog
   (1022-1161), on a phone. One write each, through `send()`; latched at
   the tap so two taps are one write (MEMORY 8). What the person typed is
   sent as typed (rates.ts baseBody); what the grid shows afterwards is the
   server's, read again, never the typed figure. A refusal stays in the
   dialog in the server's own words; offline it is the web's sentence for
   a write it does not hold (send's 503).
   ══════════════════════════════════════════════════════════════════ */

export type PriceTarget = { roomTypeId: string; roomType: string; date: string; price: number | null };

/** A tapped price (one room type, from its day), or "Set prices" (`types`:
    the room type and the first day are chosen here) - one dialog, one call. */
export function BaseDialog({ code, target, types, onClose, onDone }: {
  code: string; target: PriceTarget; types?: { id: string; name: string }[];
  onClose: () => void; onDone: (said: Said) => void;
}) {
  const [typeId, setTypeId] = useState(target.roomTypeId);
  const [from, setFrom] = useState(target.date);
  const roomType = types?.find((x) => x.id === typeId)?.name ?? target.roomType;
  const [text, setText] = useState(target.price === null || target.price === 0 ? "" : String(target.price));
  /* X-1 (D27-120): 0 only when ticked Free; empty is not priced yet. */
  const [free, setFree] = useState(target.price === 0);
  const [until, setUntil] = useState(target.date);
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);

  async function save(clearing: boolean) {
    const sent = baseBody({ roomTypeId: typeId, from, until, text, free, clearing });
    if (!sent || latch.current) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await setBase(code, sent);
      onDone({ title: clearing ? "Base cleared" : "Base set", body: baseDone(roomType, from, until), tone: "ok" });
      onClose();
    } catch (e) {
      setSaid(saidOf("Not saved", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog title={types ? "Set prices" : `${roomType} · base`} onClose={onClose}>
      {types ? (
        <>
          <Field label="Room type">
            <Select label="Room type" value={typeId} onChange={setTypeId} options={types.map((x) => ({ value: x.id, label: x.name }))} />
          </Field>
          <Field label="From" hint="The first day this base applies to.">
            <DayStep label="From" value={from} step={addDays} onChange={(d) => { setFrom(d); if (until < d) setUntil(d); }} />
          </Field>
        </>
      ) : null}
      <Field label="Base per night" hint="One guest, room only. The add-ons follow it.">
        <Input label="Base per night" big autoFocus keyboardType="decimal-pad" value={free ? "0" : text} disabled={free} onChangeText={(v) => setText(typedPrice(v))} />
      </Field>
      <Tick label="Free" on={free} onChange={setFree} />
      <Field label="Through" hint="The last day this base applies to.">
        <DayStep label="Through" value={until} min={from} step={addDays} onChange={setUntil} />
      </Field>
      <Text style={[body, { color: c.grey600 }]}>{spanWords(from, until)}</Text>
      <InDialog said={said} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label="Cancel" grow onPress={onClose} />
        {target.price !== null ? <Btn label="Clear" disabled={busy} onPress={() => void save(true)} /> : null}
        <Btn label={busy ? "Saving…" : "Set base"} variant="primary" grow disabled={busy || (!free && priceOf(text) === null)} onPress={() => void save(false)} />
      </View>
    </Dialog>
  );
}

export type DayTarget = { roomTypeId: string; roomType: string; date: string };

/** A day's restrictions for one room type, through a later day: stop sell
    (close the day; untick to open it), closed to arrival or departure, and
    the nights a stay must keep. Clearing everything removes the rule. */
export function RestrictionDialog({ code, target, existing, onClose, onDone }: {
  code: string; target: DayTarget; existing: Restriction | undefined;
  onClose: () => void; onDone: (said: Said) => void;
}) {
  const [stopSell, setStopSell] = useState(existing?.stopSell ?? false);
  const [coa, setCoa] = useState(existing?.closedArrival ?? false);
  const [cod, setCod] = useState(existing?.closedDeparture ?? false);
  const [min, setMin] = useState(existing?.minNights?.toString() ?? "");
  const [max, setMax] = useState(existing?.maxNights?.toString() ?? "");
  const [until, setUntil] = useState(target.date);
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const days = daysThrough(target.date, until);

  async function save() {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await setRestriction(code, restrictionBody({
        roomTypeId: target.roomTypeId, from: target.date, until, stopSell, closedArrival: coa, closedDeparture: cod, min, max,
      }));
      onDone({ title: "Applied", body: `${target.roomType} · ${days} ${days === 1 ? "day" : "days"}`, tone: "ok" });
      onClose();
    } catch (e) {
      setSaid(saidOf("Not saved", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog title={`${target.roomType} · ${dateShort(target.date)}`} onClose={onClose}>
      <View style={{ gap: 12 }}>
        <Toggle on={stopSell} onChange={setStopSell} label="Stop sell" hint="Nothing may be booked at all" />
        <Toggle on={coa} onChange={setCoa} label="Closed to arrival" hint="A stay may not begin here - protects a long weekend" />
        <Toggle on={cod} onChange={setCod} label="Closed to departure" hint="A stay may not end here" />
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Minimum nights"><Input label="Minimum nights" keyboardType="number-pad" value={min} onChangeText={(v) => setMin(typedNights(v))} /></Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Maximum nights"><Input label="Maximum nights" keyboardType="number-pad" value={max} onChangeText={(v) => setMax(typedNights(v))} /></Field>
        </View>
      </View>
      <Field label="Through" hint="Apply the same rules to every day up to here.">
        <DayStep label="Through" value={until} min={target.date} step={addDays} onChange={setUntil} />
      </Field>
      <Text style={[body, { color: c.grey600 }]}>
        {spanWords(target.date, until)} Clearing everything removes the rule rather than storing a row that says nothing.
      </Text>
      <InDialog said={said} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label="Cancel" grow onPress={onClose} />
        <Btn label={busy ? "Applying…" : "Apply"} variant="primary" grow disabled={busy} onPress={() => void save()} />
      </View>
    </Dialog>
  );
}
