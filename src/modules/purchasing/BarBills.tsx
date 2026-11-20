import { useQueryClient } from "@tanstack/react-query";
import { GlassWater, Image as ImageIcon, Plus, Trash2 } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { outcomeUnknown, type Hotel } from "../../core/api";
import { DateField } from "../../core/DateField";
import type { Picked } from "../../core/files";
import { c, face, space, t } from "../../core/theme";
import { Stopped, keys, ripple, shade, useRead, useScreenStop } from "../../core/ui";
import { BillField, useOpenStored } from "../finance/BillPhoto";
import { Box, Btn, body, Dialog, Empty, Field, Foot, InDialog, Input, Loading, message, saidOf, Select, Stale, type Said } from "../guest-services/kit";
import { LoadFailed, Note } from "../laundry/kit";
import {
  billBody, billCheck, billWhen, chargesLine, creditWords, draftAmount, EMPTY_LINE, lineFigures, recordedWords, rupees, UNITS,
  whyNotRecordBar, type BarDrink, type BillDraft, type LineDraft,
} from "./barBills";
import { addBarPhoto, barPhotoPath, barStop, isRefused, readBarBills, readBarDrinks, recordBarBill } from "./data";
import { Tick } from "./kit";
import { suggestedDue } from "./purchase";

/* ══════════════════════════════════════════════════════════════════
   PURCHASING · BAR on a phone (D27-354; M-16 row 1.9) — the web's
   purchasing/components/BarBills.tsx, the Bar tab of /h/:code/purchasing.
   The bar's bills of the last 60 days, newest first, each as printed with
   its photo; and Record a bar bill, typed as printed, with the photo taken
   on the phone (the camera, the photos or a file). Rules: barBills.ts.
   WHO: the bills are BAR_VIEW's (the screen's own gate is Purchasing's);
   recording is BAR_RECORDERS': for anyone else the button is grey with the
   server's sentence (the web hides it). ONE INTENT, ONE BILL: the dialog
   is locked while it is on its way; a bill or a photo whose outcome is not
   known stops Record (core useScreenStop, MEMORY 16, 22) until the bills
   are read again after it - and the server refuses the same supplier and
   number twice. The bill first, then its photo to the new id (the web's
   order); the bill stands without it, said so.
   ══════════════════════════════════════════════════════════════════ */

const BAR_UNKNOWN = "Not known whether the bar bill was saved: look at the bar's bills before recording it again.";

export function BarBills({ hotel, role, onSaid }: { hotel: Hotel; role: string | null; onSaid: (s: Said) => void }) {
  const code = hotel.code;
  const stop = useScreenStop(barStop(code));
  const bills = useRead(stop.watch(() => readBarBills(code)), ["purchasing", code, "bar", "bills"]);
  const drinks = useRead(() => readBarDrinks(code), ["purchasing", code, "bar", "drinks"]);
  const [recording, setRecording] = useState(false);
  const stored = useOpenStored((title, text) => onSaid({ title, body: text, tone: "bad" }));
  const why = whyNotRecordBar(role);
  const d = drinks.data && !isRefused(drinks.data) ? drinks.data : null;
  const list = bills.data && !isRefused(bills.data) ? bills.data : null;
  const refused = isRefused(bills.data) ? bills.data.refused : isRefused(drinks.data) ? drinks.data.refused : null;

  return (
    <View style={{ gap: space.card }}>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row" }}>
          <Btn label="Record a bar bill" variant="primary" icon={GlassWater} disabled={why != null || !d?.store || stop.stuck || refused != null}
            onPress={() => { if (!stop.isStuck()) setRecording(true); }} />
        </View>
        {why ? <Text style={[t.caption, { color: c.grey600 }]}>{why}</Text> : null}
        {stop.unknown ? <Stopped line={BAR_UNKNOWN} onRead={bills.reload} /> : null}
      </View>

      {refused ? <Note>{refused}</Note> : null}
      {d && !d.store ? <Note>This hotel has no bar store, so a bar bill has nowhere to go. Mark one in Places and suppliers first.</Note> : null}

      {refused ? null : !list ? (
        bills.error ? (
          <LoadFailed title="The bar's bills did not load" error={bills.error} onRetry={bills.reload}
            offline="This device is offline, so the bar's bills cannot load. They load by themselves as soon as the connection is back." />
        ) : <Loading words="Reading the bar's bills…" />
      ) : list.length === 0 ? (
        <Box style={{ paddingBottom: 24, alignItems: "center" }}>
          <Empty title="No bar bill recorded in the last 60 days"
            description={why ? "The owner, an Admin, the GM, the Inventory Manager or the bar manager records them."
              : "Record a bar bill when one comes: its drinks go into the bar's store."} />
        </Box>
      ) : (
        <>
          <Stale error={bills.error} />
          {list.map((b) => {
            const charges = chargesLine(b);
            const credit = creditWords(b);
            const path = barPhotoPath(code, b.id);
            return (
              <Box key={b.id} style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 8 }}>
                <View style={{ flexDirection: "row", gap: 12, alignItems: "baseline" }}>
                  <Text style={[body, { flex: 1, color: c.ink900, ...face[600] }]}>{b.supplier} · Bill {b.billNo}</Text>
                  <Text style={[body, t.tab, { color: c.ink900, ...face[500] }]}>{rupees(b.total)}</Text>
                </View>
                <Text style={[t.caption, t.tab, { color: c.grey600 }]}>{billWhen(b)}</Text>
                {b.lines.map((l, i) => (
                  <View key={i} style={{ gap: 2 }}>
                    <Text style={[body, { color: c.grey700 }]}>{l.item}{l.mrp === null ? "" : ` · MRP ${rupees(l.mrp)}`}</Text>
                    <Text style={[t.caption, t.tab, { color: c.grey600 }]}>{lineFigures(l)}</Text>
                  </View>
                ))}
                {charges ? <Text style={[t.caption, t.tab, { color: c.grey600 }]}>{charges}</Text> : null}
                {credit ? <Text style={[t.caption, { color: c.grey600 }]}>{credit}</Text> : null}
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <Text style={[t.caption, { flex: 1, minWidth: 160, color: c.grey500 }]}>Recorded by {b.recordedBy ?? "-"} · {b.recordedAt}</Text>
                  {b.photoId ? (
                    <Btn label={stored.opening === path ? "Opening…" : "Photo of the bill"} icon={ImageIcon} disabled={stored.opening !== null}
                      a11y={`Photo of bill ${b.billNo} from ${b.supplier}`} onPress={() => void stored.open(path, "The photo needs the connection.")} />
                  ) : <Text style={[t.caption, { color: c.grey500 }]}>No photo</Text>}
                </View>
              </Box>
            );
          })}
        </>
      )}

      {recording && d?.store ? (
        <RecordBill hotel={hotel} drinks={d.drinks} suppliers={d.suppliers ?? []} stop={stop}
          onClose={() => setRecording(false)} onDone={(s) => { setRecording(false); onSaid(s); }} />
      ) : null}
    </View>
  );
}

type Stop = ReturnType<typeof useScreenStop>;

function RecordBill({ hotel, drinks, suppliers, stop, onClose, onDone }: {
  hotel: Hotel; drinks: BarDrink[]; suppliers: { id: string; name: string }[]; stop: Stop; onClose: () => void; onDone: (s: Said) => void;
}) {
  const code = hotel.code;
  const cache = useQueryClient();
  /* The web starts the bill's date at the browser's today; the phone at the property's own. */
  const [f, setF] = useState<BillDraft>({
    supplierId: "", billNo: "", billDate: hotel.today ?? hotel.businessDate, tpNo: "", handling: "", tcs: "", printed: "", onCredit: false, dueOn: "",
  });
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }]);
  const [file, setFile] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const latch = useRef(false);
  const set = <K extends keyof BillDraft>(k: K) => (v: BillDraft[K]) => setF((o) => ({ ...o, [k]: v }));
  const setLine = (i: number, patch: Partial<LineDraft>) => setLines((all) => all.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const check = billCheck(lines, f.handling, f.tcs, f.printed);

  async function submit() {
    if (latch.current || stop.isStuck()) return;
    setSaid(null);
    const out = billBody(f, lines);
    if ("problem" in out) { setSaid({ title: out.problem, tone: "bad" }); return; }
    latch.current = true;
    setBusy(true);
    try {
      const r = await stop.guard(() => recordBarBill(code, out.body));
      let without: Said | null = null;
      if (file && r.id) {
        try { await stop.guard(() => addBarPhoto(code, r.id, file)); } catch (e) {
          without = outcomeUnknown(e)
            ? { title: `${recordedWords(f.billNo)}. Not known whether its photo was saved`, body: `${message(e)} Look at the bar's bills before adding it again.`, tone: "bad" }
            : { title: `${recordedWords(f.billNo)}, without its photo`, body: message(e), tone: "bad" };
        }
      }
      void cache.invalidateQueries({ queryKey: ["purchasing", code, "bar"] });
      void cache.invalidateQueries({ queryKey: ["stores", code] });
      void cache.invalidateQueries({ queryKey: ["finance", code] });
      onDone(without ?? { title: recordedWords(f.billNo), body: "Its bottles are in the bar's store.", tone: "ok" });
    } catch (e) {
      if (outcomeUnknown(e)) {
        /* Not known whether it was made (MEMORY 16): the printed total goes, so a repeat is typed on purpose. */
        setF((o) => ({ ...o, printed: "" }));
        setSaid({ title: "Not known whether it was recorded", body: `${message(e)} Close this and look at the bar's bills before trying again.`, tone: "bad" });
      } else setSaid(saidOf("Not recorded", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  const supplierOptions = [
    { value: "", label: suppliers.length ? "Pick the supplier" : "No supplier yet: add one in Places and suppliers" },
    ...suppliers.map((s) => ({ value: s.id, label: s.name })),
  ];
  const drinkOptions = [
    { value: "", label: "Pick a drink" },
    ...drinks.map((x) => ({ value: x.id, label: `${x.name}${x.sizeMl ? ` (${x.sizeMl} ml)` : ""}` })),
    { value: "new", label: "Add another drink…" },
  ];

  return (
    <Dialog title="Record a bar bill" onClose={onClose} locked={busy}>
      <Text style={[body, { color: c.grey600 }]}>Type it as printed. The lines, the handling and the TCS must make the bill's total.</Text>
      <Field label="Supplier"><Select label="Supplier" value={f.supplierId} options={supplierOptions} onChange={set("supplierId")} /></Field>
      <Field label="Bill number"><Input label="Bill number" value={f.billNo} onChangeText={set("billNo")} maxLength={60} /></Field>
      <DateField label="Bill date" value={f.billDate} onChange={set("billDate")} hotel={hotel} disabled={busy} />
      <Field label="T.P. number" hint="The transport permit, if printed."><Input label="T.P. number" value={f.tpNo} onChangeText={set("tpNo")} maxLength={60} /></Field>
      <BillField label="Photo of the bill" hint="Take it with the phone's camera, or pick a file." file={file} onFile={setFile} off={busy} />

      <Text style={[t.label, { color: c.grey700, ...face[500] }]}>The drinks on the bill</Text>
      {lines.map((l, i) => (
        <View key={i} style={{ gap: 10, borderWidth: 1, borderColor: c.grey200, borderRadius: 8, padding: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Select label={`Drink on line ${i + 1}`} value={l.itemId} options={drinkOptions} onChange={(v) => {
                const x = drinks.find((y) => y.id === v);
                setLine(i, { itemId: v, ...(x?.perCase && l.perCase === "" ? { perCase: String(x.perCase) } : {}) });
              }} />
            </View>
            {lines.length > 1 ? (
              <Pressable android_ripple={ripple} onPress={() => setLines((all) => all.filter((_, n) => n !== i))} accessibilityRole="button"
                accessibilityLabel={`Remove line ${i + 1}`} style={shade(({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.grey100 : "transparent" }))}>
                <Trash2 size={16} color={c.grey500} />
              </Pressable>
            ) : null}
          </View>
          {/* Each box keeps its name in sight: "2" and "48" side by side say nothing on their own. */}
          {l.itemId === "new" ? (
            <>
              <Field label="Brand, as on the bill"><Input label={`New drink's name on line ${i + 1}`} value={l.name} onChangeText={(v) => setLine(i, { name: v })} /></Field>
              <Pair>
                <Field label="Size, ml (a NIP is 180)"><Input label={`Size in ml on line ${i + 1}`} {...keys.count} value={l.sizeMl} onChangeText={(v) => setLine(i, { sizeMl: v })} /></Field>
                <Field label="Counted in"><Select label={`Counted in, on line ${i + 1}`} value={l.unit} options={UNITS.map((u) => ({ value: u, label: u }))} onChange={(v) => setLine(i, { unit: v })} /></Field>
              </Pair>
            </>
          ) : null}
          <Pair>
            <Field label="Bottles a case"><Input label={`Bottles to a case on line ${i + 1}`} {...keys.count} value={l.perCase} onChangeText={(v) => setLine(i, { perCase: v })} /></Field>
            <Field label="Cases"><Input label={`Cases on line ${i + 1}`} {...keys.count} value={l.cases} onChangeText={(v) => setLine(i, { cases: v })} /></Field>
          </Pair>
          <Pair>
            <Field label="Loose bottles"><Input label={`Loose bottles on line ${i + 1}`} {...keys.count} value={l.bottles} onChangeText={(v) => setLine(i, { bottles: v })} /></Field>
            <Field label="MRP, ₹"><Input label={`MRP on line ${i + 1}`} {...keys.amount} value={l.mrp} onChangeText={(v) => setLine(i, { mrp: v })} /></Field>
          </Pair>
          <Pair>
            <Field label="Rate a case, ₹"><Input label={`Rate per case on line ${i + 1}`} {...keys.amount} value={l.rate} onChangeText={(v) => setLine(i, { rate: v })} /></Field>
            <Field label="Amount"><Text style={[body, t.tab, { minHeight: 44, textAlignVertical: "center", textAlign: "right", color: c.ink900, paddingTop: 11 }]}>{draftAmount(l)}</Text></Field>
          </Pair>
        </View>
      ))}
      <View style={{ flexDirection: "row" }}>
        <Btn label="Add a drink" icon={Plus} disabled={busy} onPress={() => setLines((all) => [...all, { ...EMPTY_LINE }])} />
      </View>

      <Field label="Handling charges, ₹"><Input label="Handling charges, in rupees" {...keys.amount} value={f.handling} onChangeText={set("handling")} /></Field>
      <Field label="TCS, ₹"><Input label="TCS, in rupees" {...keys.amount} value={f.tcs} onChangeText={set("tcs")} /></Field>
      <Field label="Total, as printed, ₹"><Input label="The bill's total, as printed, in rupees" {...keys.amount} value={f.printed} onChangeText={set("printed")} /></Field>
      <Text style={[t.label, t.tab, { textAlign: "right" }]} accessibilityLiveRegion="polite">
        <Text style={{ color: c.grey600 }}>The lines, handling and TCS make </Text>
        <Text style={{ color: c.ink900, ...face[500] }}>{check.made}</Text>
        {check.words ? <Text style={{ color: check.words.ok ? c.success600 : c.red700, ...(check.words.ok ? {} : face[500]) }}>{` · ${check.words.text}`}</Text> : null}
      </Text>

      <Tick label="On credit - the bill is paid later" on={f.onCredit} disabled={busy}
        onChange={(v) => setF((o) => ({ ...o, onCredit: v, dueOn: v && !o.dueOn ? suggestedDue(o.billDate) : o.dueOn }))} />
      {f.onCredit ? <DateField label="Due on" value={f.dueOn} onChange={set("dueOn")} hotel={hotel} disabled={busy} /> : null}

      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow disabled={busy} onPress={onClose} />
        <Btn label={busy ? "Saving…" : "Save the bill"} variant="primary" tall grow disabled={busy || stop.stuck} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}

/** Two boxes side by side, half each. */
function Pair({ children }: { children: [ReactNode, ReactNode] }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ flex: 1 }}>{children[0]}</View>
      <View style={{ flex: 1 }}>{children[1]}</View>
    </View>
  );
}
