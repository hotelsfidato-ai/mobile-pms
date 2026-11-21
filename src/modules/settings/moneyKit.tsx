import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2 } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Platform, Pressable, Switch, Text, View } from "react-native";
import { outcomeUnknown } from "../../core/api";
import { asRole, mayReach } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { notKnown, ripple, shade, useScreenStop } from "../../core/ui";
import { stops } from "../../core/stop";
import { notYourRole } from "../admin/rolesRules";
import { Btn, TextBox } from "../inventory/configKit";
import { Empty, body, saidOf, type Said } from "../inventory/kit";
import { freshBook, matches } from "./moneyRules";

/* ══════════════════════════════════════════════════════════════════
   THE PIECES THE LANE'S PAGES SHARE (lane m13-set-money, 20 Nov). The
   set-up lane's kit (inventory/configKit.tsx: Btn, Sheet, Field, TextBox,
   Select, SwitchLine, the states) and Rates' (inventory/kit.tsx: Toast,
   InDialog, Stale, Segmented, saidOf) are used as they are; here only
   what this lane adds:

     useWriter  one tap, one write, on the core's stop book (src/core/
                stop.ts, ui.tsx useScreenStop; MEMORY 8, 16, 22): while a
                write is on its way nothing else is sent and the sheet
                cannot close; after an unknown outcome the page's writes
                stay grey until a good read BEGUN after the loss (and its
                settle) has come back; after a write that landed, until a
                read begun after it has (moneyRules.ts freshBook, MSET-M5)
     refusedPage  the web's console: a page not offered to the role is
                "not part of your role" (the web's Settings.tsx sends such
                a person to the first page they may open)
     ListCard   the web's MoneyList (finance/pages/money/MoneyList.tsx):
                search, add, and per row On/Off, Edit, and Delete only
                when nothing used it - the delete asked first
     Why        the web's Explained aside: the plain words and a ₹ example
   ══════════════════════════════════════════════════════════════════ */

export type Outcome = { ok: true } | { ok: false; unknown: boolean; said: Said };

/** The app's one fresh-after-write book (moneyRules.ts freshBook), ordered by the core stop book. */
const fresh = freshBook(stops);
/** The words of the last loss under each name, for the core's Stopped line (the book keeps no words). */
const lines = new Map<string, string>();

/** One page's writes and its read, by name "settings/<code>/<page>": the core stop book (useScreenStop)
    for the unknown outcome and the write on its way, and the fresh-after-write rule. `watch` wraps the
    page's read: a good read begun after a loss (and its settle) or after a write lets the page go. */
export function useWriter(name: string) {
  const st = useScreenStop(name);
  const [busy, setBusy] = useState(false);
  const [, redraw] = useState(0);
  const stale = fresh.stale(name);
  /** `title`: the refusal's heading ("Not saved"), or a function for a write of two steps; `done` and
      `where`: "Not known whether it was <done>… Look at <where> before trying again". Null: the tap
      was not taken (stopped, on its way, or not yet read again since the last write). */
  async function run(fn: () => Promise<unknown>, words: { title: string | (() => string); done: string; where: string }): Promise<Outcome | null> {
    if (st.isStuck() || fresh.stale(name)) return null;
    setBusy(true);
    try {
      await st.guard(fn);
      fresh.wrote(name);
      return { ok: true };
    } catch (e) {
      if (outcomeUnknown(e)) {
        const n = notKnown(words.done, words.where, e);
        lines.set(name, n.line);
        return { ok: false, unknown: true, said: { title: n.title, body: n.body, tone: "bad" } };
      }
      return { ok: false, unknown: false, said: saidOf(typeof words.title === "function" ? words.title() : words.title, e) };
    } finally {
      setBusy(false);
      redraw((x) => x + 1);
    }
  }
  const watch = <T,>(read: () => Promise<T>) => st.watch(async (ctx?: { signal?: AbortSignal }) => {
    const ticket = stops.begin();
    const got = await read();
    if (!ctx?.signal?.aborted) fresh.seen(name, ticket);
    return got;
  });
  return {
    busy,
    /** Every write of the page grey: lost, on its way, or not yet read again after one. */
    locked: st.stuck || stale || busy,
    /** The "Not known whether…" line while lost (the core's Stopped draws it). */
    line: st.unknown ? lines.get(name) ?? notKnown("saved", "this page").line : null,
    run,
    watch,
  };
}
export type Writer = ReturnType<typeof useWriter>;

/** null when the web's console offers this page to the role (settingsConsole's canSee, menu.ts mayReach). */
export const refusedPage = (role: string | null, address: string, label: string) =>
  mayReach(asRole(role), address) ? null : notYourRole(asRole(role), label);

/** Why the page's writes are grey: the doubt's own line, or the API's refusal. */
export function Grey({ line }: { line: string | null }) {
  if (!line) return null;
  return <Text style={[t.caption, { color: c.red700, lineHeight: 17 }]} accessibilityRole="alert">{line}</Text>;
}

/** The web's Explained aside, under the fields on a phone. */
export function Why({ children }: { children: ReactNode }) {
  return <View style={{ borderRadius: 8, backgroundColor: c.grey50, padding: 12, gap: 8 }}>{children}</View>;
}
/** One paragraph of it: the bold words, then the rest. */
export function WhyLine({ bold, text }: { bold?: string; text: string }) {
  return (
    <Text style={[body, { color: c.grey600 }]}>
      {bold ? <Text style={[face[600], { color: c.ink900 }]}>{bold}</Text> : null}
      {bold ? " " : ""}{text}
    </Text>
  );
}

/** The web's Checkbox, 44 tall, and greyed for somebody who may not change it. */
export function TickBox({ label, a11y, on, onChange, disabled }: { label: string; a11y?: string; on: boolean; onChange: (on: boolean) => void; disabled?: boolean }) {
  return (
    <Pressable android_ripple={disabled ? undefined : ripple} onPress={() => onChange(!on)} disabled={disabled}
      accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: Boolean(disabled) }} accessibilityLabel={a11y ?? label}
      style={{ minHeight: 44, minWidth: 44, flexDirection: "row", alignItems: "center", justifyContent: label ? "flex-start" : "center", gap: 10 }}>
      <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: on ? (disabled ? c.grey400 : c.orange600) : c.grey300, backgroundColor: on ? (disabled ? c.grey400 : c.orange600) : disabled ? c.grey50 : c.white, alignItems: "center", justifyContent: "center" }}>
        {on ? <Check size={15} color={c.white} /> : null}
      </View>
      {label ? <Text style={[t.label, { flex: 1, color: disabled ? c.grey500 : c.ink900 }]}>{label}</Text> : null}
    </Pressable>
  );
}

/** Each phone's own Switch, the theme's colours. */
export function OnOff({ on, label, onChange, disabled }: { on: boolean; label: string; onChange: (on: boolean) => void; disabled?: boolean }) {
  return (
    <Switch value={on} onValueChange={onChange} disabled={disabled} accessibilityLabel={label}
      trackColor={{ false: c.grey300, true: c.orange600 }} thumbColor={Platform.OS === "android" ? c.white : undefined} ios_backgroundColor={c.grey300} />
  );
}

/** A 44 px icon button with its label for a screen reader (a ghost Btn with no words). */
function IconBtn({ label, icon: Icon, onPress, disabled, tone }: { label: string; icon: typeof Pencil; onPress: () => void; disabled?: boolean; tone?: string }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled) }}
      android_ripple={{ ...ripple, borderless: true }}
      style={shade(({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.grey100 : "transparent" }))}>
      <Icon size={18} color={disabled ? c.grey300 : tone ?? c.grey600} />
    </Pressable>
  );
}

/** The drag's phone form, in an editor: one place up or down (the whole list is sent, as the web). */
export function MoveButtons({ first, last, onMove, disabled }: { first: boolean; last: boolean; onMove: (by: -1 | 1) => void; disabled?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Btn label="Move up" icon={ArrowUp} grow disabled={disabled || first} onPress={() => onMove(-1)} />
      <Btn label="Move down" icon={ArrowDown} grow disabled={disabled || last} onPress={() => onMove(1)} />
    </View>
  );
}

/* ── MoneyList.tsx at phone width ──────────────────────────────────── */

export function ListCard<T extends { id: string; isActive: boolean; used: boolean }>({
  rows, name, detail, addLabel, onAdd, onToggle, onEdit, onDelete, empty, locked,
}: {
  rows: T[];
  name: (row: T) => string;
  detail: (row: T) => ReactNode;
  addLabel: string;
  onAdd: () => void;
  onToggle: (row: T, on: boolean) => void;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  empty: string;
  /** Every change refused for now (the API's sentence, or a write in doubt): the controls grey. */
  locked: boolean;
}) {
  const [search, setSearch] = useState("");
  const shown = rows.filter((r) => matches(name(r), search));
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
        <View style={{ flex: 1 }}><TextBox label="Search" value={search} placeholder="Search" caps="none" onChangeText={setSearch} /></View>
        <Btn label="" a11y={addLabel} icon={Plus} variant="primary" disabled={locked} onPress={onAdd} />
      </View>
      {shown.length === 0 ? (
        <View style={{ padding: 12 }}><Empty title={rows.length ? "Nothing matches" : empty} /></View>
      ) : shown.map((row, i) => (
        <View key={row.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: space.cardX, paddingRight: 4, paddingVertical: 8, minHeight: 60, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey200 }}>
          <OnOff on={row.isActive} label={`${name(row)}: ${row.isActive ? "On" : "Off"}`} disabled={locked} onChange={(on) => onToggle(row, on)} />
          <View style={{ flex: 1, gap: 2, paddingLeft: 4 }}>
            <Text style={[t.label, face[500], { fontSize: 16, color: row.isActive ? c.ink900 : c.grey500 }]} numberOfLines={2}>{name(row)}</Text>
            {typeof detail(row) === "string" ? <Text style={[t.label, t.tab, { color: c.grey500 }]}>{detail(row)}</Text> : detail(row)}
          </View>
          <IconBtn label={`Edit ${name(row)}`} icon={Pencil} disabled={locked} onPress={() => onEdit(row)} />
          {/* Delete only when nothing used it (MoneyList.tsx 85-90): otherwise it is switched Off. */}
          {!row.used ? <IconBtn label={`Delete ${name(row)}`} icon={Trash2} tone={c.red700} disabled={locked} onPress={() => onDelete(row)} /> : null}
        </View>
      ))}
    </View>
  );
}
