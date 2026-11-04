import { Minus, Plus, Square, SquareCheck, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api, type Hotel } from "../../core/api";
import { cash } from "../../core/format";
import { c, face, t } from "../../core/theme";
import { notKnown, useRead } from "../../core/ui";
import { MOST_OF_A_CUSTOM, MOST_OF_ONE, customiseAct, whyNotCustom } from "./order";
import { Btn, Choice, Field, Input, Refused, Sheet, type Write } from "./OrderSheets";
import type { CustomAddon, LineAddon, NumberedAddon, Order, OrderLine } from "./types";

/* ══════════════════════════════════════════════════════════════════
   CUSTOMISE ONE DISH — the web's flows/CustomiseDialog.tsx (D27-289,
   D27-290, D27-291), its words. Before Send a numbered add-on folds into
   the dish (all of a line of several, or just one split off); once the
   kitchen has it, every add-on is a line of its own for the next Send.
   A custom add-on: a name, a price or Free (never a default), how many.
   The difference (MODULE.md): no running figure. The web adds the prices
   up in the browser as they are tapped; here each add-on shows its own
   price and the bill shows the server's line once Done is pressed.
   Refused offline by the web's tiers (offline.ts): the server's sentence.
   ══════════════════════════════════════════════════════════════════ */

export function CustomiseSheet({ hotel, order, line, onClose, write }: {
  hotel: Hotel; order: Order; line: OrderLine; onClose: () => void; write: Write;
}) {
  const code = hotel.code;
  const sent = line.kotStatus !== "pending";
  const dish = line.numberedAddons?.dish ?? line.name;
  const initial = line.numberedAddons?.addons ?? [];
  const addons = useRead(
    () => api<{ addons: NumberedAddon[] }>(`/api/hotels/${code}/till/numbered-addons`).then((b) => b.addons),
    ["pos", code, "order", "addons"],
  );
  /* A sent dish starts empty: what is on it already is on the bill. */
  const [chosen, setChosen] = useState<LineAddon[]>(sent ? [] : [...initial]);
  const [customs, setCustoms] = useState<CustomAddon[]>([]);
  const [scope, setScope] = useState<"all" | "one" | null>(line.qty > 1 && !sent ? null : "all");
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  const add = (a: NumberedAddon) => setChosen((prev) => {
    const have = prev.find((x) => x.id === a.id);
    if (have) return have.qty >= MOST_OF_ONE ? prev : prev.map((x) => (x.id === a.id ? { ...x, qty: x.qty + 1 } : x));
    return [...prev, { id: a.id, number: a.number, name: a.name, price: a.price, qty: 1 }].sort((x, y) => x.number - y.number);
  });
  const less = (id: string) => setChosen((prev) => prev.flatMap((x) => (x.id !== id ? [x] : x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : [])));

  const key = (list: readonly LineAddon[]) => JSON.stringify(list.map((x) => [x.id, x.qty]));
  const asks = line.qty > 1 && !sent && key(chosen) !== key(initial);
  const nothing = sent && chosen.length === 0 && customs.length === 0;
  const list = addons.data ?? [];

  /* Added twice is two sets of add-ons (or a second one split off), and the
     route reads no key: after an unknown outcome Done takes no more taps
     until this is closed and the order read again (MPOS-4). */
  const stuck = useRef(false);
  const [unknown, setUnknown] = useState(false);
  const done = async () => {
    if (stuck.current) return;
    stuck.current = true;
    setBusy(true);
    setRefused(null);
    const out = await write(customiseAct(code, order, line, chosen, scope ?? "all", customs)).finally(() => setBusy(false));
    if ("refused" in out && out.unknown) {
      const n = notKnown("added", "the order once this is closed");
      setUnknown(true);
      setRefused(`${n.title}. ${out.refused} ${n.body}`);
      return;
    }
    stuck.current = false;
    if ("refused" in out) setRefused(out.refused);
    else onClose();
  };

  return (
    <Sheet
      visible onClose={onClose}
      title={sent ? `Add to ${dish}` : `Customise ${dish}`}
      description={sent
        ? "The kitchen has this dish. Each add-on goes on as its own line under it, and to the kitchen with the next Send."
        : "Tap a number to add it to this dish. Tap again for two."}
      footer={(
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label="Cancel" onPress={onClose} grow />
          <Btn label="Done" kind="primary" off={(asks && scope === null) || nothing || busy || unknown} busy={busy} onPress={() => void done()} grow />
        </View>
      )}
    >
      {asks ? (
        <View style={{ gap: 8 }}>
          <Text style={[t.label, { color: c.ink900 }]}>There are {line.qty} on this line. Put these add-ons on:</Text>
          <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Which of them">
            <Choice label={`All ${line.qty}`} on={scope === "all"} onPress={() => setScope("all")} />
            <Choice label="Just 1" on={scope === "one"} onPress={() => setScope("one")} />
          </View>
          {scope === "one" ? <Text style={[t.label, { color: c.orange700 }]}>One of them as its own line; the other {line.qty - 1} stay as they are.</Text> : null}
        </View>
      ) : null}

      {list.length === 0 && addons.loading ? <Text style={t.label}>Reading the add-ons…</Text>
        : list.length === 0 && addons.error ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={[t.label, { flex: 1, color: c.red700 }]}>The add-ons could not be read. Check the connection.</Text>
            <Btn label="Try again" onPress={addons.reload} />
          </View>
        ) : list.length === 0 ? (
          <Text style={t.label}>No numbered add-ons yet. Whoever edits the menu adds them on the Menu screen, under Add-ons. A custom one can still be typed below.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {list.map((a) => {
              const off = Boolean(a.offUntil && Date.parse(a.offUntil) > Date.now());
              const n = chosen.find((x) => x.id === a.id)?.qty ?? 0;
              return (
                <Pressable
                  key={a.id} disabled={off} onPress={() => add(a)} accessibilityRole="button"
                  accessibilityLabel={`Add-on ${a.number}, ${a.name}${n ? `, ${n} on this dish` : ""}`} accessibilityState={{ disabled: off }}
                  style={{
                    minHeight: 64, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 12,
                    alignItems: "flex-start", borderColor: off ? c.grey200 : n > 0 ? c.success600 : c.grey300,
                    backgroundColor: off ? c.grey50 : c.white,
                  }}
                >
                  <Text style={[t.figure, { color: off ? c.grey300 : c.ink900 }]}>{a.number}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.heading, { ...face[500], color: off ? c.grey500 : c.ink900, textDecorationLine: off ? "line-through" : "none" }]}>{a.name}</Text>
                    <Text style={[t.label, t.tab]}>
                      {off ? "off today" : a.price === 0 ? "Free" : `+${cash(a.price)}`}
                      {n > 0 ? <Text style={{ color: c.success600, ...face[600] }}>{`  ×${n}`}</Text> : null}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

      {chosen.map((x) => (
        <View key={x.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 6 }}>
          <Text style={[t.label, t.tab, { width: 24 }]}>{x.number}</Text>
          <Text style={[t.heading, { flex: 1, ...face[500] }]}>{sent ? "+ " : ""}{x.name}{x.qty > 1 ? ` ×${x.qty}` : ""}</Text>
          <Text style={[t.label, t.tab]}>{x.price === 0 ? "Free" : `+${cash(x.price)} each`}</Text>
          <Round label={`One less ${x.name}`} Icon={X} onPress={() => less(x.id)} />
        </View>
      ))}

      <CustomForm onAdd={(x) => setCustoms((prev) => [...prev, x])} />
      {customs.map((x, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 6 }}>
          <Text style={[t.heading, { flex: 1, ...face[500] }]} numberOfLines={1}>+ {x.name} ×{x.qty}</Text>
          <Text style={[t.label, t.tab]}>{x.price === 0 ? "Free" : `+${cash(x.price)} each`}</Text>
          <Round label={`Take off ${x.name}`} Icon={X} onPress={() => setCustoms((prev) => prev.filter((_, j) => j !== i))} />
        </View>
      ))}
      <Refused text={refused} />
    </Sheet>
  );
}

function Round({ label, Icon, onPress, off }: { label: string; Icon: typeof X; onPress: () => void; off?: boolean }) {
  return (
    <Pressable
      onPress={onPress} disabled={off} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(off) }}
      style={({ pressed }) => ({
        width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.grey300, alignItems: "center", justifyContent: "center",
        backgroundColor: pressed ? c.grey100 : c.white, opacity: off ? 0.4 : 1,
      })}
    >
      <Icon size={16} color={c.grey600} />
    </Pressable>
  );
}

/** Closed until asked for, so the numbered list stays the first thing a thumb meets. */
function CustomForm({ onAdd }: { onAdd: (x: CustomAddon) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [free, setFree] = useState(false);
  const [n, setN] = useState(1);
  if (!open) return <Btn label="Custom add-on" Icon={Plus} onPress={() => setOpen(true)} />;
  const why = whyNotCustom(name, price, free);
  /* Said once something is typed, not on an empty form. */
  const shown = name.trim() || price.trim() ? why : null;
  const add = () => {
    onAdd({ name: name.trim().replace(/\s+/g, " "), price: free ? 0 : Number(price.trim()), qty: n });
    setName(""); setPrice(""); setFree(false); setN(1);
  };
  return (
    <View style={{ borderWidth: 1, borderColor: c.grey200, borderRadius: 10, padding: 14, gap: 12 }} accessibilityLabel="Custom add-on">
      <Text style={[t.label, { color: c.ink900 }]}>Custom add-on - something not on the list. Its own line under the dish.</Text>
      <Field label="Name" required><Input label="Name" value={name} onChangeText={setName} placeholder="Extra papad" autoFocus /></Field>
      <Field label="Price" required={!free} hint="Taxed at the dish's own rate.">
        <Input label="Price" value={free ? "" : price} onChangeText={setPrice} placeholder={free ? "Free" : "40"} number editable={!free} />
      </Field>
      <Pressable
        onPress={() => setFree(!free)} accessibilityRole="checkbox" accessibilityState={{ checked: free }} accessibilityLabel="Free"
        style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        {free ? <SquareCheck size={22} color={c.orange} /> : <Square size={22} color={c.grey500} />}
        <Text style={[t.heading, face[500]]}>Free</Text>
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={[t.label, { marginRight: 4 }]}>How many</Text>
        <Round label="One less" Icon={Minus} off={n <= 1} onPress={() => setN((x) => Math.max(1, x - 1))} />
        <Text style={[t.heading, t.tab, { width: 32, textAlign: "center" }]} accessibilityLiveRegion="polite">{n}</Text>
        <Round label="One more" Icon={Plus} off={n >= MOST_OF_A_CUSTOM} onPress={() => setN((x) => Math.min(MOST_OF_A_CUSTOM, x + 1))} />
        <View style={{ flex: 1 }} />
        <Btn label="Add" kind="primary" off={why != null} onPress={add} />
      </View>
      {shown ? <Text style={[t.caption, { color: c.red700 }]}>{shown}</Text> : null}
    </View>
  );
}
