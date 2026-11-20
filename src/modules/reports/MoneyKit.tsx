import { Check, ChevronDown, CloudOff, FileSpreadsheet, Lock, Minus, Plus, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExportButtons } from "../../core/Export";
import type { ExportTable } from "../../core/exportDoc";
import { dateLong } from "../../core/format";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Capsule, Card, Head, ReadFailed, Screen, s } from "../../core/ui";
import { addDays } from "./figures";
import { addMonths, docCards, factsLine, monthWords, type CardItem, type Figure, type ReportDoc } from "./money";

/* ══════════════════════════════════════════════════════════════════
   THE REPORT KIT of the money and tax reports (lane m13-rep-money), after
   the web's components/ReportShell.tsx and ReportView.tsx, cut for a phone:
   the page head with its period, the report's own settings (a day, a month
   or a range, stepped as the app's day stepper, M-7: no date-picker
   package), the export (print or save as PDF, share: src/core/Export.tsx),
   the masthead, and the server's rows as cards of labelled figures in the
   web's column order, its own totals as total cards. Nothing is added up
   here (money.ts).
   ══════════════════════════════════════════════════════════════════ */

/** A report's page: its head, its settings, its export, then the report. */
export function ReportPage({ title, period, controls, files, refreshing, onRefresh, children }: {
  title: string; period: string; controls?: ReactNode; files?: ReactNode; refreshing: boolean; onRefresh: () => void; children: ReactNode;
}) {
  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Head title={title} under={period} />
      {controls ? <View style={{ gap: 12 }}>{controls}</View> : null}
      {files}
      {children}
    </Screen>
  );
}

/* ── The settings: a day, a month, a range (the app's day stepper) ── */

function Step({ Icon, a11y, off, onPress }: { Icon: LucideIcon; a11y: string; off: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress} disabled={off} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ disabled: off }}
      android_ripple={off ? undefined : { color: c.grey200, borderless: true }}
      style={({ pressed }) => [s.capsule, { width: 44, paddingHorizontal: 0 },
        off ? { backgroundColor: c.grey50, borderColor: c.grey200 } : pressed && Platform.OS === "ios" ? { backgroundColor: c.grey100 } : null]}
    >
      <Icon size={18} color={off ? c.grey300 : c.grey700} />
    </Pressable>
  );
}

function Stepper({ label, hint, words, earlier, later, onEarlier, onLater }: {
  label: string; hint?: string; words: string; earlier: boolean; later: boolean; onEarlier: () => void; onLater: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Step Icon={Minus} a11y={`${label}: earlier`} off={!earlier} onPress={onEarlier} />
        <Text style={[t.label, t.tab, { flex: 1, textAlign: "center", color: c.ink900 }]} accessibilityLiveRegion="polite">{words}</Text>
        <Step Icon={Plus} a11y={`${label}: later`} off={!later} onPress={onLater} />
      </View>
      {hint ? <Text style={t.caption}>{hint}</Text> : null}
    </View>
  );
}

/** One day, never before `min` nor after `max` (the web's date input's min and max). */
export function DayStep({ label, value, min, max, hint, onChange }: {
  label: string; value: string; min?: string; max?: string; hint?: string; onChange: (d: string) => void;
}) {
  return (
    <Stepper label={label} words={dateLong(value)} {...(hint ? { hint } : {})}
      earlier={min === undefined || value > min} later={max === undefined || value < max}
      onEarlier={() => onChange(addDays(value, -1))} onLater={() => onChange(addDays(value, 1))} />
  );
}

/** One month, "YYYY-MM", never after `max` (Gst.tsx MonthPicker). */
export function MonthStep({ value, max, onChange }: { value: string; max: string; onChange: (m: string) => void }) {
  return (
    <Stepper label="Month" words={monthWords(value)} earlier later={value < max}
      onEarlier={() => onChange(addMonths(value, -1))} onLater={() => onChange(addMonths(value, 1))} />
  );
}

/** From and To, the first never after the last (the pages' From-To inputs). */
export function RangeStep({ from, to, onChange, hints }: {
  from: string; to: string; onChange: (from: string, to: string) => void; hints?: [string, string];
}) {
  return (
    <>
      <DayStep label="From" value={from} max={to} {...(hints ? { hint: hints[0] } : {})} onChange={(d) => onChange(d, to)} />
      <DayStep label="To" value={to} min={from} {...(hints ? { hint: hints[1] } : {})} onChange={(d) => onChange(from, d)} />
    </>
  );
}

/** An on/off setting: each phone's own switch (Misc.tsx Switch). */
export function OnOff({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}>
      <Text style={[t.label, { flex: 1, color: c.ink900 }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: c.success, false: c.grey300 }} thumbColor={c.white} />
    </View>
  );
}

/** A choice from a list (the web's NativeSelect): a box, and a sheet from the
    bottom clear of the home indicator (docs/NATIVE.md). */
export function Choose({ label, value, placeholder, options, onChange }: {
  label: string; value: string; placeholder: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${label}: ${value || placeholder}`}
        android_ripple={{ color: c.grey200 }}
        style={({ pressed }) => ({ minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, paddingHorizontal: 12, flexDirection: "row",
          alignItems: "center", gap: 8, overflow: "hidden", backgroundColor: pressed && Platform.OS === "ios" ? c.grey50 : c.white })}
      >
        <Text numberOfLines={1} style={[t.heading, face[500], { flex: 1, color: value ? c.ink900 : c.grey400 }]}>{value || placeholder}</Text>
        <ChevronDown size={16} color={c.grey500} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space.side, paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 16), gap: 6, maxHeight: "80%" }}>
            <Text style={[t.heading, { marginBottom: 4 }]} accessibilityRole="header">{label}</Text>
            {options.length === 0 ? <Text style={[t.label, { color: c.grey500, paddingVertical: 12 }]}>Nothing to choose from yet.</Text> : null}
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={o} onPress={() => { setOpen(false); onChange(o); }} accessibilityRole="button" accessibilityLabel={o}
                  accessibilityState={{ selected: o === value }} android_ripple={{ color: c.grey200 }}
                  style={({ pressed }) => ({ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: c.grey100,
                    backgroundColor: pressed && Platform.OS === "ios" ? c.grey50 : c.white })}
                >
                  <Text style={[t.label, { flex: 1, color: c.ink900 }]}>{o}</Text>
                  {o === value ? <Check size={18} color={c.orange} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ── Taking it away ─────────────────────────────────────────────── */

/** PDF, Excel (CSV) and Print from the rows on screen (src/core/Export.tsx,
    M-14); or the server's sentence where this person may read the report but
    not take it away. `more`: what of the web's is still on the website. */
export function Files({ table, refusal, more }: { table: ExportTable | null; refusal: string | null; more?: string }) {
  if (refusal) {
    return (
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }} accessibilityRole="text">
        <Lock size={14} color={c.grey500} style={{ marginTop: 2 }} />
        <Text style={[t.caption, { flex: 1 }]}>{refusal}</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <ExportButtons table={table} />
      {more ? (
        <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
          <FileSpreadsheet size={14} color={c.grey400} style={{ marginTop: 1 }} />
          <Text style={[t.caption, { flex: 1 }]}>{`${more}: on the website for now.`}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ── The four states, each in its own words ─────────────────────── */

/** Loading, refused, failed (offline said as such), or nothing: null when there is data to draw. */
export function ReadState({ what, loading, error, has, onRetry }: {
  what: string; loading: boolean; error: string | undefined; has: boolean; onRetry: () => void;
}) {
  if (has) return error ? <Kept what={what} error={error} /> : null;
  if (error) {
    if (isOnline()) return <ReadFailed what={what} error={error} onRetry={onRetry} />;
    return (
      <Card style={{ backgroundColor: c.yellow50, borderColor: c.yellow100, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CloudOff size={16} color={c.yellow800} />
          <Text style={[t.heading, { color: c.yellow800 }]}>No connection</Text>
        </View>
        <Text style={[t.label, { color: c.grey700 }]}>{`${what[0]!.toUpperCase()}${what.slice(1)} has not been read on this phone yet. It shows once the line is back.`}</Text>
        <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={onRetry} /></View>
      </Card>
    );
  }
  if (loading) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 }}>
        <ActivityIndicator color={c.orange} />
        <Text style={t.label} accessibilityLiveRegion="polite">{`Reading ${what}…`}</Text>
      </View>
    );
  }
  return null;
}

/** A re-read failed over figures already shown. */
function Kept({ what, error }: { what: string; error: string }) {
  const off = !isOnline();
  return (
    <Text style={[t.caption, { color: off ? c.yellow800 : c.red700 }]} accessibilityRole="alert">
      {off ? `No connection. Showing ${what} as last read; pull down to read again.` : `Could not read ${what} again: ${error} Showing what was last read.`}
    </Text>
  );
}

/** A report this person may not read: the API's own sentence, and no read. */
export function Refused({ words }: { words: string }) {
  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Lock size={16} color={c.grey500} />
        <Text style={t.heading}>Not open to you</Text>
      </View>
      <Text style={[t.label, { color: c.grey700, lineHeight: 21 }]}>{words}</Text>
    </Card>
  );
}

/** The words where nothing came: "This property has no report to show." */
export function Nothing({ words }: { words: string }) {
  return <Card><Text style={[t.label, { color: c.grey500, textAlign: "center", paddingVertical: 16 }]}>{words}</Text></Card>;
}

/* ── The report ─────────────────────────────────────────────────── */

/** The printed documents' masthead (DocMasthead): the property, the report behind the orange bar, its period. */
export function Masthead({ property, title, period, facts }: { property: string; title: string; period: string; facts?: string }) {
  return (
    <Card style={{ gap: 12 }}>
      <Text style={[t.figure, face[700]]}>{property}</Text>
      <View style={{ borderLeftWidth: 3, borderLeftColor: c.orange, paddingLeft: 12, gap: 2 }}>
        <Text style={[t.heading, face[700], { letterSpacing: 0.8, textTransform: "uppercase" }]}>{title}</Text>
        <Text style={[t.caption, t.tab]}>{period}</Text>
      </View>
      <View style={{ height: 2, backgroundColor: c.orange }} />
      {facts ? <Text style={[t.label, t.tab, { color: c.grey600, lineHeight: 21 }]}>{facts}</Text> : null}
    </Card>
  );
}

/** One labelled figure, the label in small capitals as the web's phone table writes it. */
export function FigureLine({ label, text, missing, negative, strong, color }: {
  label: string; text: string; missing?: boolean; negative?: boolean; strong?: boolean; color?: string;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12, paddingVertical: 3 }}>
      <Text style={[t.caption, { letterSpacing: 0.36, textTransform: "uppercase", flexShrink: 1 }]}>{label}</Text>
      <Text style={[t.label, t.tab, { textAlign: "right", flexShrink: 1, ...face[strong ? 600 : 500],
        color: color ?? (missing ? c.grey500 : negative ? c.red : strong ? c.ink900 : c.grey700) }]}>{text}</Text>
    </View>
  );
}

/** A row of a list, as a card: its title, what sits under it, its figures. */
export function RowCard({ title, under, total, indent = 0, children }: {
  title: string; under?: ReactNode; total?: boolean; indent?: number; children: ReactNode;
}) {
  return (
    <Card style={[{ gap: 6, marginLeft: indent * 12 },
      total ? { borderStyle: "dashed", borderColor: c.grey400, backgroundColor: c.grey50 } : null]}>
      <View style={{ gap: 2 }}>
        <Text style={[t.heading, total ? face[700] : null]}>{title}</Text>
        {under}
      </View>
      <View>{children}</View>
    </Card>
  );
}

const figureOf = (f: Figure, strong: boolean) => (
  <FigureLine key={f.label} label={f.label} text={f.text} missing={f.missing} negative={f.negative} strong={strong} />
);

function Item({ item }: { item: CardItem }) {
  if (item.kind === "band") return <Text style={[t.label, face[600], { color: c.ink900, paddingTop: 4 }]}>{item.text}</Text>;
  const total = item.kind === "total";
  return <RowCard title={item.title} total={total} indent={item.indent}>{item.figures.map((f) => figureOf(f, total))}</RowCard>;
}

/** A report document from the server, drawn section by section (ReportView). */
export function DocReport({ doc, period }: { doc: ReportDoc; period: string }) {
  const tz = doc.property.timezone;
  return (
    <>
      <Masthead property={doc.property.name} title={doc.title} period={period} facts={doc.facts.length ? factsLine(doc.facts, tz) : undefined} />
      {docCards(doc).map((sec) => (
        <View key={sec.key} style={{ gap: space.tile }}>
          <Text style={[t.heading, { color: c.orange700, marginTop: 8 }]} accessibilityRole="header">{sec.title}</Text>
          {sec.items.length === 0
            ? <Text style={[t.label, { color: c.grey500 }]}>{sec.empty}</Text>
            : sec.items.map((item, i) => <Item key={i} item={item} />)}
          {sec.note ? <Text style={[t.caption, { lineHeight: 18 }]}>{sec.note}</Text> : null}
        </View>
      ))}
      {doc.chart ? <Text style={t.caption}>The chart: on the website for now.</Text> : null}
      <Notes lines={doc.footnotes.map((f) => `* ${f}`)} />
    </>
  );
}

/** The notes at a report's foot. */
export function Notes({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <View style={{ gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: c.grey200 }}>
      {lines.map((l) => <Text key={l} style={[t.caption, { lineHeight: 18 }]}>{l}</Text>)}
    </View>
  );
}
