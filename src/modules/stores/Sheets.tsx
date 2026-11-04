import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileText, Plus } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { LoadFailed, StatePill } from "../laundry/kit";
import {
  Back, Box, Btn, body, Empty, Field, InDialog, Input, Loading, NotYours, Pill, Segmented, Select, Stale, Toast, saidOf, type Said,
} from "../guest-services/kit";
import {
  approveRequest, askTheStore, isRefused, markBarClosed, readBarDrinks, readBarRequests, readBarSheet, readKitchenSheet,
  readModules, rejectRequest, saveBarCount, saveKitchenCount, undoBarClosed,
} from "./data";
import { GroupHead } from "./kit";
import { ON_THE_WEBSITE, whyNotSee, whyNotSeeBar } from "./roles";
import { dayText, rupees as rupeeOf } from "./shelf";
import {
  askBody, barBody, barDifference, barLead, barPlaceName, belowZero, countSaidWords, dayStep, figure, held, KITCHEN_COLUMNS,
  kitchenBody, kitchenDifference, morningText, moved, otherMoves, REQUEST_STATE, requestUnit, subOf, wholeWord,
  type BarSheet, type KitchenItem, type KitchenSheet, type Moment, type Place, type SheetDrink,
} from "./sheets";

/* ══════════════════════════════════════════════════════════════════
   INVENTORY (Bar | Restaurant), BAR STOCK and KITCHEN STOCK on a phone —
   the web's /h/:code/inventory (pages/Inventory.tsx), /pos/:code/bar-stock
   (BarStock.tsx) and /pos/:code/kitchen-stock (KitchenStock.tsx): one body,
   three doors, as on the web. Picture: pms-shots/new/n-h-inventory and
   n-pos-bar-stock (as the GM); n-pos-kitchen-stock is the GM's "not part of
   your role", so the kitchen's sheet is built from the code.

   THE FLOOR'S WORK: today's sheet and its count (closing, or the bar's
   morning count), the counter's asks of the store (ask, approve, reject),
   "the bar did not open today". THE DESK'S, on the website for now: the
   bar's Bills and Set up, the Recipes, which store is the kitchen's, the
   excise registers (FLR PDFs) and the Bar stock report.

   The web's table is wider than a phone; here each drink and each item is
   a card of its labelled figures, in the table's order. Every figure is
   the server's; the bar's "Amount, all drinks" is a browser sum and is not
   drawn (MST-1). A count line left blank is not counted (sheets.ts).
   ══════════════════════════════════════════════════════════════════ */

export type Door = "inventory" | "bar" | "kitchen";

export function Inventory({ hotel, role, door, tab: startTab, onBack }: {
  hotel: Hotel; role: string | null; door: Door; tab?: "bar" | "restaurant"; onBack: () => void;
}) {
  const code = hotel.code;
  const modules = useQuery({ queryKey: ["modules", code], staleTime: 5 * 60_000, queryFn: () => readModules(code) }).data;
  const barOn = modules?.["bar_stock"] !== false;
  const [tabPicked, setTab] = useState<"bar" | "restaurant">(startTab ?? "bar");
  const tab = door === "kitchen" ? "restaurant" : door === "bar" ? "bar" : !barOn ? "restaurant" : tabPicked;
  const [said, setSaid] = useState<Said | null>(null);
  const cache = useQueryClient();
  const [pulled, setPulled] = useState(false);
  const refresh = () => { setPulled(true); void cache.refetchQueries({ queryKey: ["stores", code], type: "active" }).finally(() => setPulled(false)); };

  const title = door === "inventory" ? "Inventory" : door === "bar" ? "Bar stock" : "Kitchen stock";
  const under = tab === "bar"
    ? "The bar's day: what came, what was sold, what is left, and the count."
    : "The kitchen's day: what came, what the KOTs used, what was wasted, what is left, and the count.";

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled} onRefresh={refresh}>
        <Head title={title} under={under} action={<Back onPress={onBack} />} />
        {tab === "bar" ? (
          <View style={{ gap: 4, marginTop: -4 }}>
            <View style={{ flexDirection: "row" }}><Btn label="Bar stock report" icon={FileText} disabled onPress={() => undefined} /></View>
            <Text style={[t.caption, { color: c.grey600 }]}>Bar stock report: {ON_THE_WEBSITE}</Text>
          </View>
        ) : null}
        {door === "inventory" ? (
          <View style={{ flexDirection: "row" }}>
            <Segmented<"bar" | "restaurant">
              label="Bar or Restaurant" value={tab} onChange={setTab}
              options={barOn ? [{ value: "bar", label: "Bar" }, { value: "restaurant", label: "Restaurant" }] : [{ value: "restaurant", label: "Restaurant" }]}
            />
          </View>
        ) : null}
        {tab === "bar" ? <BarBody code={code} role={role} onSaid={setSaid} /> : <KitchenBody code={code} role={role} onSaid={setSaid} />}
      </Screen>
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

/* ── Shared ─────────────────────────────────────────────────────── */

/** The web's Day date input, stepped (M-7): never after the business date. */
function DayStep({ date, max, onChange }: { date: string; max: string; onChange: (d: string) => void }) {
  const step = (n: number, label: string, Icon: typeof ChevronLeft, off: boolean) => (
    <Pressable
      onPress={() => onChange(dayStep(date, n))} disabled={off} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: off }}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.grey300, alignItems: "center", justifyContent: "center", backgroundColor: off ? c.grey50 : pressed ? c.grey100 : c.white })}
    >
      <Icon size={16} color={off ? c.grey400 : c.ink900} />
    </Pressable>
  );
  return (
    <View style={{ gap: 6 }}>
      <Text style={t.caption}>Day</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {step(-1, "The day before", ChevronLeft, false)}
        <Text style={[t.label, t.tab, { color: c.ink900, minWidth: 104, textAlign: "center" }]}>{dayText(date)}</Text>
        {step(1, "The day after", ChevronRight, date >= max)}
      </View>
    </View>
  );
}

/** A labelled figure in a card's row: the web table's one cell. */
function Cell({ label, value, red, strong }: { label: string; value: string; red?: boolean; strong?: boolean }) {
  return (
    <View style={{ minWidth: 76, gap: 1 }}>
      <Text style={{ fontSize: 12, lineHeight: 17, letterSpacing: 0.3, textTransform: "uppercase", color: c.grey500, ...face[600] }}>{label}</Text>
      <Text style={[t.label, t.tab, { color: red ? c.red700 : strong ? c.ink900 : c.grey700, ...face[red || strong ? 600 : 500] }]}>{value === "" ? " " : value}</Text>
    </View>
  );
}

function CountBox({ label, value, onChange, placeholder, width = 72 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; width?: number }) {
  return (
    <TextInput
      accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.grey400}
      keyboardType="decimal-pad" maxLength={10}
      style={{ width, minHeight: 44, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white, fontSize: 16, color: c.ink900, textAlign: "right", ...face[500], ...t.tab }}
    />
  );
}

const card = { backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 } as const;

/* ── The kitchen (KitchenStock.tsx) ─────────────────────────────── */

function KitchenBody({ code, role, onSaid }: { code: string; role: string | null; onSaid: (s: Said) => void }) {
  const [part, setPart] = useState<"sheet" | "recipes">("sheet");
  return (
    <>
      <View style={{ flexDirection: "row" }}>
        <Segmented<"sheet" | "recipes"> label="Today's sheet or Recipes" value={part} onChange={setPart}
          options={[{ value: "sheet", label: "Today's sheet" }, { value: "recipes", label: "Recipes" }]} />
      </View>
      {part === "sheet" ? <KitchenSheetCard code={code} role={role} onSaid={onSaid} /> : (
        <Box><Empty compact title="Recipes" description={`What one of each dish takes, and the dishes with none. ${ON_THE_WEBSITE}.`} /></Box>
      )}
    </>
  );
}

function KitchenSheetCard({ code, role, onSaid }: { code: string; role: string | null; onSaid: (s: Said) => void }) {
  const cache = useQueryClient();
  const refused = whyNotSee(role);
  const [date, setDate] = useState<string | undefined>(undefined);
  const q = useRead(() => (refused ? Promise.resolve(null) : readKitchenSheet(code, date)), ["stores", code, "kitchen-sheet", date ?? "today"]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);

  if (refused) return <NotYours title="Kitchen stock" sentence={refused} />;
  if (q.data === undefined) {
    return q.error
      ? <LoadFailed title="The kitchen's sheet did not load" error={q.error} onRetry={q.reload} offline="This device is offline, so the kitchen's sheet cannot load. It loads by itself as soon as the connection is back." />
      : <Loading words="Reading the kitchen's sheet…" />;
  }
  if (isRefused(q.data)) return <NotYours title="Kitchen stock" sentence={q.data.refused} />;
  const s = q.data as KitchenSheet;

  if (!s.store) {
    return (
      <View style={[card, { padding: space.cardX, gap: 6 }]}>
        <Text style={[body, { color: c.grey700 }]}>No store is marked as the kitchen's yet, so a KOT takes nothing.</Text>
        <Text style={[body, { color: c.grey600 }]}>{s.mayKeep ? `Marking the kitchen's store: ${ON_THE_WEBSITE}.` : "The GM or the Inventory Manager marks it here."}</Text>
      </View>
    );
  }

  const today = s.date === s.businessDate;
  const out = kitchenBody(s.items, draft);
  const typedN = "lines" in out ? out.lines.length : 0;

  async function save() {
    if (latch.current || !("lines" in out)) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      const res = await saveKitchenCount(code, out.lines);
      setDraft({});
      void cache.invalidateQueries({ queryKey: ["stores", code] });
      onSaid({ title: "The closing count is saved", body: countSaidWords(res), tone: "ok" });
    } catch (e) {
      setSaid(saidOf("Not saved", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.card }}>
      <View style={[card, { padding: space.cardX, gap: 12 }]}>
        <DayStep date={s.date} max={s.businessDate} onChange={(d) => { setDate(d === s.businessDate ? undefined : d); setDraft({}); }} />
        <Text style={[body, { color: c.grey600 }]}>{s.store.name}{s.mayKeep ? ` · Change: ${ON_THE_WEBSITE}` : ""}</Text>
        {s.mayCount ? (
          <View style={{ flexDirection: "row" }}>
            <Btn label={busy ? "Saving…" : `Save the closing count${typedN ? ` (${typedN})` : ""}`} variant="primary" disabled={busy || typedN === 0} onPress={() => void save()} />
          </View>
        ) : null}
        <Text style={[body, { color: c.grey600 }]}>
          {!today ? "An earlier day: the count is typed on today's sheet."
            : s.mayCount ? "The closing count: type each item you count, in its unit; a blank line is not counted. Below zero is red - a delivery or a count puts it right."
              : "Today. Below zero is red - a delivery or a count puts it right."}
        </Text>
        {"missing" in out && Object.values(draft).some((v) => v.trim() !== "") ? <Text style={[t.caption, { color: c.red700 }]}>{out.missing}</Text> : null}
        <InDialog said={said} />
        <Stale error={q.error} />
      </View>

      {s.items.length === 0 ? (
        <Box><Empty compact title={`Nothing in ${s.store.name} yet`} description="A delivery or a move into it, or an item in a recipe, shows here." /></Box>
      ) : (
        <View style={card}>
          {s.items.map((i, n) => <KitchenLine key={i.id} item={i} first={n === 0} mayCount={s.mayCount} value={draft[i.id]} onChange={(v) => setDraft((d) => ({ ...d, [i.id]: v }))} />)}
        </View>
      )}

      {s.wasted.length > 0 ? (
        <View style={[card, { padding: space.cardX, gap: 4 }]}>
          <Text style={[t.label, { color: c.ink900, ...face[600] }]}>Wastage on this day</Text>
          {s.wasted.map((w, n) => (
            <Text key={n} style={[body, { color: c.grey700 }]}>
              {w.item}: {figure(w.quantity)} {w.unit}{w.note ? ` - ${w.note}` : ""}{w.reference ? ` (${w.reference})` : ""}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function KitchenLine({ item: i, first, mayCount, value, onChange }: { item: KitchenItem; first: boolean; mayCount: boolean; value: string | undefined; onChange: (v: string) => void }) {
  const diff = kitchenDifference(i, mayCount ? value : undefined);
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <Text style={[t.label, { color: c.ink900 }]}>{i.name} <Text style={[t.caption]}>{i.unit}</Text></Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 8 }}>
        {KITCHEN_COLUMNS.map(([label, key, look]) => {
          const n = i[key] as number;
          return <Cell key={label} label={label} value={look === "moved" ? moved(n) : figure(n)} red={look !== "moved" && belowZero(n)} strong={look === "closing"} />;
        })}
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16 }}>
        {mayCount ? (
          <View style={{ gap: 4 }}>
            <Text style={t.caption}>Counted</Text>
            <CountBox label={`Counted, ${i.name}, ${i.unit}`} value={value ?? ""} onChange={onChange} width={96} />
          </View>
        ) : <Cell label="Counted" value={i.counted === null ? "-" : figure(i.counted)} />}
        <Cell label="Difference" value={diff.text} red={diff.off} />
      </View>
    </View>
  );
}

/* ── The bar (BarStock.tsx) ─────────────────────────────────────── */

type BarPart = "sheet" | "requests" | "bills" | "setup";

function BarBody({ code, role, onSaid }: { code: string; role: string | null; onSaid: (s: Said) => void }) {
  const [part, setPart] = useState<BarPart>("sheet");
  return (
    <>
      <View style={{ flexDirection: "row" }}>
        <Segmented<BarPart> label="The bar's parts" value={part} onChange={setPart}
          options={[{ value: "sheet", label: "Today's sheet" }, { value: "requests", label: "Requests" }, { value: "bills", label: "Bills" }, { value: "setup", label: "Set up" }]} />
      </View>
      {part === "sheet" ? <BarSheetCard code={code} role={role} onSaid={onSaid} onRequests={() => setPart("requests")} />
        : part === "requests" ? <Requests code={code} role={role} onSaid={onSaid} />
          : <Box><Empty compact title={part === "bills" ? "Bills" : "Set up"} description={`${part === "bills" ? "The bar's bills, recorded from the supplier's paper." : "The bar's drinks, how the sheet looks and what each dish takes."} ${ON_THE_WEBSITE}.`} /></Box>}
    </>
  );
}

type Draft = Record<string, { nip: string; ml: string }>;

function BarSheetCard({ code, role, onSaid, onRequests }: { code: string; role: string | null; onSaid: (s: Said) => void; onRequests: () => void }) {
  const cache = useQueryClient();
  const refused = whyNotSeeBar(role);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [place, setPlace] = useState<Place>("counter");
  const [moment, setMoment] = useState<Moment>("closing");
  const q = useRead(() => (refused ? Promise.resolve(null) : readBarSheet(code, place, date)), ["stores", code, "bar-sheet", date ?? "today", place]);
  const [draft, setDraft] = useState<Draft>({});
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);
  const [closing, setClosing] = useState<string | null>(null);

  if (refused) return <NotYours title="Bar stock" sentence={refused} />;
  if (q.data === undefined) {
    return q.error
      ? <LoadFailed title="The bar's sheet did not load" error={q.error} onRetry={q.reload} offline="This device is offline, so the bar's sheet cannot load. It loads by itself as soon as the connection is back." />
      : <Loading words="Reading the bar's sheet…" />;
  }
  if (isRefused(q.data)) return <NotYours title="Bar stock" sentence={q.data.refused} />;
  const s = q.data as BarSheet;
  if (!s.store) {
    return <View style={[card, { padding: space.cardX }]}><Text style={[body, { color: c.grey600 }]}>This hotel has no bar store marked. Mark it in Places and suppliers.</Text></View>;
  }
  const all = s.groups.flatMap((g) => g.drinks);
  const today = s.date === s.businessDate;
  const out = barBody(all, draft, s.place);
  const typedN = "lines" in out ? out.lines.length : 0;
  const anyTyped = Object.values(draft).some((x) => x.nip.trim() !== "" || x.ml.trim() !== "");

  /* One write at a time, latched at the tap (MEMORY 8). */
  async function once(title: string, act: () => Promise<Said>) {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      onSaid(await act());
      void cache.invalidateQueries({ queryKey: ["stores", code] });
    } catch (e) {
      setSaid(saidOf(title, e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }
  const save = () => {
    if (!("lines" in out)) return;
    void once("Not saved", async () => {
      const res = await saveBarCount(code, s.place, moment, out.lines);
      setDraft({});
      return { title: moment === "morning" ? "The morning count is saved" : "The closing count is saved", body: countSaidWords(res), tone: "ok" };
    });
  };
  const closeBar = () => void once("Not saved", async () => {
    await markBarClosed(code, closing ?? "");
    setClosing(null);
    return { title: "The bar is marked closed today", body: "The night audit will not wait for its count.", tone: "ok" };
  });
  const openBar = () => void once("Not changed", async () => {
    await undoBarClosed(code);
    return { title: "The bar is open today", body: "The night audit waits for its closing count again.", tone: "ok" };
  });

  return (
    <View style={{ gap: space.card }}>
      {s.closedToday ? (
        <View style={[card, { padding: space.cardX, gap: 8 }]}>
          <Pill tone="warning">Bar closed today</Pill>
          <Text style={[body, { color: c.grey700 }]}>{s.closedToday.reason}{s.closedToday.by ? ` - ${s.closedToday.by}` : ""}</Text>
          {s.mayCloseBar && today ? <View style={{ flexDirection: "row" }}><Btn label="The bar opened" disabled={busy} onPress={openBar} /></View> : null}
        </View>
      ) : null}
      {s.pendingRequests > 0 ? (
        <View style={[card, { padding: space.cardX, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 }]}>
          <Text style={[body, { color: c.ink900, flex: 1, minWidth: 180 }]}>
            {s.pendingRequests === 1 ? "One request from the counter waits" : `${s.pendingRequests} requests from the counter wait`} for the GM or the Inventory Manager.
          </Text>
          <Btn label="Open requests" onPress={onRequests} />
        </View>
      ) : null}

      <View style={[card, { padding: space.cardX, gap: 12 }]}>
        <DayStep date={s.date} max={s.businessDate} onChange={(d) => { setDate(d === s.businessDate ? undefined : d); setDraft({}); }} />
        {s.places.counter ? (
          <View style={{ flexDirection: "row" }}>
            <Segmented<Place> label="The counter or the store" value={s.place} onChange={(p) => { setPlace(p); setDraft({}); }}
              options={[{ value: "counter", label: s.places.counter.name }, { value: "store", label: s.places.store?.name ?? "Bar store" }]} />
          </View>
        ) : null}
        {s.mayCount ? (
          <View style={{ flexDirection: "row" }}>
            <Segmented<Moment> label="Closing or morning count" value={moment} onChange={(m) => { setMoment(m); setDraft({}); }}
              options={[{ value: "closing", label: "Closing count" }, { value: "morning", label: "Morning count" }]} />
          </View>
        ) : null}
        {s.mayApprove ? (
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Btn label="FLR-1A/2A/3A" icon={FileText} disabled onPress={() => undefined} />
              <Btn label="FLR-3" icon={FileText} disabled onPress={() => undefined} />
            </View>
            <Text style={[t.caption, { color: c.grey600 }]}>The excise registers: {ON_THE_WEBSITE}</Text>
          </View>
        ) : null}
        {s.mayCount ? (
          <View style={{ flexDirection: "row" }}>
            <Btn label={busy ? "Saving…" : `Save the ${moment === "morning" ? "morning" : "closing"} count${typedN ? ` (${typedN})` : ""}`} variant="primary" disabled={busy || typedN === 0} onPress={save} />
          </View>
        ) : null}
        <Text style={[body, { color: c.grey600 }]}>{barLead(s, moment)}</Text>
        {"missing" in out && anyTyped ? <Text style={[t.caption, { color: c.red700 }]}>{out.missing}</Text> : null}
        {s.mayCloseBar && today && !s.closedToday ? (
          closing === null ? (
            <Pressable onPress={() => setClosing("")} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
              <Text style={[t.label, { color: c.ink900, textDecorationLine: "underline" }]}>The bar did not open today</Text>
            </Pressable>
          ) : (
            <View style={{ gap: 8 }}>
              <Field label="Why the bar did not open">
                <Input label="Why the bar did not open" placeholder="Dry day" value={closing} onChangeText={setClosing} maxLength={300} />
              </Field>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Btn label="Mark the bar closed today" variant="primary" disabled={busy || !closing.trim()} onPress={closeBar} />
                <Btn label="Cancel" variant="ghost" onPress={() => setClosing(null)} />
              </View>
            </View>
          )
        ) : null}
        <InDialog said={said} />
        <Stale error={q.error} />
      </View>

      {all.length === 0 ? (
        <Box><Empty compact title={`Nothing in the ${barPlaceName(s)}`} description={s.place === "store" ? "A bar bill recorded puts its drinks here." : "A request approved moves drinks here from the store."} /></Box>
      ) : s.groups.map((g) => (
        <View key={g.section} style={{ gap: 8 }}>
          <GroupHead title={g.section} />
          <View style={card}>
            {g.drinks.map((d, n) => (
              <DrinkLine key={d.id} d={d} s={s} first={n === 0} x={draft[d.id]}
                onChange={(patch) => setDraft((all) => ({ ...all, [d.id]: { ...(all[d.id] ?? { nip: "", ml: "" }), ...patch } }))} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function DrinkLine({ d, s, first, x, onChange }: {
  d: SheetDrink; s: BarSheet; first: boolean; x: { nip: string; ml: string } | undefined; onChange: (p: Partial<{ nip: string; ml: string }>) => void;
}) {
  const store = s.place === "store";
  const sub = subOf(d, s.place);
  const diff = barDifference(d, x, s);
  const morning = morningText(d, s.place);
  const paper = !store && s.format === "paper";
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <Text style={[t.label, { color: c.ink900 }]}>{d.name}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 8 }}>
        <Cell label="Opening" value={held(d.opening, d, s.place)} />
        <Cell label={store ? "Received" : "From the store"} value={held(d.received, d, s.place)} />
        <Cell label={store ? "To the counter" : "Sold"} value={held(store ? d.moved : d.sold, d, s.place)} />
        <Cell label="Other moves" value={held(otherMoves(d, s.place), d, s.place)} />
        <Cell label="Closing" value={held(d.closing, d, s.place)} strong />
      </View>
      {paper ? (
        <Text style={[t.caption, t.tab]}>
          {`Sold: NIP ${d.sell.nip} · 30 ml ${d.sell.p30} · 60 ml ${d.sell.p60} · 90 ml ${d.sell.p90} · ${d.sell.ml} ml`
            + ` · rate ${d.rate === null ? "-" : rupeeOf(d.rate)} · amount ${d.amount === null ? "-" : rupeeOf(d.amount)}`}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 16 }}>
        {s.mayCount ? (
          <View style={{ gap: 4 }}>
            <Text style={t.caption}>Counted</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <CountBox label={`Counted, ${d.name}, ${wholeWord(d)}`} value={x?.nip ?? ""} onChange={(v) => onChange({ nip: v })} />
              {sub ? <CountBox label={`Counted, ${d.name}, ${sub.label} in the open one`} value={x?.ml ?? ""} onChange={(v) => onChange({ ml: v })} placeholder={sub.label} /> : null}
            </View>
          </View>
        ) : <Cell label="Counted" value={d.counted === null ? "-" : held(d.counted, d, s.place)} />}
        <Cell label="Difference" value={diff.text} red={diff.off} />
        <Cell label="Morning" value={morning.text} red={morning.off} />
      </View>
    </View>
  );
}


/* ── The counter asks the store (BarStock.tsx Requests, D27-361) ── */

function Requests({ code, role, onSaid }: { code: string; role: string | null; onSaid: (s: Said) => void }) {
  const cache = useQueryClient();
  const refused = whyNotSeeBar(role);
  const q = useRead(() => (refused ? Promise.resolve(null) : readBarRequests(code)), ["stores", code, "bar-requests"]);
  const drinks = useRead(() => (refused ? Promise.resolve(null) : readBarDrinks(code)), ["stores", code, "bar-drinks"]);
  const [lines, setLines] = useState<{ itemId: string; qty: string }[]>([{ itemId: "", qty: "" }]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const latch = useRef(false);
  const [rejecting, setRejecting] = useState<{ id: string; note: string } | null>(null);
  const [said, setSaid] = useState<Said | null>(null);

  if (refused) return <NotYours title="Requests" sentence={refused} />;
  if (q.data === undefined || drinks.data === undefined) {
    const error = q.error ?? drinks.error;
    return error
      ? <LoadFailed title="The requests did not load" error={error} onRetry={() => { q.reload(); drinks.reload(); }} offline="This device is offline, so the requests cannot load. They load by themselves as soon as the connection is back." />
      : <Loading words="Reading the requests…" />;
  }
  if (isRefused(q.data)) return <NotYours title="Requests" sentence={q.data.refused} />;
  if (isRefused(drinks.data)) return <NotYours title="Requests" sentence={drinks.data.refused} />;
  const { mayAsk, mayApprove, requests } = q.data!;
  const list = drinks.data!.drinks;
  const whole = (n: number) => String(Math.round(n * 1000) / 1000);
  const setLine = (i: number, patch: Partial<{ itemId: string; qty: string }>) => setLines((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function once(key: string, title: string, act: () => Promise<Said>) {
    if (latch.current) return;
    latch.current = true;
    setBusy(key);
    setSaid(null);
    try {
      onSaid(await act());
      void cache.invalidateQueries({ queryKey: ["stores", code] });
    } catch (e) {
      setSaid(saidOf(title, e));
    } finally {
      latch.current = false;
      setBusy(null);
    }
  }
  const asked = askBody(lines, note);
  const ask = () => {
    if (!("body" in asked)) { setSaid({ title: "Not sent", body: asked.missing, tone: "bad" }); return; }
    void once("ask", "Not sent", async () => {
      await askTheStore(code, asked.body);
      setLines([{ itemId: "", qty: "" }]); setNote("");
      return { title: "Sent to the store", body: "The GM or the Inventory Manager approves it, and it moves to the counter.", tone: "ok" };
    });
  };

  return (
    <View style={{ gap: space.card }}>
      <InDialog said={said} />
      {mayAsk ? (
        <View style={[card, { padding: space.cardX, gap: 12 }]}>
          <View style={{ gap: 2 }}>
            <Text style={t.heading}>Ask the store</Text>
            <Text style={[body, { color: c.grey600 }]}>Whole NIPs, bottles or packets. The GM or the Inventory Manager approves, and they move to the counter.</Text>
          </View>
          {lines.map((l, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Select<string> label={`Drink, line ${i + 1}`} value={l.itemId} onChange={(v) => setLine(i, { itemId: v })}
                  options={[{ value: "", label: "Pick a drink" }, ...list.map((d) => ({ value: d.id, label: `${d.name}${d.onHand !== null ? ` - the store has ${whole(d.onHand)}` : ""}` }))]} />
              </View>
              <View style={{ width: 96 }}>
                <Input label={`How many, line ${i + 1}`} placeholder="How many" keyboardType="numbers-and-punctuation" value={l.qty} onChangeText={(v) => setLine(i, { qty: v })} maxLength={5} />
              </View>
            </View>
          ))}
          <View style={{ flexDirection: "row" }}><Btn label="Another drink" icon={Plus} onPress={() => setLines((all) => [...all, { itemId: "", qty: "" }])} /></View>
          <Field label="Note (optional)">
            <Input label="Note (optional)" placeholder="For tonight's party" value={note} onChangeText={setNote} maxLength={300} />
          </Field>
          <View style={{ flexDirection: "row" }}><Btn label={busy === "ask" ? "Sending…" : "Ask the store"} variant="primary" disabled={busy !== null} onPress={ask} /></View>
        </View>
      ) : null}

      {requests.length === 0 ? (
        <Box><Empty compact title="No requests yet" description="The counter's requests of the store show here, waiting first." /></Box>
      ) : requests.map((r) => {
        const state = REQUEST_STATE[r.status];
        return (
          <View key={r.id} style={[card, { padding: space.cardX, gap: 8 }]}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              {state.tone === "danger" ? <StatePill tone="danger">{state.words}</StatePill> : <Pill tone={state.tone}>{state.words}</Pill>}
              <Text style={[body, { color: c.grey600 }]}>{r.requestedBy ?? "Somebody"} · {r.requestedAt}</Text>
              {r.decidedBy ? <Text style={[body, { color: c.grey600 }]}>· {r.status === "approved" ? "approved" : "rejected"} by {r.decidedBy}, {r.decidedAt}</Text> : null}
            </View>
            {r.lines.map((l) => (
              <Text key={l.itemId} style={[t.label, { fontSize: 16, color: c.ink900 }]}>
                <Text style={[t.tab, face[500]]}>{whole(l.quantity)}</Text> {requestUnit(l.countAs)} of {l.name}
                {r.status === "pending" && l.inStore !== null
                  ? <Text style={[t.label, { color: l.inStore < l.quantity ? c.red700 : c.grey500 }]}> (the store has {whole(l.inStore)})</Text> : null}
              </Text>
            ))}
            {r.note ? <Text style={[body, { color: c.grey600 }]}>Note: {r.note}</Text> : null}
            {r.decisionNote ? <Text style={[body, { color: c.red700 }]}>Why: {r.decisionNote}</Text> : null}
            {r.status === "pending" && mayApprove ? (r.mine ? (
              <Text style={[body, { color: c.grey600 }]}>Your own request: somebody else approves it.</Text>
            ) : rejecting?.id === r.id ? (
              <View style={{ gap: 8 }}>
                <Field label="Why it is rejected">
                  <Input label="Why it is rejected" value={rejecting.note} onChangeText={(v) => setRejecting({ id: r.id, note: v })} maxLength={300} />
                </Field>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Btn label={busy === r.id ? "Rejecting…" : "Reject"} variant="danger" disabled={busy !== null || !rejecting.note.trim()}
                    onPress={() => void once(r.id, "Not rejected", async () => {
                      await rejectRequest(code, r.id, rejecting.note);
                      setRejecting(null);
                      return { title: "Rejected", body: "The counter sees why.", tone: "ok" };
                    })} />
                  <Btn label="Cancel" variant="ghost" onPress={() => setRejecting(null)} />
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Btn label={busy === r.id ? "Moving…" : "Approve and move"} variant="primary" disabled={busy !== null}
                  onPress={() => void once(r.id, "Not approved", async () => {
                    await approveRequest(code, r.id);
                    return { title: "Approved", body: "The drinks moved from the store to the counter.", tone: "ok" };
                  })} />
                <Btn label="Reject" disabled={busy !== null} onPress={() => setRejecting({ id: r.id, note: "" })} />
              </View>
            )) : null}
          </View>
        );
      })}
    </View>
  );
}

