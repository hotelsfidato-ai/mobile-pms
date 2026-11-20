import { ListPlus, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { c, space, t } from "../../core/theme";
import { Card } from "../../core/ui";
import {
  courseShown, M, menuHeadings, mrpShown, newDish, OFF_FOR, offAbout, offDone, offTill, ownText, parseCourse, parseMrp, parsePrep,
  prepShown, priceShown, rateShown, TAX_RATES, variationLine, type Dish, type OffFor, type Section,
} from "./menuEdit";
import { paise, whyNotMenu } from "./setup";
import { Btn, Caps, Chooser, Field, Input, Sheet, Toggle, type Acts } from "./SetupKit";
import { VariationsSheet } from "./MenuSheets";
import { SaidBar, ty } from "./TablesKit";
import type { SectionHeading } from "./types";

/* ══════════════════════════════════════════════════════════════════
   ONE PART OF THE MENU (Menu.tsx CategoryCard): its name, the course and
   minutes every dish in it inherits, its tax heading; each dish with its
   rate, price, MRP, course, minutes, variations, Out of stock and Take
   off; the sides under it; a new dish at the foot. POS-9: on a phone the
   controls go under the name. The price is typed, never defaulted.
   ══════════════════════════════════════════════════════════════════ */

type Ctx = { code: string; role: string | null; acts: Acts };

export function CategoryCard({ section, servesAlcohol, byGroup, ctx }: {
  section: Section; servesAlcohol: boolean; byGroup: Map<string, string[]>; ctx: Ctx;
}) {
  const { code, role, acts } = ctx;
  const refusal = whyNotMenu(role);
  const hid = `category:${section.id}:tax-kind`;
  return (
    <Card style={{ paddingHorizontal: 0, paddingVertical: 0 }}>
      <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 10, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[t.heading, ty.md, { flex: 1 }]} accessibilityRole="header">{section.name}</Text>
          <FigureChip kind="course" value={section.course} own={section.course} name={`everything in ${section.name}`}
            path={M.category(code, section.id, "course")} id={`category:${section.id}:course`} ctx={ctx} />
          <FigureChip kind="prep" value={section.prepMinutes} own={section.prepMinutes} name={section.name} category
            path={M.category(code, section.id, "prep")} id={`category:${section.id}:prep`} ctx={ctx} />
        </View>
        {/* THE SECTION'S TAX HEADING (D22-4): Not set, and Alcohol where no longer served, shown and not chosen. */}
        <Chooser<SectionHeading | "">
          label={`Tax heading for ${section.name}`} value={section.taxKind ?? ""} options={menuHeadings(servesAlcohol, section.taxKind)}
          why={acts.why(hid, refusal)} onRefused={acts.refused}
          onPick={(kind) => void acts.run(hid, "POST", M.category(code, section.id, "tax-kind"), { kind },
            { done: "Saved", doneBody: `${section.name}: the tax heading is changed.`, not: "Not changed", what: "changed", where: section.name })} />
      </View>
      {section.items.map((d, i) => <DishRow key={d.id} dish={d} first={i === 0} byGroup={byGroup} ctx={ctx} />)}
      {section.items.length === 0 ? (
        <Text style={[t.label, ty.sm, { color: c.grey500, paddingHorizontal: space.cardX, paddingVertical: 14 }]}>Nothing in here yet.</Text>
      ) : null}
      <NewDish section={section} ctx={ctx} />
    </Card>
  );
}

function DishRow({ dish, first, byGroup, ctx }: { dish: Dish; first: boolean; byGroup: Map<string, string[]>; ctx: Ctx }) {
  const { code, role, acts } = ctx;
  const refusal = whyNotMenu(role);
  const [varying, setVarying] = useState(false);
  const tid = `item:${dish.id}:toggle`;
  const lines = dish.variations.length > 0 ? variationLine(dish) : [];
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text style={[t.label, ty.md, { flex: 1, color: dish.isActive ? c.ink900 : c.grey500, textDecorationLine: dish.isActive ? "none" : "line-through" }]}>
          {dish.name}
        </Text>
        {/* The rate the till rings it at; a dash, never "0%" (POS-15). */}
        <Text style={[t.caption, ty.xs, t.tab]}>{rateShown(dish)}</Text>
        {/* Sold by variation: no price of its own, a dash. */}
        <Text style={[t.label, ty.md, t.tab, { color: c.ink900, minWidth: 80, textAlign: "right" }]}>{priceShown(dish)}</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {dish.variations.length === 0 ? (
          <FigureChip kind="mrp" value={dish.mrp ?? null} own={dish.mrp ?? null} name={dish.name} path={M.item(code, dish.id, "mrp")} id={`item:${dish.id}:mrp`} ctx={ctx} />
        ) : null}
        <FigureChip kind="course" value={dish.course} own={dish.ownCourse} name={dish.name} path={M.item(code, dish.id, "course")} id={`item:${dish.id}:course`} ctx={ctx} />
        <FigureChip kind="prep" value={dish.prepMinutes} own={dish.ownPrepMinutes} name={dish.name} path={M.item(code, dish.id, "prep")} id={`item:${dish.id}:prep`} ctx={ctx} />
        <Btn label={dish.variations.length > 0 ? "Change variations" : "Add variation"} kind="ghost" small Icon={ListPlus}
          a11y={dish.variations.length > 0 ? `Change variations of ${dish.name}` : `Add variation to ${dish.name}`}
          why={acts.why(`item:${dish.id}:variations`, refusal)} onRefused={acts.refused} onPress={() => setVarying(true)} />
      </View>
      {/* TWO DIFFERENT ACTS: out of paneer until eight (a shift's), and off the card (the menu's). */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
        <OffControl name={dish.name} offUntil={dish.offUntil} askWhy id={`item:${dish.id}`} ctx={ctx}
          offPath={M.item(code, dish.id, "off")} onPath={M.item(code, dish.id, "on")} />
        <Btn label={dish.isActive ? "Take off" : "Put back"} kind="ghost" small busy={acts.busy === tid}
          why={acts.why(tid, refusal)} onRefused={acts.refused}
          onPress={() => void acts.run(tid, "POST", M.item(code, dish.id, "toggle"), undefined,
            { done: "", not: "Not changed", what: dish.isActive ? "taken off" : "put back", where: "the menu" })} />
      </View>
      {lines.length > 0 ? (
        <View style={{ marginLeft: 12, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: c.grey200, gap: 2 }}>
          {lines.map((l) => (
            <Text key={l.heading} style={[t.label, ty.md, t.tab, { color: c.ink900 }]}>
              <Text style={[t.caption, ty.xs, { textTransform: "uppercase", letterSpacing: 0.4 }]}>{l.heading}  </Text>{l.text}
            </Text>
          ))}
        </View>
      ) : null}
      {dish.addonGroups.map((g) => (
        <View key={g.id} style={{ marginLeft: 12, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: c.grey200, gap: 2 }}>
          <Caps>{g.label}</Caps>
          {g.addons.map((a) => (
            <View key={a.id} style={{ gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
                <Text style={[t.label, ty.md, { flex: 1, color: c.ink900 }]}>{a.label}</Text>
                <Text style={[t.label, ty.md, t.tab, { color: c.ink900 }]}>{a.price === 0 ? "Free" : paise(a.price)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <OffControl name={a.label} offUntil={a.offUntil} alsoOn={byGroup.get(g.id)} id={`addon:${a.id}`} ctx={ctx}
                  offPath={M.addonOff(code, a.id, "off")} onPath={M.addonOff(code, a.id, "on")} />
              </View>
            </View>
          ))}
        </View>
      ))}
      {varying ? <VariationsSheet dish={dish} ctx={ctx} onClose={() => setVarying(false)} /> : null}
    </View>
  );
}

/* ── Out of stock, for a while (OffControl): a duration, never a switch ── */

function OffControl({ name, offUntil, askWhy, alsoOn, id, offPath, onPath, ctx }: {
  name: string; offUntil: string | null; askWhy?: boolean; alsoOn?: string[]; id: string; offPath: string; onPath: string; ctx: Ctx;
}) {
  const { acts, role } = ctx;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const refusal = whyNotMenu(role);
  const till = offTill(offUntil);
  if (till) {
    /* When, not just whether: a waiter asked "is it back?" needs a time. */
    return (
      <Btn label={till} small a11y={`${till.replace(" - put back", "")} - put back ${name}`} busy={acts.busy === `${id}:on`}
        why={acts.why(`${id}:on`, refusal)} onRefused={acts.refused}
        onPress={() => void acts.run(`${id}:on`, "POST", onPath, undefined, { done: `${name} is back on`, not: "Not changed", what: "put back", where: "the menu" })} />
    );
  }
  const choose = async (until: OffFor) => {
    const w = offDone(name, until);
    /* A side keeps no reason (POS-2): none is asked for. */
    const ran = await acts.run(`${id}:off`, "POST", offPath, askWhy ? { until, reason: reason.trim() } : { until },
      { done: w.title, doneBody: w.body, not: "Not changed", what: "taken off", where: "the menu" });
    if (ran === "done" || ran === "held") { setOpen(false); setReason(""); }
  };
  return (
    <>
      <Btn label="Out of stock" kind="ghost" small a11y={`Out of stock: ${name}`} why={acts.why(`${id}:off`, refusal)} onRefused={acts.refused} onPress={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title={`${name} is off`} about={offAbout(alsoOn)}
        footer={<Btn label="Cancel" onPress={() => setOpen(false)} />}>
        {askWhy ? (
          <Field label="Why" hint="Shown to the waiter who tries to ring it">
            <Input label="Why" value={reason} onChange={setReason} placeholder="Out of paneer" autoFocus />
          </Field>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {OFF_FOR.map((o) => (
            <Btn key={o.key} label={o.label} style={{ flexBasis: "47%", flexGrow: 1 }} busy={acts.busy === `${id}:off`}
              why={acts.why(`${id}:off`)} onRefused={acts.refused} onPress={() => void choose(o.key)} />
          ))}
        </View>
        {acts.said && acts.said.tone !== "ok" ? <SaidBar said={acts.said} onDone={() => acts.setSaid(null)} /> : null}
      </Sheet>
    </>
  );
}

/* ── Minutes, course, MRP: tap, type, Save; empty clears (Prep/Course/MrpControl) ── */

const FIG = {
  prep: { parse: parsePrep, field: "minutes", label: (n: string, cat?: boolean) => (cat ? `Default preparation time for ${n}` : `Preparation time for ${n}`),
    hint: "Minutes, 1 to 480. Empty: cleared, the category's time is used.", keys: "number" as const, placeholder: "min" },
  course: { parse: parseCourse, field: "course", label: (n: string) => `Course for ${n}`,
    hint: "1 to 9. Empty: not part of the sequence - a drink goes when it is poured.", keys: "number" as const, placeholder: "crs" },
  mrp: { parse: parseMrp, field: "mrp", label: (n: string) => `MRP of ${n}`,
    hint: "What a bill given free (NC) values this dish at in the stock. Never a sale. Empty: none.", keys: "decimal" as const, placeholder: "MRP" },
};

function FigureChip({ kind, value, own, name, category, path, id, ctx }: {
  kind: "prep" | "course" | "mrp"; value: number | null | undefined; own: number | null | undefined; name: string; category?: boolean;
  path: string; id: string; ctx: Ctx;
}) {
  const { acts, role } = ctx;
  const f = FIG[kind];
  const label = f.label(name, category);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const shownText = kind === "prep" ? prepShown(value, own) : kind === "course" ? courseShown(value, own) : mrpShown(value);
  const unset = value == null;
  const save = async () => {
    const p = f.parse(draft);
    if (!p.ok) { setError(`${p.title}. ${p.body}`); return; }
    const ran = await acts.run(id, "POST", path, { [f.field]: p.value }, { done: "", not: "Not changed", what: "changed", where: label });
    if (ran === "done" || ran === "held") setOpen(false);
  };
  return (
    <>
      <Pressable
        onPress={() => { const why = acts.why(id, whyNotMenu(role)); if (why) { acts.refused(why); return; } setDraft(ownText(kind === "mrp" ? value : own)); setError(null); setOpen(true); }}
        accessibilityRole="button" accessibilityLabel={label} accessibilityHint={shownText} android_ripple={{ color: c.grey200 }}
        style={({ pressed }) => ({ minHeight: 44, minWidth: kind === "mrp" ? 96 : 56, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.grey300,
          alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: pressed ? c.grey50 : c.white })}
      >
        <Text style={[t.label, ty.md, t.tab, { color: unset ? c.grey500 : c.ink900 }]}>{shownText}</Text>
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}
        footer={<View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label="Cancel" grow onPress={() => setOpen(false)} />
          <Btn label="Save" kind="primary" grow busy={acts.busy === id} why={acts.why(id)} onRefused={acts.refused} onPress={() => void save()} />
        </View>}>
        <Field label={label} hint={f.hint} error={error ?? undefined}>
          <Input label={label} value={draft} onChange={setDraft} keys={f.keys} placeholder={f.placeholder} autoFocus onDone={() => void save()} />
        </Field>
        {acts.said && acts.said.tone !== "ok" ? <SaidBar said={acts.said} onDone={() => acts.setSaid(null)} /> : null}
      </Sheet>
    </>
  );
}

/* ── A new dish at the foot: a price typed, or Free; never ₹0 by a blank (POS-14) ── */

function NewDish({ section, ctx }: { section: Section; ctx: Ctx }) {
  const { code, role, acts } = ctx;
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [free, setFree] = useState(false);
  /* The web's select starts at 5% - shown chosen, changed in one tap (a question for the owner). */
  const [tax, setTax] = useState<string>("5");
  const id = `category:${section.id}:add`;
  const add = async () => {
    const d = newDish(section.id, name, price, free, tax);
    if (d === null) return;
    if (!d.ok) { acts.setSaid({ title: "Not added", body: d.reason, tone: "bad" }); return; }
    const ran = await acts.run(id, "POST", M.items(code), d.body, { done: "", not: "Not added", what: "added", where: section.name });
    if (ran === "done") { setName(""); setPrice(""); setFree(false); }
  };
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 10, borderTopWidth: 1, borderTopColor: c.grey100 }}>
      <Input label={`A new dish in ${section.name}`} value={name} onChange={setName} placeholder="Dish" />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Input label={`Price of a new dish in ${section.name}`} value={free ? "0" : price} onChange={setPrice} keys="decimal" placeholder="Price" off={free}
          style={{ flex: 1 }} />
        <View style={{ flex: 1 }}><Toggle label="Free" on={free} onChange={setFree} /></View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {/* The rates a hotel restaurant meets: a choice, never a free number. */}
        <Chooser label={`Tax rate of a new dish in ${section.name}`} value={tax} options={TAX_RATES.map((r) => ({ value: r, label: `${r}%` }))} onPick={setTax} />
        <Btn label="Add" Icon={Plus} off={!name.trim()} busy={acts.busy === id} why={acts.why(id, whyNotMenu(role))} onRefused={acts.refused} onPress={() => void add()} />
      </View>
    </View>
  );
}

