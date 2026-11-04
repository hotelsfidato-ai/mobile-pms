import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { c, face, t } from "../../core/theme";
import { useRead } from "../../core/ui";
import { Btn, body, Dialog, Field, Foot, InDialog, Input, Loading, Select, saidOf, type Said } from "../guest-services/kit";
import { collect, isRefused, readPriceList, readStays } from "./data";
import { collectBody, itemWords, stayWords, type Draft } from "./docket";
import { ON_THE_WEBSITE } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   COLLECTING A BAG — the web's CollectDialog (pages/Dockets.tsx).
   THE FIRST QUESTION IS WHOSE IT IS, AND IT STARTS UNANSWERED (D18-5): a
   default would put a hotel's bedsheets on a guest's bill. Nothing else
   shows until it is answered. What is in the bag comes off the price list
   (one catalogue, nothing typed free-hand onto a bill); an unpriced item
   says "not priced" where it is picked. Not pictured: built from the code.
   One tap is one docket (MEMORY 8): the write is latched at the tap.
   ══════════════════════════════════════════════════════════════════ */

type Belongs = "" | "guest" | "hotel";
const EMPTY: Draft = { priceItemId: "", quantity: "" };

export function Collect({ code, onClose, onCollected }: {
  code: string; onClose: () => void; onCollected: (id: string, number: string) => void;
}) {
  const cache = useQueryClient();
  const [belongsTo, setBelongsTo] = useState<Belongs>("");
  const [stayId, setStayId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Draft[]>([{ ...EMPTY }]);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);

  const prices = useRead(() => readPriceList(code), ["laundry", code, "price-list"]);
  const items = prices.data && !isRefused(prices.data) ? prices.data.items.filter((i) => i.isActive) : [];

  const set = (i: number, patch: Partial<Draft>) => setLines((all) => all.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  async function submit() {
    if (latch.current) return;
    setSaid(null);
    const out = collectBody(belongsTo, stayId, notes, lines);
    if ("problem" in out) { setSaid({ title: out.problem, tone: "bad" }); return; }
    latch.current = true;
    setBusy(true);
    try {
      const made = await collect(code, out.body);
      void cache.invalidateQueries({ queryKey: ["laundry", code] });
      onCollected(made.data.id, made.data.number);
    } catch (e) {
      setSaid(saidOf("Not collected", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog title="Collect a bag" onClose={onClose}>
      <Field
        label="Whose is this" required
        hint="A guest's bag charges to their room. The hotel's own linen is counted out and counted back, and is never charged to anybody."
      >
        <Select<Belongs>
          label="Whose is this" value={belongsTo}
          onChange={(v) => { setBelongsTo(v); setStayId(""); }}
          options={[
            { value: "", label: "Say whose this is" },
            { value: "guest", label: "A guest's bag" },
            { value: "hotel", label: "The hotel's own linen" },
          ]}
        />
      </Field>

      {belongsTo === "guest" ? <WhichStay code={code} value={stayId} onChange={setStayId} /> : null}

      {belongsTo !== "" ? (
        <View style={{ gap: 8 }}>
          <Text style={[body, { color: c.ink900, ...face[500] }]}>What is in the bag</Text>
          {prices.data === undefined ? (
            prices.error ? <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">The price list did not load: {prices.error}</Text>
              : <Loading words="Reading the price list…" />
          ) : isRefused(prices.data) ? (
            <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">{prices.data.refused}</Text>
          ) : items.length === 0 ? (
            <Text style={[body, { color: c.grey600 }]}>
              Nothing is on this property's price list yet, so there is nothing to put in a bag. Add what it launders on the
              price list first - an item with no price is fine, and is how linen belongs on it. Price list: {ON_THE_WEBSITE}.
            </Text>
          ) : (
            <>
              {lines.map((l, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Select<string>
                      label={`What is on line ${i + 1}`} value={l.priceItemId} onChange={(v) => set(i, { priceItemId: v })}
                      options={[{ value: "", label: "Pick what it is" }, ...items.map((it) => ({ value: it.id, label: itemWords(it) }))]}
                    />
                  </View>
                  <View style={{ width: 100 }}>
                    <Input
                      label={`How many on line ${i + 1}`} placeholder="How many" keyboardType="numbers-and-punctuation"
                      value={l.quantity} onChangeText={(v) => set(i, { quantity: v })} maxLength={4}
                    />
                  </View>
                  {lines.length > 1 ? (
                    <Pressable
                      onPress={() => setLines((all) => all.filter((_, n) => n !== i))}
                      accessibilityRole="button" accessibilityLabel={`Take line ${i + 1} off`}
                      style={({ pressed }) => ({
                        width: 44, height: 44, borderRadius: 999, borderWidth: 1, borderColor: c.grey300,
                        alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.grey100 : c.white,
                      })}
                    >
                      <Trash2 size={16} color={c.ink900} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
              <View style={{ flexDirection: "row" }}>
                <Btn label="Add another thing" onPress={() => setLines((all) => [...all, { ...EMPTY }])} />
              </View>
              <Text style={[body, { color: c.grey500 }]}>
                The description and the price are copied onto the docket as they are now, so re-pricing next month does not
                rewrite a bag somebody was handed. Anything marked "not priced" leaves this docket with no total, and a price
                added later applies to new bags only.
              </Text>
            </>
          )}
        </View>
      ) : null}

      {belongsTo !== "" ? (
        <Field label="Anything to note" hint="Optional - a stain, a missing button, who brought it down.">
          <Input label="Anything to note" placeholder="Ink on the left cuff" maxLength={500} value={notes} onChangeText={setNotes} />
        </Field>
      ) : null}

      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={busy ? "Collecting…" : "Collect it"} variant="primary" tall grow disabled={busy} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}

/** Only asked for once a guest's bag is what this is: the hotel's own linen
    belongs to no stay, and the server refuses one. */
function WhichStay({ code, value, onChange }: { code: string; value: string; onChange: (id: string) => void }) {
  const stays = useRead(() => readStays(code), ["laundry", code, "stays"]);
  return (
    <>
      <Field
        label="Which stay" required
        hint="Only guests in the house are listed. A booking still to arrive, cancelled or checked out is refused by the server as well."
      >
        {stays.data === undefined ? (
          stays.error ? <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">The stays did not load: {stays.error}</Text>
            : <Loading words="Reading who is in the house…" />
        ) : (
          <Select<string>
            label="Which stay" value={value} onChange={onChange}
            options={[{ value: "", label: "Pick the stay" }, ...stays.data.map((s) => ({ value: s.id, label: stayWords(s) }))]}
          />
        )}
      </Field>
      {stays.data?.length === 0 ? (
        <Text style={[t.label, { lineHeight: 21, color: c.grey600 }]}>
          Nobody is in house to charge a bag to. The hotel's own linen does not need a stay.
        </Text>
      ) : null}
    </>
  );
}
