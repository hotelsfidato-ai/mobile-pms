import { AlertTriangle, Plus, Receipt, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api } from "../../core/api";
import { DateField } from "../../core/DateField";
import { DASH } from "../../core/format";
import { c, t } from "../../core/theme";
import { Card, useRead } from "../../core/ui";
import {
  newBand, orphaned, orphanedLine, P, sacShown, slabRows, slabsBad, slabsBody, slabsSaved, slabWords, TAX_LABEL, TAX_WHAT,
  taxHeadings, taxName, whyNotGst, whyNotModules, type SlabRow, type TaxKind, type TaxKindRules, type TaxSetup,
} from "./setup";
import { Btn, Chooser, Field, Input, Part, Pill, Sheet, Toggle, type Acts, Loading } from "./SetupKit";
import { ReadProblem, SaidBar, ty } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   TAXES, FROM THE RESTAURANT'S SIDE (Setup.tsx Taxes, the owner's
   D27-368): the "Serves alcohol (VAT)" switch, then the same card as
   Settings, Taxes (finance/flows/TaxRulesCard.tsx) - one card, two doors,
   so they cannot disagree. The switch is the owner's or an Admin's; the
   rates and each menu section's heading roleGate GST's (the owner, an
   administrator, the GM, the accountant). UNSET IS NOT ZERO: a heading
   with no rate shows a dash and refuses to bill.
   A band's From and Last day are the phone's own date picker (M-16): the
   server keeps the day after the Last day (TaxRulesCard.tsx 265-266).
   ══════════════════════════════════════════════════════════════════ */

type Day = { today?: string; businessDate: string };

export function TaxesPart({ code, role, acts, hotel }: { code: string; role: string | null; acts: Acts; hotel: Day }) {
  const modules = useRead(async () => Object.fromEntries(
    (await api<{ modules: { module: string; enabled: boolean }[] }>(P.modules(code))).modules.map((m) => [m.module, m.enabled])) as Record<string, boolean>,
    ["pos", code, "setup", "modules"]);
  const vat = modules.data?.["alcohol"];
  const id = "module:alcohol";
  return (
    <Part title="Taxes"
      about="The same settings as Settings, Taxes: changed here or there, they are one. Alcohol is switched on or off by the owner or an Admin; the rates by whoever may change them in Settings.">
      <Card>
        <Toggle label="Serves alcohol (VAT)"
          about="Alcohol on the menu, taxed as VAT, not GST: its own rate below, one VAT line on the bill, kept off the GST invoice. Off, no menu section can sell it."
          on={vat === true} why={acts.why(id, whyNotModules(role) ?? (vat === undefined ? modules.error ?? "Reading whether it is on…" : null))}
          onRefused={acts.refused}
          onChange={(on) => void acts.run(id, "POST", P.module(code, "alcohol"), { enabled: on },
            { done: on ? "Alcohol is sold under VAT" : "Alcohol is switched off", not: "Not changed", what: "changed", where: "the alcohol switch" })} />
      </Card>
      <TaxCard code={code} role={role} acts={acts} hotel={hotel} />
    </Part>
  );
}

function TaxCard({ code, role, acts, hotel }: { code: string; role: string | null; acts: Acts; hotel: Day }) {
  const q = useRead(() => api<TaxSetup>(P.tax(code)), ["pos", code, "setup", "tax"]);
  const [editing, setEditing] = useState<TaxKind | null>(null);
  const d = q.data;
  if (!d) return q.error ? <ReadProblem error={new Error(q.error)} what="the tax rules" onRetry={q.reload} /> : <Loading what="the tax rules" />;
  const lost = orphaned(d);
  const current = d.kinds.find((k) => k.kind === editing) ?? null;
  const refusal = whyNotGst(role);
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <Receipt size={16} color={c.grey400} style={{ marginTop: 3 }} />
        <Text style={[t.heading, ty.md]}>{d.servesAlcohol ? "GST and VAT" : "GST"}</Text>
        <Text style={[t.label, ty.sm, { color: c.grey500, flex: 1 }]}>One set of rules, for the front desk and the till</Text>
      </View>
      {lost.length > 0 ? (
        <View style={{ flexDirection: "row", gap: 10, borderRadius: 8, borderWidth: 1, borderColor: c.yellow100, backgroundColor: c.yellow50, padding: 12 }} accessibilityRole="alert">
          <AlertTriangle size={16} color={c.yellow800} />
          <Text style={[t.label, ty.sm, { color: c.ink900, flex: 1 }]}>{orphanedLine(lost)}</Text>
        </View>
      ) : null}
      {d.kinds.map((k) => <KindTile key={k.kind} rules={k} why={acts.why(`tax:${k.kind}`, refusal)} onRefused={acts.refused} onEdit={() => setEditing(k.kind)} />)}
      {d.categories.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={[t.label, ty.sm, { color: c.grey500 }]}>The till's half: which rate each part of the menu sells under.</Text>
          {d.categories.map((cat) => {
            const id = `tax:category:${cat.name}`;
            return (
              <View key={cat.name} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 8, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: 12, paddingVertical: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[t.label, ty.md, { color: c.ink900 }]} numberOfLines={1}>{cat.name}</Text>
                  <Text style={[t.label, ty.sm, { color: c.grey500 }]}>{cat.items} {cat.items === 1 ? "item" : "items"}</Text>
                </View>
                <Chooser label={`GST heading for ${cat.name}`} value={cat.kind ?? ""} options={taxHeadings(d.servesAlcohol, cat.kind)}
                  why={acts.why(id, refusal)} onRefused={acts.refused}
                  onPick={(v) => void acts.run(id, "PATCH", P.categoryTax(code, cat.name), { kind: v || null },
                    { done: "Saved", doneBody: `${cat.name}: the tax heading is changed.`, not: "Not changed", what: "changed", where: "the tax headings" })} />
              </View>
            );
          })}
        </View>
      ) : null}
      {current ? <SlabsSheet key={current.kind} code={code} hotel={hotel} rules={current} acts={acts} why={refusal} onClose={() => setEditing(null)} /> : null}
    </Card>
  );
}

function KindTile({ rules, why, onRefused, onEdit }: { rules: TaxKindRules; why: string | null; onRefused: (w: string) => void; onEdit: () => void }) {
  const unset = rules.slabs.length === 0;
  return (
    <View style={{ borderRadius: 8, borderWidth: 1, borderStyle: unset ? "dashed" : "solid", borderColor: unset ? c.grey300 : c.grey200,
      backgroundColor: unset ? c.grey50 : c.white, padding: 12, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Text style={[t.label, ty.md, { color: c.ink900 }]}>{TAX_LABEL[rules.kind]}</Text>
        {rules.kind === "alcohol" ? <Text style={[t.label, ty.sm, { color: c.grey500 }]}>VAT</Text> : null}
        {unset ? <Pill tone="neutral" text="Not set" /> : null}
      </View>
      {/* A dash, not 0%: nobody has said what it is. */}
      {unset ? <Text style={[t.figure, { color: c.grey500 }]}>{DASH}</Text> : rules.slabs.map((s) => (
        <View key={s.id} style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <Text style={[t.figure, { fontSize: 18 }]}>{s.rate}%</Text>
          <Text style={[t.label, ty.sm, { color: c.grey500, flexShrink: 1 }]}>{slabWords(rules, s)}</Text>
        </View>
      ))}
      <Text style={[t.label, ty.sm, { color: c.grey500 }]}>{TAX_WHAT[rules.kind]}</Text>
      <Text style={[t.label, ty.sm, t.tab, { color: c.grey600 }]}>HSN/SAC {sacShown(rules)}</Text>
      <Btn label={unset ? "Set it" : "Edit"} why={why} onRefused={onRefused} onPress={onEdit} style={{ marginTop: 6 }} />
    </View>
  );
}

function SlabsSheet({ code, hotel, rules, acts, why, onClose }: { code: string; hotel: Day; rules: TaxKindRules; acts: Acts; why: string | null; onClose: () => void }) {
  /* VAT on alcohol is one rate on everything (D21-91): no bands. */
  const single = rules.kind === "alcohol";
  const [rows, setRows] = useState<SlabRow[]>(() => slabRows(rules));
  const [sac, setSac] = useState(rules.sac ?? "");
  const id = `tax:${rules.kind}`;
  const set = (i: number, patch: Partial<SlabRow>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const bad = slabsBad(rows);
  const save = async () => {
    const body = slabsBody(rows);
    const w = slabsSaved(rules.kind, body.slabs.length);
    const first = await acts.run(id, "PUT", P.taxKind(code, rules.kind), body,
      { done: w.title, doneBody: w.body, not: "Not saved", what: "saved", where: `the ${taxName(rules.kind)} on ${TAX_LABEL[rules.kind].toLowerCase()}` });
    if (first !== "done") return;
    if ((sac.trim() || null) !== rules.sac) {
      const second = await acts.run(`${id}:sac`, "PUT", P.taxSac(code, rules.kind), { sacCode: sac.trim() || null },
        { done: w.title, doneBody: w.body, not: "HSN/SAC not saved", what: "saved", where: "the HSN/SAC code" });
      if (second !== "done") return;
    }
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={`${taxName(rules.kind)} on ${TAX_LABEL[rules.kind].toLowerCase()}`} about={TAX_WHAT[rules.kind]}
      footer={<View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label="Cancel" grow onPress={onClose} />
        <Btn label="Save" kind="primary" grow off={bad} busy={acts.busy === id || acts.busy === `${id}:sac`}
          why={acts.why(id, why) ?? acts.why(`${id}:sac`)} onRefused={acts.refused} onPress={() => void save()} />
      </View>}
    >
      <Text style={[t.label, ty.sm, { color: c.grey600 }]}>
        {single ? "One rate, on everything sold under this heading. It prints on the bill as one VAT line."
          : "One row is one rate. Leave the amount at zero for the rate that applies to everything; add a second row to charge more above a figure - rooms above ₹7,500 being the usual one."}
      </Text>
      {rows.map((r, i) => (
        <View key={i} style={{ borderRadius: 8, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, padding: 12, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            {!single ? (
              <View style={{ flex: 1 }}>
                <Field label={i === 0 ? "On everything from" : "Above"}>
                  <Input label={i === 0 ? "On everything from" : "Above"} value={r.overAmount} keys="decimal" onChange={(overAmount) => set(i, { overAmount })} />
                </Field>
              </View>
            ) : null}
            <View style={single ? { flex: 1 } : { width: 104 }}>
              {/* No placeholder figure for VAT: the rate is the accountant's to confirm. */}
              <Field label={`${taxName(rules.kind)} %`}>
                <Input label={`${taxName(rules.kind)} %`} value={r.rate} keys="decimal" placeholder={single ? undefined : "5"} onChange={(rate) => set(i, { rate })} />
              </Field>
            </View>
            <Pressable onPress={() => setRows((x) => x.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel="Remove this rate"
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={c.grey500} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <DateField label="From" hint="Empty: always." clearable value={r.validFrom} onChange={(validFrom) => set(i, { validFrom })} hotel={hotel} />
            </View>
            <View style={{ flex: 1 }}>
              <DateField label="Last day" hint="Empty: current." clearable value={r.lastDay} onChange={(lastDay) => set(i, { lastDay })} hotel={hotel} />
            </View>
          </View>
          <Field label="Note" hint={single ? "Who confirmed it, and when. It shows on this card." : "Why this band exists. It shows on this card."}>
            <Input label="Note" value={r.note} placeholder={single ? undefined : "Rooms above 7,500 a night"} onChange={(note) => set(i, { note })} />
          </Field>
        </View>
      ))}
      {bad ? <Text style={[t.label, ty.sm, { color: c.red700 }]}>A rate and an amount are figures.</Text> : null}
      {!single ? <Btn label="Add a band" Icon={Plus} onPress={() => setRows((r) => [...r, newBand()])} /> : null}
      {single && rows.length === 0 ? <Btn label="Add the rate" Icon={Plus} onPress={() => setRows([{ ...newBand(), overAmount: "0" }])} /> : null}
      <Field label="HSN/SAC code"
        hint={rules.kind === "room"
          ? "A SAC is 6 digits; an HSN for goods 4, 6 or 8. Printed on each line of this kind. Empty: 996311, as before."
          : "A SAC is 6 digits; an HSN for goods 4, 6 or 8 - your CA's code. Printed on each line of this kind. Empty: a dash."}>
        <Input label="HSN/SAC code" value={sac} keys="number" maxLength={8} placeholder={rules.kind === "room" ? "996311" : DASH}
          onChange={(v) => setSac(v.replace(/\D/g, ""))} />
      </Field>
      {rows.length === 0 ? (
        <Text style={[t.label, ty.sm, { color: c.grey600, borderRadius: 8, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, padding: 12 }]}>
          With no rates, nothing under this heading can be billed - the desk and the till will refuse it and say why. That is the right state for something the property does not sell yet.
        </Text>
      ) : null}
      {acts.said && acts.said.tone !== "ok" ? <SaidBar said={acts.said} onDone={() => acts.setSaid(null)} /> : null}
    </Sheet>
  );
}

