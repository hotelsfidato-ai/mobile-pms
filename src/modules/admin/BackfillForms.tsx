import { useRef, useState, type ReactNode } from "react";
import { Switch, Text, View } from "react-native";
import { outcomeUnknown, type Hotel } from "../../core/api";
import { DateField } from "../../core/DateField";
import { c, face, t } from "../../core/theme";
import { keys, notKnown, type useScreenStop } from "../../core/ui";
import { ID_TYPES } from "../front-desk/guestId";
import { Returning } from "../reservations/NewBooking";
import { addBackfill, correctBackfill } from "./data";
import { Btn, Choose, Field, Segmented, Sheet, body, type Said } from "./kit";
import {
  backfillSaved, billBody, billForm, billReady, cashBody, cashForm, cashReady, dateShort, dayBeforeFirst, isForeign, sendWhy, stayBody,
  stayForm, stayReady, type BackfillBill, type BackfillCash, type BackfillKind, type BackfillStay, type BackfillView, type BillForm,
  type CashForm, type StayForm,
} from "./rules";

/* ══════════════════════════════════════════════════════════════════
   BACKFILL'S THREE FORMS on a phone (M-16, 20 Nov) — the web's StayDialog,
   BillDialog and CashDialog (backfill/BackfillPage.tsx), each a sheet, each
   field as the web's, its days on each phone's own date picker (DateField):
   a bill's, a cash line's and an arrival before the hotel's first day, a
   departure by it (the web's max). Add (POST) or Correct (PUT, with the
   reason the web asks); the server decides who and which days, and its
   refusal is said in the sheet, which stays open.

   ONE TAP, ONE WRITE, and the doubt outlives the sheet (MEMORY 8, 16, 22):
   each save goes through the screen's stop (the core's book, kept by
   hotel outside React). Add reads no key and a repeat makes a SECOND line
   (and a stay's ticked bill goes again): after an unknown outcome every
   Add, Correct and Remove is grey until a read of the registers begun
   after it. A figure nobody typed is null (a dash), never 0; paise as typed.
   ══════════════════════════════════════════════════════════════════ */

type Stop = ReturnType<typeof useScreenStop>;

/** The screen's write: latched at the tap, guarded by the screen's stop, its three endings said by the caller. */
export function useBackfillWrite(stop: Stop) {
  const latch = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = async <T,>(fn: () => Promise<T>, on: { ok: (r: T) => void; no: (e: unknown) => void; unknown: (e: unknown) => void }) => {
    if (latch.current || stop.isStuck()) return;
    latch.current = true;
    setBusy(true);
    try { on.ok(await stop.guard(fn)); }
    catch (e) { if (outcomeUnknown(e)) on.unknown(e); else on.no(e); }
    finally { latch.current = false; setBusy(false); }
  };
  return { busy, stuck: stop.stuck, run };
}
export type BackfillWrite = ReturnType<typeof useBackfillWrite>;

export type Editing =
  | { kind: "stays"; row: BackfillStay | null }
  | { kind: "bills"; row: BackfillBill | null }
  | { kind: "cash"; row: BackfillCash | null };

/** The open form, by kind. */
export function BackfillForm({ editing, hotel, v, w, onSaid, onClose }: {
  editing: Editing; hotel: Hotel; v: BackfillView; w: BackfillWrite; onSaid: (s: Said) => void; onClose: () => void;
}) {
  const p = { hotel, v, w, onSaid, onClose };
  return editing.kind === "stays" ? <StaySheet {...p} row={editing.row} />
    : editing.kind === "bills" ? <BillSheet {...p} row={editing.row} /> : <CashSheet {...p} row={editing.row} />;
}

type Props = { hotel: Hotel; v: BackfillView; w: BackfillWrite; onSaid: (s: Said) => void; onClose: () => void };

/** FormDialog: the fields, the correction's reason, the server's refusal in the sheet, Cancel and Save. */
function FormSheet({ title, w, ready, correcting, reason, setReason, said, onSave, onClose, children }: {
  title: string; w: BackfillWrite; ready: boolean; correcting: boolean; reason: string; setReason: (r: string) => void;
  said: string | null; onSave: () => void; onClose: () => void; children: ReactNode;
}) {
  return (
    <Sheet open title={title} onClose={onClose} closable={!w.busy}
      footer={<>
        <Btn label="Cancel" onPress={onClose} disabled={w.busy} grow />
        <Btn label={w.busy ? "Saving…" : "Save"} variant="primary" grow disabled={w.busy || w.stuck || !ready || (correcting && !reason.trim())} onPress={onSave} />
      </>}>
      {children}
      {correcting ? (
        <Field label="Why it is being corrected" required multiline maxLength={300} value={reason} onChangeText={setReason}
          hint="Kept with the record and in the audit log." />
      ) : null}
      {said ? <Text accessibilityRole="alert" style={[body, { color: c.red700 }]}>{said}</Text> : null}
      {w.stuck && !said ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("saved", "the register").line} Close this to read it again.</Text> : null}
    </Sheet>
  );
}

/** The save's three endings (BackfillPage `saved`), the same for the three forms. */
function useSave({ w, onSaid, onClose }: Pick<Props, "w" | "onSaid" | "onClose">) {
  const [said, setSaid] = useState<string | null>(null);
  const save = (fn: () => Promise<{ sent?: true | string | null }>) => {
    setSaid(null);
    void w.run(fn, {
      ok: (r) => { onSaid(backfillSaved(r.sent)); onClose(); },
      no: (e) => setSaid(`Not saved: ${e instanceof Error ? e.message : String(e)}`),
      unknown: (e) => setSaid(`${notKnown("saved", "the register", e).title}. Close this and look at the register before trying again.`),
    });
  };
  return { said, save };
}

/** Money: blank is "not recorded (a dash)", never 0. */
function Money({ label, value, set, hint }: { label: string; value: string; set: (v: string) => void; hint?: string }) {
  return <Field label={label} value={value} onChangeText={set} input={keys.amount} hint={hint ?? "Blank: not recorded (a dash)."} />;
}
/** The hotel's payment methods; "Not recorded" for none. */
function Method({ v, value, set, label = "Paid by" }: { v: BackfillView; value: string; set: (m: string) => void; label?: string }) {
  return <Choose label={label} value={value} none="Not recorded" choices={v.methods.map((m) => ({ value: m, label: m }))} onChange={set} />;
}

function StaySheet({ hotel, v, w, onSaid, onClose, row }: Props & { row: BackfillStay | null }) {
  const [f, setF] = useState<StayForm>(() => stayForm(v, row));
  const [chosen, setChosen] = useState<{ id: string; name: string } | null>(null);
  const [sendBill, setSendBill] = useState(false);
  const [reason, setReason] = useState("");
  const { said, save } = useSave({ w, onSaid, onClose });
  const set = (key: keyof StayForm) => (value: string) => setF((x) => ({ ...x, [key]: value }));
  const foreign = isForeign(f);
  const why = sendWhy(v, f.email);
  const sent = stayBody(f, chosen?.id ?? null, sendBill, why);
  const kind: BackfillKind = "stays";
  return (
    <FormSheet title={row ? `Correct ${row.guestName}'s stay` : "Add a stay"} w={w} ready={stayReady(f)} correcting={!!row}
      reason={reason} setReason={setReason} said={said} onClose={onClose}
      onSave={() => save(() => (row ? correctBackfill(hotel.code, kind, row.id, { ...sent, reason }) : addBackfill(hotel.code, kind, sent)))}>
      <Field label="Guest's name" required value={f.guestName} onChangeText={set("guestName")} input={keys.name} />
      <Field label="Phone" value={f.phone} onChangeText={(x) => { set("phone")(x); setChosen(null); }} input={keys.phone} />
      <Field label="Email" hint="Optional." value={f.email} onChangeText={(x) => { set("email")(x); setChosen(null); }} input={keys.email} />
      {!row ? <Returning code={hotel.code} phone={f.phone} email={f.email} chosen={chosen} onChoose={setChosen} /> : null}
      <Field label="Nationality" hint="Two letters: IN, GB, US..." maxLength={2} value={f.nationality} input={keys.code}
        onChangeText={(x) => set("nationality")(x.toUpperCase())} />
      <Choose label="ID" value={foreign ? "passport" : f.idType} disabled={foreign} onChange={set("idType")}
        choices={ID_TYPES.map(([key, words]) => ({ value: key, label: words }))} />
      <Field label={foreign ? "Passport number" : "ID number"} required={!row} value={f.idNumber} onChangeText={set("idNumber")} input={keys.code}
        hint={row ? `Blank keeps ${row.idNumber ?? "the one on file"}.` : undefined} />
      {foreign ? (
        <>
          <Field label="Visa or OCI number" required hint="Not asked of a citizen of Nepal or Bhutan." value={f.visaNumber} onChangeText={set("visaNumber")} input={keys.code} />
          <Field label="Form C reference" hint="If it was filed outside the system. Blank: Form C not recorded." value={f.formCReference} onChangeText={set("formCReference")} input={keys.code} />
        </>
      ) : null}
      <Choose label="Room" value={f.roomId} onChange={set("roomId")} choices={v.rooms.map((r) => ({ value: r.id, label: r.number }))} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Adults" value={f.adults} onChangeText={set("adults")} input={keys.count} maxLength={2} /></View>
        <View style={{ flex: 1 }}><Field label="Children" value={f.children} onChangeText={set("children")} input={keys.count} maxLength={2} /></View>
      </View>
      <DateField label="Arrival" required value={f.arrival} onChange={set("arrival")} hotel={hotel} max={dayBeforeFirst(v.firstDay)} disabled={w.busy} />
      <DateField label="Departure" required value={f.departure} onChange={set("departure")} hotel={hotel} max={v.firstDay} disabled={w.busy}
        hint={`By ${dateShort(v.firstDay)} at the latest.`} />
      <Money label="Rate a night" value={f.rate} set={set("rate")} />
      <Money label="Room charges" value={f.roomCharges} set={set("roomCharges")} />
      <Money label="GST" value={f.gst} set={set("gst")} />
      <Money label="Other charges" value={f.otherCharges} set={set("otherCharges")} />
      {f.otherCharges.trim() !== "" ? (
        <Field label="Other charges were for" required placeholder="Laundry, minibar..." value={f.otherChargesFor} onChangeText={set("otherChargesFor")} />
      ) : null}
      <Money label="What was paid" value={f.paid} set={set("paid")} />
      <Method v={v} value={f.paidBy} set={set("paidBy")} />
      <Field label="The hotel's bill number" hint="As on the paper bill. Blank: no bill (a dash)." value={f.billNumber} onChangeText={set("billNumber")} />
      {!row ? (
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}>
            <Text style={[t.label, { flex: 1, color: why ? c.grey500 : c.ink900, ...face[600] }]}>Send the guest their bill and thank-you</Text>
            <Switch value={sendBill && !why} onValueChange={setSendBill} disabled={!!why || w.busy} accessibilityLabel="Send the guest their bill and thank-you"
              trackColor={{ false: c.grey300, true: c.orange }} thumbColor={c.white} ios_backgroundColor={c.grey300} />
          </View>
          <Text style={[body, { color: c.grey600 }]}>{why ?? "By email, once, when this is saved. It quotes the hotel's bill number and is never called a tax invoice."}</Text>
        </View>
      ) : (
        <Text style={[body, { color: c.grey600 }]}>A correction changes this register only, and never sends the bill again. The guest's own record is corrected on Guest 360.</Text>
      )}
    </FormSheet>
  );
}

function BillSheet({ hotel, v, w, onSaid, onClose, row }: Props & { row: BackfillBill | null }) {
  const [f, setF] = useState<BillForm>(() => billForm(v, row));
  const [reason, setReason] = useState("");
  const { said, save } = useSave({ w, onSaid, onClose });
  const set = (key: keyof BillForm) => (value: string) => setF((x) => ({ ...x, [key]: value }));
  const sent = billBody(f);
  const kind: BackfillKind = "bills";
  return (
    <FormSheet title={row ? "Correct a restaurant bill" : "Add a restaurant bill"} w={w} ready={billReady(f)} correcting={!!row}
      reason={reason} setReason={setReason} said={said} onClose={onClose}
      onSave={() => save(() => (row ? correctBackfill(hotel.code, kind, row.id, { ...sent, reason }) : addBackfill(hotel.code, kind, sent)))}>
      <Choose label="Restaurant" value={f.outletId} onChange={set("outletId")} choices={v.outlets.map((o) => ({ value: o.id, label: o.name }))} />
      <DateField label="Date" required value={f.billDate} onChange={set("billDate")} hotel={hotel} max={dayBeforeFirst(v.firstDay)} disabled={w.busy} />
      <Field label="The hotel's bill number" hint="Blank: no bill (a dash)." value={f.billNumber} onChangeText={set("billNumber")} />
      <Method v={v} value={f.paidBy} set={set("paidBy")} label="How it was paid" />
      <Money label="Amount before GST" value={f.amount} set={set("amount")} />
      <Money label="GST" value={f.gst} set={set("gst")} />
      <Money label="Total" value={f.total} set={set("total")} hint="As on the bill. Blank: not recorded (a dash)." />
      <Field label="Note" maxLength={300} value={f.note} onChangeText={set("note")} />
    </FormSheet>
  );
}

function CashSheet({ hotel, v, w, onSaid, onClose, row }: Props & { row: BackfillCash | null }) {
  const [f, setF] = useState<CashForm>(() => cashForm(row));
  const [reason, setReason] = useState("");
  const { said, save } = useSave({ w, onSaid, onClose });
  const set = <K extends keyof CashForm>(key: K) => (value: CashForm[K]) => setF((x) => ({ ...x, [key]: value }));
  const sent = cashBody(f);
  const kind: BackfillKind = "cash";
  return (
    <FormSheet title={row ? "Correct a cash line" : "Add cash in or out"} w={w} ready={cashReady(f)} correcting={!!row}
      reason={reason} setReason={setReason} said={said} onClose={onClose}
      onSave={() => save(() => (row ? correctBackfill(hotel.code, kind, row.id, { ...sent, reason }) : addBackfill(hotel.code, kind, sent)))}>
      <DateField label="Date" required value={f.cashDate} onChange={set("cashDate")} hotel={hotel} max={dayBeforeFirst(v.firstDay)} disabled={w.busy} />
      <View style={{ gap: 6 }}>
        <Text style={[t.label, { color: c.grey700 }]}>Money in or out<Text style={{ color: c.red700 }}> *</Text></Text>
        <Segmented label="Money in or out" value={f.direction} onChange={set("direction")}
          options={[{ value: "in", label: "Money in" }, { value: "out", label: "Money out" }]} />
      </View>
      <Money label="Amount" value={f.amount} set={set("amount")} hint="Required." />
      <Field label="What for" required maxLength={200} value={f.purpose} onChangeText={set("purpose")} />
      <Field label="Who" required hint="Who paid it in, or took it." maxLength={120} value={f.person} onChangeText={set("person")} input={keys.name} />
    </FormSheet>
  );
}
