import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react-native";
import { CloudOff } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, HeldError, outcomeUnknown } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import type { ExportTable } from "../../core/exportDoc";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Card, ReadFailed, notKnown } from "../../core/ui";
import { stillUnknown } from "./desk";
import type { Said } from "./Kit";

/* ══════════════════════════════════════════════════════════════════
   THE FINANCE DESK'S OWN PIECES (lane m13-fin-desk): the sheet with the
   phone's safe areas and the keyboard lift (docs/NATIVE.md), the web's
   StatusPill with its warning tone, the four read states, the export with
   its refusal, and ONE WRITE PER INTENT: a tap latched before the first
   await (MEMORY 8), and stuck once its outcome is unknown until the sheet is
   closed and the record read again (MEMORY 16, the core's useStuck).
   ══════════════════════════════════════════════════════════════════ */

export type PillTone = "danger" | "warning" | "success" | "neutral" | "info";
const PILL: Record<PillTone, { bg: string; fg: string; dot: string }> = {
  danger: { bg: c.red50, fg: c.red700, dot: c.red },
  warning: { bg: c.yellow50, fg: c.yellow800, dot: c.yellow },
  success: { bg: c.success50, fg: c.success600, dot: c.success },
  neutral: { bg: c.grey100, fg: c.grey600, dot: c.grey400 },
  info: { bg: c.info50, fg: c.info, dot: c.info },
};

/** The web's StatusPill: a soft tint, a dot, the small words. */
export function TonePill({ tone, words }: { tone: PillTone; words: string }) {
  const p = PILL[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, backgroundColor: p.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.dot }} />
      <Text style={[t.caption, { color: p.fg }]}>{words}</Text>
    </View>
  );
}

/** The page head: the title, a pill beside it, the line under (the web's PageHeader). */
export function PageHead({ title, pill, under }: { title: string; pill?: ReactNode; under?: string }) {
  return (
    <View style={{ gap: 4, marginBottom: space.section - space.card }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 10, rowGap: 4 }}>
        <Text style={t.title} accessibilityRole="header">{title}</Text>
        {pill}
      </View>
      {under ? <Text style={[t.label, { color: c.grey500, lineHeight: 21 }]}>{under}</Text> : null}
    </View>
  );
}

/** A card's head: its title and the line under it (CardHeader). */
export function CardHead({ title, under, action }: { title: string; under?: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={t.heading} accessibilityRole="header">{title}</Text>
        {under ? <Text style={[t.label, { color: c.grey500, lineHeight: 21 }]}>{under}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export const Hair = () => <View style={{ height: 1, backgroundColor: c.grey200, marginHorizontal: -space.cardX }} />;

/** A read that is not here: still reading, no connection, or failed - each in its own words. */
export function ReadState({ what, reading, error, onRetry }: { what: string; reading: string; error?: string; onRetry: () => void }) {
  if (!error) return <Text style={t.label} accessibilityLiveRegion="polite">{reading}</Text>;
  if (!isOnline()) {
    return (
      <Card style={{ backgroundColor: c.yellow50, borderColor: c.yellow100, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CloudOff size={16} color={c.yellow800} />
          <Text style={[t.heading, { color: c.yellow800 }]}>No connection</Text>
        </View>
        <Text style={[t.label, { color: c.grey700, lineHeight: 20 }]}>{`${what[0]!.toUpperCase()}${what.slice(1)} needs the connection to read, and nothing here can be changed offline. Pull down to read again when it is back.`}</Text>
      </Card>
    );
  }
  return <ReadFailed what={what} error={error} onRetry={onRetry} />;
}

/** A role the API refuses: the screen says so in the API's words and reads nothing. */
export function RefusedCard({ title, why }: { title: string; why: string }) {
  return (
    <Card style={{ gap: 4 }}>
      <Text style={t.heading}>{title}</Text>
      <Text style={[t.label, { color: c.grey600, lineHeight: 20 }]}>{why}</Text>
    </Card>
  );
}

/** A list the web lets people download: the phone's print and share sheets, or why not. */
export function DeskExport({ table, why }: { table: ExportTable | null; why: string | null }) {
  if (why) return <Text style={[t.caption, { lineHeight: 16 }]}>{why}</Text>;
  return <ExportButtons table={table} />;
}

/** What a failed write says: not known whether it was made, or the server's own words. */
export function failedSaid(e: unknown, title: string, done: string, where: string): Said {
  if (outcomeUnknown(e)) {
    const k = notKnown(done, where, e);
    return { tone: "warn", title: k.title, text: k.body };
  }
  if (e instanceof HeldError) return { tone: "warn", title, text: e.message };
  return { tone: "refused", title, text: e instanceof ApiError || e instanceof Error ? e.message : String(e) };
}

/** A read that also says when the answer now on screen BEGAN, so an unknown outcome can wait
    for a read begun after it (stillUnknown). The core's useRead, with that one time added. */
export function useDeskRead<T>(read: () => Promise<T>, key: readonly unknown[]) {
  const q = useQuery({ queryKey: key, queryFn: async () => { const began = Date.now(); return { value: await read(), began }; } });
  return {
    data: q.data?.value, error: q.error ? q.error.message : undefined, loading: q.isFetching,
    reload: () => { void q.refetch(); }, began: q.data?.began ?? 0,
  };
}

/** THE SCREEN'S STOP (MEMORY 16; the reviews of 20 Nov): once a write's outcome is unknown
    (`outcomeUnknown`: nothing came back, or a 5xx), every write on this screen waits until a read
    of it that began after that moment has come back - not when a sheet closes. None of these
    routes reads an idempotency key, so a second tap could be a second deposit or payment. */
export function useStop(began: number) {
  const [lost, setLost] = useState<{ at: number; done: string; where: string } | null>(null);
  const now = useRef({ lost, began });
  now.current = { lost, began };
  const stuck = lost !== null && stillUnknown(lost.at, began);
  return {
    stuck,
    line: stuck ? notKnown(lost!.done, lost!.where).line : null,
    isStuck: () => now.current.lost !== null && stillUnknown(now.current.lost.at, now.current.began),
    lose: (e: unknown, done: string, where: string) => {
      if (!outcomeUnknown(e)) return false;
      const v = { at: Date.now(), done, where };
      now.current = { ...now.current, lost: v };
      setLost(v);
      return true;
    },
  };
}
export type Stop = ReturnType<typeof useStop>;

/** The screen's stop said where the person looks, with the screen's grey buttons. */
export function StopCard({ stop }: { stop: Stop }) {
  if (!stop.line) return null;
  return (
    <Card style={{ backgroundColor: c.yellow50, borderColor: c.yellow100, gap: 4 }}>
      <Text style={[t.label, { color: c.ink900, lineHeight: 20, ...face[500] }]} accessibilityRole="alert">{stop.line}</Text>
      <Text style={[t.caption, { lineHeight: 16 }]}>It is being read again; nothing here can be done until it has been.</Text>
    </Card>
  );
}

/** One intent, one write (MEMORY 8, 16): latched at the tap, and refused while the screen's stop
    is on. `done` and `where` are the words of an unknown outcome: "Not known whether it was
    <done>: look at <where> before trying again." `onError` hears every failure. */
export function useWrite(stop: Stop, done: string, where: string) {
  const latch = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = async (write: () => Promise<void>, onError: (e: unknown, unknown: boolean) => void) => {
    if (latch.current || stop.isStuck()) return;
    latch.current = true;
    setBusy(true);
    try { await write(); } catch (e) { onError(e, stop.lose(e, done, where)); } finally { latch.current = false; setBusy(false); }
  };
  return { run, busy, stuck: stop.stuck };
}

/** A sheet from the bottom: the web's Dialog at phone width, clear of the home indicator and
    the gesture bar, lifted over the keyboard, closed by the back gesture (docs/NATIVE.md). */
export function DeskSheet({ title, description, onClose, children, footer }: {
  title: string; description?: string; onClose: () => void; children?: ReactNode; footer: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent statusBarTranslucent animationType={Platform.OS === "web" ? "none" : "slide"} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)", paddingTop: insets.top }}>
          <Pressable style={{ flex: 1, minHeight: 48 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "92%" }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.side, paddingTop: 18, paddingBottom: 12, gap: 14 }}>
              <View style={{ gap: 2 }}>
                <Text style={t.figure} accessibilityRole="header">{title}</Text>
                {description ? <Text style={[t.label, t.tab, { lineHeight: 20 }]}>{description}</Text> : null}
              </View>
              {children}
            </ScrollView>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 8, paddingHorizontal: space.side, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) }}>
              {footer}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** On / off: each phone's own Switch (docs/NATIVE.md), its words beside it, 44 px. */
export function OnOff({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Text style={[t.label, { flex: 1, color: c.ink900 }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label}
        trackColor={{ false: c.grey300, true: c.orange }} thumbColor={c.white} ios_backgroundColor={c.grey300} />
    </View>
  );
}

/** A plain text action (the web's ghost or underlined link), 44 px to the touch. */
export function TextAct({ label, onPress, why, onRefused, Icon, tone = "ink", underline }: {
  label: string; onPress: () => void; why?: string | null; onRefused?: (why: string) => void; Icon?: LucideIcon;
  tone?: "ink" | "grey"; underline?: boolean;
}) {
  const off = why != null;
  const fg = off ? c.grey400 : tone === "grey" ? c.grey600 : c.ink900;
  return (
    <Pressable
      onPress={() => (off ? onRefused?.(why!) : onPress())} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: off }} accessibilityHint={why ?? undefined} hitSlop={4}
      android_ripple={{ color: c.grey200 }}
      style={({ pressed }) => ({ minHeight: 44, minWidth: 44, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, backgroundColor: pressed && Platform.OS === "ios" ? c.grey100 : "transparent" })}
    >
      {Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[t.label, { color: fg, ...face[500], textDecorationLine: underline ? "underline" : "none" }]}>{label}</Text>
    </Pressable>
  );
}

/** A labelled figure in a card (the web's table cell on a phone: label above, value below). */
export function Figure({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" }) {
  return (
    <View style={{ gap: 2, minWidth: 88 }}>
      <Text style={[t.caption]}>{label}</Text>
      <Text style={[t.label, t.tab, { color: tone === "danger" ? c.red700 : tone === "success" ? c.success600 : c.ink900, ...face[500] }]} adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1}>{value}</Text>
    </View>
  );
}

/** A label and its value on one line, the value right (the web's dl rows). */
export function Line({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "warn" }) {
  const fg = tone === "warn" ? c.yellow800 : strong ? c.ink900 : c.grey600;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12, paddingVertical: 10 }}>
      <Text style={[t.label, { color: fg, flexShrink: 1, ...(strong ? face[600] : {}) }]}>{label}</Text>
      <Text style={[strong ? t.heading : t.label, t.tab, { color: tone === "warn" ? c.yellow800 : c.ink900 }]}>{value}</Text>
    </View>
  );
}
