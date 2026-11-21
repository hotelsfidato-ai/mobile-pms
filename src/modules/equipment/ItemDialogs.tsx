import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { HeldError, outcomeUnknown } from "../../core/api";
import type { KeyKeeper } from "../../core/keys";
import { DateField } from "../../core/DateField";
import { c, t } from "../../core/theme";
import { notKnown, useRead, useStuck } from "../../core/ui";
import { body, Btn, Dialog, Field, Foot, InDialog, Input, Loading, saidOf, Segmented, Select, type Said } from "../housekeeping/careKit";
import { PRIORITIES, REPAIR_KINDS } from "../housekeeping/repair";
import { editEquipment, moveEquipment, raiseRepair, readOptions, retireEquipment, setEquipmentStatus } from "./data";
import {
  askCount, changesOf, countHint, countOf, leaves, movedWords, whyNotMove, whyNotRetire, type EquipmentItem,
} from "./registerRules";

/* ══════════════════════════════════════════════════════════════════
   WHAT CAN HAPPEN TO ONE THING - the web's flows/ItemDialogs.tsx: change
   its details · move it (or ask to take it out of the store) · under
   repair / back in use · retire it; and, from housekeeping's ItemRepairs,
   report a repair on it (RepairFlow with the item fixed).
   PART OF A COUNT: on a counted line a move, a status or a retirement may
   take some of the pieces; blank is all of them.
   ONE TAP, ONE WRITE: each dialog latches its tap; the register's routes
   read no key, so on an unknown outcome the dialog takes no more taps until
   it is closed and the item read again (MEMORY 16). The repair reads the
   key, so its form sends one key on every try (MHK-3) and may be held
   offline, as the web holds a work order.
   ══════════════════════════════════════════════════════════════════ */

export interface Done { landedOn: string; said: Said }
interface Props {
  code: string; item: EquipmentItem; onClose: () => void; onDone: (d: Done) => void;
  /** An unknown outcome: the SCREEN keeps the mark, so a reopened dialog cannot repeat it (the review's H3). */
  onLost: (at: number) => void;
}

/** The shared catch: an unknown outcome sticks the dialog; anything else is the server's no. */
function useWrite(what: string, done: string, onLost: (at: number) => void) {
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useStuck();
  async function run(fn: () => Promise<void>) {
    if (latch.current || stuck.isStuck()) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await fn();
    } catch (e) {
      if (stuck.stop(e)) {
        onLost(Date.now());
        const k = notKnown(done, "this item once it is read again", e);
        setSaid({ title: k.title, body: k.body, tone: "held" });
      } else setSaid(saidOf(what, e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }
  return { said, busy, stuck: stuck.stuck, run };
}

function CountField({ item, value, onChange, what }: { item: EquipmentItem; value: string; onChange: (v: string) => void; what: string }) {
  if (!askCount(item)) return null;
  return (
    <Field label={`How many of the ${item.quantity}`} hint={countHint(item, what)}>
      <Input label={`How many of the ${item.quantity}`} value={value} onChangeText={onChange} placeholder={String(item.quantity)} keyboardType="number-pad" inputMode="numeric" />
    </Field>
  );
}

function Why({ text }: { text: string | null }) {
  return text ? <Text style={[t.caption, { color: c.grey600 }]}>{text}</Text> : null;
}

/* ── Details ──────────────────────────────────────────────────────── */

export function EditDialog({ code, item, hotel, onClose, onDone, onLost }: Props & { hotel: { today?: string; businessDate: string } }) {
  const options = useRead(() => readOptions(code), ["equipment", code, "options"]);
  const o = options.data;
  const [f, setF] = useState({
    name: item.name, category: item.category ?? "", tag: item.tag ?? "", supplierId: item.supplierId ?? "",
    unitCost: item.unitCost === null ? "" : String(item.unitCost),
    purchaseDate: item.purchaseDate ?? "", warrantyEnds: item.warrantyEnds ?? "", amcEnds: item.amcEnds ?? "",
  });
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const w = useWrite("Not saved", "saved", onLost);
  const why = w.stuck ? "Not known whether it was saved: close this and look at the item first." : f.name.trim() ? null : "What is it called?";
  const suppliers = [{ value: "", label: "Not known" },
    ...(item.supplierId && !o?.suppliers.some((s) => s.id === item.supplierId) ? [{ value: item.supplierId, label: item.supplier ?? "-" }] : []),
    ...(o?.suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))];

  return (
    <Dialog title="Change the details" description={item.name} onClose={onClose} busy={w.busy}>
      {!o && !options.error ? <Loading words="Reading the suppliers and categories…" /> : (
        <>
          <Field label="What is it" required><Input label="What is it" value={f.name} onChangeText={(v) => set({ name: v })} /></Field>
          <Field label="Category" hint="Pick one this property already uses, or type a new one.">
            <Input label="Category" value={f.category} onChangeText={(v) => set({ category: v })} />
            {o?.categories.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {o.categories.map((k) => <Btn key={k.id} label={k.name} variant={f.category === k.name ? "primary" : "secondary"} onPress={() => set({ category: k.name })} />)}
              </View>
            ) : null}
          </Field>
          {item.heldAs === "tagged" ? (
            <Field label="Tag" required><Input label="Tag" value={f.tag} onChangeText={(v) => set({ tag: v })} autoCapitalize="characters" /></Field>
          ) : null}
          <Field label="Supplier">
            <Select label="Supplier" value={f.supplierId} onChange={(v) => set({ supplierId: v })} options={suppliers}
              disabled={(o?.suppliers.length ?? 0) === 0 && !item.supplierId} />
          </Field>
          <Field label={item.heldAs === "counted" ? "Cost of one, in rupees" : "Cost, in rupees"} hint="Blank if nobody knows. It shows a dash, never zero.">
            <Input label="Cost, in rupees" value={f.unitCost} onChangeText={(v) => set({ unitCost: v })} keyboardType="decimal-pad" inputMode="decimal" />
          </Field>
          {/* The phone's own date picker (M-16); emptied is null ("nobody knows"), and only a changed day is sent. */}
          <DateField label="Bought on" clearable value={f.purchaseDate} onChange={(v) => set({ purchaseDate: v })} hotel={hotel} />
          <DateField label="Warranty ends" clearable value={f.warrantyEnds} onChange={(v) => set({ warrantyEnds: v })} hotel={hotel} />
          <DateField label="Service contract (AMC) ends" clearable value={f.amcEnds} onChange={(v) => set({ amcEnds: v })} hotel={hotel} />
        </>
      )}
      <InDialog said={w.said} />
      <Foot>
        <Btn label="Cancel" grow tall disabled={w.busy} onPress={onClose} />
        <Btn label="Save" variant="primary" grow tall busy={w.busy} disabled={Boolean(why) || !o}
          onPress={() => void w.run(async () => {
            const res = await editEquipment(code, item.id, changesOf(item, f));
            onDone({ landedOn: item.id, said: { title: res.changed ? "Saved" : "Nothing had changed", tone: "ok" } });
          })} />
      </Foot>
      {!w.said ? <Why text={why} /> : null}
    </Dialog>
  );
}

/* ── Moving it ────────────────────────────────────────────────────── */

export function MoveDialog({ code, item, mayEdit, onClose, onDone, onLost }: Props & { mayEdit: boolean }) {
  const options = useRead(() => readOptions(code), ["equipment", code, "options"]);
  const o = options.data;
  const fromStore = item.placeKind === "store";
  const [whereKind, setWhereKind] = useState<"room" | "place">("room");
  const [roomId, setRoomId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [count, setCount] = useState("");
  const [note, setNote] = useState("");
  const w = useWrite("Not moved", "moved", onLost);

  const where = whereKind === "room" ? roomId : locationId;
  const toKind = whereKind === "room" ? "room" : (o?.places.find((p) => p.id === locationId)?.kind ?? null);
  const leaving = leaves(item, toKind, where !== "", mayEdit);
  /* Somebody who may only look is offered only the places that are an ask. */
  const places = (o?.places ?? []).filter((p) => p.id !== item.locationId && (mayEdit || (fromStore && p.kind !== "store")));
  const why = w.stuck ? "Not known whether it moved: close this and look at the item first." : whyNotMove(where !== "", leaving, note);

  return (
    <Dialog title={fromStore && !mayEdit ? "Ask to take it out of the store" : "Move it"} description={`${item.name} · now in ${item.place}`} onClose={onClose} busy={w.busy}>
      {!o ? (options.error ? <Text style={[body, { color: c.red700 }]}>{options.error}</Text> : <Loading words="Reading the rooms and places…" />) : (
        <>
          <Segmented label="Where to" value={whereKind} onChange={setWhereKind}
            options={[{ value: "room", label: "To a room" }, { value: "place", label: "To another place" }]} />
          {whereKind === "room" ? (
            <Select label="Room" value={roomId} placeholder="Choose a room" onChange={setRoomId}
              options={o.rooms.filter((r) => r.id !== item.roomId).map((r) => ({ value: r.id, label: `Room ${r.number}` }))} />
          ) : places.length === 0 ? (
            <Text style={body}>{o.places.length === 0 ? "No places other than rooms are set up at this property yet." : "There is no other place this can go from here."}</Text>
          ) : (
            <Select label="Place" value={locationId} placeholder="Choose a place" onChange={setLocationId}
              options={places.map((p) => ({ value: p.id, label: `${p.name}${p.kind === "store" ? " (a store)" : ""}` }))} />
          )}
          <CountField item={item} value={count} onChange={setCount} what={leaving ? "asks for" : "moves"} />
          {leaving ? (
            <View style={{ borderRadius: 8, borderWidth: 1, borderColor: c.yellow100, backgroundColor: c.yellow50, padding: 12 }}>
              <Text style={[body, { color: c.ink900 }]}>
                This takes it out of the store, so it is asked for. It stays in the store until the Inventory Manager approves it - or the owner, an administrator or the general manager when they are away.
              </Text>
            </View>
          ) : null}
          <Field label="Why" required={leaving} hint={leaving ? "The person deciding reads this." : "Optional. It is kept with the move."}>
            <Input label="Why" value={note} onChangeText={setNote} />
          </Field>
        </>
      )}
      <InDialog said={w.said} />
      <Foot>
        <Btn label="Cancel" grow tall disabled={w.busy} onPress={onClose} />
        <Btn label={leaving ? "Ask" : "Move"} variant="primary" grow tall busy={w.busy} disabled={Boolean(why) || !o}
          onPress={() => void w.run(async () => {
            const n = countOf(item, count);
            const res = await moveEquipment(code, item.id, {
              ...(whereKind === "room" ? { roomId } : { locationId }), ...(n !== undefined ? { count: n } : {}), ...(note.trim() ? { note: note.trim() } : {}),
            });
            onDone({ landedOn: res.id, said: { title: movedWords(res), tone: "ok" } });
          })} />
      </Foot>
      {!w.said ? <Why text={o ? why : null} /> : null}
    </Dialog>
  );
}

/* ── Under repair, or back in use ─────────────────────────────────── */

export function StatusDialog({ code, item, onClose, onDone, onLost }: Props) {
  const to = item.status === "under_repair" ? "in_use" : "under_repair";
  const [count, setCount] = useState("");
  const [note, setNote] = useState("");
  const w = useWrite("Not changed", "changed", onLost);
  return (
    <Dialog title={to === "under_repair" ? "Mark it under repair" : "Mark it back in use"} description={item.name} onClose={onClose} busy={w.busy}>
      <CountField item={item} value={count} onChange={setCount} what="marks" />
      <Field label="What is wrong, or what was done" hint="Optional. It is kept with the change.">
        <Input label="What is wrong, or what was done" value={note} onChangeText={setNote} />
      </Field>
      <InDialog said={w.said} />
      <Foot>
        <Btn label="Cancel" grow tall disabled={w.busy} onPress={onClose} />
        <Btn label={to === "under_repair" ? "Under repair" : "Back in use"} variant="primary" grow tall busy={w.busy} disabled={w.stuck}
          onPress={() => void w.run(async () => {
            const n = countOf(item, count);
            const res = await setEquipmentStatus(code, item.id, { status: to, ...(n !== undefined ? { count: n } : {}), ...(note.trim() ? { note: note.trim() } : {}) });
            onDone({ landedOn: res.id, said: { title: to === "under_repair" ? "Marked under repair" : "Back in use", tone: "ok" } });
          })} />
      </Foot>
    </Dialog>
  );
}

/* ── Retiring it ──────────────────────────────────────────────────── */

export function RetireDialog({ code, item, waits, onClose, onDone, onLost }: Props & { waits: boolean }) {
  const [reason, setReason] = useState("");
  const [count, setCount] = useState("");
  const w = useWrite("Not retired", "retired", onLost);
  const why = w.stuck ? "Not known whether it was retired: close this and look at the item first." : whyNotRetire(reason);
  return (
    <Dialog
      title={waits ? "Ask to retire it" : "Retire it"}
      description={waits
        ? `${item.name} is tagged, so retiring it waits in the approvals inbox for the Inventory Manager - or the owner, an administrator or the general manager when they are away.`
        : `${item.name}. It stays in the register as retired, with who, when and why - nothing is deleted.`}
      onClose={onClose} busy={w.busy}
    >
      <CountField item={item} value={count} onChange={setCount} what="retires" />
      <Field label="Why" required hint="Broken beyond repair, lost, sold, given away.">
        <Input label="Why" value={reason} onChangeText={setReason} rows={3} />
      </Field>
      <InDialog said={w.said} />
      <Foot>
        <Btn label="Cancel" grow tall disabled={w.busy} onPress={onClose} />
        <Btn label={waits ? "Ask to retire" : "Retire"} variant="danger" grow tall busy={w.busy} disabled={Boolean(why)}
          onPress={() => void w.run(async () => {
            const n = countOf(item, count);
            const res = await retireEquipment(code, item.id, { reason: reason.trim(), ...(n !== undefined ? { count: n } : {}) });
            onDone({ landedOn: res.id, said: { title: res.requested ? "Sent to the approvals inbox" : "Retired", tone: "ok" } });
          })} />
      </Foot>
      {!w.said ? <Why text={why} /> : null}
    </Dialog>
  );
}

/* ── A repair on it (RepairFlow, the item fixed) ──────────────────── */

const KINDS = REPAIR_KINDS.map((k) => ({ value: k, label: k }));
const LEVELS = PRIORITIES.map((p) => ({ value: p.value, label: p.label }));

export function RepairDialog({ code, item, keeper, onClose, onDone, onLost }: Props & {
  /** The SCREEN's keeper for this repair: POST /work-orders reads the key, so a reopened form after a
      lost reply sends the same key and the server answers with the first repair (the review's H4). */
  keeper: KeyKeeper;
}) {
  const [what, setWhat] = useState("");
  const [detail, setDetail] = useState("");
  const [kind, setKind] = useState<string>("maintenance");
  const [priority, setPriority] = useState<string>("normal");
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const room = item.roomId ? item.place.replace(/^Room /, "") : null;
  const why = what.trim() ? null : "What needs fixing?";

  async function raise() {
    if (latch.current || why) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await raiseRepair(code, {
        title: what.trim(), detail: detail.trim(), category: kind, priority, ...(room ? { roomNumber: room } : {}), equipmentItemId: item.id,
      }, keeper);
      onDone({ landedOn: item.id, said: { title: "Repair raised", body: `${item.name} (${item.tag ?? "-"}) is under repair.`, tone: "ok" } });
    } catch (e) {
      /* Held on this phone, as the web holds a work order: never a failure. */
      if (e instanceof HeldError) onDone({ landedOn: item.id, said: saidOf("", e) });
      else if (outcomeUnknown(e)) {
        onLost(Date.now());
        const k = notKnown("raised", "this item's repairs", e);
        setSaid({ title: k.title, body: `${k.body} Raise it again sends the same repair: the server makes it once.`, tone: "held" });
      } else setSaid(saidOf("Not raised", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Report a repair · ${item.name}`} description="It shows as under repair until the repair is closed." onClose={onClose} busy={busy}>
      <Text style={[body, { color: c.ink900 }]}>{item.name}<Text style={{ color: c.grey500 }}>{` · ${item.tag ?? "-"}`}</Text></Text>
      <Field label="What needs fixing" required>
        <Input label="What needs fixing" value={what} onChangeText={setWhat} placeholder="Dripping tap in the bathroom" autoFocus />
      </Field>
      <Field label="Kind"><Select label="Kind" value={kind} options={KINDS} onChange={setKind} /></Field>
      <Field label="Priority"><Select label="Priority" value={priority} options={LEVELS} onChange={setPriority} /></Field>
      <Field label="Anything else" hint="Optional."><Input label="Anything else" value={detail} onChangeText={setDetail} rows={3} /></Field>
      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" grow tall disabled={busy} onPress={onClose} />
        <Btn label="Raise it" variant="primary" grow tall busy={busy} disabled={Boolean(why)} onPress={() => void raise()} />
      </Foot>
      {!said ? <Why text={why} /> : null}
    </Dialog>
  );
}
