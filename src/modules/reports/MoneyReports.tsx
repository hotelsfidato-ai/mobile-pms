import { FileJson } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { orNull, type Hotel } from "../../core/api";
import { c, t } from "../../core/theme";
import { useRead } from "../../core/ui";
import { DownloadButton } from "../../core/Download";
import { dateYear } from "./figures";
import { DayStep, DocReport, Files, MonthStep, Nothing, OnOff, ReadState, Refused, RangeStep, ReportPage, Choose } from "./MoneyKit";
import { accountNames, docTable, monthStartOf, monthWords, queryString, rangeWords, type DocKey, type ReportDoc, type ReportQuery } from "./money";
import { GSTR1_FILE_REFUSED, mayDownloadGstr1, whyNoFile, whyNotRead } from "./moneyRoles";

/* ══════════════════════════════════════════════════════════════════
   THE MONEY AND TAX REPORTS THAT ARRIVE AS ONE DOCUMENT, on a phone:
   the web's pages/Ledgers.tsx (City ledger, Money owed by age, Statement of
   account, Commission owed, TDS, Petty cash, Lodging tax), pages/Gst.tsx
   (GSTR-1, Input tax credit, GST on advances) and pages/Voids.tsx (Voids,
   NC bills), each drawn by components/DocumentReport.tsx. Each asks
   GET /api/hotels/:code/reports/:key with its own question and draws the
   server's document as it came (MoneyKit DocReport). Read only.
   ══════════════════════════════════════════════════════════════════ */

interface Props { hotel: Hotel; role: string | null }

/** One document report: who may read it, its read, its four states, its export. */
function DocScreen({ hotel, role, report, title, what, period, query, controls, more, extra }: Props & {
  report: DocKey; title: string; what: string; period: string;
  /** Undefined while the screen still needs a choice (a statement's account): nothing is asked. */
  query: ReportQuery | undefined; controls?: ReactNode; more?: string; extra?: ReactNode;
}) {
  const code = hotel.code;
  const refused = whyNotRead(report, role);
  const path = query ? `/api/hotels/${code}/reports/${report}${queryString(query)}` : null;
  const read = useRead<ReportDoc | null>(
    () => (refused || !path ? Promise.resolve(null) : orNull<ReportDoc>(path)),
    ["reports", code, report, path, refused],
  );
  if (refused) return <ReportPage title={title} period={period} refreshing={false} onRefresh={() => {}}><Refused words={refused} /></ReportPage>;
  const doc = read.data ?? null;
  return (
    <ReportPage
      title={doc?.title ?? title} period={period} controls={controls} refreshing={read.loading} onRefresh={read.reload}
      files={<View style={{ gap: 8 }}>
        <Files table={doc ? docTable(doc, period) : null} refusal={whyNoFile(report, role)} more={more ?? "Email"} />
        {extra}
      </View>}
    >
      <ReadState what={what} loading={read.loading} error={read.error} has={doc !== null} onRetry={read.reload} />
      {doc ? <DocReport doc={doc} period={period} />
        : !path ? <Nothing words="Choose above what the report is of." />
          : read.data === null && !read.loading && !read.error ? <Nothing words="This property has no report to show." /> : null}
    </ReportPage>
  );
}

/** The month so far: from the 1st to the business date (the pages' default range). */
function useRange(hotel: Hotel) {
  const [range, setRange] = useState({ from: monthStartOf(hotel.businessDate), to: hotel.businessDate });
  return [range, (from: string, to: string) => setRange({ from, to })] as const;
}
const span = (from: string, to: string) => `${dateYear(from)} to ${dateYear(to)}`;

/* ── Ledgers.tsx ──────────────────────────────────────────────────── */

/** City ledger: the one day, accounts with nothing on them left out unless the switch puts them back. */
export function CityLedger(p: Props) {
  const bd = p.hotel.businessDate;
  const [ignoreZero, setIgnoreZero] = useState(true);
  return (
    <DocScreen {...p} report="city-ledger" title="City ledger" what="the city ledger" period={dateYear(bd)}
      query={{ asOn: bd, from: bd, ignoreZero }}
      controls={<OnOff label="Ignore zero balance account" value={ignoreZero} onChange={setIgnoreZero} />} />
  );
}

/** Money owed by age, on a date not after the business date. */
export function DuesByAge(p: Props) {
  const bd = p.hotel.businessDate;
  const [asOn, setAsOn] = useState(bd);
  return (
    <DocScreen {...p} report="dues-by-age" title="Money owed by age" what="the money owed by age" period={`Owed on ${dateYear(asOn)}`}
      query={{ asOn }} controls={<DayStep label="Owed on" value={asOn} max={bd} onChange={setAsOn} />} />
  );
}

/** One account's statement for the days chosen; the account from the address or the list. */
export function CompanyStatement(p: Props & { account?: string; onAccount: (a: string) => void }) {
  const code = p.hotel.code;
  const bd = p.hotel.businessDate;
  const account = p.account ?? "";
  const [{ from, to }, setRange] = useRange(p.hotel);
  const refused = whyNotRead("company-statement", p.role);
  /* Every account the City ledger has ever named, zero balances included (Ledgers.tsx 95-99). */
  const accounts = useRead(
    () => (refused ? Promise.resolve(null) : orNull<ReportDoc>(`/api/hotels/${code}/reports/city-ledger${queryString({ asOn: bd, from: bd, ignoreZero: false })}`)),
    ["reports", code, "city-ledger", "accounts", bd, refused],
  );
  const names = accountNames(accounts.data, account || undefined);
  return (
    <DocScreen {...p} report="company-statement" title={account ? `Statement: ${account}` : "Statement of account"}
      what="the statement of account" period={account ? span(from, to) : "Pick an account and the days"}
      query={account ? { from, asOn: to, account } : undefined}
      controls={<>
        <Choose label="Account" value={account} placeholder="Pick an account" options={names} onChange={p.onAccount} />
        {accounts.error && !accounts.data ? <Text style={[t.caption, { color: c.red700 }]}>{`Could not read the accounts: ${accounts.error}`}</Text> : null}
        <RangeStep from={from} to={to} onChange={setRange} />
      </>} />
  );
}

/** Commission owed on the bookings that checked out in the days chosen. */
export function Commission(p: Props) {
  const [{ from, to }, setRange] = useRange(p.hotel);
  return (
    <DocScreen {...p} report="commission" title="Commission owed" what="the commission owed" period={`Checked out ${span(from, to)}`}
      query={{ from, asOn: to }} controls={<RangeStep from={from} to={to} onChange={setRange} />} />
  );
}

/** TDS deducted from suppliers, by section and supplier: the 26Q's figures. */
export function Tds(p: Props) {
  const [{ from, to }, setRange] = useRange(p.hotel);
  return (
    <DocScreen {...p} report="tds" title="TDS on supplier payments" what="the TDS deducted" period={span(from, to)}
      query={{ from, asOn: to }} controls={<RangeStep from={from} to={to} onChange={setRange} />} />
  );
}

/** The petty cash book: every paid-out, the restaurant's and the front desk's. */
export function PettyCash(p: Props) {
  const [{ from, to }, setRange] = useRange(p.hotel);
  return (
    <DocScreen {...p} report="petty-cash" title="Petty cash" what="the petty cash book" period={span(from, to)}
      query={{ from, asOn: to }} controls={<RangeStep from={from} to={to} onChange={setRange} />} />
  );
}

/** Lodging tax: the business date's month, filed as it stands (REP-1). */
export function LodgingTax(p: Props) {
  const month = p.hotel.businessDate.slice(0, 7);
  return <DocScreen {...p} report="lodging-tax" title="Lodging tax" what="the lodging tax report" period={monthWords(month)} query={{ month }} />;
}

/* ── Gst.tsx: a month at a time, never after the business month ──── */

function useMonth(hotel: Hotel) {
  return useState(hotel.businessDate.slice(0, 7));
}

/** The month's GSTR-1, table by table. Its JSON file is a download. */
export function Gstr1(p: Props) {
  const [month, setMonth] = useMonth(p.hotel);
  const may = mayDownloadGstr1(p.role);
  return (
    <DocScreen {...p} report="gstr-1" title="GSTR-1" what="the GSTR-1" period={monthWords(month)} query={{ month }}
      controls={<MonthStep value={month} max={p.hotel.businessDate.slice(0, 7)} onChange={setMonth} />}
      more="Email"
      extra={may ? (
        /* M-16 row 1.13: the GST offline tool's JSON, saved under the server's own name (its GSTIN in it). */
        <DownloadButton label="GSTR-1 file (JSON)" a11y={`The GSTR-1 file for ${monthWords(month)}, as JSON`}
          path={`/api/hotels/${encodeURIComponent(p.hotel.code)}/reports/gstr-1.json?month=${month}`} fileName="" mimeType="application/json" />
      ) : (
        <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
          <FileJson size={14} color={c.grey400} style={{ marginTop: 1 }} />
          <Text style={[t.caption, { flex: 1 }]}>{GSTR1_FILE_REFUSED}</Text>
        </View>
      )} />
  );
}

/** The GST on the month's deliveries, as recorded: claimable and not. */
export function InputTaxCredit(p: Props) {
  const [month, setMonth] = useMonth(p.hotel);
  return (
    <DocScreen {...p} report="input-tax-credit" title="Input tax credit" what="the input tax credit" period={monthWords(month)} query={{ month }}
      controls={<MonthStep value={month} max={p.hotel.businessDate.slice(0, 7)} onChange={setMonth} />} />
  );
}

/** GST on money taken before a tax invoice: received, given back, adjusted. */
export function GstAdvances(p: Props) {
  const [month, setMonth] = useMonth(p.hotel);
  return (
    <DocScreen {...p} report="gst-advances" title="GST on advances" what="the GST on advances" period={monthWords(month)} query={{ month }}
      controls={<MonthStep value={month} max={p.hotel.businessDate.slice(0, 7)} onChange={setMonth} />} />
  );
}

/* ── Voids.tsx WindowReport: From-To, the month so far ────────────── */

function Window({ report, title, what, ...p }: Props & { report: "voids" | "nc-bills"; title: string; what: string }) {
  const [{ from, to }, setRange] = useRange(p.hotel);
  return (
    <DocScreen {...p} report={report} title={title} what={what} period={rangeWords(from, to)}
      query={{ from, asOn: to }} controls={<RangeStep from={from} to={to} onChange={setRange} />} />
  );
}
export const Voids = (p: Props) => <Window {...p} report="voids" title="Voids" what="the voids report" />;
export const NcBills = (p: Props) => <Window {...p} report="nc-bills" title="NC bills" what="the NC bills" />;
