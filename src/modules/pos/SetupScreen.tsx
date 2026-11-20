import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { CheckCircle2, ChevronRight, Circle, Plus } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { api, type Hotel } from "../../core/api";
import { asRole, mayReach, ON_THE_WEBSITE, phoneRoute } from "../../core/menu";
import { c, face, t } from "../../core/theme";
import { Card, Head, Screen, useRead } from "../../core/ui";
import {
  addTablesBody, addTablesDone, addTablesReady, allowanceLine, orDash, P, paise, readyTicks, seatsShown, sectionAway, seesWholeSetup,
  shown, slotsLine, tableAbout, tablesCount, typed, whyNotAllowance, whyNotHours, whyNotSetup,
  type AddForm, type OwnerAllowance, type SetupSection, type SetupTable, type TableHours, type TillSetup,
} from "./setup";
import { Btn, Field, Input, LinkBtn, Loading, NameSheet, Part, Seg, Sheet, useActs, type Acts } from "./SetupKit";
import { KotPart } from "./SetupKot";
import { TaxesPart } from "./SetupTaxes";
import { ReadProblem, SaidBar, Stale, ty, useAccess, Refused } from "./TablesKit";
import type { MenuCategory } from "./types";

/* ══════════════════════════════════════════════════════════════════
   RESTAURANT SETUP on a phone — the web's /pos/:code/setup
   (src/modules/pos/pages/Setup.tsx, 16 Nov; the picture
   reference/pms-shots/new/n-pos-setup, 31 Oct): Ready to open, the
   restaurant's name, Parcels, Service charge, Owner's allowance, Taxes,
   Sections and tables, the KOT section, Table booking hours - in the
   web's order and words. For the owner, an administrator and the GM; the
   kitchen manager sees the KOT section only (D27-292), as the web.
   Nothing is deleted: a table or a section taken away is switched off, and
   the server refuses it while a bill sits on it.
   ══════════════════════════════════════════════════════════════════ */

const key = (code: string, part: string) => ["pos", code, "setup", part];

export function RestaurantSetup({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const access = useAccess(hotel.code);
  if (access.data && !access.data.ok) {
    return (
      <Screen refreshing={false} onRefresh={() => void access.refetch()}>
        <Head title="Restaurant setup" />
        <Refused store title="The point of sale is not open to you here" reason={access.data.reason} />
      </Screen>
    );
  }
  return seesWholeSetup(role) ? <Whole hotel={hotel} role={role} /> : <KotOnly hotel={hotel} role={role} />;
}

/** The kitchen manager: the KOT section only, "and is not even read for anybody else". */
function KotOnly({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const acts = useActs(hotel.code);
  const cache = useQueryClient();
  return (
    <Screen refreshing={false} onRefresh={() => { acts.unstick(); void cache.invalidateQueries({ queryKey: ["pos", hotel.code, "setup"] }); }}>
      <Head title="Restaurant setup" under="Which computer prints which KOT, and where each menu section's dishes go." />
      {acts.said ? <SaidBar said={acts.said} onDone={() => acts.setSaid(null)} /> : null}
      <KotPart code={hotel.code} role={role} acts={acts} />
    </Screen>
  );
}

function Whole({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const acts = useActs(code);
  /* Asked again every time the page opens (the web's staleTime 0): a ready list not current is worse than none. */
  const setup = useRead(() => api<TillSetup>(P.setup(code)), key(code, "till"));
  const menu = useRead(async () => (await api<{ categories: MenuCategory[] }>(P.menu(code))).categories, key(code, "menu"));
  const cache = useQueryClient();
  /* Pulled down: every part of the page read again, and a "not known" control free again. */
  const refresh = () => { acts.unstick(); void cache.invalidateQueries({ queryKey: ["pos", code, "setup"] }); };
  const d = setup.data;

  return (
    <Screen refreshing={false} onRefresh={refresh}>
      <Head title="Restaurant setup"
        under="Name the restaurant, lay out its sections and tables, choose which computer prints which KOT, and see what is left before its first order." />
      {acts.said ? <SaidBar said={acts.said} onDone={() => acts.setSaid(null)} /> : null}
      {setup.error && d ? <Stale error={new Error(setup.error)} loadedAt={0} onRetry={refresh} /> : null}
      {!d ? (
        setup.error ? <ReadProblem error={new Error(setup.error)} what="the restaurant's setup" onRetry={refresh} />
          : <Loading what="the restaurant's setup" />
      ) : (
        <>
          <ReadyToOpen code={code} role={role} setup={d} menu={menu} acts={acts} />
          <Restaurant key={`r${d.restaurant?.name ?? ""}`} code={code} role={role} setup={d} acts={acts} />
          {d.restaurant ? <FigurePart key={`p${shown(d.restaurant.packingCharge)}`} code={code} role={role} acts={acts}
            id="packing" title="Parcels" about="A packing charge added once to each parcel's bill, taxed as the food. Blank: none."
            label="Packing charge, ₹" saved={d.restaurant.packingCharge ?? null} path={P.packing(code)} field="amount"
            words={(v) => (v === null ? "No packing charge" : "Packing charge saved")} /> : null}
          {d.restaurant ? <FigurePart key={`s${shown(d.restaurant.serviceChargePct)}`} code={code} role={role} acts={acts}
            id="service" title="Service charge"
            about="Voluntary by law: never added by itself. With a rate here the Till and the Terminal offer it, and it goes on a bill only when the guest agrees. GST is charged on it with the food. Blank: none."
            label="Service charge, %" saved={d.restaurant.serviceChargePct ?? null} path={P.serviceCharge(code)} field="percent"
            words={(v) => (v === null ? "No service charge" : "Service charge saved")} /> : null}
          {d.restaurant ? <Allowance code={code} acts={acts} /> : null}
          {d.restaurant ? <TaxesPart code={code} role={role} acts={acts} /> : null}
          <Sections code={code} role={role} setup={d} acts={acts} />
          <KotPart code={code} role={role} acts={acts} />
          <Hours code={code} role={role} acts={acts} />
        </>
      )}
    </Screen>
  );
}

/* ── Ready to open: the six ticks the owner chose ─────────────────── */

function ReadyToOpen({ code, role, setup, menu, acts }: {
  code: string; role: string | null; setup: TillSetup; acts: Acts;
  menu: { data?: MenuCategory[]; error?: string; loading: boolean };
}) {
  const said = menu.data ? null : menu.error ? "The menu could not be read" : "Reading the menu";
  const ticks = readyTicks(setup, menu.data ? menu.data.flatMap((cat) => cat.items) : null, said);
  return (
    <Part title="Ready to open" about="What a first order needs. Each line opens the screen that does it.">
      {ticks.map((tk) => {
        /* The web offers a line's link only to whom its menu offers the screen; the phone opens its own
           screen where it has one, else says the screen is on the website. */
        const offered = tk.to && tk.open && mayReach(asRole(role), tk.to);
        const route = tk.to ? phoneRoute(tk.to.replace(":code", code), code) : null;
        return (
          <Card key={tk.label} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            {tk.done ? <CheckCircle2 size={20} color={c.success600} accessibilityLabel="Done" />
              : <Circle size={20} color={c.grey400} accessibilityLabel="Not yet" />}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[t.label, ty.md, { color: c.ink900 }]}>{tk.label}</Text>
              <Text style={[t.label, ty.sm, { color: c.grey600 }]}>{tk.detail}</Text>
              {offered ? <LinkBtn label={tk.open!} why={route ? null : ON_THE_WEBSITE} onRefused={acts.refused}
                onPress={() => router.push(route as never)} /> : null}
            </View>
          </Card>
        );
      })}
    </Part>
  );
}

/* ── The restaurant's name ────────────────────────────────────────── */

function Restaurant({ code, role, setup, acts }: { code: string; role: string | null; setup: TillSetup; acts: Acts }) {
  const [name, setName] = useState(setup.restaurant?.name ?? "");
  const named = setup.restaurant !== null;
  const id = "restaurant";
  return (
    <Part title="The restaurant" about="Its name is printed on every bill and shown on the till.">
      <Card style={{ gap: 12 }}>
        <Field label="Name">
          <Input label="Name" value={name} onChange={setName} placeholder="Main Restaurant" />
        </Field>
        <Btn label={named ? "Save name" : "Name the restaurant"} kind={named ? "secondary" : "primary"}
          off={!name.trim()} busy={acts.busy === id} why={acts.why(id, whyNotSetup(role))} onRefused={acts.refused}
          onPress={() => void acts.run(id, "POST", P.restaurant(code), { name },
            { done: named ? "Name changed" : "Restaurant named", not: "Not saved", what: "saved", where: "the restaurant's name" })} />
      </Card>
    </Part>
  );
}

/* ── One figure whose blank is none: Parcels' packing charge, the service charge ── */

function FigurePart({ code, role, acts, id, title, about, label, saved, path, field, words }: {
  code: string; role: string | null; acts: Acts; id: string; title: string; about: string; label: string;
  saved: number | null; path: string; field: "amount" | "percent"; words: (v: number | null) => string;
}) {
  void code;
  const [text, setText] = useState(shown(saved));
  const v = typed(text);
  return (
    <Part title={title} about={about}>
      <Card style={{ gap: 12 }}>
        <Field label={label} error={v.bad ? "A figure, or leave it blank for none." : undefined}>
          <Input label={label} value={text} onChange={setText} keys="decimal" />
        </Field>
        <Btn label="Save" off={v.bad || v.value === saved} busy={acts.busy === id}
          why={acts.why(id, whyNotSetup(role))} onRefused={acts.refused}
          onPress={() => void acts.run(id, "POST", path, { [field]: v.value },
            { done: words(v.value), not: "Not saved", what: "saved", where: title })} />
      </Card>
    </Part>
  );
}

/* ── The owner's allowance (D27-355, D27-365, D27-366) ─────────────── */

function Allowance({ code, acts }: { code: string; acts: Acts }) {
  const q = useRead(() => api<OwnerAllowance>(P.allowance(code)), key(code, "allowance"));
  const a = q.data;
  return (
    <Part title="Owner's allowance"
      about="What the owner takes free from the restaurant each month, and the % off a bill above it. The GM, the owner or an Admin settles the owner's bill to it on the Till. Blank: not set.">
      {!a ? (q.error ? <ReadProblem error={new Error(q.error)} what="the owner's allowance" onRetry={q.reload} /> : <Loading what="the owner's allowance" />)
        : <AllowanceCard key={`${a.monthly}-${a.offPct}`} code={code} a={a} acts={acts} />}
    </Part>
  );
}

function AllowanceCard({ code, a, acts }: { code: string; a: OwnerAllowance; acts: Acts }) {
  const [monthly, setMonthly] = useState(shown(a.monthly));
  const [off, setOff] = useState(shown(a.offPct));
  const m = typed(monthly), o = typed(off);
  const id = "allowance";
  return (
    <Card style={{ gap: 12 }}>
      <Field label="Free each month, ₹" error={m.bad ? "A figure, or leave it blank for none." : undefined}>
        <Input label="Free each month, ₹" value={monthly} onChange={setMonthly} keys="decimal" off={!a.mayEdit} />
      </Field>
      <Field label="% off above it" error={o.bad ? "A figure, or leave it blank for none." : undefined}>
        <Input label="% off above it" value={off} onChange={setOff} keys="decimal" off={!a.mayEdit} />
      </Field>
      {a.mayEdit ? (
        <Btn label="Save" off={m.bad || o.bad || (m.value === a.monthly && o.value === a.offPct)} busy={acts.busy === id}
          why={acts.why(id, whyNotAllowance(a.mayEdit))}
          onPress={() => void acts.run(id, "PUT", P.allowance(code), { monthly: m.value, offPct: o.value },
            { done: "Owner's allowance saved", not: "Not saved", what: "saved", where: "the owner's allowance" })} />
      ) : <Text style={[t.label, ty.sm, { color: c.grey600 }]}>Set by the owner or an Admin.</Text>}
      {a.monthly !== null ? (
        <View style={{ gap: 8 }}>
          <Text style={[t.label, ty.sm, t.tab, { color: c.ink900 }]}>{allowanceLine(a)}</Text>
          {/* The web's five-column table, as cards of labelled figures (one column on a phone). */}
          {a.bills.map((b) => (
            <View key={b.orderNo} style={{ borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 8, gap: 2 }}>
              <Text style={[t.label, ty.sm, t.tab, { color: c.ink900, ...face[600] }]}>Bill {b.orderNo} · {b.date}</Text>
              <Fig label="Free" value={paise(b.free)} />
              <Fig label="% off, before tax" value={orDash(b.discount)} />
              <Fig label="Paid" value={orDash(b.paid)} />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

export function Fig({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={[t.label, ty.sm, { color: c.grey600 }]}>{label}</Text>
      <Text style={[t.label, ty.sm, t.tab, { color: c.ink900 }]}>{value}</Text>
    </View>
  );
}

/* ── Sections and their tables ────────────────────────────────────── */

function Sections({ code, role, setup, acts }: { code: string; role: string | null; setup: TillSetup; acts: Acts }) {
  const [name, setName] = useState("");
  const id = "section:new";
  return (
    <Part title="Sections and tables"
      about="A section is a part of the room - A/C, Non A/C, the bar - and tables sit inside one, four to a row, in the order they are added.">
      {!setup.restaurant ? (
        <Card><Text style={[t.label, ty.sm, { color: c.grey600 }]}>Name the restaurant first - its sections sit inside it.</Text></Card>
      ) : (
        <>
          {setup.sections.map((s) => <SectionCard key={s.id} code={code} role={role} section={s} acts={acts} />)}
          <Card style={{ gap: 12 }}>
            <Field label="New section">
              <Input label="New section" value={name} onChange={setName} placeholder="A/C" />
            </Field>
            <Btn label="Add section" Icon={Plus} off={!name.trim()} busy={acts.busy === id}
              why={acts.why(id, whyNotSetup(role))} onRefused={acts.refused}
              onPress={async () => {
                const done = await acts.run(id, "POST", P.sections(code), { name },
                  { done: `${name.trim()} added`, not: "Not saved", what: "added", where: "the sections" });
                if (done === "done") setName("");
              }} />
          </Card>
        </>
      )}
    </Part>
  );
}

function SectionCard({ code, role, section, acts }: { code: string; role: string | null; section: SetupSection; acts: Acts }) {
  const [renaming, setRenaming] = useState(false);
  const [table, setTable] = useState<SetupTable | null>(null);
  const refusal = whyNotSetup(role);
  const away = () => {
    const { busy, line } = sectionAway(section);
    /* The web's own dialog words, in the phone's own dialog (NATIVE.md). */
    Alert.alert(`Take away ${section.name}`,
      `Its tables leave the Tables screen. Old bills keep their table names, and adding a section of the same name brings it back.\n\n${line}`,
      busy.length ? [{ text: "Cancel", style: "cancel" }] : [
        { text: "Cancel", style: "cancel" },
        { text: "Take away", style: "destructive", onPress: () => void acts.run(`section:${section.id}:off`, "POST", P.sectionOff(code, section.id), undefined,
          { done: `${section.name} taken away`, not: "Not saved", what: "taken away", where: "the sections" }) },
      ]);
  };
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={[t.heading, ty.md]}>{section.name}</Text>
          <Text style={[t.label, ty.sm, { color: c.grey600 }]}>{tablesCount(section.tables.length)}</Text>
        </View>
        <Btn label="Rename" kind="ghost" small why={acts.why(`section:${section.id}`, refusal)} onRefused={acts.refused} onPress={() => setRenaming(true)} />
        <Btn label="Take away" kind="ghost" small why={acts.why(`section:${section.id}:off`, refusal)} onRefused={acts.refused} onPress={away} />
      </View>
      {section.tables.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {section.tables.map((tb) => (
            <Pressable key={tb.id} onPress={() => setTable(tb)} accessibilityRole="button" accessibilityLabel={`Table ${tb.label}, ${seatsShown(tb.seats)}`}
              android_ripple={{ color: c.grey200 }}
              style={({ pressed }) => ({ flexBasis: "47%", flexGrow: 1, minHeight: 56, borderRadius: 10, borderWidth: 1, borderColor: c.grey200,
                paddingHorizontal: 14, paddingVertical: 10, backgroundColor: pressed ? c.grey50 : c.white, overflow: "hidden" })}>
              <Text style={[t.label, ty.md, { color: c.ink900, ...face[600] }]}>{tb.label}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={[t.label, ty.sm, t.tab, { color: c.grey600 }]}>{seatsShown(tb.seats)}</Text>
                <ChevronRight size={16} color={c.grey400} />
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      <AddTables code={code} role={role} section={section} acts={acts} />
      {renaming ? (
        <NameSheet title={`Rename ${section.name}`} initial={section.name} onClose={() => setRenaming(false)}
          id={`section:${section.id}`} acts={acts} why={refusal}
          save={(n) => acts.run(`section:${section.id}`, "PATCH", P.section(code, section.id), { name: n },
            { done: "Section renamed", not: "Not saved", what: "renamed", where: "the sections" })} />
      ) : null}
      {table ? <TableSheet code={code} role={role} table={table} acts={acts} onClose={() => setTable(null)} /> : null}
    </Card>
  );
}

function AddTables({ code, role, section, acts }: { code: string; role: string | null; section: SetupSection; acts: Acts }) {
  const [f, setF] = useState<AddForm>({ mode: "one", label: "", prefix: "", from: "", to: "", seats: "" });
  const set = (patch: Partial<AddForm>) => setF((x) => ({ ...x, ...patch }));
  const id = `tables:${section.id}`;
  return (
    <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 14 }}>
      <Seg label="How many tables" value={f.mode} onPick={(mode) => set({ mode })}
        options={[{ value: "one", label: "One table" }, { value: "run", label: "A numbered run" }]} />
      {f.mode === "one" ? (
        <Field label="Table"><Input label="Table" value={f.label} onChange={(label) => set({ label })} placeholder="12" /></Field>
      ) : (
        <>
          <Field label="Starts with (optional)"><Input label="Starts with (optional)" value={f.prefix} onChange={(prefix) => set({ prefix })} placeholder="AC" caps /></Field>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="From"><Input label="From" value={f.from} onChange={(from) => set({ from })} keys="number" placeholder="1" /></Field></View>
            <View style={{ flex: 1 }}><Field label="To"><Input label="To" value={f.to} onChange={(to) => set({ to })} keys="number" placeholder="10" /></Field></View>
          </View>
        </>
      )}
      <Field label="Seats (optional)"><Input label="Seats (optional)" value={f.seats} onChange={(seats) => set({ seats })} keys="number" /></Field>
      <Btn label={f.mode === "one" ? "Add table" : "Add tables"} Icon={Plus} off={!addTablesReady(f)} busy={acts.busy === id}
        why={acts.why(id, whyNotSetup(role))} onRefused={acts.refused}
        onPress={async () => {
          const done = await acts.run(id, "POST", P.tables(code, section.id), addTablesBody(f),
            { done: addTablesDone(f), not: "Not saved", what: "added", where: section.name });
          if (done === "done") set({ label: "", from: "", to: "" });
        }} />
    </View>
  );
}

function TableSheet({ code, role, table, acts, onClose }: { code: string; role: string | null; table: SetupTable; acts: Acts; onClose: () => void }) {
  const [label, setLabel] = useState(table.label);
  const [seats, setSeats] = useState(table.seats === null ? "" : String(table.seats));
  const refusal = whyNotSetup(role);
  const act = async (done: Promise<string>) => { if ((await done) === "done") onClose(); };
  return (
    <Sheet open onClose={onClose} title={`Table ${table.label}`} about={tableAbout(table)}
      footer={<>
        <Btn label="Save" kind="primary" off={!label.trim()} busy={acts.busy === `table:${table.id}`}
          why={acts.why(`table:${table.id}`, refusal)} onRefused={acts.refused}
          onPress={() => void act(acts.run(`table:${table.id}`, "PATCH", P.table(code, table.id), { label, seats },
            { done: "Table saved", not: "Not saved", what: "saved", where: "the table" }))} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label="Take away" grow off={table.busy} busy={acts.busy === `table:${table.id}:off`}
            why={acts.why(`table:${table.id}:off`, refusal)} onRefused={acts.refused}
            onPress={() => void act(acts.run(`table:${table.id}:off`, "POST", P.tableOff(code, table.id), undefined,
              { done: `${table.label} taken away`, not: "Not saved", what: "taken away", where: "the tables" }))} />
          <Btn label="Cancel" grow onPress={onClose} />
        </View>
      </>}
    >
      <Field label="Table"><Input label="Table" value={label} onChange={setLabel} /></Field>
      <Field label="Seats" hint="Optional - left blank it shows a dash"><Input label="Seats" value={seats} onChange={setSeats} keys="number" /></Field>
      {acts.said && acts.said.tone !== "ok" ? <SaidBar said={acts.said} onDone={() => acts.setSaid(null)} /> : null}
    </Sheet>
  );
}

/* ── Table booking hours (D27-224) ─────────────────────────────────── */

function Hours({ code, role, acts }: { code: string; role: string | null; acts: Acts }) {
  const q = useRead(() => api<{ restaurants: TableHours[] }>(P.hours(code)), key(code, "hours"));
  return (
    <Part title="Table booking hours" about="When hotel guests may ask for a table from their own page. Somebody at the restaurant confirms each request.">
      {!q.data ? (q.error ? <ReadProblem error={new Error(q.error)} what="the table booking hours" onRetry={q.reload} /> : <Loading what="the table booking hours" />)
        : q.data.restaurants.map((r) => <HoursCard key={`${r.code}${r.lunch}${r.dinner}`} code={code} role={role} r={r} acts={acts} />)}
    </Part>
  );
}

function HoursCard({ code, role, r, acts }: { code: string; role: string | null; r: TableHours; acts: Acts }) {
  const [lunch, setLunch] = useState(r.lunch);
  const [dinner, setDinner] = useState(r.dinner);
  const id = `hours:${r.code}`;
  return (
    <Card style={{ gap: 12 }}>
      <Text style={[t.label, ty.md, { color: c.ink900 }]}>{r.name}</Text>
      <Field label="Lunch" hint="Such as 12:30-15:00. Empty: no lunch bookings."><Input label="Lunch" value={lunch} onChange={setLunch} /></Field>
      <Field label="Dinner" hint="Such as 19:30-23:00. Empty: no dinner bookings."><Input label="Dinner" value={dinner} onChange={setDinner} /></Field>
      <Text style={[t.label, ty.sm, { color: c.grey600 }]}>{slotsLine(r)}</Text>
      <Btn label="Save hours" busy={acts.busy === id} why={acts.why(id, whyNotHours(role))} onRefused={acts.refused}
        onPress={() => void acts.run(id, "PUT", P.hours(code), { outlet: r.code, lunch, dinner },
          { done: "Hours saved", doneBody: "Guests are offered these from now on.", not: "Not saved", what: "saved", where: "the table booking hours" })} />
    </Card>
  );
}

