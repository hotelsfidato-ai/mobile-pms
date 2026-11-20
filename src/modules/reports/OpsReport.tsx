import { Minus, Plus, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { DateField } from "../../core/DateField";
import { ExportButtons } from "../../core/Export";
import { asRole } from "../../core/menu";
import { useSession } from "../../core/session";
import { c, t } from "../../core/theme";
import { Head, Screen, ripple, s as kit, shade, useRead } from "../../core/ui";
import { readReport, type OpsReportKey } from "./opsData";
import { dayWords, exportOf, monthFrom, monthWords, plusDays, rangeWords, type ReportQuery } from "./opsDoc";
import { DocView, Kept, NotRead, NotYours, Quiet, Reading } from "./OpsDocView";
import { PAGES, notYourRole, type ReportLink } from "./opsIndex";

/* ══════════════════════════════════════════════════════════════════
   ONE REPORT SCREEN (mobile/m13-rep-ops) — the web's
   components/DocumentReport.tsx: the property's document from the server,
   drawn in the report's card, with its files; four states, each in its own
   words (reading · could not read, with the server's reason · no such
   property · the report), and the page guard of RequireAccess.tsx first.

   The pages, each the web's own (pages/ManagerReport.tsx, NightAudit.tsx,
   Statistics.tsx, Ledgers.tsx NoShowPage, Voids.tsx ItemSalesPage): the
   day, the month and the year are the property's business date's (REP-1),
   nothing typed in; Item sales asks From and To (day steppers, M-7).

   The files (NATIVE.md, BRIEF-T3, M-14): PDF, Excel (a CSV file) and Print
   from the rows shown, through core/Export.tsx. The web's Email button (a
   dialog that sends the server's file) is on the website for now.
   ══════════════════════════════════════════════════════════════════ */

const LEFT = "Email: on the website for now.";

export function OpsReport({ hotel, role, page, report, title, period, query, what, controls }: {
  hotel: Hotel; role: string | null; page: Pick<ReportLink, "may" | "menu">;
  report: OpsReportKey; title: string; period: string; query: ReportQuery; what: string; controls?: ReactNode;
}) {
  const s = useSession();
  const code = hotel.code;
  const open = page.may(asRole(role));
  const [pulled, setPulled] = useState(false);
  const read = useRead(() => (open ? readReport(code, report, query) : Promise.resolve(null)), ["reports", code, "ops", report, query]);
  const reload = () => { setPulled(true); read.reload(); };
  const doc = read.data;

  if (!open) {
    return (
      <Screen refreshing={false} onRefresh={() => undefined}>
        <Head title={title} />
        <NotYours sentence={notYourRole(role, page.menu)} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={pulled && read.loading} onRefresh={reload}>
      <Head title={doc?.title ?? title} under={period} />
      <View style={{ gap: 6 }}>
        <ExportButtons table={doc ? exportOf(doc, period) : null} />
        <Text style={t.caption}>{LEFT}</Text>
      </View>
      {controls}
      {doc === undefined ? (
        read.error ? <NotRead what={what} error={read.error} onRetry={reload} /> : <Reading what={what} />
      ) : doc === null ? (
        <Quiet text="This property has no report to show." />
      ) : (
        <>
          <Kept error={read.error} what={what} />
          <DocView doc={doc} period={period} ranBy={s.who?.scope.fullName ?? ""} test={Boolean(hotel.testOf)} />
        </>
      )}
    </Screen>
  );
}

/* ── The pages ──────────────────────────────────────────────────── */

type Page = { hotel: Hotel; role: string | null };
const asOn = (h: Hotel) => `As on ${dayWords(h.businessDate)}`;

/** pages/ManagerReport.tsx: read afresh each time it opens (D27-151; the core's cache keeps nothing fresh). */
export const ManagerReport = ({ hotel, role }: Page) => (
  <OpsReport hotel={hotel} role={role} page={PAGES.manager} report="manager" title="Manager report"
    period={asOn(hotel)} query={{ asOn: hotel.businessDate }} what="the manager report" />
);

export const NightAuditReport = ({ hotel, role }: Page) => (
  <OpsReport hotel={hotel} role={role} page={PAGES.nightAudit} report="night-audit" title="Night audit report"
    period={asOn(hotel)} query={{ asOn: hotel.businessDate }} what="the night audit report" />
);

export const NoShowReport = ({ hotel, role }: Page) => (
  <OpsReport hotel={hotel} role={role} page={PAGES.noShow} report="no-show" title="No show"
    period={dayWords(hotel.businessDate)} query={{ asOn: hotel.businessDate }} what="the no show report" />
);

export const MonthlyOccupancy = ({ hotel, role }: Page) => (
  <OpsReport hotel={hotel} role={role} page={PAGES.monthlyOccupancy} report="monthly-occupancy" title="Monthly occupancy"
    period={monthWords(hotel.businessDate)} query={{ month: hotel.businessDate.slice(0, 7) }} what="monthly occupancy" />
);

export const MonthlyStatistics = ({ hotel, role }: Page) => (
  <OpsReport hotel={hotel} role={role} page={PAGES.monthlyStats} report="monthly-statistics" title="Monthly statistics"
    period={monthWords(hotel.businessDate)} query={{ month: hotel.businessDate.slice(0, 7) }} what="monthly statistics" />
);

export const YearlyStatistics = ({ hotel, role }: Page) => (
  <OpsReport hotel={hotel} role={role} page={PAGES.yearlyStats} report="yearly-statistics" title="Yearly statistics"
    period={hotel.businessDate.slice(0, 4)} query={{ year: Number(hotel.businessDate.slice(0, 4)) }} what="yearly statistics" />
);

/** Voids.tsx WindowReport: From and To, opening on the business month so far. The web's From
    goes no later than To and its To no earlier than From; To has no end (the web's). */
export function ItemSales({ hotel, role }: Page) {
  const bd = hotel.businessDate;
  const [from, setFrom] = useState(monthFrom(bd));
  const [to, setTo] = useState(bd);
  return (
    <OpsReport hotel={hotel} role={role} page={PAGES.itemSales} report="item-sales" title="Item sales"
      period={rangeWords(from, to)} query={{ from, asOn: to }} what="the item sales"
      controls={(
        <View style={{ gap: 12 }}>
          <DayPick label="From" value={from} max={to} onChange={setFrom} />
          <DayPick label="To" value={to} min={from} onChange={setTo} />
        </View>
      )} />
  );
}

/** A report's day (the web's date input, its min and max): each phone's own date picker (M-16, core
    DateField), the day as the same text. */
export function DayPick({ label, value, min, max, onChange }: { label: string; value: string; min?: string; max?: string; onChange: (v: string) => void }) {
  return <DateField label={label} value={value} min={min} max={max} hotel={{ businessDate: value }} onChange={(d) => { if (d) onChange(d); }} />;
}

/** A stepper (M-7), kept for a month (DateField picks days): − a day earlier, + a day later, within the web's min and max. */
export function DayStep({ label, value, min, max, onChange, words = dayWords, step = (d, n) => plusDays(d, n) }: {
  label: string; value: string; min?: string; max?: string; onChange: (v: string) => void;
  words?: (v: string) => string; step?: (v: string, n: number) => string;
}) {
  const button = (Icon: LucideIcon, a11y: string, off: boolean, next: string) => (
    <Pressable
      onPress={() => onChange(next)} disabled={off} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ disabled: off }}
      android_ripple={{ ...ripple, borderless: true }}
      style={shade(({ pressed }) => [kit.capsule, { width: 44, paddingHorizontal: 0 },
        off ? { backgroundColor: c.grey50, borderColor: c.grey200 } : pressed && { backgroundColor: c.grey100 }])}
    >
      <Icon size={18} color={off ? c.grey300 : c.grey700} />
    </Pressable>
  );
  const back = step(value, -1);
  const on = step(value, 1);
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {button(Minus, `${label}: earlier`, min !== undefined && back < min, back)}
        <Text style={[t.label, t.tab, { flex: 1, textAlign: "center", color: c.ink900 }]} accessibilityLiveRegion="polite">{words(value)}</Text>
        {button(Plus, `${label}: later`, max !== undefined && on > max, on)}
      </View>
    </View>
  );
}
