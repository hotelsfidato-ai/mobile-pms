import { Plus, TicketPercent } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { api } from "../../core/api";
import { DateField } from "../../core/DateField";
import { c, face, space, t } from "../../core/theme";
import { Card, useRead, useScreenStop } from "../../core/ui";
import {
  couponLine, couponPart, dishesSaved, groupForm, groupOn, groupRule, importStop, M, optionForm, promoForm, promoValue, usedLine,
  type AddonGroupSetup, type Promo, type Section,
} from "./menuEdit";
import { paise, whyNotMenu } from "./setup";
import { Btn, Caps, Field, Input, Loading, Part, Ring, Sheet, Toggle, type Acts } from "./SetupKit";
import { ReadProblem, SaidBar, Stale, ty } from "./TablesKit";
import type { Addon } from "./types";

/* ══════════════════════════════════════════════════════════════════
   SIDES AND PROMOTIONS, the foot of the Menu's Dishes tab (Menu.tsx
   AddonGroups, GroupDialog, DishesDialog, EntryDialog, Promotions,
   PromotionDialog). A group of sides is made once and offered on many
   dishes: a price changed here changes on all of them. A promotion is a
   named discount, never deleted, its code never changed. NOTHING IS
   SEEDED: every price and every rate here is typed by somebody at the hotel.
   ══════════════════════════════════════════════════════════════════ */

type Ctx = { code: string; role: string | null; acts: Acts; hotel: { today?: string; businessDate: string } };
const said = (acts: Acts) => (acts.said && acts.said.tone !== "ok" ? <SaidBar said={acts.said} onDone={() => acts.setSaid(null)} /> : null);

export function Sides({ sections, ctx }: { sections: Section[]; ctx: Ctx }) {
  const { code, role, acts } = ctx;
  /* A sides import whose reply was lost (ImportSheet.tsx) is let go by this read, begun after it. */
  const sidesImport = useScreenStop(importStop(code, "addons"));
  const q = useRead(sidesImport.watch(async () => (await api<{ groups: AddonGroupSetup[] }>(M.groups(code))).groups), ["pos", code, "menu", "groups"]);
  const [editing, setEditing] = useState<AddonGroupSetup | "new" | null>(null);
  const [dishesFor, setDishesFor] = useState<AddonGroupSetup | null>(null);
  const [option, setOption] = useState<{ group: AddonGroupSetup; addon?: Addon } | null>(null);
  const refusal = whyNotMenu(role);
  const dishName = new Map(sections.flatMap((s) => s.items).map((i) => [i.id, i.name]));
  const groups = q.data ?? [];
  return (
    <Part title="Sides"
      action={<Btn label="Add a group of sides" Icon={Plus} small why={acts.why("group:new", refusal)} onRefused={acts.refused} onPress={() => setEditing("new")} />}>
      {q.error && q.data ? <Stale error={new Error(q.error)} loadedAt={0} onRetry={q.reload} /> : null}
      {!q.data ? (q.error ? <ReadProblem error={new Error(q.error)} what="the sides" onRetry={q.reload} /> : <Loading what="the sides" />)
        : groups.length === 0 ? (
          <Card><Text style={[t.label, ty.sm, { color: c.grey500 }]}>
            None yet. A group is a list a dish offers - Choice of bread, Extra toppings, or Preferences such as No onion at 0 - made once and offered on as many dishes as you like.
          </Text></Card>
        ) : groups.map((g) => (
          <Card key={g.id} style={{ paddingHorizontal: 0, gap: 6 }}>
            <View style={{ paddingHorizontal: space.cardX, gap: 4 }}>
              <Text style={[t.heading, ty.md]}>{g.label}  <Text style={[t.label, ty.sm, { color: c.grey500 }]}>{groupRule(g.minSelect, g.maxSelect)}</Text></Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Btn label="Edit" kind="ghost" small a11y={`Edit ${g.label}`} why={acts.why(`group:${g.id}`, refusal)} onRefused={acts.refused} onPress={() => setEditing(g)} />
                <Btn label="Dishes" kind="ghost" small a11y={`Dishes offering ${g.label}`} why={acts.why(`group:${g.id}:dishes`, refusal)} onRefused={acts.refused} onPress={() => setDishesFor(g)} />
              </View>
              <Text style={[t.label, ty.sm, { color: c.grey600 }]}>{groupOn(g.itemIds.map((id) => dishName.get(id)).filter((n): n is string => Boolean(n)))}</Text>
            </View>
            {g.addons.map((a) => {
              const rid = `option:${a.id}:remove`;
              return (
                <View key={a.id} style={{ paddingHorizontal: space.cardX, paddingVertical: 6, gap: 4, borderTopWidth: 1, borderTopColor: c.grey100 }}>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
                    <Text style={[t.label, ty.md, { flex: 1, color: c.ink900 }]}>{a.label}</Text>
                    <Text style={[t.label, ty.md, t.tab, { color: c.ink900 }]}>{a.price === 0 ? "Free" : paise(a.price)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                    <Btn label="Change" kind="ghost" small a11y={`Change ${g.label} ${a.label}`} why={acts.why(`option:${a.id}`, refusal)} onRefused={acts.refused}
                      onPress={() => setOption({ group: g, addon: a })} />
                    <Btn label="Remove" kind="ghost" small a11y={`Remove ${g.label} ${a.label}`} busy={acts.busy === rid} why={acts.why(rid, refusal)} onRefused={acts.refused}
                      onPress={() => void acts.run(rid, "POST", M.optionOff(code, a.id), undefined,
                        { done: `${a.label} is off ${g.label}`, not: "Not removed", what: "removed", where: g.label })} />
                  </View>
                </View>
              );
            })}
            <View style={{ paddingHorizontal: space.cardX, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.grey100 }}>
              <Btn label="Add option" Icon={Plus} small style={{ alignSelf: "flex-start" }} why={acts.why(`group:${g.id}:option`, refusal)} onRefused={acts.refused}
                onPress={() => setOption({ group: g })} />
            </View>
          </Card>
        ))}
      {editing ? <GroupSheet group={editing === "new" ? undefined : editing} ctx={ctx} onClose={() => setEditing(null)} /> : null}
      {dishesFor ? <DishesSheet group={dishesFor} sections={sections} ctx={ctx} onClose={() => setDishesFor(null)} /> : null}
      {option ? <OptionSheet group={option.group} addon={option.addon} ctx={ctx} onClose={() => setOption(null)} /> : null}
    </Part>
  );
}

function GroupSheet({ group, ctx, onClose }: { group?: AddonGroupSetup; ctx: Ctx; onClose: () => void }) {
  const { code, role, acts } = ctx;
  const [label, setLabel] = useState(group?.label ?? "");
  const [min, setMin] = useState(String(group?.minSelect ?? 0));
  const [max, setMax] = useState(group?.maxSelect == null ? "" : String(group.maxSelect));
  const f = groupForm(label, min, max);
  const id = group ? `group:${group.id}` : "group:new";
  const save = async () => {
    const ran = group
      ? await acts.run(id, "PATCH", M.group(code, group.id), f.body, { done: `${f.body.label} saved`, not: "Not saved", what: "saved", where: "the sides" })
      : await acts.run(id, "POST", M.groups(code), f.body, { done: `${f.body.label} added`, not: "Not saved", what: "added", where: "the sides" });
    if (ran === "done") onClose();
  };
  return (
    <Sheet open onClose={onClose} title={group ? `Edit ${group.label}` : "Add a group of sides"} about="A list a dish offers, and how many of it a guest may choose."
      footer={<View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label="Cancel" grow onPress={onClose} />
        <Btn label="Save" kind="primary" grow off={!f.ready} busy={acts.busy === id} why={acts.why(id, whyNotMenu(role))} onRefused={acts.refused} onPress={() => void save()} />
      </View>}>
      <Field label="Name" hint="Printed on the kitchen slip beside each option.">
        <Input label="Name" value={label} onChange={setLabel} placeholder="Choice of bread" autoFocus />
      </Field>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Choose at least" hint="0 if the guest may take none." error={f.minError}>
          <Input label="Choose at least" value={min} onChange={setMin} keys="number" /></Field></View>
        <View style={{ flex: 1 }}><Field label="Choose at most" hint="Empty for no limit." error={f.maxError}>
          <Input label="Choose at most" value={max} onChange={setMax} keys="number" /></Field></View>
      </View>
      {said(acts)}
    </Sheet>
  );
}

function DishesSheet({ group, sections, ctx, onClose }: { group: AddonGroupSetup; sections: Section[]; ctx: Ctx; onClose: () => void }) {
  const { code, role, acts } = ctx;
  const [picked, setPicked] = useState(() => new Set(group.itemIds));
  const id = `group:${group.id}:dishes`;
  const flip = (itemId: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
    return next;
  });
  const save = async () => {
    const ran = await acts.run(id, "POST", M.groupDishes(code, group.id), { itemIds: [...picked] },
      { done: dishesSaved(group.label, picked.size), not: "Not saved", what: "saved", where: `the dishes offering ${group.label}` });
    if (ran === "done") onClose();
  };
  return (
    <Sheet open onClose={onClose} title={`Dishes offering ${group.label}`} about="Tick every dish a waiter should be offered it with."
      footer={<View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label="Cancel" grow onPress={onClose} />
        <Btn label="Save" kind="primary" grow busy={acts.busy === id} why={acts.why(id, whyNotMenu(role))} onRefused={acts.refused} onPress={() => void save()} />
      </View>}>
      {sections.filter((s) => s.items.length > 0).map((s) => (
        <View key={s.id} style={{ gap: 2 }}>
          <Caps>{s.name}</Caps>
          {s.items.map((item) => <Toggle key={item.id} label={item.name} on={picked.has(item.id)} onChange={() => flip(item.id)} />)}
        </View>
      ))}
      {said(acts)}
    </Sheet>
  );
}

/** A side: a name and a price, or Free (EntryDialog). The price is typed or ticked Free, or nothing is saved. */
function OptionSheet({ group, addon, ctx, onClose }: { group: AddonGroupSetup; addon?: Addon; ctx: Ctx; onClose: () => void }) {
  const { code, role, acts } = ctx;
  const [label, setLabel] = useState(addon?.label ?? "");
  const [price, setPrice] = useState(addon && addon.price > 0 ? String(addon.price) : "");
  const [free, setFree] = useState(addon?.price === 0);
  const f = optionForm(label, price, free);
  const id = addon ? `option:${addon.id}` : `group:${group.id}:option`;
  const save = async () => {
    const ran = addon
      ? await acts.run(id, "PATCH", M.option(code, addon.id), f.body, { done: `${f.body.label} saved`, not: "Not saved", what: "saved", where: group.label })
      : await acts.run(id, "POST", M.groupOptions(code, group.id), f.body, { done: `${f.body.label} added to ${group.label}`, not: "Not saved", what: "added", where: group.label });
    if (ran === "done") onClose();
  };
  return (
    <Sheet open onClose={onClose} title={addon ? `Change ${group.label} - ${addon.label}` : `Add an option to ${group.label}`}
      about="A price changed here changes on every dish that offers the group."
      footer={<View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label="Cancel" grow onPress={onClose} />
        <Btn label="Save" kind="primary" grow off={!f.ready} busy={acts.busy === id} why={acts.why(id, whyNotMenu(role))} onRefused={acts.refused} onPress={() => void save()} />
      </View>}>
      <Field label="Option"><Input label="Option" value={label} onChange={setLabel} placeholder="Butter naan" autoFocus /></Field>
      <Field label="Price" hint="Rupees. A blank is not zero - tick Free for something that costs nothing." error={f.bad ? "A price is a number, more than 0." : undefined}>
        <Input label="Price" value={free ? "" : price} onChange={setPrice} keys="decimal" off={free} />
      </Field>
      <Toggle label="Free" on={free} onChange={setFree} />
      {said(acts)}
    </Sheet>
  );
}

/* ── Promotions ─────────────────────────────────────────────────────── */

export function Promotions({ ctx }: { ctx: Ctx }) {
  const { code, role, acts } = ctx;
  const q = useRead(async () => (await api<{ promotions: Promo[] }>(M.promotions(code))).promotions, ["pos", code, "menu", "promotions"]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);
  const refusal = whyNotMenu(role);
  const list = q.data ?? [];
  return (
    <Part title="Promotions"
      action={<Btn label="Add a promotion" Icon={Plus} small why={acts.why("promo:new", refusal)} onRefused={acts.refused} onPress={() => setAdding(true)} />}>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TicketPercent size={16} color={c.grey400} style={{ marginTop: 3 }} />
          <Text style={[t.label, ty.sm, { color: c.grey600, flex: 1 }]}>
            The discounts this restaurant gives again and again, each by name. On the Till's Discount they come first, so it is the same concession every time and the
            month-end report counts what it cost. The GM, the owner or an Admin can also type any amount off by hand, with a reason. A coupon is a promotion the guest
            brings as a code, good between two days, on so many bills, above a least bill.
          </Text>
        </View>
        {q.error && q.data ? <Stale error={new Error(q.error)} loadedAt={0} onRetry={q.reload} /> : null}
        {!q.data ? (q.error ? <ReadProblem error={new Error(q.error)} what="the promotions" onRetry={q.reload} />
          : <Text style={[t.label, ty.sm, { color: c.grey500 }]}>Loading the promotions…</Text>)
          : list.length === 0 ? <Text style={[t.label, ty.sm, { color: c.grey500 }]}>None set up. Discounts can still be typed by hand on the Till.</Text>
            : list.map((p, i) => (
              <View key={p.id} style={{ gap: 6, paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey100 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: p.isActive ? c.orange50 : c.grey100 }}>
                    <Text style={[t.caption, ty.xs, t.tab, { ...face[600], color: p.isActive ? c.orange700 : c.grey600 }]}>{p.code}</Text>
                  </View>
                  <Text style={[t.label, ty.md, { flex: 1, color: p.isActive ? c.ink900 : c.grey500 }]} numberOfLines={1}>
                    {p.name}{!p.isActive ? <Text style={[t.label, ty.sm, { color: c.grey500 }]}>  not running</Text> : null}
                  </Text>
                  <Text style={[t.label, ty.md, t.tab, { color: c.ink900 }]}>{promoValue(p)}</Text>
                </View>
                {couponLine(p) ? <Text style={[t.label, ty.sm, { color: c.grey600 }]}>{couponLine(p)}</Text> : null}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={[t.label, ty.sm, t.tab, { color: p.used === 0 ? c.grey500 : c.grey600 }]}>{usedLine(p.used)}</Text>
                  <Btn label="Edit" kind="ghost" small why={acts.why(`promo:${p.id}`, refusal)} onRefused={acts.refused} onPress={() => setEditing(p)} />
                </View>
              </View>
            ))}
      </Card>
      {adding ? <PromotionSheet ctx={ctx} onClose={() => setAdding(false)} /> : null}
      {editing ? <PromotionSheet promotion={editing} ctx={ctx} onClose={() => setEditing(null)} /> : null}
    </Part>
  );
}

function PromotionSheet({ promotion, ctx, onClose }: { promotion?: Promo; ctx: Ctx; onClose: () => void }) {
  const { code: hotel, role, acts } = ctx;
  const [code, setCode] = useState(promotion?.code ?? "");
  const [name, setName] = useState(promotion?.name ?? "");
  const [kind, setKind] = useState<"percent" | "fixed">(promotion?.kind ?? "percent");
  const [value, setValue] = useState(promotion ? String(promotion.value) : "");
  const [active, setActive] = useState(promotion?.isActive ?? true);
  /* A COUPON (261): a code the guest brings, with its two days and its limits (M-16: the phone's own picker). */
  const [isCoupon, setIsCoupon] = useState(false);
  const [limits, setLimits] = useState({ from: "", to: "", maxUses: "", minBill: "" });
  const limit = (k: keyof typeof limits) => (v: string) => setLimits((l) => ({ ...l, [k]: v }));
  const f = promoForm(!promotion, code, name, kind, value);
  const coupon = couponPart(!promotion && isCoupon, limits);
  const id = promotion ? `promo:${promotion.id}` : "promo:new";
  const save = async () => {
    const ran = promotion
      ? await acts.run(id, "PATCH", M.promotion(hotel, promotion.id), { name: name.trim(), value: f.amount, isActive: active },
        { done: `${name.trim()} saved`, not: "Not saved", what: "saved", where: "the promotions" })
      : await acts.run(id, "POST", M.promotions(hotel), { code: code.trim().toUpperCase(), name: name.trim(), kind, value: f.amount, ...coupon.body },
        { done: `${name.trim()} added`, not: "Not saved", what: "added", where: "the promotions" });
    if (ran === "done") onClose();
  };
  return (
    <Sheet open onClose={onClose} title={promotion ? `Edit ${promotion.name}` : "Add a promotion"}
      about={promotion ? "The code cannot change - bills already printed name it." : "A named discount a biller applies by typing its code."}
      footer={<View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label="Cancel" grow onPress={onClose} />
        <Btn label="Save" kind="primary" grow off={!f.ready || !coupon.ready} busy={acts.busy === id} why={acts.why(id, whyNotMenu(role))} onRefused={acts.refused} onPress={() => void save()} />
      </View>}>
      {!promotion ? (
        <Field label="Code" hint="What the biller types. Short - a terminal has a queue behind it.">
          <Input label="Code" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="HOUSE" caps autoFocus />
        </Field>
      ) : null}
      <Field label="Name" hint="Prints on the bill and groups the report. The guest reads this.">
        <Input label="Name" value={name} onChange={setName} placeholder="House guests" />
      </Field>
      {!promotion ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Ring label="Percentage" on={kind === "percent"} onPress={() => setKind("percent")} />
          <Ring label="Fixed amount" on={kind === "fixed"} onPress={() => setKind("fixed")} />
        </View>
      ) : null}
      <Field label={kind === "percent" ? "Percent off" : "Amount off"} error={f.error}>
        <Input label={kind === "percent" ? "Percent off" : "Amount off"} value={value} onChange={setValue} keys="decimal" placeholder={kind === "percent" ? "50" : "200.00"} />
      </Field>
      {!promotion ? (
        <Toggle label="A coupon the guest brings" about="Typed from the guest's code at the Till or the Terminal, on the days you set; never a button."
          on={isCoupon} onChange={setIsCoupon} />
      ) : null}
      {!promotion && isCoupon ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><DateField label="From" required value={limits.from} onChange={limit("from")} hotel={ctx.hotel} /></View>
            <View style={{ flex: 1 }}><DateField label="Until" required value={limits.to} onChange={limit("to")} hotel={ctx.hotel} /></View>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Bills it may go on" hint="Blank: no limit." error={coupon.maxUsesError}>
                <Input label="Bills it may go on" value={limits.maxUses} onChange={limit("maxUses")} keys="number" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Least bill, ₹" hint="Blank: any bill." error={coupon.minBillError}>
                <Input label="Least bill, ₹" value={limits.minBill} onChange={limit("minBill")} keys="decimal" />
              </Field>
            </View>
          </View>
        </View>
      ) : null}
      {promotion ? (
        <Toggle label="Offer this at the till" on={active} onChange={setActive}
          about="Switching it off hides it from the discount dialog. Bills that already used it keep it - a promotion is never deleted." />
      ) : null}
      {said(acts)}
    </Sheet>
  );
}
