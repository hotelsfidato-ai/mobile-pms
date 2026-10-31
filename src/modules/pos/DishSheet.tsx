import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { cash } from "../../core/format";
import { c, t } from "../../core/theme";
import { BAR_NOTES, chooseRule, countIn, dishReady, pickedIds, PRESET_NOTES, toggleSide, typesOf, unitPriceOf } from "./pad";
import type { MenuItem } from "./types";
import { Btn, Caps, Input, Sheet, ty, web } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   A DISH'S SHEET — the web's DishDialog (src/modules/pos/flows/
   DishDialog.tsx): one variation of each type, sides with their limits,
   the note for the kitchen (or the bar), the quantity; the price moves as
   choices are made. Add stays off until one of each type is chosen and
   every group has its minimum - the reason is written where it is read.
   It opens only for a dish with something to ask. Reference picture 04.
   ══════════════════════════════════════════════════════════════════ */

export function DishSheet({ item, bar, onCancel, onAdd }: {
  item: MenuItem | null; bar: boolean; onCancel: () => void;
  onAdd: (qty: number, note: string, variationId?: string, addonIds?: string[], moreChoiceIds?: string[]) => void;
}) {
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  /* The pad keys this by the dish, so another dish starts afresh: a side
     left from the last dish is a charge nobody asked for. */

  const types = useMemo(() => (item ? typesOf(item) : []), [item]);
  if (!item) return null;
  const { variationId, moreChoiceIds } = pickedIds(item, picked);
  const unitPrice = unitPriceOf(item, variationId, chosen, moreChoiceIds);
  const ready = dishReady(item, picked, chosen);
  const q = search.trim().toLowerCase();

  return (
    <Sheet
      open onClose={onCancel} title={item.name} gap={20}
      description={types.length > 0
        ? (types.length > 1 ? "Choose one of each, and any sides." : "Choose one, and any sides.")
        : "Add sides, or a note for the kitchen."}
      footer={(
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={[t.heading, ty.md, t.tab, { flex: 1 }]}>{cash(unitPrice * qty)}</Text>
          <Btn label="Cancel" onPress={onCancel} />
          <Btn
            label="Add" primary disabled={!ready}
            onPress={() => ready && onAdd(qty, note, variationId ?? undefined, chosen.size ? [...chosen] : undefined, moreChoiceIds.length ? moreChoiceIds : undefined)}
          />
        </View>
      )}
    >
      {types.map((kind, i) => (
        <View key={kind.typeNo} style={{ gap: 12 }}>
          <Caps>{kind.heading}</Caps>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {kind.choices.map((v) => {
              const on = picked[kind.typeNo] === v.id;
              return (
                <Pressable
                  key={v.id} onPress={() => setPicked((p) => ({ ...p, [kind.typeNo]: v.id }))}
                  accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${v.label}, ${v.price === 0 ? "Free" : cash(v.price)}`}
                  style={{ minWidth: 96, minHeight: 64, paddingHorizontal: 16, justifyContent: "center", borderRadius: 12, borderWidth: 1,
                    borderColor: on ? c.orange : c.grey300, backgroundColor: on ? c.orange50 : c.white }}
                >
                  <Text style={[t.label, ty.sm, { color: on ? c.orange700 : c.ink900 }]}>{v.label}</Text>
                  <Text style={[t.label, ty.sm, t.tab]}>{v.price === 0 ? "Free" : `${i > 0 ? "+" : ""}${cash(v.price)}`}</Text>
                </Pressable>
              );
            })}
          </View>
          {i === 0 && variationId === null ? <Text style={[t.label, ty.sm, { marginTop: -4 }]}>This dish is sold by variation - it has no price of its own.</Text> : null}
        </View>
      ))}

      {item.addonGroups.length > 0 ? (
        <View style={{ gap: 12 }}>
          <Input value={search} onChangeText={setSearch} placeholder="Search sides" accessibilityLabel="Search sides" />
          {item.addonGroups.map((g) => {
            const shown = g.addons.filter((a) => a.label.toLowerCase().includes(q));
            if (!shown.length) return null;
            const short = countIn(g, chosen) < g.minSelect;
            return (
              <View key={g.id} style={{ gap: 12 }}>
                <Text>
                  <Caps>{g.label}</Caps>
                  <Text style={[t.caption, ty.xs, { color: short ? c.red700 : c.grey500 }]}> {chooseRule(g.minSelect, g.maxSelect)}</Text>
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {shown.map((a) => {
                    const off = Boolean(a.offUntil && Date.parse(a.offUntil) > Date.now());
                    const on = chosen.has(a.id);
                    /* The group has all it allows: the rest wait until one is taken back. */
                    const full = !on && g.maxSelect !== null && g.maxSelect > 1 && countIn(g, chosen) >= g.maxSelect;
                    return (
                      <Pressable
                        key={a.id} disabled={off || full} onPress={() => setChosen((prev) => toggleSide(prev, a.id, g))}
                        accessibilityRole="button" accessibilityState={{ selected: on, disabled: off || full }}
                        accessibilityLabel={`${a.label}, ${off ? "off today" : a.price === 0 ? "Free" : cash(a.price)}`}
                        style={{ flexBasis: "47%", flexGrow: 1, minHeight: 64, paddingHorizontal: 14, justifyContent: "center", borderRadius: 12, borderWidth: 1,
                          opacity: full ? 0.5 : 1,
                          borderColor: off ? c.grey200 : on ? web.success : c.grey300, backgroundColor: off ? c.grey50 : on ? web.success50 : c.white }}
                      >
                        <Text style={[t.label, ty.sm, { color: off ? c.grey500 : c.ink900, textDecorationLine: off ? "line-through" : "none" }]}>{a.label}</Text>
                        <Text style={[t.label, ty.sm, t.tab]}>{off ? "off today" : a.price === 0 ? "Free" : cash(a.price)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        <Caps>{bar ? "Note for the bar" : "Note for the kitchen"}</Caps>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(bar ? BAR_NOTES : PRESET_NOTES).map((n) => (
            <Pressable
              key={n} onPress={() => setNote(note === n ? "" : n)} accessibilityRole="button" accessibilityState={{ selected: note === n }}
              style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: 999, borderWidth: 1,
                borderColor: note === n ? c.orange : c.grey300, backgroundColor: note === n ? c.orange50 : c.white }}
            >
              <Text style={[t.label, ty.sm, { color: note === n ? c.orange700 : c.grey700 }]}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <Input value={note} onChangeText={setNote} placeholder="Anything else" accessibilityLabel="Anything else" />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Caps>Quantity</Caps>
        <View style={{ flex: 1 }} />
        <Btn label="−" a11y="One less" onPress={() => setQty((n) => Math.max(1, n - 1))} />
        <Text style={[t.heading, ty.md, t.tab, { width: 40, textAlign: "center" }]} accessibilityLiveRegion="polite">{qty}</Text>
        <Btn label="+" a11y="One more" onPress={() => setQty((n) => n + 1)} />
      </View>
    </Sheet>
  );
}
