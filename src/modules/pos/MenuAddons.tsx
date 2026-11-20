import { Hash, PenLine, Plus } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { api } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Card, useRead } from "../../core/ui";
import {
  customLine, M, nextNumber, numberedForm, numberedPrice, numberedState, OFF_FOR_NUMBERED, type CustomAddonUsed,
} from "./menuEdit";
import { paise, whyNotMenu } from "./setup";
import { Btn, Field, Input, Loading, Part, Pill, Sheet, Toggle, type Acts } from "./SetupKit";
import { ReadProblem, SaidBar, Stale, ty } from "./TablesKit";
import type { NumberedAddon } from "./types";

/* ══════════════════════════════════════════════════════════════════
   THE MENU'S ADD-ONS TAB (components/NumberedAddonsTab.tsx, the owner's
   D27-289, D27-291): a numbered list any dish can take under Customise.
   The number is typed once and never changes: an add-on that goes is
   switched off. No default price (D27-120): blank until typed, 0 only when
   Free. Below it, the custom add-ons staff typed lately, to be numbered.
   ══════════════════════════════════════════════════════════════════ */

type Ctx = { code: string; role: string | null; acts: Acts };

export function NumberedAddons({ ctx }: { ctx: Ctx }) {
  const { code, role, acts } = ctx;
  const q = useRead(async () => (await api<{ addons: NumberedAddon[] }>(M.numbered(code, true))).addons, ["pos", code, "menu", "numbered"]);
  const [editing, setEditing] = useState<NumberedAddon | "new" | null>(null);
  const [preset, setPreset] = useState<{ name: string; price: number } | null>(null);
  const [offing, setOffing] = useState<NumberedAddon | null>(null);
  const refusal = whyNotMenu(role);
  const list = q.data ?? [];
  const inUse = list.filter((a) => a.isActive);
  const switchedOff = list.filter((a) => !a.isActive);
  return (
    <>
      <Part title="Add-ons" about="Numbered extras any dish can take. On an order, tap Customise beside the dish, then the number: it is added to that dish and its price.">
        <Btn label="Add an add-on" Icon={Plus} style={{ alignSelf: "flex-start" }} why={acts.why("numbered:new", refusal)} onRefused={acts.refused} onPress={() => setEditing("new")} />
        {q.error && q.data ? <Stale error={new Error(q.error)} loadedAt={0} onRetry={q.reload} /> : null}
        {!q.data ? (q.error ? <ReadProblem error={new Error(q.error)} what="the add-ons" onRetry={q.reload} /> : <Loading what="the add-ons" />)
          : list.length === 0 ? (
            <Card style={{ alignItems: "center", gap: 6, paddingVertical: 24 }}>
              <Hash size={22} color={c.grey400} />
              <Text style={[t.heading, ty.md]}>No add-ons yet</Text>
              <Text style={[t.label, ty.sm, { textAlign: "center", color: c.grey600 }]}>
                Add one with its number, name and price - for example 2, Kebab, ₹120. Staff tap the number under Customise on any dish.
              </Text>
            </Card>
          ) : (
            <Card style={{ paddingHorizontal: 0, paddingVertical: 0 }}>
              {[...inUse, ...switchedOff].map((a, i) => {
                const st = numberedState(a);
                const off = a.isActive && st.tone === "warning";
                const id = `numbered:${a.id}`;
                return (
                  <View key={a.id} style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey100 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Text style={[t.figure, { fontSize: 24, width: 40, textAlign: "center", color: a.isActive ? c.ink900 : c.grey400 }]}>{a.number}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[t.label, ty.md, { color: a.isActive ? c.ink900 : c.grey500 }]}>{a.name}</Text>
                        {a.description ? <Text style={[t.label, ty.sm, { color: c.grey600 }]} numberOfLines={1}>{a.description}</Text> : null}
                      </View>
                      <Text style={[t.label, ty.md, t.tab, { color: c.ink900 }]}>{numberedPrice(a)}</Text>
                    </View>
                    <Pill tone={st.tone} text={st.text} />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {a.isActive ? <Btn label="Change" small why={acts.why(id, refusal)} onRefused={acts.refused} onPress={() => setEditing(a)} /> : null}
                      {a.isActive ? (off ? (
                        <Btn label="Back on" small busy={acts.busy === `${id}:on`} why={acts.why(`${id}:on`, refusal)} onRefused={acts.refused}
                          onPress={() => void acts.run(`${id}:on`, "POST", M.numberedOff(code, a.id, "on"), undefined,
                            { done: `${a.name} is back`, not: "Not changed", what: "put back", where: "the add-ons" })} />
                      ) : (
                        <Btn label="Off for a while" small why={acts.why(`${id}:off`, refusal)} onRefused={acts.refused} onPress={() => setOffing(a)} />
                      )) : null}
                      <Btn label={a.isActive ? "Switch off" : "Bring back"} small busy={acts.busy === `${id}:active`} why={acts.why(`${id}:active`, refusal)} onRefused={acts.refused}
                        onPress={() => void acts.run(`${id}:active`, "PATCH", M.numberedOne(code, a.id), { active: !a.isActive },
                          { done: a.isActive ? `${a.name} switched off` : `${a.name} is add-on ${a.number} again`, not: "Not changed", what: "changed", where: "the add-ons" })} />
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
      </Part>
      <CustomUsed code={code} onNumber={(u) => { setPreset({ name: u.name, price: u.price }); setEditing("new"); }} />
      {editing !== null ? (
        <AddonSheet addon={editing === "new" ? undefined : editing} preset={editing === "new" ? preset : null} suggested={nextNumber(list)} ctx={ctx}
          onClose={() => { setEditing(null); setPreset(null); }} />
      ) : null}
      {offing ? (
        <Sheet open onClose={() => setOffing(null)} title={`${offing.name} off for a while`}
          about="Customise shows it as off, and an order asking for it is refused until then." footer={<Btn label="Cancel" onPress={() => setOffing(null)} />}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {OFF_FOR_NUMBERED.map((o) => (
              <Btn key={o.key} label={o.label} style={{ flexBasis: "47%", flexGrow: 1 }} why={acts.why(`numbered:${offing.id}:off`)} onRefused={acts.refused}
                onPress={() => {
                  const a = offing;
                  setOffing(null);
                  void acts.run(`numbered:${a.id}:off`, "POST", M.numberedOff(code, a.id, "off"), { until: o.key },
                    { done: `${a.name} is off`, not: "Not changed", what: "taken off", where: "the add-ons" });
                }} />
            ))}
          </View>
        </Sheet>
      ) : null}
    </>
  );
}

function AddonSheet({ addon, preset, suggested, ctx, onClose }: {
  addon?: NumberedAddon; preset: { name: string; price: number } | null; suggested: number; ctx: Ctx; onClose: () => void;
}) {
  const { code, role, acts } = ctx;
  const [number, setNumber] = useState(addon ? String(addon.number) : String(suggested));
  const [name, setName] = useState(addon?.name ?? preset?.name ?? "");
  const [description, setDescription] = useState(addon?.description ?? "");
  /* No default price: blank until typed; a custom add-on's own price is what staff charged. */
  const [price, setPrice] = useState(addon && !addon.free ? String(addon.price) : !addon && preset && preset.price > 0 ? String(preset.price) : "");
  const [free, setFree] = useState(addon?.free ?? (preset ? preset.price === 0 : false));
  const f = numberedForm(!addon, number, name, description, price, free);
  const id = addon ? `numbered:${addon.id}` : "numbered:new";
  const save = async () => {
    const ran = addon
      ? await acts.run(id, "PATCH", M.numberedOne(code, addon.id), f.body, { done: `${f.body.name} saved`, not: "Not saved", what: "saved", where: "the add-ons" })
      : await acts.run(id, "POST", M.numbered(code), f.body, { done: `Add-on ${f.n} is ${f.body.name}`, not: "Not saved", what: "added", where: "the add-ons" });
    if (ran === "done") onClose();
  };
  return (
    <Sheet open onClose={onClose} title={addon ? `Change add-on ${addon.number}` : "Add an add-on"}
      about={addon ? "Its number stays: staff know it by that." : "Staff will tap its number under Customise on any dish."}
      footer={<View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label="Cancel" grow onPress={onClose} />
        <Btn label="Save" kind="primary" grow off={!f.ready} busy={acts.busy === id} why={acts.why(id, whyNotMenu(role))} onRefused={acts.refused} onPress={() => void save()} />
      </View>}>
      {!addon ? (
        <Field label="Number" hint="What staff tap. Not used by another add-on." error={f.numberError}>
          <Input label="Number" value={number} onChange={setNumber} keys="number" />
        </Field>
      ) : null}
      <Field label="Name" hint="Printed on the bill and under the dish on the kitchen slip.">
        <Input label="Name" value={name} onChange={setName} placeholder="Kebab" autoFocus />
      </Field>
      <Field label="What it is" hint="For staff: what goes on the plate.">
        <Input label="What it is" value={description} onChange={setDescription} placeholder="Two pieces of seekh kebab" />
      </Field>
      <Field label="Price" hint="Added to the dish. Taxed at the dish's own rate." error={f.priceError}>
        <Input label="Price" value={free ? "" : price} onChange={setPrice} keys="decimal" off={free} placeholder={free ? "Free" : "120"} />
      </Field>
      <Toggle label="Free" on={free} onChange={setFree} />
      {acts.said && acts.said.tone !== "ok" ? <SaidBar said={acts.said} onDone={() => acts.setSaid(null)} /> : null}
    </Sheet>
  );
}

/** What staff typed under Customise lately (D27-291), most used first: the common ones are worth a number. */
function CustomUsed({ code, onNumber }: { code: string; onNumber: (u: CustomAddonUsed) => void }) {
  const q = useRead(() => api<{ days: number; used: CustomAddonUsed[] }>(M.customUsed(code)), ["pos", code, "menu", "custom-used"]);
  const days = q.data?.days ?? 30;
  return (
    <Part title="Custom add-ons used" about={`What staff typed under Customise in the last ${days} days. Give the common ones a number.`}>
      {!q.data ? (q.error ? <ReadProblem error={new Error(q.error)} what="the custom add-ons" onRetry={q.reload} /> : <Loading what="the custom add-ons" />)
        : q.data.used.length === 0 ? (
          <Card style={{ alignItems: "center", gap: 6, paddingVertical: 24 }}>
            <PenLine size={22} color={c.grey400} />
            <Text style={[t.heading, ty.md]}>None typed yet</Text>
            <Text style={[t.label, ty.sm, { textAlign: "center", color: c.grey600 }]}>
              When a guest asks for something that is not on the list, staff type it under Customise, Custom add-on. It shows here.
            </Text>
          </Card>
        ) : (
          <Card style={{ paddingHorizontal: 0, paddingVertical: 0 }}>
            {q.data.used.map((u, i) => (
              <View key={`${u.name}-${u.price}`} style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 6, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey100 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
                  <Text style={[t.label, ty.md, { flex: 1, color: c.ink900 }]}>{u.name}</Text>
                  <Text style={[t.label, ty.md, t.tab, { color: c.ink900, ...face[500] }]}>{u.price === 0 ? "Free" : paise(u.price)}</Text>
                </View>
                <Text style={[t.label, ty.sm, { color: c.grey600 }]}>{customLine(u)}</Text>
                <Btn label="Number it" small style={{ alignSelf: "flex-start" }} onPress={() => onNumber(u)} />
              </View>
            ))}
          </Card>
        )}
    </Part>
  );
}

