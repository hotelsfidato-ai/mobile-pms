import { unknownSaid } from "./kit";
import { outcomeUnknown } from "../../core/api";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { c, t } from "../../core/theme";
import { Btn, body, Dialog, Field, Foot, InDialog, Input, Select, saidOf, type Said } from "../guest-services/kit";
import { moveStock, recordMovement } from "./data";
import { ON_THE_WEBSITE } from "./roles";
import {
  ACTION_LABEL, blankMove, bookIn, correctionWords, heldText, moveBody, movedWords, NOT_AN_OUTLET, NOT_KNOWN,
  offeredFor, startingStore, transferBody, type MoveDraft, type StockItem, type StockKind, type StoreList, type StoreSummary,
} from "./shelf";

/* ══════════════════════════════════════════════════════════════════
   ONE ACT ON ONE ITEM — the web's MoveDialog and TransferDialog
   (pages/Stores.tsx 870-1295): Receive, Issue, Record waste, Return,
   Record breakage, Correct the count; and Move to another store. Each asks
   Which store first, starting on the store picked at the top, else the
   Main store. Not pictured: built from the code, its words and order.
   What is sent is shelf.ts moveBody / transferBody (checked); one tap is
   one write, latched at the tap (MEMORY 8). Offline the server's store
   paths are refused by send() with the web's sentence; nothing is held.
   ══════════════════════════════════════════════════════════════════ */

const HINT_WHY: Partial<Record<StockKind, string>> = {
  wastage: "Spoiled, broken, past its date. Somebody will ask at the end of the month.",
  breakage: "Dropped, chipped, cracked in the wash.",
  return: "Damaged, the wrong thing, more than was ordered.",
  adjustment: "What the count found, and who counted.",
  issue: "Where it went.",
};

const storeChoice = (s: StoreSummary, i: StockItem) =>
  `${s.name} (${heldText(i.byStore[s.id])}${i.byStore[s.id] !== undefined ? ` ${i.unit}` : ""})`;

/** A checkbox, 44 tall: the web's Checkbox. */
function Tick({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!on)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: on ? c.orange600 : c.grey300, backgroundColor: on ? c.orange600 : c.white, alignItems: "center", justifyContent: "center" }}>
        {on ? <Check size={14} color={c.white} /> : null}
      </View>
      <Text style={[body, { color: c.ink900, flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

export function Act({ code, list, item, kind, startStoreId, onClose, onDone }: {
  code: string; list: StoreList; item: StockItem; kind: StockKind; startStoreId: string | null;
  onClose: () => void; onDone: (said: Said) => void;
}) {
  const cache = useQueryClient();
  const inUse = item.crockery ? list.inUse.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive, isMain: false })) : [];
  const offered = offeredFor(kind, list.stores, inUse);
  const [d, setD] = useState<MoveDraft>(() => blankMove(kind, startingStore(offered, startStoreId)));
  const set = (patch: Partial<MoveDraft>) => setD((x) => ({ ...x, ...patch }));
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);

  const store = offered.find((s) => s.id === d.storeId) ?? null;
  const here = store ? bookIn(item, store.id) : 0;
  const isReceipt = kind === "receipt";
  const isCount = kind === "adjustment";
  const needsOutlet = kind === "issue" && list.outlets.length > 0;
  const asksEmpties = item.cylinder && (kind === "issue" || isReceipt);
  const out = moveBody(d, item, list.outlets.length > 0);
  const note = correctionWords(d, item);

  async function submit() {
    if (latch.current || !("body" in out)) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      const res = await recordMovement(code, out.body);
      void cache.invalidateQueries({ queryKey: ["stores", code] });
      const w = movedWords(kind, d.qty, item, res);
      onDone({ title: w.title, body: w.body, tone: "ok" });
    } catch (e) {
      if (outcomeUnknown(e)) { stuck.current = true; setSaid(unknownSaid("Not recorded", e)); }
      else setSaid(saidOf("Not recorded", e));
    } finally {
      latch.current = stuck.current;
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={`${ACTION_LABEL[kind]} - ${item.name}`}
      description={!store ? "Choose a store" : item.byStore[store.id] === undefined ? `None in ${store.name}` : `${here} ${item.unit} in ${store.name}`}
      onClose={onClose}
    >
      <Field label={kind === "breakage" ? "Where it broke" : "Which store"} required>
        <Select<string>
          label={kind === "breakage" ? "Where it broke" : "Which store"} value={d.storeId} onChange={(v) => set({ storeId: v })}
          options={[...(d.storeId === "" ? [{ value: "", label: "Choose a store" }] : []), ...offered.map((s) => ({ value: s.id, label: storeChoice(s, item) }))]}
        />
      </Field>

      <Field
        label={isCount ? `What the shelf holds now, in ${item.unit}` : `How many ${item.unit}`} required
        {...(isCount && store ? { hint: `The book says ${here} ${item.unit} in ${store.name}. Count what is there; the difference is recorded.` } : {})}
      >
        <Input label={isCount ? "What the shelf holds now" : `How many ${item.unit}`} keyboardType="numbers-and-punctuation" value={d.qty} onChangeText={(v) => set({ qty: v })} maxLength={12} />
      </Field>

      {needsOutlet ? (
        <Field label="Which outlet" required hint="Not an outlet, for housekeeping or a floor.">
          <Select<string>
            label="Which outlet" value={d.outletId} onChange={(v) => set({ outletId: v })}
            options={[{ value: "", label: "Choose…" }, ...list.outlets.map((o) => ({ value: o.id, label: o.name })), { value: NOT_AN_OUTLET, label: "Not an outlet" }]}
          />
        </Field>
      ) : null}

      {asksEmpties ? (
        <Field
          label={isReceipt ? "Empties the supplier took back" : "Empties back from the kitchen"} required
          hint={isReceipt && store ? `${item.emptiesByStore[store.id] ?? 0} empty in ${store.name}. 0 if none went back.` : "0 if none came back."}
        >
          <Input label={isReceipt ? "Empties the supplier took back" : "Empties back from the kitchen"} keyboardType="numbers-and-punctuation" value={d.empties} onChangeText={(v) => set({ empties: v })} maxLength={6} />
        </Field>
      ) : null}

      {note ? <Text style={[body, { color: c.grey600 }]} accessibilityLiveRegion="polite">{note}</Text> : null}

      {kind === "breakage" ? (
        <Field label="Who broke it" required>
          <Select<string>
            label="Who broke it" value={d.brokenBy} onChange={(v) => set({ brokenBy: v })}
            options={[{ value: "", label: "Choose…" }, ...list.people.map((p) => ({ value: p.id, label: p.name })), { value: NOT_KNOWN, label: "Not known" }]}
          />
        </Field>
      ) : null}

      {kind === "issue" ? (
        <Field label="Department" hint="Optional. Housekeeping, Banquets - as you call it.">
          <Input label="Department" value={d.department} onChangeText={(v) => set({ department: v })} maxLength={60} />
        </Field>
      ) : null}

      {isReceipt ? (
        <>
          <Field
            label={`What it cost, per ${item.unit}, before GST`}
            hint="Leave blank if the bill has not arrived. A cost can only be added later by undoing this delivery and receiving it again - what it must not be is a guess."
          >
            {d.free
              ? <Text style={[body, { color: c.grey500 }]}>₹0 - ticked Free</Text>
              : <Input label="What it cost, before GST" keyboardType="numbers-and-punctuation" value={d.cost} onChangeText={(v) => set({ cost: v })} maxLength={12} />}
          </Field>
          <Tick label="Free - it cost nothing" on={d.free} onChange={(v) => set({ free: v })} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="GST rate, %" hint="0, 5, 18 or 40; 12 or 28 on an older bill.">
                <Input label="GST rate, %" keyboardType="numbers-and-punctuation" value={d.gstRate} onChangeText={(v) => set({ gstRate: v })} maxLength={5} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="GST amount" hint="As the bill says.">
                <Input label="GST amount" keyboardType="numbers-and-punctuation" value={d.gstAmount} onChangeText={(v) => set({ gstAmount: v })} maxLength={12} />
              </Field>
            </View>
          </View>
          <Field label="Can this GST be claimed?">
            <Select<"" | "yes" | "no">
              label="Can this GST be claimed?" value={d.claimable} onChange={(v) => set({ claimable: v })}
              options={[{ value: "", label: "Not recorded" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
            />
          </Field>
          <Text style={[t.caption, { color: c.grey600 }]}>Use by: {ON_THE_WEBSITE}</Text>
          <Field label="Who from">
            <Input label="Who from" placeholder="Kirana Bros" value={d.supplier} onChangeText={(v) => set({ supplier: v })} maxLength={120} />
          </Field>
          <Field label="Delivery note or bill number" hint="What somebody holds in their hand when they ask why the count is what it is.">
            <Input label="Delivery note or bill number" value={d.reference} onChangeText={(v) => set({ reference: v })} maxLength={120} />
          </Field>
        </>
      ) : null}

      {kind === "return" ? (
        <Field label="Who it goes back to">
          <Input label="Who it goes back to" placeholder="Kirana Bros" value={d.supplier} onChangeText={(v) => set({ supplier: v })} maxLength={120} />
        </Field>
      ) : null}

      {!isReceipt ? (
        <Field label="Why" {...(HINT_WHY[kind] ? { hint: HINT_WHY[kind] } : {})}>
          <Input label="Why" value={d.note} onChangeText={(v) => set({ note: v })} maxLength={300} />
        </Field>
      ) : null}

      {"missing" in out && d.qty.trim() !== "" ? <Text style={[t.caption, { color: c.grey600 }]}>{out.missing}</Text> : null}
      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={busy ? "Recording…" : ACTION_LABEL[kind]} variant="primary" tall grow disabled={busy || !("body" in out)} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}

/** From one store to another, one act: the server writes both halves. */
export function Transfer({ code, list, item, startFromId, onClose, onDone }: {
  code: string; list: StoreList; item: StockItem; startFromId: string | null; onClose: () => void; onDone: (said: Said) => void;
}) {
  const cache = useQueryClient();
  const places = item.crockery
    ? [...list.stores, ...list.inUse.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive, isMain: false }))]
    : list.stores;
  const holding = places.filter((s) => (item.byStore[s.id] ?? 0) > 0);
  const [fromId, setFromId] = useState(() => startingStore(holding, startFromId));
  const [toId, setToId] = useState("");
  const [qty, setQty] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);
  const from = holding.find((s) => s.id === fromId) ?? null;
  const destinations = places.filter((s) => s.isActive && s.id !== fromId);
  const out = transferBody(item, fromId, toId, qty, why);

  async function submit() {
    if (latch.current || !("body" in out)) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      const res = await moveStock(code, out.body);
      void cache.invalidateQueries({ queryKey: ["stores", code] });
      onDone({
        title: `Moved ${qty.trim()} ${item.unit} of ${item.name}`,
        body: `${res.from.onHand} ${res.unit} left in ${res.from.name}, ${res.to.onHand} ${res.unit} in ${res.to.name}.`, tone: "ok",
      });
    } catch (e) {
      if (outcomeUnknown(e)) { stuck.current = true; setSaid(unknownSaid("Not moved", e)); }
      else setSaid(saidOf("Not moved", e));
    } finally {
      latch.current = stuck.current;
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Move to another store - ${item.name}`} description={from ? `${bookIn(item, from.id)} ${item.unit} in ${from.name}` : "Choose a store"} onClose={onClose}>
      <Field label="From" required>
        <Select<string>
          label="From" value={fromId} onChange={(v) => { setFromId(v); if (v === toId) setToId(""); }}
          options={[...(fromId === "" ? [{ value: "", label: "Choose a store" }] : []), ...holding.map((s) => ({ value: s.id, label: storeChoice(s, item) }))]}
        />
      </Field>
      <Field label="To" required>
        <Select<string>
          label="To" value={toId} onChange={setToId}
          options={[{ value: "", label: "Choose a store" }, ...destinations.map((s) => ({ value: s.id, label: storeChoice(s, item) }))]}
        />
      </Field>
      <Field label={`How many ${item.unit}`} required>
        <Input label={`How many ${item.unit}`} keyboardType="numbers-and-punctuation" value={qty} onChangeText={setQty} maxLength={12} />
      </Field>
      <Field label="Why" hint="What it is for.">
        <Input label="Why" value={why} onChangeText={setWhy} maxLength={300} />
      </Field>
      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={busy ? "Moving…" : "Move"} variant="primary" tall grow disabled={busy || !("body" in out)} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}

