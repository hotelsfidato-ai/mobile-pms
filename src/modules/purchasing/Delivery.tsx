import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, t } from "../../core/theme";
import { Btn, body, Dialog, Field, Foot, InDialog, Input, saidOf, Select, type Said } from "../guest-services/kit";
import { recordDelivery } from "./data";
import { Tick } from "./kit";
import {
  deliveredWords, deliveryBody, deliveryStart, figure, GST_RATES, gstParts, suggestedDue,
  type BillDraft, type DeliveryDraft, type PurchaseLine,
} from "./purchase";

/* ══════════════════════════════════════════════════════════════════
   THE DELIVERY — the web's DeliveryDialog (pages/PurchaseRequest.tsx).
   WHAT CAME, not what was ordered: the fields start from the ordered
   quantity and the agreed price, because that is usually what turned up,
   and are typed over freely; what was ordered is never written over. Each
   line takes the bill's GST (the rate, the amount, claimable: all three or
   none) and a use-by (D27-238). On credit, the supplier's bill goes on the
   Supplier dues (D27-370).

   SENT AS TYPED. A quantity left blank is refused with the web's sentence
   ("Nothing at all is 0") - never sent as 0; a cost left blank is null.
   THE GST AMOUNT IS THE BILL'S: the web fills it from came × cost × rate on
   the device; the phone shows those parts beside the box and the person
   types the amount the bill prints (money is the server's, or the bill's;
   never the phone's sum). Dates are typed YYYY-MM-DD (M-7: no date-picker
   package). The stock lands in the Store through its own door; who may is
   the Store's rule (roles.ts whyNotReceive). Refused offline with the web's
   sentence; one tap is one delivery (latched, the request's keeper), and
   the server refuses a second ("…This one is delivered.").
   ══════════════════════════════════════════════════════════════════ */

const CLAIMABLE = [{ value: "", label: "-" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }] as const;

export function Delivery({ code, id, store, lines, hotel, onClose, onDone }: {
  code: string; id: string; store: string; lines: PurchaseLine[]; hotel: Hotel; onClose: () => void; onDone: (said: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, DeliveryDraft>>(Object.fromEntries(lines.map((l) => [l.id, deliveryStart(l)])));
  const [note, setNote] = useState("");
  const [onCredit, setOnCredit] = useState(false);
  /* The web starts the bill's date at today; the phone takes the property's own today, when the server sent it. */
  const [bill, setBill] = useState<BillDraft>({ billNo: "", billDate: hotel.today ?? "", amount: "", dueOn: "" });
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);

  const set = (lineId: string, patch: Partial<DeliveryDraft>) =>
    setDrafts((all) => ({ ...all, [lineId]: { ...all[lineId]!, ...patch } }));

  async function submit() {
    if (latch.current) return;
    setSaid(null);
    const out = deliveryBody(lines, drafts, note, onCredit ? bill : null);
    if ("problem" in out) { setSaid({ title: out.problem, tone: "bad" }); return; }
    latch.current = true;
    setBusy(true);
    try {
      const done = await recordDelivery(code, id, out.body);
      onDone(deliveredWords(done.received.length, store));
    } catch (e) {
      setSaid(saidOf("Not recorded", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog title="Record the delivery" onClose={onClose}>
      <Text style={[body, { color: c.grey600 }]}>
        What actually came, and what it actually cost before GST, with the bill&apos;s GST. It may differ from what was ordered - both stay on the
        record. The stock lands in <Text style={{ color: c.ink900, ...face[500] }}>{store}</Text>.
      </Text>

      {lines.map((l) => {
        const d = drafts[l.id]!;
        const parts = gstParts(d);
        return (
          <View key={l.id} style={{ gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.grey100 }}>
            <Text style={[body, { color: c.ink900 }]}>
              <Text style={face[600]}>{l.item}</Text>
              <Text style={{ color: c.grey500 }}> · {l.unit} · {figure(l.quantity)} ordered</Text>
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label="Came">
                  <Input label={`How much of the ${l.item} came`} keyboardType="numbers-and-punctuation" value={d.came} onChangeText={(v) => set(l.id, { came: v })} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Cost each, ₹">
                  <Input label={`What the ${l.item} cost each`} keyboardType="numbers-and-punctuation" value={d.cost} onChangeText={(v) => set(l.id, { cost: v })} placeholder="-" />
                </Field>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label="GST %">
                  <Input label={`GST rate on the ${l.item}, per cent`} keyboardType="numbers-and-punctuation" value={d.rate} onChangeText={(v) => set(l.id, { rate: v })} placeholder="-" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="GST amount, ₹">
                  <Input label={`GST amount on the ${l.item}, as on the bill`} keyboardType="numbers-and-punctuation" value={d.gst} onChangeText={(v) => set(l.id, { gst: v })} placeholder="-" />
                </Field>
              </View>
            </View>
            {/* The web's rates since 22 September 2025 (its datalist); 12 and 28 still typed for an older bill. */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {GST_RATES.map((r) => (
                <Pressable
                  key={r} onPress={() => set(l.id, { rate: r })} accessibilityRole="button" accessibilityLabel={`GST ${r} per cent on the ${l.item}`}
                  accessibilityState={{ selected: d.rate.trim() === r }}
                  style={({ pressed }) => ({
                    minHeight: 44, minWidth: 52, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center",
                    borderColor: d.rate.trim() === r ? c.ink900 : c.grey300, backgroundColor: pressed ? c.grey100 : c.white,
                  })}
                >
                  <Text style={[t.label, t.tab, { color: c.ink900 }]}>{r}%</Text>
                </Pressable>
              ))}
            </View>
            {parts ? <Text style={t.caption}>GST on the bill for {parts}: type the amount the bill prints.</Text> : null}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label="Claimable">
                  <Select<DeliveryDraft["claimable"]>
                    label={`Can the GST on the ${l.item} be claimed`} value={d.claimable}
                    onChange={(v) => set(l.id, { claimable: v })} options={CLAIMABLE.map((o) => ({ ...o }))}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Use by">
                  <Input label={`Use by, the ${l.item}, as YYYY-MM-DD`} keyboardType="numbers-and-punctuation" value={d.useBy} onChangeText={(v) => set(l.id, { useBy: v })} placeholder="YYYY-MM-DD" />
                </Field>
              </View>
            </View>
          </View>
        );
      })}

      <Field label="Anything to note" hint="A short delivery, a damaged case, a different brand. Optional.">
        <Input label="Anything to note" value={note} onChangeText={setNote} />
      </Field>

      <Tick
        label="On credit - the supplier's bill is paid later" on={onCredit}
        onChange={(v) => {
          setOnCredit(v);
          /* D27-372: the bill's date + 30 days offered; changed if the bill says otherwise. */
          if (v) setBill((b) => (b.dueOn ? b : { ...b, dueOn: suggestedDue(b.billDate) }));
        }}
      />
      {onCredit ? (
        <View style={{ gap: 12 }}>
          <Field label="Bill number">
            <Input label="Bill number" value={bill.billNo} onChangeText={(v) => setBill((b) => ({ ...b, billNo: v }))} maxLength={60} />
          </Field>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label="Bill date">
                <Input label="Bill date, as YYYY-MM-DD" keyboardType="numbers-and-punctuation" value={bill.billDate} onChangeText={(v) => setBill((b) => ({ ...b, billDate: v }))} placeholder="YYYY-MM-DD" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Due on">
                <Input label="Due on, as YYYY-MM-DD" keyboardType="numbers-and-punctuation" value={bill.dueOn} onChangeText={(v) => setBill((b) => ({ ...b, dueOn: v }))} placeholder="YYYY-MM-DD" />
              </Field>
            </View>
          </View>
          <Field label="Amount, as printed, ₹">
            <Input label="The bill's amount, as printed, in rupees" keyboardType="numbers-and-punctuation" value={bill.amount} onChangeText={(v) => setBill((b) => ({ ...b, amount: v }))} />
          </Field>
        </View>
      ) : null}

      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={busy ? "Recording…" : "Record the delivery"} variant="primary" tall grow disabled={busy} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}
