import { router } from "expo-router";
import { ArrowUpRight, ChevronRight } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ON_THE_WEBSITE, can, mayReach, phoneRoute, type Role } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { outcomeUnknown } from "../../core/api";
import { Head, Screen, Stopped, notKnown, ripple, shade, useRead, useScreenStop } from "../../core/ui";
import type { FileRule, Picked } from "../../core/files";
import { explainPick } from "../../core/pickers";
import { base64For } from "../../core/upload";
import { Btn, Failed, Loading, Refused, Stale, body, saidOf, type Said } from "../admin/kit";
import { notYourRole, refusalFor } from "../admin/roles";
import { TEXT_MOST, type TextKind } from "./propertyRules";
import { saveText } from "./propertyData";

/* ══════════════════════════════════════════════════════════════════
   WHAT EVERY PROPERTY PAGE SHARES (lane P): who may open it (the web's
   console: RequireAccess on /settings/property/<slug>), its one read and
   the moment it began, the page's stop after an unknown outcome kept
   outside React (MEMORY 16 and 22), one latch for
   the whole page so it sends one thing at a time, a link to another page
   (the phone's, or greyed "On the website for now"), and the web's
   TextEditor (pages/property/TextEditor.tsx). The stop is the core's
   (src/core/stop.ts, useScreenStop), named settings/<code>/<page>.
   ══════════════════════════════════════════════════════════════════ */

/** RequireAccess's sentence when the console does not offer this page to the role, else null. */
export const refusedPage = (role: Role, address: string, label: string) =>
  mayReach(role, address) ? null : notYourRole(role, label);

/** `room_config` edit: the logo's three (roleGate PROPERTY and its siblings). */
export const mayEditHere = (role: Role) => can(role, "edit", "room_config");
/** roleGate's sentence for a write this role is refused: shown where the page is read only. */
export const readOnlyLine = (doing: string) => refusalFor(doing, "room_config", "edit");

/** The page's stop name in the core's book (src/core/stop.ts): by hotel and page. */
export const stopName = (code: string, page: string) => `settings/${code}/${page}`;

/** The page's one read, watched by the core's stop: a good read begun after a loss (and its wait) lets it go. */
export function usePage<T>(code: string, page: string, fn: () => Promise<T>) {
  const stop = useScreenStop(stopName(code, page));
  const q = useRead(stop.watch(fn), ["settings", code, page]);
  return { q, stop };
}

/** One latch for the page (MEMORY 8, 22: one write at a time), each write guarded by the core's stop (stopped
    while on its way, lost on an unknown outcome, outside React), the server's answer said. */
export function useWrites(stop: ReturnType<typeof useScreenStop>, reload: () => void, say: (s: Said) => void) {
  const latch = useRef(false);
  const [busy, setBusy] = useState(false);
  const write = async <T,>(fn: () => Promise<T>, w: {
    ok: (r: T) => Said | null; done: string; where: string; no?: string; after?: (r: T) => void;
  }) => {
    if (latch.current || stop.isStuck()) return;
    latch.current = true;
    setBusy(true);
    try {
      const r = await stop.guard(fn);
      const s = w.ok(r);
      if (s) say(s);
      w.after?.(r);
      reload();
    } catch (e) {
      if (outcomeUnknown(e)) say({ ...notKnown(w.done, w.where, e), tone: "bad" });
      else say(saidOf(e, w.no ?? "Not saved"));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  };
  return { busy, stuck: stop.stuck, unknown: stop.unknown, off: busy || stop.stuck, write, reload };
}
export type Writes = ReturnType<typeof useWrites>;

/** Said while the page is stopped after an unknown outcome: why nothing here can be pressed, and the read that frees it. */
export function StuckLine({ w }: { w: Writes }) {
  if (!w.unknown) return null;
  return <Stopped line="Not known whether the last change was saved: read this page again before changing anything." onRead={w.reload} />;
}

/** The page's frame: the web's title and its line (as the pictures: no hotel above it), pull down to read again. */
export function PageFrame({ title, under, refused, refreshing, onRefresh, children }: {
  title: string; under: string; refused: string | null; refreshing: boolean; onRefresh: () => void; children: ReactNode;
}) {
  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Head title={title} under={under} />
      {refused ? <Refused sentence={refused} /> : children}
    </Screen>
  );
}

/** The read's four states before the page: loading, failed (or offline), then the page with a stale line. */
export function Read<T>({ q, what, children }: { q: { data: T | undefined; error?: string; reload: () => void }; what: string; children: (d: T) => ReactNode }) {
  if (q.data === undefined) return q.error ? <Failed title={`Could not read ${what}`} error={q.error} onRetry={q.reload} /> : <Loading what={what} />;
  return <><Stale error={q.error} />{children(q.data)}</>;
}

/** A card's heading (SettingHeader): title, its line, and an act on the right. */
export function CardHead({ title, line, info, action }: { title: string; line?: string; info?: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={t.heading} accessibilityRole="header">{title}</Text>
        {line ? <Text style={[body, { color: c.grey500 }]}>{line}</Text> : null}
        {info ? <Text style={[t.caption, { lineHeight: 17 }]}>{info}</Text> : null}
      </View>
      {action}
    </View>
  );
}

/** A file or a photo chosen with the phone's own picker (M-16; core pickers.ts), checked against the web's or
    the server's own limits BEFORE anything is sent (files.ts), and read as base64 for a JSON route's `data`
    (the web's FileReader). Null: cancelled, or refused - said here (`refused(name)` is the toast's title;
    a camera refused by the phone says so in its own dialog, with Settings). One picker at a time (`open`). */
export function usePickData(say: (s: Said) => void) {
  const open = useRef(false);
  const [picking, setPicking] = useState(false);
  const pick = async (choose: () => Promise<Picked | null>, rule: FileRule, refused: (name: string) => string) => {
    if (open.current) return null;
    open.current = true;
    setPicking(true);
    try {
      let picked: Picked | null;
      try { picked = await choose(); } catch (e) { if (!explainPick(e)) say(saidOf(e, "Nothing chosen")); return null; }
      if (!picked) return null;
      const read = await base64For(picked, rule);
      if (!read.ok) { say({ title: refused(picked.name), body: read.reason, tone: "bad" }); return null; }
      return { picked, data: read.data };
    } finally {
      open.current = false;
      setPicking(false);
    }
  };
  return { picking, pick };
}

/** A link to another page: the phone's screen where it has one, else greyed and said. */
export function GoTo({ to, code, label, sub, inline }: { to: string; code: string; label: string; sub?: string; inline?: boolean }) {
  const route = phoneRoute(to.replace(":code", code), code);
  if (!route) {
    return (
      <View style={{ minHeight: 44, justifyContent: "center", gap: 2 }} accessibilityLabel={`${label}. ${ON_THE_WEBSITE}`}>
        <Text style={[t.label, { color: c.grey500 }]}>{label}</Text>
        <Text style={t.caption}>{sub ? `${sub} ` : ""}{ON_THE_WEBSITE}</Text>
      </View>
    );
  }
  return (
    <Pressable onPress={() => router.push(route as never)} accessibilityRole="link" android_ripple={ripple}
      style={shade(({ pressed }) => ({ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, opacity: pressed ? 0.7 : 1 }))}>
      <View style={{ flex: inline ? undefined : 1, gap: 2 }}>
        <Text style={[t.label, { color: inline ? c.orange700 : c.ink900, ...face[inline ? 600 : 500] }]}>{label}</Text>
        {sub ? <Text style={[body, { color: c.grey500 }]}>{sub}</Text> : null}
      </View>
      {inline ? <ArrowUpRight size={14} color={c.orange700} /> : <ChevronRight size={16} color={c.grey500} />}
    </Pressable>
  );
}

/** One of the hotel's texts (TextEditor.tsx): plain text, a blank line between paragraphs, 2000 characters. */
export function TextEditor({ code, page, kind, label, value, hint, mayEdit, w }: {
  code: string; page: string; kind: TextKind; label: string; value: string; hint?: string; mayEdit: boolean; w: Writes;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  const text = typed ?? value;
  const save = () => void w.write(() => saveText(code, kind, text, page), {
    ok: () => ({ title: `${label} saved`, body: text.trim() ? "Guests see it from now on." : "Removed.", tone: "ok" }),
    done: "saved", where: `${label} here`, after: () => setTyped(null),
  });
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.ink900 }]}>{label}</Text>
      {hint ? <Text style={[body, { color: c.grey500 }]}>{hint}</Text> : null}
      <TextInput
        value={text} onChangeText={setTyped} editable={mayEdit} multiline maxLength={TEXT_MOST} accessibilityLabel={label}
        style={{
          minHeight: 140, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: c.grey300,
          backgroundColor: mayEdit ? c.white : c.grey50, fontSize: 16, lineHeight: 22, color: mayEdit ? c.ink900 : c.grey600,
          textAlignVertical: "top", ...face[500],
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.card }}>
        <Text style={[t.caption, t.tab]}>{`${text.length} / ${TEXT_MOST}`}</Text>
        {mayEdit ? <Btn label={w.busy ? "…" : "Save"} a11y={`Save ${label}`} disabled={w.off || typed === null || typed === value} onPress={save} /> : null}
      </View>
    </View>
  );
}

/** The web's Tabs at phone width: the tabs wrap as chips, the chosen one filled. */
export function Tabs<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: ReadonlyArray<readonly [T, string]>; label: string;
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map(([v, words]) => {
        const on = v === value;
        return (
          <Pressable key={v} onPress={() => onChange(v)} accessibilityRole="tab" accessibilityState={{ selected: on }} android_ripple={ripple}
            style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, justifyContent: "center", overflow: "hidden",
              borderColor: on ? c.ink900 : c.grey300, backgroundColor: on ? c.ink900 : c.white }}>
            <Text style={[t.label, { color: on ? c.white : c.grey700 }]}>{words}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The figure's label over its value (SettingRow), a dash greyed. */
export function Value({ label, value, children }: { label: string; value?: string | null; children?: ReactNode }) {
  const v = value ?? "-";
  return (
    <View style={{ gap: 2, flex: 1, minWidth: 0 }}>
      <Text style={[t.label, { color: c.grey600 }]}>{label}</Text>
      {children ?? <Text style={[t.label, { fontSize: 16, color: v === "-" ? c.grey500 : c.ink900 }]}>{v}</Text>}
    </View>
  );
}
