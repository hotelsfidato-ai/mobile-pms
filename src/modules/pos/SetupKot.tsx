import { Plus, Printer, Receipt } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { api } from "../../core/api";
import { ON_THE_WEBSITE } from "../../core/menu";
import { c, face, t } from "../../core/theme";
import { Card, useRead } from "../../core/ui";
import {
  DISH_PX, designBody, HEADING, kindLine, kindNameReady, kindPill, KOT_TODAY, LINE_LABEL, NUMBER_PX, P, printsLine, routeChoices, routedWords,
  routingAbout, sameDesign, SIZES, stationPill, stationPrints, TABLE_PX, whyNotDesign, whyNotKot,
  type KotDesign, type KotKindFull, type KotSetupFull,
} from "./setup";
import { Btn, Chooser, Field, Input, Part, Pill, Rule, Seg, Toggle, type Acts, Loading, NameSheet } from "./SetupKit";
import { ReadProblem, ty } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   THE KOT SECTION OF RESTAURANT SETUP (components/KotSection.tsx, the
   owner's D27-292, D27-368) on a phone: This computer, The KOT's design
   with its preview, KOT kinds, Computers that print, Which section prints
   where. For the owner, an administrator, the GM and the kitchen manager
   (roleGate KOT_SWITCH; the design is the GM's, the owner's or an Admin's).
   A phone is never a KOT computer: it prints through no printer of its own
   and names no device (as the Kitchen board), so "This computer" - naming
   it, ticking what it prints, the Fidato Printer download, the test prints
   and the Reprints list - is on the website, said in place.
   ══════════════════════════════════════════════════════════════════ */

export function KotPart({ code, role, acts }: { code: string; role: string | null; acts: Acts }) {
  const q = useRead(() => api<KotSetupFull>(P.kot(code)), ["pos", code, "setup", "kot"]);
  const d = q.data;
  return (
    <Part title="KOT section"
      about="What each KOT is, which computer prints it, and where each menu section's dishes go. A computer at the hotel prints through its own printer: the website cannot reach a printer by its address.">
      {!d ? (q.error ? <ReadProblem error={new Error(q.error)} what="the KOT section" onRetry={q.reload} /> : <Loading what="the KOT section" />) : (
        <>
          <ThisComputer d={d} acts={acts} />
          <Design key={JSON.stringify(d.design ?? KOT_TODAY)} code={code} role={role} saved={d.design ?? KOT_TODAY} acts={acts} />
          <Kinds code={code} role={role} d={d} acts={acts} />
          <Computers code={code} role={role} d={d} acts={acts} />
          <Routing code={code} role={role} d={d} acts={acts} />
        </>
      )}
    </Part>
  );
}

/* ── 1. This computer: the website's (the phone is not one) ────────── */

function ThisComputer({ d, acts }: { d: KotSetupFull; acts: Acts }) {
  return (
    <Card style={{ gap: 10 }}>
      <Text style={[t.heading, ty.md]}>This computer</Text>
      <Text style={[t.label, ty.sm, { color: c.grey600 }]}>
        Open this on the computer that has the printer - at the bar, in the kitchen - and tick what it prints.
      </Text>
      <View style={{ borderRadius: 10, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, padding: 14, gap: 8 }}>
        <Text style={[t.label, ty.sm, { color: c.ink900, ...face[600] }]}>Set up this computer for printing</Text>
        <Text style={[t.label, ty.sm, { color: c.grey600 }]}>
          On the Windows computer the printer is plugged into, install Fidato Printer. It prints each KOT and bill straight away, with no
          window and no print screen, starts with Windows and keeps the computer awake. In its window, sign in, open this section, name the
          computer and tick what it prints. Pick the receipt printer from its icon by the clock: Printer.
        </Text>
        <Btn label="Download Fidato Printer for Windows" why={ON_THE_WEBSITE} onRefused={acts.refused} onPress={() => undefined} />
      </View>
      {/* The web's controls, drawn as they are and greyed: a phone prints nothing of its own. */}
      <Field label="This computer's name" hint="For example Bar PC or Kitchen PC.">
        <Input label="This computer's name" value="" onChange={() => undefined} placeholder="Bar PC" off />
      </Field>
      {d.kinds.map((k) => (
        <View key={k.id}>
          <Toggle label={`Prints ${k.name} KOTs`} on={false} onChange={() => undefined} why={ON_THE_WEBSITE} onRefused={acts.refused} />
          {k.station ? <Text style={[t.caption, ty.xs, { color: c.grey600 }]}>{k.station.name} prints them now. Ticked here, they move here.</Text> : null}
        </View>
      ))}
      <View>
        <Toggle label="Prints the bills" on={false} onChange={() => undefined} why={ON_THE_WEBSITE} onRefused={acts.refused} />
        {d.billPrinter ? <Text style={[t.caption, ty.xs, { color: c.grey600 }]}>{d.billPrinter.name} prints them now. Ticked here, they move here.</Text> : null}
      </View>
      <Btn label="Save" kind="primary" why={ON_THE_WEBSITE} onRefused={acts.refused} onPress={() => undefined} style={{ alignSelf: "flex-end" }} />
    </Card>
  );
}

/* ── The KOT's design, with its preview (D27-368) ──────────────────── */

function Design({ code, role, saved, acts }: { code: string; role: string | null; saved: KotDesign; acts: Acts }) {
  const [draft, setDraft] = useState<KotDesign>(saved);
  const set = (patch: Partial<KotDesign>) => setDraft((x) => ({ ...x, ...patch }));
  const refusal = whyNotDesign(role);
  const id = "kot:design";
  return (
    <Card style={{ gap: 12 }}>
      <Text style={[t.heading, ty.md]}>The KOT's design</Text>
      <Text style={[t.label, ty.sm, { color: c.grey600 }]}>
        How every KOT at this hotel prints. The KOT beside it is the preview, as it will print.{refusal ? " Set by the GM, the owner or an Admin." : ""}
      </Text>
      <Sub label="The dishes"><Seg label="The dishes" value={draft.dishSize} options={SIZES} why={refusal} onRefused={acts.refused} onPick={(dishSize) => set({ dishSize })} /></Sub>
      <Sub label="The KOT number and table"><Seg label="The KOT number and table" value={draft.numberSize} options={SIZES} why={refusal} onRefused={acts.refused} onPick={(numberSize) => set({ numberSize })} /></Sub>
      <Sub label="The paper">
        <Seg label="The paper" value={String(draft.widthMm) as "80" | "58"} why={refusal} onRefused={acts.refused}
          options={[{ value: "80", label: "80 mm" }, { value: "58", label: "58 mm" }]} onPick={(v) => set({ widthMm: v === "58" ? 58 : 80 })} />
      </Sub>
      <Sub label="What it prints">
        {(Object.keys(LINE_LABEL) as (keyof KotDesign["show"])[]).map((line) => (
          <Toggle key={line} label={LINE_LABEL[line]} on={draft.show[line]} why={refusal} onRefused={acts.refused}
            onChange={(v) => set({ show: { ...draft.show, [line]: v } })} />
        ))}
      </Sub>
      <Field label="A heading line, your own words (blank: none)">
        <Input label="A heading line, your own words (blank: none)" value={draft.heading ?? ""} maxLength={40} off={refusal != null}
          placeholder="Fidato Kitchen" onChange={(heading) => set({ heading })} />
      </Field>
      {refusal == null ? (
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Btn label="Save the design" kind="primary" off={sameDesign(draft, saved)} busy={acts.busy === id} why={acts.why(id)}
            onRefused={acts.refused}
            onPress={() => void acts.run(id, "PUT", P.kotDesign(code), designBody(draft),
              { done: "The KOT's design is saved", not: "Not saved", what: "saved", where: "the KOT's design" })} />
          <Btn label="As it was" kind="ghost" off={sameDesign(draft, KOT_TODAY)} onPress={() => setDraft(KOT_TODAY)} />
        </View>
      ) : null}
      <Preview design={draft} />
    </Card>
  );
}

const Sub = ({ label, children }: { label: string; children: ReactNode }) => (
  <View style={{ gap: 6 }}><Text style={[t.caption, ty.xs, { color: c.grey600 }]}>{label}</Text>{children}</View>
);

/** The web's preview KOT (KotSection.tsx PREVIEW_KOT), drawn as DocketSlip.tsx draws it - the shop's
    own sample, never a figure of this hotel's. In Inter: the slip's monospace is the printer's. */
function Preview({ design }: { design: KotDesign }) {
  const mono = { color: c.ink900, ...face[500] } as const;
  const bold = face[700];
  const dish = { ...mono, fontSize: DISH_PX[design.dishSize] };
  const where = design.numberSize === "normal" ? 16 : TABLE_PX[design.numberSize];
  const s = design.show;
  return (
    <View accessibilityLabel="The KOT, as it will print" style={{ borderRadius: 8, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, padding: 8 }}>
      <View style={{ alignSelf: "center", width: design.widthMm === 58 ? 220 : 300, backgroundColor: c.white, paddingHorizontal: 12, paddingVertical: 16, gap: 2 }}>
        {design.heading?.trim() ? <Text style={[dish, { textAlign: "center", ...bold }]}>{design.heading.trim()}</Text> : null}
        {s.time ? <Text style={[dish, { textAlign: "center" }]}>27/10/26 13:05</Text> : null}
        <Text style={[mono, { fontSize: NUMBER_PX[design.numberSize], textAlign: "center", ...bold, borderTopWidth: 2, borderBottomWidth: 2, paddingVertical: 4, marginTop: 4 }]}>
          {s.kind ? "KITCHEN KOT 14" : "KOT - 14"}
        </Text>
        <Text style={[mono, { fontSize: where, textAlign: "center", ...bold }]}>RESTAURANT · A/C</Text>
        <Text style={[dish, { textAlign: "center", ...bold }]}>Dine In</Text>
        <Text style={[mono, { fontSize: TABLE_PX[design.numberSize], textAlign: "center", ...bold }]}>Table No: 4</Text>
        {s.waiter || s.covers ? (
          <Text style={[dish, { textAlign: "center" }]}>{[s.waiter ? "Waiter: Ramesh" : null, s.covers ? "Covers: 3" : null].filter(Boolean).join(" · ")}</Text>
        ) : null}
        <View style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: c.ink900, marginVertical: 6 }} />
        <View style={{ flexDirection: "row" }}><Text style={[dish, { flex: 1, ...bold }]}>Item</Text><Text style={[dish, bold]}>Qty.</Text></View>
        <View style={{ flexDirection: "row" }}><Text style={[dish, { flex: 1, ...bold }]}>Paneer Tikka</Text><Text style={[dish, bold]}>2</Text></View>
        {s.notes ? <Text style={[dish, { paddingLeft: 14, fontStyle: "italic" }]}>[Note] Less spicy</Text> : null}
        <View style={{ flexDirection: "row" }}><Text style={[dish, { flex: 1, ...bold }]}>Butter Roti</Text><Text style={[dish, bold]}>4</Text></View>
        <Text style={[mono, { fontSize: 11, textAlign: "center", marginTop: 10 }]}>{s.orderNo ? "Restaurant · 20261027-12" : "Restaurant"}</Text>
      </View>
    </View>
  );
}

/* ── 2. The KOT kinds ──────────────────────────────────────────────── */

function Kinds({ code, role, d, acts }: { code: string; role: string | null; d: KotSetupFull; acts: Acts }) {
  const [naming, setNaming] = useState<KotKindFull | "new" | null>(null);
  const refusal = whyNotKot(role);
  return (
    <Card style={{ gap: 12 }}>
      <Text style={[t.heading, ty.md]}>KOT kinds</Text>
      <Text style={[t.label, ty.sm, { color: c.grey600 }]}>Each prints at the top of its slip - KITCHEN KOT 14, BAR KOT 14. One Send keeps one number.</Text>
      <Btn label="Add a KOT" Icon={Plus} why={acts.why("kot:kind:new", refusal)} onRefused={acts.refused} onPress={() => setNaming("new")} style={{ alignSelf: "flex-start" }} />
      {d.kinds.map((k) => {
        const pill = kindPill(k);
        return (
          <View key={k.id} style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 10 }}>
            <Text style={[t.label, ty.md, { color: c.ink900 }]}>{k.name}</Text>
            <Text style={[t.label, ty.sm, { color: c.grey600 }]}>{kindLine(k)}</Text>
            {pill ? <Pill tone={pill.tone} text={pill.text} /> : null}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Btn label="Rename" small why={acts.why(`kot:kind:${k.id}`, refusal)} onRefused={acts.refused} onPress={() => setNaming(k)} />
              {!k.fixed ? (
                <Btn label="Switch off" small busy={acts.busy === `kot:kind:${k.id}:off`} why={acts.why(`kot:kind:${k.id}:off`, refusal)} onRefused={acts.refused}
                  onPress={() => void acts.run(`kot:kind:${k.id}:off`, "POST", P.kotKindOff(code, k.id), {},
                    { done: `${k.name} KOT switched off`, not: "Not saved", what: "switched off", where: "the KOT kinds" })} />
              ) : null}
            </View>
          </View>
        );
      })}
      {naming !== null ? (
        <NameSheet
          title={naming === "new" ? "Add a KOT" : `Rename ${naming.name}`} about="Its name heads the slip: TANDOOR KOT 14."
          initial={naming === "new" ? "" : naming.name} hint="Kitchen, Bar, Tandoor, Desserts. The slip adds KOT." placeholder="Tandoor"
          ready={kindNameReady} onClose={() => setNaming(null)} acts={acts} why={refusal}
          id={naming === "new" ? "kot:kind:new" : `kot:kind:${naming.id}`}
          save={(name) => (naming === "new"
            ? acts.run("kot:kind:new", "POST", P.kotKinds(code), { name }, { done: `${name} KOT added`, not: "Not saved", what: "added", where: "the KOT kinds" })
            : acts.run(`kot:kind:${naming.id}`, "PATCH", P.kotKind(code, naming.id), { name }, { done: `Renamed ${name}`, not: "Not saved", what: "renamed", where: "the KOT kinds" }))} />
      ) : null}
    </Card>
  );
}

/* ── 3. The computers ──────────────────────────────────────────────── */

function Computers({ code, role, d, acts }: { code: string; role: string | null; d: KotSetupFull; acts: Acts }) {
  return (
    <Card style={{ gap: 12 }}>
      <Text style={[t.heading, ty.md]}>Computers that print</Text>
      <Text style={[t.label, ty.sm, { color: c.grey600 }]}>An offline computer's KOTs wait for it, the same day, and every till screen says so.</Text>
      {d.stations.length === 0 ? (
        <Text style={[t.label, ty.sm, { color: c.grey600 }]}>None yet. On the computer with the printer, open this page and tick what it prints.</Text>
      ) : d.stations.map((s) => {
        const prints = stationPrints(s, d.kinds);
        const pill = stationPill(s);
        const Icon = s.printsBills ? Receipt : Printer;
        const id = `kot:station:${s.id}`;
        return (
          <View key={s.id} style={{ gap: 6, borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon size={16} color={c.grey500} />
              <Text style={[t.label, ty.md, { color: c.ink900, flex: 1 }]}>{s.name}</Text>
            </View>
            <Text style={[t.label, ty.sm, { color: c.grey600 }]}>{printsLine(prints)}</Text>
            <Pill tone={pill.tone} text={pill.text} />
            {prints.length === 0 ? (
              <Btn label="Remove" small style={{ alignSelf: "flex-start" }} busy={acts.busy === id} why={acts.why(id, whyNotKot(role))} onRefused={acts.refused}
                onPress={() => void acts.run(id, "POST", P.kotStationOff(code, s.id), {},
                  { done: `${s.name} removed`, not: "Not saved", what: "removed", where: "the computers that print" })} />
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

/* ── 4. Which section prints where ─────────────────────────────────── */

function Routing({ code, role, d, acts }: { code: string; role: string | null; d: KotSetupFull; acts: Acts }) {
  return (
    <Card style={{ gap: 12 }}>
      <Text style={[t.heading, ty.md]}>Which section prints where</Text>
      <Text style={[t.label, ty.sm, { color: c.grey600 }]}>{routingAbout(d.kinds)}</Text>
      {d.sections.length === 0 ? (
        <Text style={[t.label, ty.sm, { color: c.grey600 }]}>No menu sections yet. The Menu screen makes them.</Text>
      ) : d.sections.map((s, i) => {
        const id = `kot:route:${s.id}`;
        return (
          <View key={s.id} style={{ gap: 8 }}>
            {i > 0 ? <Rule /> : null}
            <Text style={[t.label, ty.md, { color: c.ink900 }]}>{s.name}</Text>
            <Text style={[t.label, ty.sm, { color: c.grey600 }]}>{HEADING[s.heading ?? ""] ?? "No tax heading"}</Text>
            <Chooser label={`${s.name} prints on`} value={s.own} options={routeChoices(d.kinds, s.heading).map((o) => ({ value: o.id, label: o.label }))}
              why={acts.why(id, whyNotKot(role))} onRefused={acts.refused}
              onPick={(kindId) => void acts.run(id, "POST", P.kotSection(code, s.id), { kindId },
                { done: routedWords(d.kinds, s, kindId), not: "Not saved", what: "saved", where: "which section prints where" })} />
          </View>
        );
      })}
    </Card>
  );
}
