import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, confirmAct, ripple, shade, useRead } from "../../core/ui";
import { Refused as NotYours } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { readSources } from "../inventory/configData";
import { Btn, Failed, Field, Loading, Pill, Sheet, TextBox } from "../inventory/configKit";
import { readBreakup, readInventory, readPricing } from "../inventory/data";
import { Empty, InDialog, Segmented, Stale, Toast, body, type Said } from "../inventory/kit";
import type { Pricing } from "../inventory/rates";
import { orderPlans, planStep, readPlanSettings, setMealDays, setPlanOn, stamped } from "./moneyData";
import { Grey, MoveButtons, OnOff, TickBox, refusedPage, useWriter, type Writer } from "./moneyKit";
import {
  KIND_WORDS, MEALS, MEAL_DAYS, MEAL_PLANS, PLAN_NAME, PRICE, PRICES, SOURCES_READ, flipDay, kindsFor, mealDaysInWords, moved, offsetWords,
  planPriceLine, planRows, planSteps, rupees, typedSigned, whyNot,
  type Day, type Meal, type MealDays, type PlanKind, type PlanRow,
} from "./moneyRules";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS → RATES AND TAX: RATE PLANS AND MEAL PLANS on a phone (lane
   m13-set-money, 20 Nov) — the web's /settings/rates/plans and
   /settings/rates/meal-plans (inventory/rooms.settings.ts; pages/
   RatePlans.tsx, MealPlans.tsx; the owner's D27-251, D27-258). Not
   pictured.

   RATE PLANS - A TREE OVER THE ONE PRICING. A plan is "Room type · Meal
   plan", named by itself. Its PRICE is the pricing's own: nothing here is a
   second price. The figures are the server's break-up for the business
   date (GET /inventory for the date, /pricing, /pricing?breakup= - the
   same reads as Rates, inventory/data.ts), a dash where nothing is set.
   Off: not offered for new bookings. Who sells it: none chosen = every
   source. The editor changes the master (PUT pricing/basis - asked first:
   every derived plan moves), a room type's difference (PUT pricing/addon,
   sent as typed, blank clears it) and the sources (PUT plan-settings). The
   web's drag is Move up / Move down in the editor (PUT plan-settings/order,
   the whole order).

   MEAL PLANS BY DAY: on which days of a stay each meal of a plan is served.
   A meal's price is its add-on on Rates; this says only when it is served.

   Who: the console offers both pages to the owner, an administrator and
   the GM (`setting` and `rate`); reading is PRICES (`rate` view), every
   change PRICE (`rate` edit, "Setting a price"). The web hides the
   controls from a person who may not set prices; the phone greys them with
   the API's sentence (AGENTS rule 1).
   ══════════════════════════════════════════════════════════════════ */

/* ══ RATE PLANS ═══════════════════════════════════════════════════ */

async function readPlans(code: string) {
  const inv = await readInventory(code);
  if (!inv) return null;
  const [pricing, settings] = await Promise.all([readPricing(code, inv.from, 1), readPlanSettings(code)]);
  if (!pricing) return null;
  /* A break-up that fails fails the page (the web leaves a dash, which would read as "not priced"). */
  const days = await Promise.all(pricing.roomTypes.map(async (x) => (await readBreakup(code, inv.from, 1, x.id))[0]));
  return { from: inv.from, pricing, settings, days };
}

export function RatePlans({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = refusedPage(role, "/settings/rates/plans", "Rate plans");
  const cannotRead = refused ?? whyNot(PRICES, role);
  const key = ["settings", code, "plans"];
  const q = useRead(() => (cannotRead ? Promise.resolve(null) : stamped(() => readPlans(code))), key);
  const w = useWriter(`${code}/plans`, q.data?.began);
  const cannot = whyNot(PRICE, role);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  /* Rates shows the same prices: its reads go too. */
  const refresh = () => void cache.invalidateQueries({ predicate: (x) => (x.queryKey[0] === "settings" && x.queryKey[1] === code && (x.queryKey[2] === "plans" || x.queryKey[2] === "meal-plans")) || (x.queryKey[0] === "inventory" && x.queryKey[1] === code) });
  const v = q.data?.d;
  const rows = v ? planRows(v.pricing, v.days, v.settings.plans) : [];

  const toggle = async (r: PlanRow, on: boolean) => {
    const out = await w.run(() => setPlanOn(code, r.roomTypeId, r.plan, on), { title: "Not changed", done: "changed", where: "the plans" });
    if (!out) return;
    setSaid(out.ok ? { title: on ? "Offered for new bookings" : "Not offered for new bookings", body: r.name, tone: "ok" } : out.said);
    refresh();
  };

  let main: ReactNode;
  if (refused) main = <NotYours sentence={refused} />;
  else if (cannotRead) main = <Empty title="Rate plans" description={cannotRead} />;
  else if (q.data === undefined) main = q.error ? <Failed title="The rate plans did not load" what="The rate plans" error={q.error} onRetry={q.reload} /> : <Loading words="Reading the rate plans…" />;
  else if (!v) main = <Empty title="The rate plans did not load" description="Nothing was changed." />;
  else {
    main = (
      <View style={{ gap: 12 }}>
        <Stale error={q.error} />
        <View style={{ gap: 6 }}>
          <Explain bold="Master" text="- the base room on room only. Changing it moves every derived plan." />
          <Explain bold="Derived" text="- follows the master or its own room only, by a difference or the meal add-on." />
          <Explain bold="Independent" text="- its own base, typed on Rates." />
        </View>
        <Grey line={w.blocked ?? cannot} />
        {rows.length === 0 ? (
          <Empty title="No room types yet" description="Add room types under Rooms; each appears here on every meal plan it is sold on." />
        ) : (
          <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>
            {rows.map((r, i) => {
              const offset = offsetWords(r.offset);
              return (
                <View key={r.key} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 64, paddingVertical: 10, paddingLeft: r.plan !== "EP" || r.kind === "derived" ? space.cardX + 12 : space.cardX, paddingRight: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
                  <OnOff on={r.setting?.isActive ?? true} label={`${r.name} offered`} disabled={Boolean(cannot || w.blocked || w.busy)} onChange={(on) => void toggle(r, on)} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[t.label, face[500], { color: c.ink900 }]}>{r.name}</Text>
                    <Pill tone={r.kind === "master" ? "accent" : r.kind === "derived" ? "success" : "neutral"} dot={false}>{KIND_WORDS[r.kind]}</Pill>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[t.label, t.tab, face[600], { color: r.price === null ? c.grey500 : c.ink900 }]}>{rupees(r.price)}</Text>
                    {offset ? <Text style={[t.caption, t.tab, { color: c.success }]}>{offset}</Text> : null}
                  </View>
                  <Btn label={cannot ? "View" : "Edit"} a11y={`${cannot ? "View" : "Edit"} ${r.name}`} onPress={() => setEditing(r)} />
                </View>
              );
            })}
          </View>
        )}
        <Text style={t.caption}>{`Prices are for two guests on the business date (${v.from}); a dash is not priced. Off: not offered for new bookings - prices and bookings stay.`}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Rate plans" under="Each room type on each meal plan, named by itself. The price is set once, on Rates; the plans follow it." />
        {main}
      </Screen>
      {editing && v ? (
        <PlanSheet code={code} row={editing} rows={rows} pricing={v.pricing} cannot={cannot} role={role} w={w}
          mealDays={v.settings.mealDays.find((d) => d.mealPlan === editing.plan)}
          onClose={() => { if (!w.busy) { setEditing(null); refresh(); } }}
          onDone={(s) => { setEditing(null); setSaid(s); refresh(); }} />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

function Explain({ bold, text }: { bold: string; text: string }) {
  return <Text style={[body, { color: c.grey600 }]}><Text style={[face[600], { color: c.ink900 }]}>{bold}</Text>{` ${text}`}</Text>;
}

const STEP_NAMES = ["What it is", "Its price", "Who sells it"];

/** PlanEditor: what it is, its price, who sells it - with a summary that grows as you go. */
function PlanSheet({ code, row, rows, pricing, mealDays, cannot, role, w, onClose, onDone }: {
  code: string; row: PlanRow; rows: PlanRow[]; pricing: Pricing; mealDays: MealDays | undefined; cannot: string | null; role: string | null; w: Writer;
  onClose: () => void; onDone: (s: Said) => void;
}) {
  const type = pricing.roomTypes.find((x) => x.id === row.roomTypeId)!;
  const basis = pricing.basis;
  const roomOnly = row.plan === "EP";
  const mayEdit = cannot === null;
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<PlanKind>(row.kind);
  const [amount, setAmount] = useState(type.difference ? String(type.difference.amount) : "");
  const [unit, setUnit] = useState<"rupees" | "percent">(type.difference?.unit ?? "rupees");
  const [chosen, setChosen] = useState<string[]>(row.setting?.sources ?? []);
  const [said, setSaid] = useState<Said | null>(null);
  const [lost, setLost] = useState<string | null>(null);
  const noSources = whyNot(SOURCES_READ, role);
  const sources = useRead(() => (noSources ? Promise.resolve([]) : readSources(code)), ["inventory", code, "booking-sources"]);
  const meals = mealDaysInWords(mealDays);
  const grey = w.blocked ?? lost;
  const keys = rows.map((r) => r.key);
  const steps = planSteps(row, type.difference, kind, amount, unit, chosen);
  const sourceWords = chosen.length === 0 ? "Every source" : (sources.data ?? []).filter((s) => chosen.includes(s.id)).map((s) => s.name).join(", ");

  const fail = (s: Said, unknown: boolean) => { setSaid(s); if (unknown) setLost(`${s.title}: close this and look at the plans before trying again.`); };
  async function send() {
    setSaid(null);
    /* In the web's order; the first refusal stops the rest (what went is read again on close). */
    const r = await w.run(async () => { for (const s of steps) await planStep(code, row, s); }, { title: "Not saved", done: "saved", where: "the plans" });
    if (!r) return;
    if (r.ok) onDone({ title: "Saved", body: row.name, tone: "ok" });
    else fail(r.said, r.unknown);
  }
  const update = () => {
    if (steps.length === 0) { onDone({ title: "Saved", body: row.name, tone: "ok" }); return; }
    /* Making it the master moves every derived plan: asked first, in the editor's own words. */
    if (steps.some((s) => s.what === "basis")) confirmAct(`Make ${row.roomType} the master?`, "Making it the master moves every derived plan to follow it.", "Make it the master", () => void send());
    else void send();
  };
  const move = async (by: -1 | 1) => {
    const order = moved(keys, row.key, by);
    if (!order) return;
    const byKey = new Map(rows.map((r) => [r.key, r]));
    setSaid(null);
    const r = await w.run(() => orderPlans(code, order.map((k) => ({ roomTypeId: byKey.get(k)!.roomTypeId, mealPlan: byKey.get(k)!.plan }))), { title: "Not moved", done: "moved", where: "the plans" });
    if (!r) return;
    if (r.ok) onDone({ title: "Order saved", body: row.name, tone: "ok" });
    else fail(r.said, r.unknown);
  };

  return (
    <Sheet title={row.name} under={`Step ${step} of 3: ${STEP_NAMES[step - 1]}`} onClose={onClose}
      foot={
        <>
          <InDialog said={said} />
          <Grey line={grey} />
          {!mayEdit && step === 3 ? <Text style={t.caption}>{cannot}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn label="Cancel" grow disabled={w.busy} onPress={onClose} />
            {step > 1 ? <Btn label="Back" grow disabled={w.busy} onPress={() => setStep(step - 1)} /> : null}
            {step < 3 ? <Btn label="Next" variant="primary" grow onPress={() => setStep(step + 1)} /> : null}
            {step === 3 && mayEdit ? <Btn label={w.busy ? "Saving…" : "Update"} variant="primary" grow disabled={w.busy || grey !== null} onPress={update} /> : null}
          </View>
        </>
      }>
      {step === 1 ? (
        <View style={{ gap: 8 }}>
          <Line label="Room type" value={row.roomType} />
          <Line label="Meal plan" value={PLAN_NAME[row.plan]} />
          <Line label="Name" value={`${row.name} (by itself)`} />
          <Line label="Meals" value={meals ?? "-"} />
          {mayEdit ? <MoveButtons first={keys[0] === row.key} last={keys[keys.length - 1] === row.key} disabled={w.busy || grey !== null} onMove={(by) => void move(by)} /> : null}
        </View>
      ) : null}
      {step === 2 ? (
        <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="How it is priced">
          {kindsFor(row, basis).map((k) => (
            <Pressable key={k} onPress={() => setKind(k)} disabled={!mayEdit} accessibilityRole="radio" accessibilityState={{ checked: kind === k, disabled: !mayEdit }}
              android_ripple={ripple}
              style={shade(({ pressed }) => ({ minHeight: 44, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 2, borderColor: kind === k ? c.ink900 : c.grey200, backgroundColor: kind === k || pressed ? c.grey50 : c.white }))}>
              <Text style={[t.label, face[600], { color: c.ink900 }]}>{KIND_WORDS[k]}</Text>
              <Text style={[t.label, { color: c.grey600 }]}>{
                k === "master" ? "The base: set on Rates; every derived plan follows it."
                  : k === "derived" ? (roomOnly ? `Follows ${basis?.roomType ?? "the master"} by a difference.`
                    : `${row.roomType} · Room only plus the hotel's ${row.plan} add-on per guest (under How rates are built).`)
                    : "Its own base, typed on Rates."}</Text>
            </Pressable>
          ))}
          {roomOnly && kind === "derived" ? (
            <View style={{ gap: 8 }}>
              <Field label={`More than ${basis?.roomType ?? "the master"}`} hint="Below the master: a minus in front. Blank: no difference set.">
                <TextBox label={`More than ${basis?.roomType ?? "the master"}`} value={amount} keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"} disabled={!mayEdit} onChangeText={(x) => setAmount(typedSigned(x))} />
              </Field>
              {mayEdit ? <Segmented label="Rupees or percent" value={unit} onChange={setUnit} options={[{ value: "rupees", label: "₹" }, { value: "percent", label: "%" }]} /> : null}
            </View>
          ) : null}
          {kind === "master" && row.kind !== "master" ? <Text style={[body, { color: c.yellow800 }]}>Making it the master moves every derived plan to follow it.</Text> : null}
        </View>
      ) : null}
      {step === 3 ? (
        <View style={{ gap: 2 }}>
          <Text style={[t.label, { color: c.grey600, marginBottom: 6 }]}>None chosen: every source sells it.</Text>
          {noSources ? <Text style={t.caption}>{noSources}</Text>
            : sources.data === undefined ? (sources.error ? <Failed title="The booking sources did not load" what="The booking sources" error={sources.error} onRetry={sources.reload} /> : <Loading words="Reading the booking sources…" />)
              : sources.data.filter((s) => s.isActive).map((s) => (
                <TickBox key={s.id} label={s.name} on={chosen.includes(s.id)} disabled={!mayEdit}
                  onChange={() => setChosen((x) => (x.includes(s.id) ? x.filter((y) => y !== s.id) : [...x, s.id]))} />
              ))}
        </View>
      ) : null}
      {/* The summary (the web's aside), under the step on a phone. */}
      <View accessibilityLabel="Summary" style={{ borderRadius: 8, backgroundColor: c.grey50, padding: 12, gap: 4 }}>
        <Text style={t.eyebrow}>Summary</Text>
        <Text style={[t.label, face[500], { color: c.ink900 }]}>{row.name}</Text>
        <Text style={[t.label, { color: c.grey600 }]}>{KIND_WORDS[kind]}</Text>
        {meals ? <Text style={[t.label, { color: c.grey600 }]}>{meals}</Text> : null}
        {step >= 3 ? <Text style={[t.label, { color: c.grey600 }]}>{sourceWords}</Text> : null}
        <View style={{ borderTopWidth: 1, borderTopColor: c.grey200, paddingTop: 6, marginTop: 2 }}>
          <Text style={[t.label, t.tab, { color: c.ink900 }]}>{planPriceLine(row.price)}</Text>
        </View>
      </View>
    </Sheet>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Text style={[t.label, { width: 88, color: c.grey500 }]}>{label}</Text>
      <Text style={[t.label, { flex: 1, color: c.ink900 }]}>{value}</Text>
    </View>
  );
}

/* ══ MEAL PLANS BY DAY ════════════════════════════════════════════ */

export function MealPlans({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = refusedPage(role, "/settings/rates/meal-plans", "Meal plans");
  const cannotRead = refused ?? whyNot(PRICES, role);
  const key = ["settings", code, "meal-plans"];
  const q = useRead(() => (cannotRead ? Promise.resolve(null) : stamped(() => readPlanSettings(code))), key);
  const w = useWriter(`${code}/meal-plans`, q.data?.began);
  const cannot = whyNot(PRICE, role);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  const refresh = () => void cache.invalidateQueries({ predicate: (x) => x.queryKey[0] === "settings" && x.queryKey[1] === code && (x.queryKey[2] === "meal-plans" || x.queryKey[2] === "plans") });
  const v = q.data?.d;

  let main: ReactNode;
  if (refused) main = <NotYours sentence={refused} />;
  else if (cannotRead) main = <Empty title="Meal plans" description={cannotRead} />;
  else if (!v) main = q.error ? <Failed title="The meal plans did not load" what="The meal plans" error={q.error} onRetry={q.reload} /> : <Loading words="Reading the meal plans…" />;
  else {
    main = (
      <View style={{ gap: 12 }}>
        <Stale error={q.error} />
        <Grey line={w.blocked ?? cannot} />
        {MEAL_PLANS.map((p) => {
          const days = v.mealDays.find((d) => d.mealPlan === p.code);
          return <PlanCard key={`${p.code}/${JSON.stringify(days ?? null)}`} code={code} plan={p} days={days} cannot={cannot} w={w}
            onSaid={(s) => { setSaid(s); refresh(); }} />;
        })}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Meal plans" under="On which days of a stay each meal is served. The price of a meal is its add-on, on Rates." />
        {main}
      </Screen>
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

function PlanCard({ code, plan, days, cannot, w, onSaid }: {
  code: string; plan: { code: string; name: string }; days: MealDays | undefined; cannot: string | null; w: Writer; onSaid: (s: Said) => void;
}) {
  const [held, setHeld] = useState<Record<Meal, Day[]>>({ breakfast: days?.breakfast ?? [], lunch: days?.lunch ?? [], dinner: days?.dinner ?? [] });
  const words = mealDaysInWords(held);
  const mayEdit = cannot === null;
  const save = async () => {
    const r = await w.run(() => setMealDays(code, plan.code, held), { title: "Not saved", done: "saved", where: "the meal plans" });
    if (!r) return;
    onSaid(r.ok ? { title: "Saved", body: plan.name, tone: "ok" } : r.said);
  };
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 8 }}>
      <View style={{ gap: 2 }}>
        <Text style={t.heading} accessibilityRole="header">{plan.name}</Text>
        <Text style={[t.label, { color: c.grey600 }]}>{words ?? "Not said yet."}</Text>
      </View>
      {/* The web's table: a meal per row, a day per column (the short word on a phone). */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 84 }} />
        {MEAL_DAYS.map((d) => <Text key={d.day} style={[t.caption, face[500], { flex: 1, textAlign: "center" }]}>{d.short}</Text>)}
      </View>
      {MEALS.map((m) => (
        <View key={m} style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: c.grey100 }}>
          <Text style={[t.label, face[500], { width: 84, color: c.ink900, textTransform: "capitalize" }]}>{m}</Text>
          {MEAL_DAYS.map((d) => (
            <View key={d.day} style={{ flex: 1, alignItems: "center" }}>
              <TickBox label="" a11y={`${plan.name}: ${m} on the ${d.label.toLowerCase()}`} on={held[m].includes(d.day)} disabled={!mayEdit}
                onChange={() => setHeld((h) => flipDay(h, m, d.day))} />
            </View>
          ))}
        </View>
      ))}
      {mayEdit ? (
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          <Btn label={w.busy ? "Saving…" : "Save"} disabled={w.busy || w.blocked !== null} onPress={() => void save()} />
        </View>
      ) : null}
    </View>
  );
}
