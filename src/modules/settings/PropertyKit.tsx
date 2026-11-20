import { router } from "expo-router";
import { ArrowUpRight, ChevronRight } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ON_THE_WEBSITE, can, mayReach, phoneRoute, type Role } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, notKnown, ripple, shade, useRead } from "../../core/ui";
import { Btn, Failed, Loading, Refused, Stale, body, saidOf, useAct, type Said, type Stop } from "../admin/kit";
import { notYourRole, refusalFor } from "../admin/roles";
import { doubt, TEXT_MOST, type TextKind } from "./propertyRules";
import { saveText } from "./propertyData";

/* ══════════════════════════════════════════════════════════════════
   WHAT EVERY PROPERTY PAGE SHARES (lane P): who may open it (the web's
   console: RequireAccess on /settings/property/<slug>), its one read and
   the moment it began, the page's stop after an unknown outcome kept
   outside React (propertyRules `doubt`, MEMORY 16 and 22), one latch for
   the whole page so it sends one thing at a time, a link to another page
   (the phone's, or greyed "On the website for now"), and the web's
   TextEditor (pages/property/TextEditor.tsx).
   ══════════════════════════════════════════════════════════════════ */

/** RequireAccess's sentence when the console does not offer this page to the role, else null. */
export const refusedPage = (role: Role, address: string, label: string) =>
  mayReach(role, address) ? null : notYourRole(role, label);

/** `room_config` edit: the logo's three (roleGate PROPERTY and its siblings). */
export const mayEditHere = (role: Role) => can(role, "edit", "room_config");
/** roleGate's sentence for a write this role is refused: shown where the page is read only. */
export const readOnlyLine = (doing: string) => refusalFor(doing, "room_config", "edit");

/** The page's one read, when it began (the doubt lifts only on a read that began after a loss), and its stop. */
export function usePage<T>(code: string, page: string, fn: () => Promise<T>) {
  const [seenAt, setSeenAt] = useState<number | undefined>(undefined);
  const q = useRead(async () => {
    const started = Date.now();
    const answer = await fn();
    setSeenAt(started);
    return answer;
  }, ["settings", code, page]);
  const [, tick] = useState(0);
  const key = `${code} ${page}`;
  const stop: Stop = { stuck: doubt.stuck(key, seenAt), mark: () => { doubt.mark(key, Date.now()); tick((n) => n + 1); } };
  return { q, stop };
}

/** One latch for the page (MEMORY 8, 22: one write at a time), the server's answer said. */
export function useWrites(stop: Stop, reload: () => void, say: (s: Said) => void) {
  const act = useAct(undefined, stop);
  const write = <T,>(fn: () => Promise<T>, w: {
    ok: (r: T) => Said | null; done: string; where: string; no?: string; after?: (r: T) => void;
  }) => act.run(fn, {
    ok: (r) => { const s = w.ok(r); if (s) say(s); w.after?.(r); reload(); },
    no: (e) => say(saidOf(e, w.no ?? "Not saved")),
    unknown: (e) => { say({ ...notKnown(w.done, w.where, e), tone: "bad" }); reload(); },
  });
  return { busy: act.busy, stuck: act.stuck, off: act.busy || act.stuck, write };
}
export type Writes = ReturnType<typeof useWrites>;

/** Said while the page is stopped: why nothing here can be pressed. */
export function StuckLine({ stuck }: { stuck: boolean }) {
  if (!stuck) return null;
  return (
    <Text style={[t.caption, { color: c.red700, lineHeight: 17 }]} accessibilityRole="alert">
      Not known whether the last change was saved. Pull down to read this page again before changing anything.
    </Text>
  );
}

/** The page's frame: the hotel above, the web's title and line, pull down to read again. */
export function PageFrame({ hotel, title, under, refused, refreshing, onRefresh, children }: {
  hotel?: string; title: string; under: string; refused: string | null; refreshing: boolean; onRefresh: () => void; children: ReactNode;
}) {
  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Head eyebrow={hotel} title={title} under={under} />
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

/** A control that needs a file the phone cannot choose yet: greyed, with the package it waits for. */
export function NeedsFile({ label, pkg }: { label: string; pkg: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ alignSelf: "flex-start" }}><Btn label={label} a11y={`${label}: ${ON_THE_WEBSITE}`} disabled onPress={() => undefined} /></View>
      <Text style={[t.caption, { lineHeight: 17 }]}>{`${ON_THE_WEBSITE}: choosing a file on the phone needs ${pkg}, not installed.`}</Text>
    </View>
  );
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
