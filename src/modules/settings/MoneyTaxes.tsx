import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, Receipt, X } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, confirmAct, ripple, useRead } from "../../core/ui";
import { ON_THE_WEBSITE } from "../../core/menu";
import { Refused as NotYours } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { Btn, Failed, Field, Loading, Pill, Select, Sheet, TextBox } from "../inventory/configKit";
import { InDialog, Stale, Toast, body, type Said } from "../inventory/kit";
import { readTaxSetup, setCategoryTaxKind, setTaxRules, setTaxSac, stamped } from "./moneyData";
import { Grey, refusedPage, useWriter, type Writer } from "./moneyKit";
import {
  DASH, GST, NO_RATES, TAX_LABEL, TAX_WHAT, categoryChoices, dateShortOrNull, draftsOf, firstRate, newBand, orphanLine, orphaned, sacProblem,
  sacShown, sacValue, slabWords, slabsBody, taxName, taxSaved, typedFigure, whyNot,
  type SlabDraft, type TaxKind, type TaxKindRules, type TaxSetup,
} from "./moneyRules";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS → RATES AND TAX → TAXES on a phone (lane m13-set-money, 20 Nov)
   — the web's /settings/rates/taxes, the console's stand-in page
   (admin/console.settings.ts TaxesSettings) holding finance/flows/
   TaxRulesCard.tsx; picture pms-shots/new/n-admin-configuration (taken at
   /settings/rates/taxes as the owner).

   GST, IN ONE PLACE, FOR THE DESK AND THE TILL. A heading (rooms, the
   restaurant, the bar …) is a list of bands: a rate and the amount it
   starts above. UNSET IS NOT ZERO: a heading with no bands refuses to
   bill, and the card shows a dash, never 0%. Alcohol is VAT, one rate,
   only where the property serves it.

   Read: GET /tax, anyone rostered. Writes: PUT tax/:kind (every band of
   one heading at once), PUT tax/:kind/sac, PATCH menu-categories/:name/
   tax-kind - roleGate GST (the owner, an administrator, the GM, and the
   accountant). The web's card offers Edit to everyone and lets the server
   refuse; the phone greys it with the server's sentence.

   STRICTER THAN THE WEB, ON PURPOSE (BRIEF-T4): the web drops a band whose
   rate is blank - and so can clear a whole heading unasked - and sends a
   blank amount as 0. Here a blank is never sent (the row is finished or
   removed), and clearing a heading asks first. A band's dates are shown,
   not changed: the phone has no date picker (On the website for now); a
   save sends them back exactly as read, so no period moves.
   ══════════════════════════════════════════════════════════════════ */

export function Taxes({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = refusedPage(role, "/settings/rates/taxes", "Taxes");
  const key = ["settings", code, "tax"];
  const q = useRead(() => (refused ? Promise.resolve(null) : stamped(() => readTaxSetup(code))), key);
  const w = useWriter(`${code}/taxes`, q.data?.began);
  const cannot = whyNot(GST, role);
  const locked = Boolean(cannot || w.blocked || w.busy);
  const [editing, setEditing] = useState<TaxKind | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  const refresh = () => void cache.invalidateQueries({ queryKey: key });
  const setup = q.data?.d;
  const current = setup?.kinds.find((k) => k.kind === editing) ?? null;

  const changeKind = async (name: string, kind: string) => {
    const r = await w.run(() => setCategoryTaxKind(code, name, (kind || null) as TaxKind | null), { title: "Not changed", done: "changed", where: "the menu's headings" });
    if (!r) return;
    if (!r.ok) setSaid(r.said);
    refresh();
  };

  let main: ReactNode;
  if (refused) main = <NotYours sentence={refused} />;
  else if (!setup) main = q.error ? <Failed title="The taxes did not load" what="The taxes" error={q.error} onRetry={q.reload} /> : <Loading words="Reading the taxes…" />;
  else main = <><Stale error={q.error} /><Card setup={setup} locked={locked} grey={w.blocked ?? cannot} onEdit={setEditing} onKind={(n, k) => void changeKind(n, k)} /></>;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Taxes" under={hotel.name} />
        {main}
      </Screen>
      {current ? (
        <SlabsSheet code={code} rules={current} w={w}
          onClose={() => { if (!w.busy) { setEditing(null); refresh(); } }}
          onDone={(s) => { setEditing(null); setSaid(s); refresh(); }} />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

function Card({ setup, locked, grey, onEdit, onKind }: {
  setup: TaxSetup; locked: boolean; grey: string | null; onEdit: (k: TaxKind) => void; onKind: (name: string, kind: string) => void;
}) {
  const orphans = orphaned(setup);
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <Receipt size={16} color={c.grey400} style={{ marginTop: 3 }} />
        <Text style={[t.heading]} accessibilityRole="header">{setup.servesAlcohol ? "GST and VAT" : "GST"}</Text>
        <Text style={[t.label, { flex: 1, color: c.grey500 }]}>One set of rules, for the front desk and the till</Text>
      </View>
      {orphans.length > 0 ? (
        <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 10, borderRadius: 8, borderWidth: 1, borderColor: c.yellow100, backgroundColor: c.yellow50, padding: 12 }}>
          <AlertTriangle size={16} color={c.yellow800} style={{ marginTop: 2 }} />
          <Text style={[body, { flex: 1, color: c.ink900 }]}>{orphanLine(orphans.map((x) => x.name))}</Text>
        </View>
      ) : null}
      <Grey line={grey} />
      {setup.kinds.map((k) => <Tile key={k.kind} rules={k} locked={locked} onEdit={() => onEdit(k.kind)} />)}
      {setup.categories.length > 0 ? (
        <View style={{ gap: 8, paddingTop: 4 }}>
          <Text style={[t.label, { color: c.grey500 }]}>The till's half: which rate each part of the menu sells under.</Text>
          {setup.categories.map((x) => (
            <View key={x.name} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 8, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: 12, paddingVertical: 8 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[t.label, { fontSize: 16, color: c.ink900 }]} numberOfLines={1}>{x.name}</Text>
                <Text style={[t.label, { color: c.grey500 }]}>{`${x.items} ${x.items === 1 ? "item" : "items"}`}</Text>
              </View>
              <View style={{ width: 150 }}>
                <Select label={`GST heading for ${x.name}`} value={x.kind ?? ""} placeholder="Not set" disabled={locked}
                  options={categoryChoices(setup.servesAlcohol, x.kind)} onChange={(v) => { if (v !== (x.kind ?? "")) onKind(x.name, v); }} />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** KindTile: dashed and grey when unset - a dash, not 0%. */
function Tile({ rules, locked, onEdit }: { rules: TaxKindRules; locked: boolean; onEdit: () => void }) {
  const unset = rules.slabs.length === 0;
  return (
    <View style={{ borderRadius: 8, borderWidth: 1, borderStyle: unset ? "dashed" : "solid", borderColor: unset ? c.grey300 : c.grey200, backgroundColor: unset ? c.grey50 : c.white, padding: 12, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Text style={[t.label, face[500], { fontSize: 16, color: c.ink900 }]}>{TAX_LABEL[rules.kind]}</Text>
        {rules.kind === "alcohol" ? <Text style={[t.label, { color: c.grey500 }]}>VAT</Text> : null}
        {unset ? <Pill>Not set</Pill> : null}
      </View>
      {unset ? <Text style={[t.figure, { fontSize: 18, color: c.grey500 }]}>{DASH}</Text> : rules.slabs.map((s) => {
        const { where, when } = slabWords(s, rules);
        return (
          <View key={s.id} style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <Text style={[t.figure, { fontSize: 18 }]}>{`${s.rate}%`}</Text>
            <Text style={[t.label, { color: c.grey500 }]}>{where}</Text>
            {when ? <Text style={[t.label, { color: c.grey500 }]}>{when}</Text> : null}
          </View>
        );
      })}
      <Text style={[body, { color: c.grey500, marginTop: 2 }]}>{TAX_WHAT[rules.kind]}</Text>
      <Text style={[t.label, t.tab, { color: c.grey600 }]}>{`HSN/SAC ${sacShown(rules)}`}</Text>
      <View style={{ marginTop: 6 }}>
        <Btn label={unset ? "Set it" : "Edit"} a11y={`${unset ? "Set" : "Edit"} ${TAX_LABEL[rules.kind]}`} disabled={locked} onPress={onEdit} />
      </View>
    </View>
  );
}

/* ── The bands of one heading, edited together (SlabsDialog) ─────── */

function SlabsSheet({ code, rules, w, onClose, onDone }: { code: string; rules: TaxKindRules; w: Writer; onClose: () => void; onDone: (s: Said) => void }) {
  const single = rules.kind === "alcohol";
  const name = taxName(rules.kind);
  const [rows, setRows] = useState<SlabDraft[]>(() => draftsOf(rules));
  const [sac, setSac] = useState(rules.sac ?? "");
  const [said, setSaid] = useState<Said | null>(null);
  const [lost, setLost] = useState<string | null>(null);
  const grey = w.blocked ?? lost;
  const built = slabsBody(rules.kind, rows);
  const problem = "problem" in built ? built.problem : sacProblem(sac);
  const set = (i: number, patch: Partial<SlabDraft>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function send() {
    if ("problem" in built || sacProblem(sac)) return;
    setSaid(null);
    let slabs = 0;
    const r = await w.run(async () => { slabs = (await setTaxRules(code, rules.kind, built.slabs)).slabs; }, { title: "Not saved", done: "saved", where: "this heading" });
    if (!r) return;
    if (!r.ok) { setSaid(r.said); if (r.unknown) setLost(`${r.said.title}: close this and look at the heading before trying again.`); return; }
    if (sacValue(sac) !== rules.sac) {
      const s = await w.run(() => setTaxSac(code, rules.kind, sacValue(sac)), { title: "HSN/SAC not saved", done: "saved", where: "the HSN/SAC code" });
      if (s && !s.ok) {
        /* The rates went; the code did not: said, and the sheet stays (the web's toast). */
        setSaid(s.said);
        if (s.unknown) setLost(`${s.said.title}: close this and look at the heading before trying again.`);
        return;
      }
    }
    const words = taxSaved(rules.kind, slabs);
    onDone({ title: words.title, body: words.body, tone: "ok" });
  }
  /* Clearing a heading stops its billing: asked first, in the card's own words. */
  const save = () => (rows.length === 0 ? confirmAct(`Clear ${TAX_LABEL[rules.kind]}?`, NO_RATES, "Clear it", () => void send()) : void send());

  return (
    <Sheet title={`${name} on ${TAX_LABEL[rules.kind].toLowerCase()}`} under={TAX_WHAT[rules.kind]} onClose={onClose}
      foot={
        <>
          <InDialog said={said} />
          <Grey line={grey} />
          {problem ? <Text style={[t.caption, { color: c.red700 }]}>{problem}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn label="Cancel" grow disabled={w.busy} onPress={onClose} />
            <Btn label={w.busy ? "Saving…" : "Save"} variant="primary" grow disabled={w.busy || grey !== null || problem !== null} onPress={save} />
          </View>
        </>
      }>
      <Text style={[body, { color: c.grey600 }]}>
        {single ? "One rate, on everything sold under this heading. It prints on the bill as one VAT line."
          : "One row is one rate. Leave the amount at zero for the rate that applies to everything; add a second row to charge more above a figure - rooms above ₹7,500 being the usual one."}
      </Text>
      {rows.map((r, i) => (
        <View key={i} style={{ borderRadius: 8, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, padding: 12, gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
            {!single ? (
              <View style={{ flex: 1 }}>
                <Field label={i === 0 ? "On everything from" : "Above"}>
                  <TextBox label={i === 0 ? "On everything from" : "Above"} value={r.overAmount} keyboardType="decimal-pad" onChangeText={(x) => set(i, { overAmount: typedFigure(x) })} />
                </Field>
              </View>
            ) : null}
            <View style={{ width: single ? undefined : 96, flex: single ? 1 : undefined }}>
              <Field label={`${name} %`}>
                <TextBox label={`${name} %`} value={r.rate} keyboardType="decimal-pad" onChangeText={(x) => set(i, { rate: typedFigure(x) })} />
              </Field>
            </View>
            <Pressable onPress={() => setRows((x) => x.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel="Remove this rate"
              android_ripple={{ ...ripple, borderless: true }} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <X size={18} color={c.grey500} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Shown label="From" value={dateShortOrNull(r.validFrom) ?? "Always"} /></View>
            <View style={{ flex: 1 }}><Shown label="Last day" value={dateShortOrNull(r.validTo, true) ?? "Current"} /></View>
          </View>
          <Field label="Note" hint={single ? "Who confirmed it, and when. It shows on this card." : "Why this band exists. It shows on this card."}>
            <TextBox label="Note" value={r.note} placeholder={single ? "-" : "Rooms above 7,500 a night"} onChangeText={(x) => set(i, { note: x })} />
          </Field>
        </View>
      ))}
      {rows.length > 0 ? <Text style={t.caption}>{`Changing a band's dates: ${ON_THE_WEBSITE.toLowerCase()} - the phone has no date picker yet. A save keeps them as they are.`}</Text> : null}
      {!single ? <Btn label="Add a band" icon={Plus} onPress={() => setRows((r) => [...r, newBand()])} /> : null}
      {single && rows.length === 0 ? <Btn label="Add the rate" icon={Plus} onPress={() => setRows([firstRate()])} /> : null}
      <Field label="HSN/SAC code" error={sacProblem(sac)}
        hint={rules.kind === "room"
          ? "A SAC is 6 digits; an HSN for goods 4, 6 or 8. Printed on each line of this kind. Empty: 996311, as before."
          : "A SAC is 6 digits; an HSN for goods 4, 6 or 8 - your CA's code. Printed on each line of this kind. Empty: a dash."}>
        <TextBox label="HSN/SAC code" value={sac} keyboardType="number-pad" maxLength={8} placeholder={rules.kind === "room" ? "996311" : "-"} onChangeText={(x) => setSac(x.replace(/\D/g, ""))} />
      </Field>
      {rows.length === 0 ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, padding: 12 }}>
          <Text style={[body, { color: c.grey600 }]}>{NO_RATES}</Text>
        </View>
      ) : null}
    </Sheet>
  );
}

/** A value the phone shows but does not change: grey, as a disabled field. */
function Shown({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>{label}</Text>
      <View style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey100 }}
        accessibilityLabel={`${label}: ${value}. ${ON_THE_WEBSITE}`}>
        <Text style={[t.label, t.tab, { fontSize: 16, color: c.grey500 }]}>{value}</Text>
      </View>
    </View>
  );
}
