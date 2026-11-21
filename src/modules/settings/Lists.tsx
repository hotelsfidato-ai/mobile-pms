import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { DateField } from "../../core/DateField";
import { useSession } from "../../core/session";
import { c, space, t } from "../../core/theme";
import { notKnown, ripple, s as core, shade, useRead } from "../../core/ui";
import { Btn, Empty, Failed, Field, Loading, Segmented, Sheet, Stale, body, confirm, saidOf, useSaid, type Said } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import {
  HOLIDAY_COLOUR, ID_TYPES, LIST_PAGES, STATES, UNKNOWN_LINE, emptyWords, pageName, mayAddHoliday, mayMove, nextOff,
  shownRows, swapSorts, typedColour, type DeskRules, type ListItem, type ListPane, type ListSource,
} from "./listsRules";
import {
  addHoliday, addToList, changeListItem, readDeskRules, readHolidays, readList, removeHoliday, removeListItem, saveDeskSettings,
} from "./listsData";
import { ColourField, IconBtn, Page, Swatch, Why, usePageWrite, whyNotChange } from "./listsKit";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS › LISTS on a phone (lane m13-set-lists) — the web's six pages
   (src/modules/front-desk/settings/ListPages.tsx, desk.settings.ts):

   - Market segments, Ready reasons (four tabs), VIP levels: ONE list
     screen, driven by the table of kinds (lists.ts LIST_PAGES), the web's
     ListEditor - search, add, move up or down, On/Off, rename (and a VIP
     level's colour), delete (the server refuses one in use: "switch it
     Off instead");
   - Holidays: a day picked with the phone's own date picker (DateField,
     M-16; sent as the web's YYYY-MM-DD), a name, a colour; deleted one at
     a time;
   - ID types: one switch each (saved as the desk's settings, idTypesOff);
   - Reservation types: each booking state's colour on the Calendar, and
     back to the built-in colours.

   On a phone (docs/NATIVE.md): a row's name opens a sheet to rename it
   (and delete it, asked first with the phone's own dialog - the web
   deletes at one tap); moving is two 44 px arrows on the row; On/Off is
   each phone's own Switch; colours are typed (no colour box), each with
   its square. Who: the console's guard (owner, admin, GM), and every
   write SETUP_CHANGE (the same three), drawn grey with the API's sentence
   for anyone else. Refused offline with the web's sentence (send()).
   Not pictured (no picture of these pages).
   ══════════════════════════════════════════════════════════════════ */

const ADDRESS = (slug: string) => `/settings/lists/${slug}`;
const sourceKey = (code: string, source: ListSource) => ["settings", "vip" in source ? "group" : code, "list", "vip" in source ? "vip" : source.kind];
/** The list's name in the core's stop book: by hotel and kind, the VIP levels by the group. */
const nameOf = (code: string, source: ListSource) => pageName(code, "vip" in source ? "vip" : source.kind);

/** What a control shows after its write landed, until the read comes back: the cached answer, changed. */
function shown<T>(cache: QueryClient, key: readonly unknown[], change: (old: T) => T) {
  cache.setQueryData<T>(key, (old) => (old === undefined ? old : change(old)));
}

/* ── Market segments, Ready reasons, VIP levels ───────────────────── */

export function ListScreen({ hotel, role, slug }: AdminProps & { slug: keyof typeof LIST_PAGES }) {
  const page = LIST_PAGES[slug];
  const [tab, setTab] = useState(page.panes[0]!.tab ?? "");
  const pane = (page.panes.find((p) => p.tab === tab) ?? page.panes[0]!).pane;
  const { said, say, close } = useSaid();
  const [pulled, setPulled] = useState(false);
  const name = nameOf(hotel.code, pane.source);
  const w = usePageWrite([name]);
  const read = useRead(w.watch(name, () => readList(hotel.code, pane.source)), sourceKey(hotel.code, pane.source));
  return (
    <Page role={role} address={ADDRESS(slug)} title={page.title} eyebrow={hotel.name} explain={page.explain}
      refreshing={pulled && read.loading} onRefresh={() => { setPulled(true); read.reload(); }} said={said} onSaidClose={close}>
      {page.panes.length > 1 ? (
        <Segmented label={page.title} value={tab} onChange={setTab} options={page.panes.map((p) => ({ value: p.tab!, label: p.tab! }))} />
      ) : null}
      {pane.why ? <Text style={[body, { color: c.grey600 }]}>{pane.why}</Text> : null}
      <ListEditor key={name} name={name} w={w} code={hotel.code} role={role} pane={pane} read={read} say={say} />
    </Page>
  );
}

/** The three list pages, by the table of kinds (thin routes: app/settings/[code]/<slug>.tsx). */
export const MarketSegments = (p: AdminProps) => <ListScreen {...p} slug="market-segments" />;
export const Reasons = (p: AdminProps) => <ListScreen {...p} slug="reasons" />;
export const VipLevels = (p: AdminProps) => <ListScreen {...p} slug="vip" />;

type Read<T> = { data: T | undefined; error: string | undefined; loading: boolean; reload: () => void };
type Writer = ReturnType<typeof usePageWrite>;

function ListEditor({ name: key, w, code, role, pane, read, say }: {
  name: string; w: Writer; code: string; role: AdminProps["role"]; pane: ListPane; read: Read<ListItem[]>; say: (s: Said) => void;
}) {
  const cache = useQueryClient();
  const refusal = whyNotChange(role);
  const [find, setFind] = useState("");
  const [adding, setAdding] = useState("");
  const [editing, setEditing] = useState<ListItem | null>(null);
  const refresh = () => void cache.invalidateQueries({ queryKey: sourceKey(code, pane.source) });
  const unknown = (e: unknown) => { say({ ...notKnown("saved", "this list", e), tone: "bad" }); refresh(); };
  const all = read.data ?? [];
  const rows = shownRows(all, find);
  const off = w.blocked || refusal !== null;

  const add = () => {
    const label = adding.trim();
    if (!label) return;
    void w.run(key, () => addToList(code, pane.source, { label }), {
      ok: () => { setAdding(""); refresh(); },
      no: (e) => say(saidOf(e, "Not added")),
      unknown,
    });
  };
  const swap = (i: number, j: number) => {
    const a = all[i], b = all[j];
    if (!a || !b) return;
    void w.run(key, async () => {
      for (const x of swapSorts(a, b, j < i)) await changeListItem(code, pane.source, x.id, { sort: x.sort });
    }, { ok: refresh, no: (e) => { say(saidOf(e, "Not moved")); refresh(); }, unknown });
  };
  /* The switch shows what was sent until the list is read again (grey meanwhile). */
  const flip = (r: ListItem, active: boolean) => void w.run(key, () => changeListItem(code, pane.source, r.id, { active }), {
    ok: () => { shown(cache, sourceKey(code, pane.source), (l: ListItem[]) => l.map((x) => (x.id === r.id ? { ...x, active } : x))); refresh(); },
    no: (e) => say(saidOf(e, "Not changed")), unknown,
  });

  if (read.data === undefined) return read.error ? <Failed error={read.error} onRetry={read.reload} /> : <Loading what={`the ${pane.noun}s`} />;
  return (
    <>
      <Stale error={read.error} />
      <View style={[core.card, { paddingHorizontal: 0, paddingVertical: 0 }]}>
        <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderColor: c.grey200 }}>
          <Field label="Search" value={find} onChangeText={setFind} placeholder="Search" input={{ accessibilityLabel: `Search ${pane.noun}s`, autoCorrect: false }} />
          <Field label={`New ${pane.noun}`} value={adding} onChangeText={setAdding} editable={!off}
            input={{ returnKeyType: "done", onSubmitEditing: add }}
            right={<Btn label="Add" a11y={`Add ${pane.noun}`} variant="primary" disabled={off || !adding.trim()} onPress={add} icon={<Plus size={16} color={off || !adding.trim() ? c.grey500 : c.white} />} />} />
          <Why text={refusal} />
          <Why text={w.unknown ? UNKNOWN_LINE : null} tone="red" />
        </View>
        {rows.length === 0 ? (
          <Text style={[body, { color: c.grey500, padding: space.cardX }]}>{emptyWords(all.length, pane.noun)}</Text>
        ) : rows.map((r, n) => {
          const i = all.findIndex((x) => x.id === r.id);
          return (
            <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 56, paddingLeft: space.cardX, paddingRight: 8, borderTopWidth: n === 0 ? 0 : 1, borderColor: c.grey100 }}>
              {pane.withColour ? <Swatch colour={r.colour} /> : null}
              <Pressable
                onPress={() => setEditing(r)} accessibilityRole="button" accessibilityLabel={`Rename ${r.label}`} android_ripple={ripple}
                style={shade(({ pressed }) => ({ flex: 1, minHeight: 44, justifyContent: "center", paddingHorizontal: 4, borderRadius: 8, backgroundColor: pressed ? c.grey50 : "transparent" }))}
              >
                <Text style={[t.label, { fontSize: 16, color: r.active ? c.ink900 : c.grey500, textDecorationLine: r.active ? "none" : "line-through" }]} numberOfLines={2}>{r.label}</Text>
              </Pressable>
              <IconBtn icon={<ArrowUp size={16} color={c.grey600} />} label={`Move ${r.label} up`} disabled={off || !mayMove(i, all.length, find, true)} onPress={() => swap(i, i - 1)} />
              <IconBtn icon={<ArrowDown size={16} color={c.grey600} />} label={`Move ${r.label} down`} disabled={off || !mayMove(i, all.length, find, false)} onPress={() => swap(i, i + 1)} />
              <Switch value={r.active} onValueChange={(v) => flip(r, v)} disabled={off} accessibilityLabel={`${r.label} on`}
                trackColor={{ false: c.grey300, true: c.orange }} thumbColor={c.white} ios_backgroundColor={c.grey300} />
            </View>
          );
        })}
      </View>
      {editing ? (
        <RowSheet key={editing.id} item={editing} pane={pane} busy={w.busy} off={off}
          onClose={() => setEditing(null)}
          onSave={(change, fail) => void w.run(key, () => changeListItem(code, pane.source, editing.id, change), {
            ok: () => { setEditing(null); refresh(); }, no: (e) => fail(saidOf(e, "Not renamed")), unknown: (e) => { setEditing(null); unknown(e); },
          })}
          onDelete={(fail) => void confirm(`Delete ${editing.label}?`, `It goes from the list. One in use cannot be deleted: switch it Off instead.`, "Delete")
            .then(() => w.run(key, () => removeListItem(code, pane.source, editing.id), {
              ok: () => { setEditing(null); refresh(); }, no: (e) => fail(saidOf(e, "Not deleted")), unknown: (e) => { setEditing(null); unknown(e); },
            }))} />
      ) : null}
    </>
  );
}

/** A row's sheet: its name (and a VIP level's colour), saved together; and Delete. */
function RowSheet({ item, pane, busy, off, onClose, onSave, onDelete }: {
  item: ListItem; pane: ListPane; busy: boolean; off: boolean; onClose: () => void;
  onSave: (change: Partial<Omit<ListItem, "id">>, fail: (s: Said) => void) => void; onDelete: (fail: (s: Said) => void) => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [colour, setColour] = useState(item.colour ?? "");
  const [said, setSaid] = useState<Said | null>(null);
  const typed = colour.trim() ? typedColour(colour) : null;
  const change: Partial<Omit<ListItem, "id">> = {
    ...(label.trim() !== item.label ? { label: label.trim() } : {}),
    ...(pane.withColour && colour.trim() && typed && typed !== item.colour ? { colour: typed } : {}),
  };
  const can = !off && Boolean(label.trim()) && (!pane.withColour || !colour.trim() || typed !== null) && Object.keys(change).length > 0;
  return (
    <Sheet open title={item.label} description={`Rename this ${pane.noun}${pane.withColour ? ", or change its colour" : ""}.`} onClose={onClose} closable={!busy}
      footer={<>
        <Btn label="Cancel" onPress={onClose} disabled={busy} grow />
        <Btn label={busy ? "Saving…" : "Save"} variant="primary" disabled={!can || busy} grow onPress={() => { setSaid(null); onSave(change, setSaid); }} />
      </>}>
      <Field label="Name" value={label} onChangeText={setLabel} editable={!off} input={{ accessibilityLabel: `Rename ${item.label}` }} />
      {pane.withColour ? <ColourField label={`Colour of ${item.label}`} value={colour} onChangeText={setColour} editable={!off} /> : null}
      {said ? <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">{said.title}{said.body ? `: ${said.body}` : ""}</Text> : null}
      <View style={{ alignItems: "flex-start", paddingTop: 4 }}>
        <Btn label="Delete" a11y={`Delete ${item.label}`} variant="danger" disabled={off || busy} onPress={() => { setSaid(null); onDelete(setSaid); }}
          icon={<Trash2 size={16} color={off || busy ? c.grey500 : c.white} />} />
      </View>
    </Sheet>
  );
}

/* ── Holidays ─────────────────────────────────────────────────────── */

export function HolidaysScreen({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  const session = useSession();
  const { said, say, close } = useSaid();
  const [pulled, setPulled] = useState(false);
  const queryKey = ["settings", code, "holidays"];
  const key = pageName(code, "holidays");
  const w = usePageWrite([key]);
  const read = useRead(w.watch(key, () => readHolidays(code)), queryKey);
  const refusal = whyNotChange(role);
  const off = w.blocked || refusal !== null;
  const [day, setDay] = useState("");
  const [name, setName] = useState("");
  const [colour, setColour] = useState(HOLIDAY_COLOUR);
  /* The web's refreshHotels: the Calendar and Rates read the holidays from the hotel list. */
  const after = () => { void cache.invalidateQueries({ queryKey }); void session.refresh(); };
  const unknown = (e: unknown) => { say({ ...notKnown("saved", "the holidays", e), tone: "bad" }); after(); };
  const typed = typedColour(colour);
  const add = () => {
    if (off || !mayAddHoliday(day, name) || !typed) return;
    void w.run(key, () => addHoliday(code, { day: day.trim(), name: name.trim(), colour: typed }), {
      ok: () => { setDay(""); setName(""); after(); }, no: (e) => say(saidOf(e, "Not added")), unknown,
    });
  };
  const list = read.data ?? [];
  return (
    <Page role={role} address={ADDRESS("holidays")} title="Holidays" eyebrow={hotel.name}
      explain="Days the Calendar and Rates shade like a weekend, with the holiday's name on the Calendar. No price reads them."
      refreshing={pulled && read.loading} onRefresh={() => { setPulled(true); read.reload(); }} said={said} onSaidClose={close}>
      <View style={[core.card, { gap: 12 }]}>
        <DateField label="Day" value={day} onChange={setDay} hotel={hotel} disabled={off} />
        <Field label="Name" value={name} onChangeText={setName} editable={!off} placeholder="Diwali" />
        <ColourField label="Colour" value={colour} onChangeText={setColour} editable={!off} />
        <Btn label={w.busy ? "Adding…" : "Add"} variant="primary" disabled={off || !mayAddHoliday(day, name) || !typed} onPress={add} />
        <Why text={refusal} />
        <Why text={w.unknown ? UNKNOWN_LINE : null} tone="red" />
      </View>
      {read.data === undefined ? (read.error ? <Failed error={read.error} onRetry={read.reload} /> : <Loading what="the holidays" />) : (
        <>
          <Stale error={read.error} />
          {list.length === 0 ? <Empty title="No holidays yet." /> : (
            <View style={[core.card, { paddingVertical: 0, paddingHorizontal: 0 }]}>
              {list.map((h, n) => (
                <View key={h.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingLeft: space.cardX, paddingRight: 8, borderTopWidth: n === 0 ? 0 : 1, borderColor: c.grey100 }}>
                  <Swatch colour={h.colour} />
                  <Text style={[t.label, t.tab, { width: 96 }]}>{h.day}</Text>
                  <Text style={[t.label, { flex: 1, fontSize: 16, color: c.ink900 }]} numberOfLines={2}>{h.name}</Text>
                  <IconBtn icon={<Trash2 size={16} color={c.grey500} />} label={`Delete ${h.name}`} disabled={off}
                    onPress={() => void confirm(`Delete ${h.name}?`, `${h.day} is no longer shaded on the Calendar and Rates.`, "Delete")
                      .then(() => w.run(key, () => removeHoliday(code, h.id), { ok: after, no: (e) => say(saidOf(e, "Not deleted")), unknown }))} />
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </Page>
  );
}

/* ── ID types and Reservation types: the desk's settings ──────────── */

export const RULES_KEY = (code: string) => ["settings", code, "desk-rules"];

export function IdTypesScreen({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const desk = useDesk(code);
  const refusal = whyNotChange(role);
  const off = desk.w.blocked || refusal !== null;
  const rules = desk.read.data;
  const offList = rules?.idTypesOff ?? [];
  const set = (type: string, on: boolean) => {
    const change = { idTypesOff: nextOff(offList, type, on) };
    void desk.w.run(desk.key, () => saveDeskSettings(code, change), { ok: () => desk.after(change), no: (e) => desk.say(saidOf(e, "Not changed")), unknown: desk.unknown });
  };
  return (
    <Page role={role} address={ADDRESS("id-types")} title="ID types" eyebrow={hotel.name}
      explain="The documents this hotel takes. One switched Off leaves the check-in, New booking and the guest's online form; a document already recorded stays as it was."
      refreshing={desk.refreshing} onRefresh={desk.pull} said={desk.said} onSaidClose={desk.close}>
      {desk.read.data === undefined ? (desk.read.error ? <Failed error={desk.read.error} onRetry={desk.read.reload} /> : <Loading what="the ID types" />) : (
        <>
          <Stale error={desk.read.error} />
          <View style={[core.card, { paddingVertical: 4 }]}>
            {ID_TYPES.map(([v, l], n) => (
              <View key={v} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderTopWidth: n === 0 ? 0 : 1, borderColor: c.grey100 }}>
                <Text style={[t.label, { flex: 1, fontSize: 16, color: c.ink900 }]}>{l}</Text>
                <Switch value={!offList.includes(v)} onValueChange={(on) => set(v, on)} disabled={off} accessibilityLabel={`${l} on`}
                  trackColor={{ false: c.grey300, true: c.orange }} thumbColor={c.white} ios_backgroundColor={c.grey300} />
              </View>
            ))}
          </View>
          <Why text={refusal} />
          <Why text={desk.w.unknown ? UNKNOWN_LINE : null} tone="red" />
        </>
      )}
    </Page>
  );
}

export function ReservationTypesScreen({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const desk = useDesk(code);
  const refusal = whyNotChange(role);
  const off = desk.w.blocked || refusal !== null;
  const colours = desk.read.data?.statusColours ?? {};
  const [editing, setEditing] = useState<{ k: string; label: string; built: string } | null>(null);
  const save = (next: Record<string, string> | null, done?: () => void, fail?: (s: Said) => void) =>
    void desk.w.run(desk.key, () => saveDeskSettings(code, { statusColours: next }), {
      ok: () => { done?.(); desk.after({ statusColours: next }); },
      no: (e) => (fail ?? desk.say)(saidOf(e, "Not changed")),
      unknown: (e) => { done?.(); desk.unknown(e); },
    });
  const back = () => void confirm("Back to the built-in colours?", "Every booking state takes its built-in colour on the Calendar again.", "Back to the built-in colours")
    .then(() => save(null));
  return (
    <Page role={role} address={ADDRESS("reservation-types")} title="Reservation types" eyebrow={hotel.name}
      explain="The colour of each kind of booking on the Calendar. These are the states a booking can be in today; more kinds of hold would change how bookings work, and are for later."
      refreshing={desk.refreshing} onRefresh={desk.pull} said={desk.said} onSaidClose={desk.close}>
      {desk.read.data === undefined ? (desk.read.error ? <Failed error={desk.read.error} onRetry={desk.read.reload} /> : <Loading what="the booking colours" />) : (
        <>
          <Stale error={desk.read.error} />
          <View style={[core.card, { paddingVertical: 0, paddingHorizontal: 0 }]}>
            {STATES.map(([k, l, built], n) => (
              <Pressable
                key={k} onPress={() => setEditing({ k, label: l, built })} disabled={off} accessibilityRole="button"
                accessibilityLabel={`Colour of ${l}: ${colours[k] ?? built}`} accessibilityState={{ disabled: off }} android_ripple={ripple}
                style={shade(({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: space.cardX, borderTopWidth: n === 0 ? 0 : 1, borderColor: c.grey100, backgroundColor: pressed ? c.grey50 : "transparent" }))}
              >
                <Swatch colour={colours[k] ?? built} size={28} />
                <Text style={[t.label, { flex: 1, fontSize: 16, color: c.ink900 }]}>{l}</Text>
                <Text style={t.caption}>{colours[k] ? "Chosen" : "Built in"}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ alignItems: "flex-start" }}>
            <Btn label="Back to the built-in colours" onPress={back} disabled={off} />
          </View>
          <Why text={refusal} />
          <Why text={desk.w.unknown ? UNKNOWN_LINE : null} tone="red" />
        </>
      )}
      {editing ? (
        <StateColourSheet key={editing.k} label={editing.label} start={colours[editing.k] ?? editing.built} busy={desk.w.busy} off={off}
          onClose={() => setEditing(null)}
          onSave={(hex, fail) => save({ ...colours, [editing.k]: hex }, () => setEditing(null), fail)} />
      ) : null}
    </Page>
  );
}

function StateColourSheet({ label, start, busy, off, onClose, onSave }: {
  label: string; start: string; busy: boolean; off: boolean; onClose: () => void; onSave: (hex: string, fail: (s: Said) => void) => void;
}) {
  const [colour, setColour] = useState(start);
  const [said, setSaid] = useState<Said | null>(null);
  const typed = typedColour(colour);
  return (
    <Sheet open title={label} description="Its colour on the Calendar." onClose={onClose} closable={!busy}
      footer={<>
        <Btn label="Cancel" onPress={onClose} disabled={busy} grow />
        <Btn label={busy ? "Saving…" : "Save"} variant="primary" disabled={off || busy || !typed || typed === start.toUpperCase()} grow
          onPress={() => { setSaid(null); if (typed) onSave(typed, setSaid); }} />
      </>}>
      <ColourField label={`Colour of ${label}`} value={colour} onChangeText={setColour} editable={!off} />
      {said ? <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">{said.title}{said.body ? `: ${said.body}` : ""}</Text> : null}
    </Sheet>
  );
}

/** The desk's rules read again for a page that saves them (the web reads them from the hotel list and
    fetches it again after a save; here the frame's list is fetched again too, so every screen uses them). */
export function useDesk(code: string, more: readonly string[] = []) {
  const cache = useQueryClient();
  const session = useSession();
  const { said, say, close } = useSaid();
  const [pulled, setPulled] = useState(false);
  /* One name for every write built from the desk's rules (ID types, the booking colours, Front desk
     rules' sections and the rules card): they are one record, sent from one read. */
  const key = pageName(code, "desk-rules");
  const w = usePageWrite([key, ...more]);
  const read = useRead(w.watch(key, () => readDeskRules(code)), RULES_KEY(code));
  /** After a write landed: the controls show what was sent (grey) until the rules are read again. */
  const after = (change?: Partial<DeskRules>) => {
    if (change) shown<DeskRules | null>(cache, RULES_KEY(code), (old) => (old ? { ...old, ...change } : old));
    void cache.invalidateQueries({ queryKey: RULES_KEY(code) });
    void session.refresh();
  };
  return {
    read, w, key, said, say, close, after,
    refreshing: pulled && read.loading,
    pull: () => { setPulled(true); read.reload(); },
    unknown: (e: unknown) => { say({ ...notKnown("saved", "this page", e), tone: "bad" }); after(); },
  };
}

