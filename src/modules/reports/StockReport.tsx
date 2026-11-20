import { AlertTriangle, ChevronDown, ChevronUp, Lock } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import type { ExportTable } from "../../core/exportDoc";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { Back } from "../guest-services/kit";
import { Day } from "../housekeeping/DayStepper";
import { LoadFailed } from "../laundry/kit";
import { readStockReport, readSuppliers } from "./stockData";
import {
  asked, CHOOSE_FIRST, emptyWords, exportOf, factsLine, failedTitle, monthStartOf, NO_REPORT, refusedTitle, sectionCards,
  STOCK_REPORTS, TEST_DOCUMENT, printedStamp, type Card, type Figure, type ReportDoc, type StockReportKey,
} from "./stockReports.ts";

/* ══════════════════════════════════════════════════════════════════
   ONE STORE, BAR OR SUPPLIER REPORT (lane m13-rep-stock, 19 Nov) — the
   web's DocumentReport + ReportShell + ReportView
   (src/modules/reports/components/), on a phone: the heading and its
   period, the export, the report's own choices (Bar stock's days, the
   statement's supplier and days), then the document as the printed copy
   has it - the property, the title behind the orange bar, the facts, each
   section's rows as cards of labelled figures, the footnotes, who printed
   it and when. Every figure is the server's cell (stockReports.ts).
   ══════════════════════════════════════════════════════════════════ */

const ink700 = "#142b3a"; // theme.css --color-ink-700
const accentFrom = "#fe611f"; // theme.css --color-accent-from
const caps = { fontSize: 12, lineHeight: 17, letterSpacing: 0.6, textTransform: "uppercase", color: c.grey500, ...face[700] } as const;
const body = { fontSize: 14, lineHeight: 21 } as const;

export function StockReportScreen({ hotel, report, by, supplier, onSupplier, onBack }: {
  hotel: Hotel; report: StockReportKey; by: string | null;
  /** The statement's supplier, from the address (?supplier=), as the web's. */
  supplier?: string; onSupplier?: (id: string | null) => void;
  onBack: () => void;
}) {
  const about = STOCK_REPORTS[report];
  const bd = hotel.businessDate;
  const statement = report === "supplier-statement";
  const windowed = report === "bar-stock";
  const [from, setFrom] = useState(windowed ? bd : monthStartOf(bd));
  const [to, setTo] = useState(bd);
  const list = useRead(() => (statement ? readSuppliers(hotel.code) : Promise.resolve(null)), ["reports", hotel.code, "supplier-list", statement]);
  const suppliers = list.data && "suppliers" in list.data ? list.data.suppliers : [];
  const name = suppliers.find((x) => x.id === supplier)?.name;
  const q = asked(report, bd, windowed || statement ? { from, to, ...(supplier ? { supplier } : {}), ...(name ? { supplierName: name } : {}) } : {});
  const read = useRead(
    () => (q.query ? readStockReport(hotel.code, report, q.query) : Promise.resolve(null)),
    ["reports", hotel.code, report, q.query],
  );
  const got = read.data;
  const doc = got && "doc" in got ? got.doc : null;
  const table: ExportTable | null = doc ? exportOf(doc, q.period) : null;

  /* The day steppers (M-7: no date-picker package): To never before From. */
  const pickFrom = (d: string) => { setFrom(d); if (d > to) setTo(d); };

  return (
    <Screen refreshing={read.loading && got !== undefined} onRefresh={() => { read.reload(); if (statement) list.reload(); }}>
      <Head title={doc?.title ?? q.title} under={q.period} action={<Back onPress={onBack} />} />
      {/* ReportShell's Print, PDF, Excel and CSV: the core's export (M-14: real PDF and Excel-readable files). */}
      <ExportButtons table={table} />
      <Text style={[t.caption, { color: c.grey600 }]}>Email: On the website for now.</Text>

      {windowed || statement ? (
        <View style={{ gap: 10 }}>
          {statement ? <SupplierPick list={list.data} loading={list.loading} error={list.error} picked={supplier ?? null} name={name ?? null} onPick={(id) => onSupplier?.(id)} onRetry={list.reload} /> : null}
          <Labelled label="From"><Day label="From" value={from} off={false} onChange={pickFrom} /></Labelled>
          <Labelled label="To"><Day label="To" value={to} min={from} off={false} onChange={setTo} /></Labelled>
        </View>
      ) : null}

      {got !== undefined && read.error ? <Stale error={read.error} onRetry={read.reload} /> : null}
      {got === undefined ? (
        read.error
          ? <LoadFailed title={failedTitle(about.what)} error={read.error} onRetry={read.reload}
              offline={`This device is offline, so ${about.what} cannot load. It loads by itself as soon as the connection is back.`} />
          : <Reading words={`Reading ${about.what}…`} />
      ) : got === null ? (
        <Quiet>{CHOOSE_FIRST}</Quiet>
      ) : "refused" in got ? (
        <Refused title={refusedTitle(about.what)} sentence={got.refused} />
      ) : "none" in got ? (
        <Quiet>{NO_REPORT}</Quiet>
      ) : (
        <Document doc={got.doc} period={q.period} test={Boolean(hotel.testOf)} by={by} />
      )}
    </Screen>
  );
}

/* ── The document (ReportShell's card + ReportView) ──────────────── */

function Document({ doc, period, test, by }: { doc: ReportDoc; period: string; test: boolean; by: string | null }) {
  const tz = doc.property.timezone ?? "Asia/Kolkata";
  const facts = factsLine(doc.facts, tz);
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY }}>
      {test ? (
        <Text style={{ textAlign: "center", fontSize: 26, letterSpacing: 2, color: c.orange700, ...face[700], borderWidth: 4, borderColor: c.orange600, borderRadius: 6, paddingVertical: 8, marginBottom: 16 }}>
          {TEST_DOCUMENT}
        </Text>
      ) : null}
      {/* DocMasthead: the property, then the report and its period behind the orange bar. */}
      <Text style={{ fontSize: 20, lineHeight: 26, color: ink700, ...face[700] }}>{doc.property.name}</Text>
      <View style={{ marginTop: 12, borderLeftWidth: 4, borderLeftColor: accentFrom, paddingLeft: 10 }}>
        <Text style={{ fontSize: 16, lineHeight: 22, letterSpacing: 1, textTransform: "uppercase", color: ink700, ...face[700] }}>{doc.title}</Text>
        <Text style={[t.caption, t.tab, { marginTop: 2 }]}>{period}</Text>
      </View>
      <View style={{ height: 3, backgroundColor: accentFrom, marginTop: 12 }} />
      <View style={{ height: 1, backgroundColor: c.grey200, marginBottom: 16 }} />
      {facts ? <Text style={[t.label, t.tab, body, { marginBottom: 8 }]}>{facts}</Text> : null}

      {doc.sections.map((section) => {
        const cards = sectionCards(section, tz);
        return (
          <View key={section.key} style={{ marginTop: 16 }}>
            <Text style={[body, { color: c.orange700, ...face[600], paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: c.grey200 }]} accessibilityRole="header">
              {section.title}
            </Text>
            {cards.length === 0
              ? <Text style={[t.label, body, { color: c.grey500, paddingVertical: 12 }]}>{emptyWords(section)}</Text>
              : cards.map((card, i) => <RowCard key={i} card={card} />)}
            {section.note ? <Text style={[t.caption, { lineHeight: 18, paddingTop: 6 }]}>{section.note}</Text> : null}
          </View>
        );
      })}

      {doc.chart ? <ChartFigures chart={doc.chart} /> : null}

      {doc.footnotes.length > 0 ? (
        <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.grey200, gap: 4 }}>
          {doc.footnotes.map((f) => <Text key={f} style={[t.caption, { lineHeight: 18 }]}>* {f}</Text>)}
        </View>
      ) : null}

      <View style={{ marginTop: 24, borderTopWidth: 2, borderTopColor: ink700, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <Text style={[t.caption, t.tab]}>Printed {printedStamp(new Date())}</Text>
        <Text style={t.caption}>{by ?? "-"}</Text>
      </View>
    </View>
  );
}

/** One row: its first column names it, then each figure under its label, a
    group's figures (the excise registers' sizes) side by side under its heading. */
function RowCard({ card }: { card: Card }) {
  if (card.kind === "band") {
    return <Text style={[body, { color: c.ink900, ...face[600], paddingTop: 12, paddingBottom: 4 }]}>{card.text}</Text>;
  }
  const total = card.kind === "total";
  return (
    <View style={{
      paddingVertical: 10, paddingLeft: card.indent * 16, gap: 6,
      ...(total
        ? { borderTopWidth: 1, borderBottomWidth: 1, borderStyle: "dashed", borderColor: c.grey400 }
        : { borderBottomWidth: 1, borderBottomColor: c.grey100 }),
    }}>
      {card.title !== null ? <Text style={[body, { color: c.ink900, ...face[total ? 600 : 500] }]}>{card.title}</Text> : null}
      {card.parts.map((p, i) => p.group === null ? (
        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <Text style={[t.caption, { flexShrink: 1 }]}>{p.figure.label}</Text>
          <Value f={p.figure} strong={total} />
        </View>
      ) : (
        <View key={i} style={{ gap: 4 }}>
          <Text style={caps}>{p.group}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 6 }}>
            {p.figures.map((f, j) => (
              <View key={j} style={{ width: "25%", minWidth: 64, paddingRight: 8 }}>
                <Text style={[t.caption, t.tab]}>{f.label}</Text>
                <Value f={f} strong={total} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function Value({ f, strong }: { f: Figure; strong: boolean }) {
  return (
    <Text style={[t.label, t.tab, body, {
      color: f.negative ? c.red : f.missing ? c.grey500 : c.ink900, ...face[strong ? 600 : 500],
      textAlign: f.numeric ? "right" : "left", flexShrink: 1,
    }]}>
      {f.value}
    </Text>
  );
}

/** A chart's figures, when a report carries one (none of this lane's do today): its bars as words. */
function ChartFigures({ chart }: { chart: NonNullable<ReportDoc["chart"]> }) {
  const series = chart.series[0];
  if (!series) return null;
  return (
    <View style={{ marginTop: 16, gap: 4 }}>
      <Text style={[t.heading, { textAlign: "center" }]}>{chart.title}</Text>
      {chart.x.map((x, i) => (
        <View key={x} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={t.caption}>{x}</Text>
          <Text style={[t.caption, t.tab]}>{series.values[i] == null ? "-" : String(series.values[i])}</Text>
        </View>
      ))}
    </View>
  );
}

/* ── The choices (Ledgers.tsx SupplierStatementPage, Voids.tsx WindowReport) ── */

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={[t.label, { color: c.grey600 }]}>{label}</Text>
      {children}
    </View>
  );
}

type Listed = Awaited<ReturnType<typeof readSuppliers>> | null | undefined;
function SupplierPick({ list, loading, error, picked, name, onPick, onRetry }: {
  list: Listed; loading: boolean; error: string | undefined; picked: string | null; name: string | null;
  onPick: (id: string | null) => void; onRetry: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (list && "refused" in list) return <Refused title="The suppliers are not available" sentence={list.refused} />;
  const choices = list && "suppliers" in list ? list.suppliers : [];
  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <View style={{ gap: 4 }}>
      <Text style={[t.label, { color: c.grey600 }]}>Supplier</Text>
      <Pressable
        onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={`Supplier: ${name ?? "Pick a supplier"}`}
        accessibilityState={{ expanded: open }} android_ripple={{ color: c.grey200 }}
        style={({ pressed }) => ({
          minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: c.grey300, paddingHorizontal: 12, overflow: "hidden",
          flexDirection: "row", alignItems: "center", gap: 8,
          backgroundColor: pressed && Platform.OS === "ios" ? c.grey50 : c.white,
        })}
      >
        <Text style={[t.label, body, { flex: 1, color: name ? c.ink900 : c.grey500 }]}>{name ?? "Pick a supplier"}</Text>
        <Icon size={16} color={c.grey600} />
      </Pressable>
      {error && !list ? (
        <Pressable onPress={onRetry} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={[t.caption, { color: c.red700 }]}>Could not read the suppliers: {error} Tap to try again.</Text>
        </Pressable>
      ) : null}
      {open ? (
        <View style={{ borderWidth: 1, borderColor: c.grey200, borderRadius: 8, backgroundColor: c.white, overflow: "hidden" }}>
          {loading && !list ? <View style={{ padding: 12 }}><ActivityIndicator color={c.orange} /></View> : null}
          {list && choices.length === 0 ? <Text style={[t.label, { padding: 12, color: c.grey500 }]}>No supplier is on the list yet.</Text> : null}
          {[{ id: "", name: "Pick a supplier" }, ...choices].map((x) => (
            <Pressable
              key={x.id || "none"} onPress={() => { setOpen(false); onPick(x.id || null); }}
              accessibilityRole="button" accessibilityState={{ selected: (picked ?? "") === x.id }} android_ripple={{ color: c.grey200 }}
              style={({ pressed }) => ({
                minHeight: 48, justifyContent: "center", paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: c.grey100,
                backgroundColor: (picked ?? "") === x.id ? c.orange50 : pressed && Platform.OS === "ios" ? c.grey50 : c.white,
              })}
            >
              <Text style={[t.label, body, { color: x.id ? c.ink900 : c.grey500 }]}>{x.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ── The states (ReadProblem.tsx, DocumentReport) ────────────────── */

function Reading({ words }: { words: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
      <ActivityIndicator color={c.orange} />
      <Text style={[t.label, { color: c.grey500 }]}>{words}</Text>
    </View>
  );
}

function Quiet({ children }: { children: string }) {
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingVertical: 40, paddingHorizontal: 24 }}>
      <Text style={[t.label, { color: c.grey500, textAlign: "center" }]}>{children}</Text>
    </View>
  );
}

/** The server said no, in its own sentence (EmptyState with the lock). */
function Refused({ title, sentence }: { title: string; sentence: string }) {
  return (
    <View accessibilityRole="alert" style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24, backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Lock size={20} color={c.grey400} />
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 22 }]}>{sentence}</Text>
    </View>
  );
}

/** A read again that failed over the report already on screen (ReadStale's words). */
function Stale({ error, onRetry }: { error: string; onRetry: () => void }) {
  const cause = isOnline() ? error.replace(/\.$/, "") : "no connection";
  return (
    <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel={`Not up to date: ${cause}. Try again`}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, borderWidth: 1, borderColor: c.yellow100, backgroundColor: c.yellow50, paddingHorizontal: 14, paddingVertical: 8 }}>
      <AlertTriangle size={16} color={c.yellow800} />
      <Text style={[t.label, { color: c.yellow800, flex: 1 }]}>Not up to date: {cause}. <Text style={{ textDecorationLine: "underline" }}>Try again</Text></Text>
    </Pressable>
  );
}
