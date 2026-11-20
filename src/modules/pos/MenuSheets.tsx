import { Plus, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { c, t } from "../../core/theme";
import {
  blankChoice, KINDS, M, pickKind, removeType, typeRows, variationsBody, variationsReady, type ChoiceRow, type Dish, type TypeRow,
} from "./menuEdit";
import { whyNotMenu } from "./setup";
import { Btn, Field, Input, Ring, Sheet, Toggle, type Acts } from "./SetupKit";
import { SaidBar, ty } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   A DISH'S VARIATIONS, EVERY TYPE AT ONCE (Menu.tsx VariationsDialog,
   D27-189, D27-192, D27-195). Size, Quantity, or an Option the manager
   heads. The first type's choices are the dish's price; a further type's
   add to it. Picking a type fills in the NAMES, never a price. A blank
   price is not zero - tick Free. Saved in one go: all of it or none.
   ══════════════════════════════════════════════════════════════════ */

type Ctx = { code: string; role: string | null; acts: Acts };

export function VariationsSheet({ dish, ctx, onClose }: { dish: Dish; ctx: Ctx; onClose: () => void }) {
  const { code, role, acts } = ctx;
  const [types, setTypes] = useState<TypeRow[]>(() => typeRows(dish));
  const [moved, setMoved] = useState(false);
  const [dishPrice, setDishPrice] = useState("");
  const [dishFree, setDishFree] = useState(false);
  const hadAny = dish.variations.length > 0;
  const id = `item:${dish.id}:variations`;
  const change = (i: number, next: Partial<TypeRow>) => setTypes((ts) => ts.map((x, j) => (j === i ? { ...x, ...next } : x)));
  const changeChoice = (i: number, k: number, next: Partial<ChoiceRow>) =>
    setTypes((ts) => ts.map((x, j) => (j !== i ? x : { ...x, choices: x.choices.map((ch, m) => (m === k ? { ...ch, ...next } : ch)) })));
  const ready = variationsReady(types, hadAny, dishPrice, dishFree);
  const save = async () => {
    const ran = await acts.run(id, "PUT", M.item(code, dish.id, "variations"), variationsBody(types, dishPrice, dishFree),
      { done: `${dish.name}: variations saved`, not: "Not saved", what: "saved", where: `${dish.name}'s variations` });
    if (ran === "done") onClose();
  };
  return (
    <Sheet open onClose={onClose} title={`Variations - ${dish.name}`}
      about={"The waiter picks one of each. The first type's prices are the dish's price; each further type adds to it. A blank price is not zero - tick Free. "
        + "The first type's MRP values a bill given free (NC) in the stock; leave it empty for none."}
      footer={<View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label="Cancel" grow onPress={onClose} />
        <Btn label="Save" kind="primary" grow off={!ready} busy={acts.busy === id} why={acts.why(id, whyNotMenu(role))} onRefused={acts.refused} onPress={() => void save()} />
      </View>}
    >
      {types.map((ty0, i) => (
        <View key={i} accessibilityLabel={`Type ${i + 1}`} style={{ gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.grey100 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <Text style={[t.heading, ty.md, { width: 20 }]}>{i + 1}</Text>
            {KINDS.map((k) => <Ring key={k.kind} label={k.label} on={ty0.kind === k.kind} onPress={() => setTypes((ts) => pickKind(ts, i, k.kind))} />)}
            <Btn label="Remove type" kind="ghost" small onPress={() => {
              const r = removeType(types, i);
              if (r.moved) setMoved(true);
              setTypes(r.types);
            }} />
          </View>
          {!ty0.kind ? <Text style={[t.label, ty.sm, { color: c.red700 }]}>Pick Size, Quantity or Option. It sells as "Variation" until you do.</Text> : null}
          {ty0.kind === "option" ? (
            <Field label="Heading" hint="What the waiter reads - Spice level, Crust.">
              <Input label="Heading" value={ty0.heading} onChange={(heading) => change(i, { heading })} />
            </Field>
          ) : null}
          {ty0.choices.map((ch, k) => (
            <View key={k} style={{ gap: 8, borderRadius: 8, borderWidth: 1, borderColor: c.grey200, padding: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Input label={`Type ${i + 1}, choice ${k + 1}`} value={ch.label} placeholder="Choice" onChange={(label) => changeChoice(i, k, { label })} style={{ flex: 1 }} />
                <Pressable onPress={() => change(i, { choices: ty0.choices.filter((_, m) => m !== k) })} accessibilityRole="button"
                  accessibilityLabel={`Remove type ${i + 1}, choice ${k + 1}`} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                  <X size={16} color={c.grey500} />
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Field label={i === 0 ? "Price" : "Adds"}>
                    <Input label={`Price of type ${i + 1}, choice ${k + 1}`} value={ch.free ? "" : ch.price} off={ch.free} keys="decimal"
                      onChange={(price) => changeChoice(i, k, { price })} />
                  </Field>
                </View>
                {/* Optional: empty is none, a dash (D27-373). */}
                {i === 0 ? (
                  <View style={{ flex: 1 }}>
                    <Field label="MRP">
                      <Input label={`MRP of type 1, choice ${k + 1}`} value={ch.mrp} keys="decimal" placeholder="-" onChange={(mrp) => changeChoice(i, k, { mrp })} />
                    </Field>
                  </View>
                ) : null}
              </View>
              <Toggle label="Free" on={ch.free} onChange={(free) => changeChoice(i, k, { free })} />
            </View>
          ))}
          <Btn label="Add a choice" Icon={Plus} small style={{ alignSelf: "flex-start" }}
            onPress={() => change(i, { choices: [...ty0.choices, blankChoice()] })} />
        </View>
      ))}
      {moved ? <Text style={[t.label, ty.sm, { color: c.orange700 }]}>The next type is now the first, so its prices are the dish's price. Type them again.</Text> : null}
      {types.length === 0 && hadAny ? (
        <View style={{ gap: 8 }}>
          <Field label={`Price of ${dish.name}`} hint="With no variations it is sold at one price again.">
            <Input label={`Price of ${dish.name}`} value={dishFree ? "" : dishPrice} off={dishFree} keys="decimal" onChange={setDishPrice} />
          </Field>
          <Toggle label="Free" on={dishFree} onChange={setDishFree} />
        </View>
      ) : null}
      <Btn label={types.length > 0 ? "Add another type" : "Add a type"} Icon={Plus}
        onPress={() => setTypes((ts) => [...ts, { kind: null, heading: "", choices: [blankChoice()] }])} />
      {acts.said && acts.said.tone !== "ok" ? <SaidBar said={acts.said} onDone={() => acts.setSaid(null)} /> : null}
    </Sheet>
  );
}

