import { CloudOff, ShieldOff } from "lucide-react-native";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import { isOnline } from "../../core/offline";
import { c, face, t } from "../../core/theme";
import { Capsule, Card } from "../../core/ui";
import {
  TEST_DOCUMENT, barLabel, cardOf, chartAxis, factsLine, formatCell, layoutOf, printedAt, writeCell,
  type ReportDoc, type ReportRow, type ReportSection,
} from "./opsDoc";

/* ══════════════════════════════════════════════════════════════════
   ONE REPORT DOCUMENT, DRAWN FOR A PHONE (mobile/m13-rep-ops) — the web's
   components/ReportView.tsx inside ReportShell.tsx's card (the masthead,
   the facts line, the sections, the chart, the footnotes, "Printed … who").
   Sections that fit a phone are lines of a label and a figure; wider ones
   cards of labelled figures in the web's order of columns (opsDoc.ts).
   Every figure as the server sent it; nothing here adds up.
   ══════════════════════════════════════════════════════════════════ */

/* src/styles/theme.css tokens core/theme.ts lacks: the printed documents' ink and orange (D27-52). */
const INK700 = "#142b3a";
const ACCENT = "#fe611f";
const FONT = { font: "Inter_500Medium", bold: "Inter_600SemiBold" };

/** The report itself, in the web's white card. `ranBy` is who is signed in (ReportShell's footer). */
export function DocView({ doc, period, ranBy, test }: { doc: ReportDoc; period: string; ranBy: string; test: boolean }) {
  const tz = doc.property.timezone ?? "Asia/Kolkata";
  return (
    <Card style={{ gap: 0 }}>
      {test ? <TestMark /> : null}
      <Masthead name={doc.property.name} title={doc.title} period={period} />
      {doc.facts.length ? <Text style={[t.label, t.tab, { color: c.grey600, marginBottom: 12, lineHeight: 21 }]}>{factsLine(doc.facts, tz)}</Text> : null}
      {doc.sections.map((s) => <Section key={s.key} section={s} tz={tz} />)}
      {doc.chart ? <Chart doc={doc} /> : null}
      {doc.footnotes.length ? (
        <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.grey200, gap: 4 }}>
          {doc.footnotes.map((f) => <Text key={f} style={[t.caption, { lineHeight: 18 }]}>{`* ${f}`}</Text>)}
        </View>
      ) : null}
      {/* When this copy was produced, and by whom (ReportShell's footer). */}
      <View style={{ marginTop: 20, borderTopWidth: 2, borderTopColor: INK700, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <Text style={[t.caption, t.tab]}>{`Printed ${printedAt(new Date())}`}</Text>
        <Text style={t.caption}>{ranBy || "-"}</Text>
      </View>
    </Card>
  );
}

/** Document.tsx DocMasthead: the property, then the report and its period behind the orange bar. */
export function Masthead({ name, title, period }: { name: string; title: string; period: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 20, ...face[700], color: INK700, letterSpacing: -0.2 }}>{name}</Text>
      <View style={{ marginTop: 12, borderLeftWidth: 4, borderLeftColor: ACCENT, paddingLeft: 10 }}>
        <Text style={{ fontSize: 16, ...face[700], color: INK700, letterSpacing: 0.96, textTransform: "uppercase" }}>{title}</Text>
        <Text style={[t.caption, t.tab, { marginTop: 2 }]}>{period}</Text>
      </View>
      <View style={{ height: 3, backgroundColor: ACCENT, marginTop: 12 }} />
      <View style={{ height: 1, backgroundColor: c.grey200 }} />
    </View>
  );
}

/** TestDocumentMark: a test hotel's report says so on itself (D27-296 (8)). */
function TestMark() {
  return (
    <Text
      style={{ marginBottom: 16, borderRadius: 6, borderWidth: 4, borderColor: c.orange600, paddingVertical: 10, textAlign: "center",
        fontSize: 26, ...face[700], letterSpacing: 2, color: c.orange700, textTransform: "uppercase" }}
    >
      {TEST_DOCUMENT}
    </Text>
  );
}

/** The table head's small capitals over a 2px ink rule (Document.tsx DOC_TH). */
const TH = { fontSize: 12, ...face[700], letterSpacing: 0.96, textTransform: "uppercase" as const, color: c.grey500 };

function Section({ section: s, tz }: { section: ReportSection; tz: string }) {
  const lines = layoutOf(s.columns) === "lines";
  return (
    <View style={{ marginTop: 8 }}>
      {lines && s.columns.length ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingTop: 8, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: INK700 }}>
          {s.columns.map((col) => <Text key={col.key} style={TH}>{col.label}</Text>)}
        </View>
      ) : null}
      <Text style={[t.label, face[600], { color: c.orange700, paddingTop: 14, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: c.grey200 }]} accessibilityRole="header">
        {s.title}
      </Text>
      {s.rows.length === 0 ? (
        <Text style={[t.label, { color: c.grey500, paddingVertical: 12 }]}>{s.empty ?? "Nothing to report."}</Text>
      ) : (
        s.rows.map((row, i) => (lines ? <LineRow key={i} row={row} s={s} tz={tz} /> : <CardRow key={i} row={row} s={s} tz={tz} />))
      )}
      {s.note ? <Text style={[t.caption, { paddingTop: 4, paddingBottom: 12, lineHeight: 18 }]}>{s.note}</Text> : null}
    </View>
  );
}

const indentOf = (row: ReportRow) => (row.indent ?? 0) * 16;
const totalRule = { borderTopWidth: 1, borderBottomWidth: 1, borderStyle: "dashed" as const, borderColor: c.grey400 };

function Band({ text }: { text: string }) {
  return <Text style={[t.label, face[600], { color: c.ink900, paddingTop: 12, paddingBottom: 4 }]}>{text}</Text>;
}

/** A label and one figure on a line (ReportView's Line, two columns). */
function LineRow({ row, s, tz }: { row: ReportRow; s: ReportSection; tz: string }) {
  if (row.kind === "band") return <Band text={cardOf(row, s.columns, tz).title} />;
  const total = row.kind === "total";
  const cells = s.columns.map((col) => writeCell(row, col, tz));
  return (
    <View style={[{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, paddingVertical: 8 },
      total ? totalRule : { borderBottomWidth: 1, borderBottomColor: c.grey100 }]}>
      {cells.map((w, i) => (
        <Text
          key={s.columns[i]!.key}
          style={[t.label, w?.numeric && t.tab, {
            color: w?.missing ? c.grey500 : w?.negative ? c.red : c.ink900,
            ...face[total ? 600 : 500],
            textAlign: w?.numeric ? "right" : "left",
            flexShrink: i === 0 ? 1 : 0,
            paddingLeft: i === 0 ? indentOf(row) : 0,
          }]}
        >
          {w?.text ?? ""}
        </Text>
      ))}
    </View>
  );
}

/** A row of a wide section as a card: its name, then each column's figure under its label, two across. */
function CardRow({ row, s, tz }: { row: ReportRow; s: ReportSection; tz: string }) {
  const card = cardOf(row, s.columns, tz);
  if (row.kind === "band") return <Band text={card.title} />;
  const total = row.kind === "total";
  return (
    <View style={[{ paddingVertical: 10, gap: 6, paddingLeft: indentOf(row) }, total ? totalRule : { borderBottomWidth: 1, borderBottomColor: c.grey100 }]}>
      {card.title ? <Text style={[t.label, { color: c.ink900, ...face[total ? 600 : 500] }]}>{card.title}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 6 }}>
        {card.figures.map((f, i) => (
          <View key={i} style={{ width: "50%", paddingRight: 8 }}>
            <Text style={t.caption} numberOfLines={2}>{f.label}</Text>
            <Text style={[t.label, f.numeric && t.tab, { color: f.missing ? c.grey500 : f.negative ? c.red : c.ink900, ...face[total ? 600 : 500] }]}>{f.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ── The chart: ReportView.tsx Chart (recharts' bars) ────────────── */

const CH = { h: 320, top: 24, foot: 26, axis: 44, slot: 24, min: 640 };

/** One series of bars with the figure over each, scrolling sideways inside the report as the
    web's does on a narrow screen ("a day's number stays readable"). */
function Chart({ doc }: { doc: ReportDoc }) {
  const chart = doc.chart!;
  const series = chart.series[0];
  if (!series) return null;
  const ticks = chartAxis(chart.unit, series.values);
  const top = ticks[ticks.length - 1]!;
  const width = Math.max(CH.min, CH.axis + chart.x.length * CH.slot + 8);
  const plotW = width - CH.axis - 8;
  const plotH = CH.h - CH.top - CH.foot;
  const floor = CH.top + plotH;
  const band = plotW / Math.max(1, chart.x.length);
  const bar = band * 0.8;
  const yOf = (v: number) => floor - (Math.min(v, top) / top) * plotH;
  const said = chart.x.map((x, i) => `${x}: ${formatCell(series.values[i] ?? null, chart.unit)}`).join(", ");
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[t.heading, { textAlign: "center" }]}>{chart.title}</Text>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 6, marginTop: 8 }} accessibilityElementsHidden>
        <View style={{ width: 10, height: 10, backgroundColor: c.tangerine }} />
        <Text style={t.caption}>{series.label}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: 4 }}>
        <View accessible accessibilityRole="image" accessibilityLabel={`${chart.title}. ${said}`}>
          <Svg width={width} height={CH.h}>
            {ticks.map((v) => (
              <G key={v}>
                <Line x1={CH.axis} x2={width - 8} y1={yOf(v)} y2={yOf(v)} stroke={c.grey200} strokeDasharray="2 4" strokeWidth={1} />
                <SvgText x={CH.axis - 8} y={yOf(v) + 4} textAnchor="end" fontSize={12} fontFamily={FONT.font} fill={c.grey600}>{String(v)}</SvgText>
              </G>
            ))}
            <Line x1={CH.axis} x2={width - 8} y1={floor} y2={floor} stroke={c.grey300} strokeWidth={1} />
            {chart.x.map((x, i) => {
              const v = series.values[i];
              const cx = CH.axis + (i + 0.5) * band;
              const y = typeof v === "number" ? yOf(Math.max(0, v)) : floor;
              return (
                <G key={`${x}-${i}`}>
                  {typeof v === "number" && floor - y > 0 ? <Rect x={cx - bar / 2} y={y} width={bar} height={floor - y} fill={c.tangerine} /> : null}
                  {barLabel(v) ? <SvgText x={cx} y={y - 5} textAnchor="middle" fontSize={11} fontFamily={FONT.font} fill={c.grey700}>{barLabel(v)}</SvgText> : null}
                  <SvgText x={cx} y={floor + 18} textAnchor="middle" fontSize={12} fontFamily={FONT.font} fill={c.grey600}>{x}</SvgText>
                </G>
              );
            })}
          </Svg>
        </View>
      </ScrollView>
    </View>
  );
}

/* ── The page's other states, each in its own words ─────────────── */

/** RequireAccess.tsx: the page is not part of this role (the menu's own rule). */
export function NotYours({ sentence }: { sentence: string }) {
  return (
    <Card style={{ alignItems: "center", gap: 8, paddingVertical: 28 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center" }}>
        <ShieldOff size={20} color={c.grey400} />
      </View>
      <Text style={[t.heading, { textAlign: "center", fontSize: 18 }]} accessibilityRole="header">This page is not part of your role</Text>
      <Text style={[t.label, { textAlign: "center", lineHeight: 22 }]}>{sentence}</Text>
    </Card>
  );
}

/** The first read, on its way (the web's skeleton; each phone's own spinner, NATIVE.md). */
export function Reading({ what }: { what: string }) {
  return (
    <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
      <ActivityIndicator color={c.orange} />
      <Text style={[t.label, { color: c.grey500 }]}>{`Reading ${what}…`}</Text>
    </Card>
  );
}

/** A first read that failed: offline, said as such; online, the server's own words (ReadFailed). */
export function NotRead({ what, error, onRetry }: { what: string; error: string; onRetry: () => void }) {
  const off = !isOnline();
  return (
    <Card style={[{ gap: 8 }, off ? { backgroundColor: c.yellow50, borderColor: c.yellow100 } : { backgroundColor: c.red50, borderColor: c.red50 }]}>
      <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {off ? <CloudOff size={16} color={c.yellow800} /> : null}
        <Text style={[t.heading, { color: off ? c.yellow800 : c.red700, flexShrink: 1 }]}>{off ? "No connection" : `Could not read ${what}`}</Text>
      </View>
      <Text style={[t.label, { color: c.grey700, lineHeight: 21 }]}>
        {off ? `${what[0]!.toUpperCase()}${what.slice(1)} has not been read on this phone yet. It shows once the line is back.` : error}
      </Text>
      <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={onRetry} /></View>
    </Card>
  );
}

/** A re-read that failed over a report already on screen: kept, and said. */
export function Kept({ error, what }: { error: string | undefined; what: string }) {
  if (!error) return null;
  const off = !isOnline();
  return (
    <Text style={[t.caption, { color: off ? c.yellow800 : c.red700, lineHeight: 18 }]} accessibilityRole="alert">
      {off ? `No connection. Showing ${what} as last read; pull down to read again.` : `Could not read ${what} again: ${error} Showing what was last read.`}
    </Text>
  );
}

/** A quiet line in the report's card: no such property, nothing chosen yet (DocumentReport.tsx). */
export function Quiet({ text }: { text: string }) {
  return (
    <Card style={{ paddingVertical: 32 }}>
      <Text style={[t.label, { color: c.grey500, textAlign: "center" }]}>{text}</Text>
    </Card>
  );
}

