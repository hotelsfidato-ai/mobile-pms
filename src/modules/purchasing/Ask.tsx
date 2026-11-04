import { Plus, Trash2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { c, face, t } from "../../core/theme";
import { Btn, body, Dialog, Field, Foot, InDialog, Input, saidOf, Select, type Said } from "../guest-services/kit";
import { raise } from "./data";
import { askBody, EMPTY_DRAFT, firstStore, type AskDraft, type PurchaseRequest, type PurchasingList } from "./purchase";
import { Tick } from "./kit";

/* ══════════════════════════════════════════════════════════════════
   ASKING FOR SOMETHING — the web's AskDialog (pages/Purchasing.tsx).
   What, how much, which store, and why. A price may be typed if one has
   already been agreed, and left blank if it has not: blank is "-" and an
   order that cannot be sent yet, never 0; ₹0 only when ticked Free
   (D27-120). The checks are the web's, then the server's, in their words
   (purchase.ts askBody). Refused offline with the web's sentence.
   On a phone each line is stacked (the item, then how much and the price):
   the web's row of four does not fit 390 px either and wraps the same way.
   ══════════════════════════════════════════════════════════════════ */

export function Ask({ code, data, onClose, onAsked }: {
  code: string; data: PurchasingList; onClose: () => void; onAsked: (r: PurchaseRequest) => void;
}) {
  const [storeId, setStoreId] = useState(firstStore(data.stores));
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<AskDraft[]>([{ ...EMPTY_DRAFT }]);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);

  const set = (i: number, patch: Partial<AskDraft>) => setLines((all) => all.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const items = [{ value: "", label: "Pick an item" }, ...data.items.map((it) => ({ value: it.id, label: `${it.name} (${it.unit})` }))];

  async function submit() {
    if (latch.current) return;
    setSaid(null);
    const out = askBody(storeId, reason, lines);
    if ("problem" in out) { setSaid({ title: out.problem, tone: "bad" }); return; }
    latch.current = true;
    setBusy(true);
    try {
      const done = await raise(code, out.body);
      onAsked(done.request);
    } catch (e) {
      /* The server's sentence; offline, the web's ("This cannot be done offline yet…"). */
      setSaid(saidOf("Not sent", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog title="Ask to buy something" onClose={onClose}>
      <Field label="Which store is it for">
        {data.stores.length > 0 ? (
          <Select label="Which store is it for" value={storeId} onChange={setStoreId} options={data.stores.map((s) => ({ value: s.id, label: s.name }))} />
        ) : <Text style={[body, { color: c.grey600 }]}>-</Text>}
      </Field>

      <Field label="What is it for" hint="The general manager reads this before approving. A request with no reason is one nobody can act on.">
        <Input label="What is it for" value={reason} onChangeText={setReason} placeholder="The rice is down to two days" />
      </Field>

      <View style={{ gap: 12 }}>
        <Text style={[t.label, { color: c.grey700 }]}>What is needed</Text>
        {lines.map((l, i) => (
          <View key={i} style={{ gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.grey100 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Select label={`Item on line ${i + 1}`} value={l.itemId} onChange={(v) => set(i, { itemId: v })} options={items} />
              </View>
              {lines.length > 1 ? (
                <Pressable
                  onPress={() => setLines((all) => all.filter((_, n) => n !== i))} accessibilityRole="button"
                  accessibilityLabel={`Take line ${i + 1} off`}
                  style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.grey200 : "transparent" })}
                >
                  <Trash2 size={16} color={c.grey600} />
                </Pressable>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input label={`How much on line ${i + 1}`} keyboardType="numbers-and-punctuation" value={l.quantity} onChangeText={(v) => set(i, { quantity: v })} placeholder="How much" />
              </View>
              <View style={{ flex: 1 }}>
                {l.free ? (
                  /* Ticked Free: the price is 0 and cannot be typed (the web's disabled box). */
                  <View accessibilityLabel={`Agreed price on line ${i + 1}: free`} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50 }}>
                    <Text style={{ fontSize: 16, color: c.grey500, ...face[500] }}>0</Text>
                  </View>
                ) : (
                  <Input label={`Agreed price on line ${i + 1}`} keyboardType="numbers-and-punctuation" value={l.unitPrice} onChangeText={(v) => set(i, { unitPrice: v })} placeholder="Price, if agreed" />
                )}
              </View>
              <Tick label="Free" on={l.free} onChange={(v) => set(i, { free: v })} />
            </View>
          </View>
        ))}
        <Btn label="Add another item" icon={Plus} onPress={() => setLines((all) => [...all, { ...EMPTY_DRAFT }])} style={{ alignSelf: "flex-start" }} />
        <Text style={t.caption}>
          Leave the price blank where nothing has been agreed. It reads &quot;-&quot;, never 0, and the order cannot be sent until every line has one.
        </Text>
      </View>

      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={busy ? "Sending…" : "Send for approval"} variant="primary" tall grow disabled={busy} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}
