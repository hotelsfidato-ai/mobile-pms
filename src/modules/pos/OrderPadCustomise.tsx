import { Check, Minus, Plus, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { cash } from "../../core/format";
import { c, face, t } from "../../core/theme";
import { Capsule } from "../../core/ui";
import { addNumbered, customProblems, lessNumbered, LONGEST_NAME, MOST_OF_A_CUSTOM, nameWithAddons, priceWithAddons } from "./pad";
import type { CustomAddon, LineAddon, NumberedAddon } from "./types";
import { Btn, RoundBtn, Sheet } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   CUSTOMISE: THE ADD-ONS ON ONE DISH — the web's CustomiseDialog
   (src/modules/pos/flows/CustomiseDialog.tsx, the owner's D27-289, 290,
   291). A tap on a number adds it to THIS dish, again for two; × takes one
   off. On a line of several it asks: all of them, or just one. A custom
   add-on is a name and a price or Free - never a default. On a dish the
   kitchen already has (`sent`), each add-on is a line of its own and goes
   with the next Send. The pad keys this by its line, so another line
   starts afresh.
   ══════════════════════════════════════════════════════════════════ */

export function OrderPadCustomise({ dish, base, qty = 1, addons, chosen: initial, customs: initialCustoms = [], sent = false, loading, failed, onRetry, onCancel, onDone }: {
  dish: string; base: number; qty?: number; addons: NumberedAddon[]; chosen: readonly LineAddon[]; customs?: readonly CustomAddon[];
  sent?: boolean; loading: boolean; failed: boolean; onRetry: () => void; onCancel: () => void;
  onDone: (chosen: LineAddon[], scope: "all" | "one", customs: CustomAddon[]) => void;
}) {
  const [chosen, setChosen] = useState<LineAddon[]>(sent ? [] : [...initial]);
  const [customs, setCustoms] = useState<CustomAddon[]>([...initialCustoms]);
  const [scope, setScope] = useState<"all" | "one" | null>(qty > 1 && !sent ? null : "all");

  const key = (list: readonly LineAddon[]) => JSON.stringify(list.map((x) => [x.id, x.qty]));
  const asks = qty > 1 && !sent && key(chosen) !== key(initial);
  const unit = priceWithAddons(base, chosen);
  const typed = customs.reduce((s, x) => s + x.price * x.qty, 0);
  const figure = sent ? chosen.reduce((s, x) => s + x.price * x.qty, 0) + typed : (scope === "one" ? unit : unit * qty) + typed;
  const nothing = sent && chosen.length === 0 && customs.length === 0;

  return (
    <Sheet
      open onClose={onCancel}
      title={sent ? `Add to ${dish}` : `Customise ${dish}`}
      description={sent
        ? "The kitchen has this dish. Each add-on goes on as its own line under it, and to the kitchen with the next Send."
        : "Tap a number to add it to this dish. Tap again for two."}
      footer={(
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={[t.heading, t.tab, { flex: 1 }]}>{sent ? (nothing ? "-" : `+${cash(figure)}`) : cash(figure)}</Text>
          <Btn label="Cancel" onPress={onCancel} />
          <Btn label="Done" primary disabled={(asks && scope === null) || nothing}
            onPress={() => { if (!((asks && scope === null) || nothing)) onDone(chosen, scope ?? "all", customs); }} />
        </View>
      )}
    >
      {!sent ? <Text style={[t.label, { fontSize: 16, color: c.ink900 }]} accessibilityLiveRegion="polite">{nameWithAddons(dish, chosen)}</Text> : null}

      {asks ? (
        <View style={{ gap: 8 }}>
          <Text style={[t.label, { color: c.ink900 }]}>There are {qty} on this line. Put these add-ons on:</Text>
          <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Which of them">
            {([["all", `All ${qty}`], ["one", "Just 1"]] as const).map(([value, label]) => (
              <Pressable
                key={value} onPress={() => setScope(value)} accessibilityRole="radio" accessibilityState={{ checked: scope === value }}
                style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: "center", borderRadius: 999, borderWidth: 1,
                  borderColor: scope === value ? "#1f6f5c" : c.grey300, backgroundColor: scope === value ? "#eaf4f1" : c.white }}
              >
                <Text style={[t.label, { color: c.ink900 }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {scope === "all" ? <Text style={[t.label, { color: c.orange700 }]}>On each of the {qty}: {cash(unit)} each, {cash(unit * qty)} in all.</Text> : null}
          {scope === "one" ? <Text style={[t.label, { color: c.orange700 }]}>One of them, {cash(unit)}, as its own line; the other {qty - 1} stay as they are.</Text> : null}
        </View>
      ) : null}

      {addons.length === 0 && loading ? (
        <Text style={t.label}>Reading the add-ons…</Text>
      ) : addons.length === 0 && failed ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={[t.label, { flex: 1, color: c.red700 }]}>The add-ons could not be read. Check the connection.</Text>
          <Capsule label="Try again" onPress={onRetry} />
        </View>
      ) : addons.length === 0 ? (
        <Text style={t.label}>No numbered add-ons yet. Whoever edits the menu adds them on the Menu screen, under Add-ons. A custom one can still be typed below.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {addons.map((a) => {
            const off = Boolean(a.offUntil && Date.parse(a.offUntil) > Date.now());
            const n = chosen.find((x) => x.id === a.id)?.qty ?? 0;
            return (
              <Pressable
                key={a.id} disabled={off} onPress={() => setChosen((prev) => addNumbered(prev, a))}
                accessibilityRole="button" accessibilityLabel={`Add-on ${a.number}, ${a.name}${n ? `, ${n} on this dish` : ""}`}
                style={{ minHeight: 64, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 12,
                  borderColor: off ? c.grey200 : n > 0 ? "#1f6f5c" : c.grey300, backgroundColor: off ? c.grey50 : n > 0 ? "#eaf4f1" : c.white }}
              >
                <Text style={[t.figure, t.tab, { color: off ? c.grey300 : c.ink900 }]}>{a.number}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[t.label, { fontSize: 16, color: off ? c.grey500 : c.ink900, textDecorationLine: off ? "line-through" : "none" }]}>{a.name}</Text>
                  <Text style={[t.label, t.tab]}>
                    {off ? "off today" : a.price === 0 ? "Free" : `+${cash(a.price)}`}
                    {n > 0 ? <Text style={{ ...face[600], color: "#1a5f4f" }}>{`  ×${n}`}</Text> : null}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {chosen.length > 0 ? (
        <View>
          {chosen.map((x) => (
            <View key={x.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.grey100 }}>
              <Text style={[t.label, t.tab, { width: 24, color: c.grey500 }]}>{x.number}</Text>
              <Text style={[t.label, { flex: 1, fontSize: 16, color: c.ink900 }]}>{sent ? "+ " : ""}{x.name}{x.qty > 1 ? ` ×${x.qty}` : ""}</Text>
              <Text style={[t.label, t.tab]}>{x.price === 0 ? "Free" : `+${cash(x.price * x.qty)}`}</Text>
              <RoundBtn a11y={`One less ${x.name}`} tone="danger" onPress={() => setChosen((prev) => lessNumbered(prev, x.id))}><X size={16} color={c.grey500} /></RoundBtn>
            </View>
          ))}
        </View>
      ) : null}

      <CustomForm onAdd={(x) => setCustoms((prev) => [...prev, x])} />

      {customs.length > 0 ? (
        <View accessibilityLabel="Custom add-ons">
          {customs.map((x, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.grey100 }}>
              <Text style={[t.label, { flex: 1, fontSize: 16, color: c.ink900 }]} numberOfLines={1}>+ {x.name} ×{x.qty}</Text>
              <Text style={[t.label, t.tab]}>{x.price === 0 ? "Free" : `+${cash(x.price * x.qty)}`}</Text>
              <RoundBtn a11y={`Take off ${x.name}`} tone="danger" onPress={() => setCustoms((prev) => prev.filter((_, j) => j !== i))}><X size={16} color={c.grey500} /></RoundBtn>
            </View>
          ))}
        </View>
      ) : null}
    </Sheet>
  );
}

/** A custom add-on (D27-291): closed until asked for; a name, and a price or Free. */
function CustomForm({ onAdd }: { onAdd: (x: CustomAddon) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [free, setFree] = useState(false);
  const [n, setN] = useState(1);
  const { priceN, priceBad, ready } = customProblems(name, price, free);

  if (!open) return <Btn label="Custom add-on" icon={<Plus size={16} color={c.ink900} />} onPress={() => setOpen(true)} />;

  const input = { minHeight: 48, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: c.grey300, ...t.label, fontSize: 16, color: c.ink900 };
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.grey200, padding: 14, gap: 12 }} accessibilityLabel="Custom add-on">
      <Text style={[t.label, { color: c.ink900 }]}>Custom add-on - something not on the list. Its own line under the dish.</Text>
      <View style={{ gap: 6 }}>
        <Text style={[t.label, { color: c.ink900 }]}>Name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Extra papad" placeholderTextColor={c.grey500} accessibilityLabel="Name" autoFocus style={input} />
        {name.trim().length > LONGEST_NAME ? <Text style={[t.caption, { color: c.red700 }]}>At most {LONGEST_NAME} letters, so the KOT can print it.</Text> : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={[t.label, { color: c.ink900 }]}>Price</Text>
          <TextInput
            value={free ? "" : price} onChangeText={setPrice} editable={!free} keyboardType="decimal-pad" accessibilityLabel="Price"
            placeholder={free ? "Free" : "40"} placeholderTextColor={c.grey500} style={[input, free ? { backgroundColor: c.grey50 } : null]}
          />
        </View>
        <Pressable
          onPress={() => setFree((f) => !f)} accessibilityRole="checkbox" accessibilityState={{ checked: free }}
          style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: free ? c.orange : c.grey300, backgroundColor: free ? c.orange : c.white, alignItems: "center", justifyContent: "center" }}>
            {free ? <Check size={14} color={c.white} /> : null}
          </View>
          <Text style={[t.label, { color: c.ink900 }]}>Free</Text>
        </Pressable>
      </View>
      {!free && price.trim() !== "" && priceBad
        ? <Text style={[t.caption, { color: c.red700 }]}>Rupees, more than 0 - like 40 or 40.50. Or tick Free.</Text>
        : <Text style={t.caption}>Taxed at the dish's own rate.</Text>}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={[t.label, { marginRight: 4 }]}>How many</Text>
        <RoundBtn a11y="One less" disabled={n <= 1} onPress={() => setN((x) => Math.max(1, x - 1))}><Minus size={16} color={c.grey600} /></RoundBtn>
        <Text style={[t.label, t.tab, { width: 32, textAlign: "center", fontSize: 16, color: c.ink900 }]} accessibilityLiveRegion="polite">{n}</Text>
        <RoundBtn a11y="One more" disabled={n >= MOST_OF_A_CUSTOM} onPress={() => setN((x) => Math.min(MOST_OF_A_CUSTOM, x + 1))}><Plus size={16} color={c.grey600} /></RoundBtn>
        <View style={{ flex: 1 }} />
        <Btn label="Add" primary disabled={!ready}
          onPress={() => {
            if (!ready) return;
            onAdd({ name: name.trim().replace(/\s+/g, " "), price: free ? 0 : priceN!, qty: n });
            setName(""); setPrice(""); setFree(false); setN(1);
          }} />
      </View>
    </View>
  );
}
