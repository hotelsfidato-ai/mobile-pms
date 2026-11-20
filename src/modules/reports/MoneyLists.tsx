import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { ExportTable } from "../../core/exportDoc";
import { orNull, type Hotel } from "../../core/api";
import { c, face, t } from "../../core/theme";
import { Card, useRead } from "../../core/ui";
import { dateYear } from "./figures";
import { FigureLine, Files, Masthead, Nothing, Notes, ReadState, Refused, ReportPage, RowCard } from "./MoneyKit";
import {
  NO_TOTAL, cFormTable, cashierTable, guestLedgerTable, gstTable, methodLabel, monthStartOf, rupees, unfiled, when,
  type CFormRow, type CashierShiftRow, type GstSalesRow, type GuestLedgerRow, type Rows,
} from "./money";
import { whyNoFile, whyNotRead, type ReadKey } from "./moneyRoles";

/* ══════════════════════════════════════════════════════════════════
   THE FOUR REPORTS THE SERVER SENDS AS ROWS (the web's pages/Compliance.tsx):
   Guest ledger, Cashier shift, GST sales register, Form III register.
     GET /api/hotels/:code/reports/guest-ledger?from&to   (the month so far)
     GET /api/hotels/:code/reports/cashier-shift?from&to  (the business date)
     GET /api/hotels/:code/reports/gst-sales?from&to      (the month so far)
     GET /api/hotels/:code/reports/c-form?from&to         (the month so far)
   The web has no setting on these: the same periods here.

   ⚠ THE WEB ADDS THREE OF THESE UP IN THE BROWSER (the Total rows of the
   guest ledger, the cashier shift and the GST register). The server sends
   no total, so the phone draws each row as it came and NO total: a GST or
   a drawer total worked out on a phone is a second answer (NO_TOTAL).
   Every amount keeps its paise (the web's table writes whole rupees).
   ══════════════════════════════════════════════════════════════════ */

interface Props { hotel: Hotel; role: string | null }

/** One list report: who may read it, its read, its states, its export, its rows. */
function useList<T>(hotel: Hotel, role: string | null, key: ReadKey, from: string, to: string) {
  const refused = whyNotRead(key, role);
  const read = useRead<Rows<T> | null>(
    () => (refused ? Promise.resolve(null) : orNull<Rows<T>>(`/api/hotels/${hotel.code}/reports/${key}?from=${from}&to=${to}`)),
    ["reports", hotel.code, key, from, to, refused],
  );
  return { refused, read };
}

function NoTotal() {
  return <Text style={[t.caption, { color: c.grey600, lineHeight: 18 }]}>{NO_TOTAL}</Text>;
}

/** The parts every list page shares. */
function ListPage<T>({ hotel, title, what, period, facts, refused, read, table, fileRefusal, empty, children, notes }: {
  hotel: Hotel; title: string; what: string; period: string; facts: string; refused: string | null;
  read: { data: Rows<T> | null | undefined; error: string | undefined; loading: boolean; reload: () => void }; table: ExportTable | null; fileRefusal: string | null;
  empty: string; children: (rows: T[]) => ReactNode; notes: string[];
}) {
  if (refused) return <ReportPage title={title} period={period} refreshing={false} onRefresh={() => {}}><Refused words={refused} /></ReportPage>;
  const d = read.data;
  return (
    <ReportPage title={title} period={period} refreshing={read.loading} onRefresh={read.reload}
      files={<Files table={table} refusal={fileRefusal} />}>
      <ReadState what={what} loading={read.loading} error={read.error} has={!!d} onRetry={read.reload} />
      {d ? (
        <>
          <Masthead property={hotel.name} title={title} period={period} facts={facts} />
          {d.rows.length === 0 ? <Nothing words={empty} /> : children(d.rows)}
          <Notes lines={notes} />
        </>
      ) : d === null && !read.loading && !read.error ? <Nothing words="This property has no report to show." /> : null}
    </ReportPage>
  );
}

const money = (v: number, strong = false, label = "") => (
  <FigureLine label={label} text={rupees(v)} negative={v < 0} strong={strong} />
);

/* ── Guest ledger ─────────────────────────────────────────────────── */

export function GuestLedger({ hotel, role }: Props) {
  const from = monthStartOf(hotel.businessDate);
  const to = hotel.businessDate;
  const period = `${dateYear(from)} to ${dateYear(to)}`;
  const { refused, read } = useList<GuestLedgerRow>(hotel, role, "guest-ledger", from, to);
  return (
    <ListPage<GuestLedgerRow> hotel={hotel} title="Guest ledger" what="the guest ledger" period={period} refused={refused} read={read}
      facts={`Date From ${dateYear(from)} To ${dateYear(to)}   Folios that moved in the window`}
      table={read.data ? guestLedgerTable(read.data, `${hotel.name} · ${period}`) : null} fileRefusal={whyNoFile("guest-ledger", role)}
      empty="No folio moved in this window."
      notes={["Opening is the folio balance strictly before the window; closing includes everything up to and including the last day. A reversed charge and its reversal are both excluded — counting the pair would show two movements that net to nothing."]}>
      {(rows) => (
        <>
          {rows.map((r) => (
            <RowCard key={r.folioId} title={r.guest} under={<Text style={[t.caption, t.tab]}>{r.reference}</Text>}>
              <FigureLine label="Room" text={r.room} />
              {money(r.opening, false, "Opening")}
              {money(r.charges, false, "Charges")}
              {money(r.payments, false, "Received")}
              {money(r.closing, true, "Closing")}
            </RowCard>
          ))}
          <NoTotal />
        </>
      )}
    </ListPage>
  );
}

/* ── Cashier shift ────────────────────────────────────────────────── */

export function CashierShift({ hotel, role }: Props) {
  const bd = hotel.businessDate;
  const { refused, read } = useList<CashierShiftRow>(hotel, role, "cashier-shift", bd, bd);
  return (
    <ListPage<CashierShiftRow> hotel={hotel} title="Cashier shift" what="the cashier shift" period={dateYear(bd)} refused={refused} read={read}
      facts={`Business date ${dateYear(bd)}   Receipts by cashier and method`}
      table={read.data ? cashierTable(read.data, `${hotel.name} · ${dateYear(bd)}`) : null} fileRefusal={whyNoFile("cashier-shift", role)}
      empty="Nothing was taken on this date."
      notes={["A receipt whose posting has been reversed is not money the cashier holds, so it is excluded - the same definition the Manager Report uses. A blank cashier is a posting made before this system recorded who made it; naming somebody would be worse than the dash."]}>
      {(rows) => (
        <>
          {rows.map((r, i) => (
            <RowCard key={`${r.staffId ?? "none"}-${r.method}-${i}`} title={r.cashier ?? "not on record"}
              under={r.cashier ? undefined : <Text style={[t.caption, { color: c.red700 }]}>This posting predates staff attribution.</Text>}>
              <FigureLine label="Method" text={methodLabel(r.method)} />
              <FigureLine label="Receipts" text={String(r.count)} />
              {money(r.amount, false, "Amount")}
            </RowCard>
          ))}
          <NoTotal />
        </>
      )}
    </ListPage>
  );
}

/* ── GST sales register ───────────────────────────────────────────── */

export function GstSales({ hotel, role }: Props) {
  const from = monthStartOf(hotel.businessDate);
  const to = hotel.businessDate;
  const period = `${dateYear(from)} to ${dateYear(to)}`;
  const { refused, read } = useList<GstSalesRow>(hotel, role, "gst-sales", from, to);
  const n = read.data?.rows.length ?? 0;
  return (
    <ListPage<GstSalesRow> hotel={hotel} title="GST sales register" what="the GST sales register" period={period} refused={refused} read={read}
      facts="GSTR-1 extract   Every document issued in the period, credit notes included"
      table={read.data ? gstTable(read.data, `${hotel.name} · ${period}`) : null} fileRefusal={whyNoFile("gst-sales", role)}
      empty="No invoice was issued in this period."
      notes={["Credit notes appear as their own rows with negative values, because that is how they are filed. Netting them into the invoice would leave this register disagreeing with the invoices actually issued. Place of supply is the property's state on every row - accommodation is supplied where the hotel is, so a hotel supply is never IGST."]}>
      {(rows) => (
        <>
          <Text style={[t.label, t.tab, { color: c.grey500, textAlign: "right" }]}>{`${n} document${n === 1 ? "" : "s"}`}</Text>
          {rows.map((r) => (
            <RowCard key={r.number} title={r.number}
              under={r.creditsInvoice ? <Text style={[t.caption, { color: c.red700 }]}>{`credits ${r.creditsInvoice}`}</Text> : undefined}>
              <FigureLine label="Date" text={dateYear(r.issued)} />
              <FigureLine label="Recipient" text={r.recipient ?? "-"} missing={!r.recipient} />
              <FigureLine label="GSTIN" text={r.gstin ?? "-"} missing={!r.gstin} />
              <FigureLine label="Type" text={r.type} />
              <FigureLine label="Place" text={r.placeOfSupply ?? "-"} missing={!r.placeOfSupply} />
              {money(r.taxable, false, "Taxable")}
              {money(r.cgst, false, "CGST")}
              {money(r.sgst, false, "SGST")}
              {money(r.total, true, "Total")}
            </RowCard>
          ))}
          <NoTotal />
        </>
      )}
    </ListPage>
  );
}

/* ── The Form III register ────────────────────────────────────────── */

const line = (words: string, color: string = c.grey500) => <Text style={[t.caption, { color }]}>{words}</Text>;

export function CForm({ hotel, role }: Props) {
  const from = monthStartOf(hotel.businessDate);
  const to = hotel.businessDate;
  const period = `${dateYear(from)} to ${dateYear(to)}`;
  const { refused, read } = useList<CFormRow>(hotel, role, "c-form", from, to);
  const d = read.data;
  return (
    <ListPage<CFormRow> hotel={hotel} title="Form III register" what="the Form III register" period={period} refused={refused} read={read}
      facts={`Arrivals in the period   ${d ? unfiled(d.rows) : "-"} awaiting an FRRO number`}
      table={d ? cFormTable(d, `${hotel.name} · ${period}`) : null} fileRefusal={whyNoFile("c-form", role)}
      empty="No foreign national arrived in this period."
      notes={["A blank passport is a guest whose document was not captured at check-in. It is shown rather than hidden: the filing cannot be made without it, and a report that looked complete would be worse than one that names the gap. The download carries every Form III field."]}>
      {(rows) => (
        <>
          {/* Said on the page: nobody must walk away believing the filing has happened. */}
          <Card style={{ backgroundColor: c.yellow50, borderColor: c.yellow100 }}>
            <Text style={[t.caption, { color: c.ink900, lineHeight: 18 }]}>
              {d?.note ?? "This system does not file with the FRRO. Filing happens on the government portal."}
            </Text>
          </Card>
          {rows.map((r, i) => (
            <RowCard key={`${r.guest}-${r.arrived}-${i}`} title={r.guest}
              under={line(`${r.nationality} · room ${r.room}${r.address ? ` · ${r.address}` : ""}`)}>
              <View style={{ gap: 8 }}>
                <Block label="Passport and visa">
                  {r.passport ? <Text style={[t.label, t.tab, { color: c.grey700 }]}>{r.passport}</Text> : line("not on record", c.red700)}
                  {line(`visa ${r.visaNumber ?? "-"} · ${r.visaType ?? "-"}`)}
                </Block>
                <Block label="Arrival">
                  <Text style={[t.label, t.tab, { color: c.grey600 }]}>{r.arrivedAt ? when(r.arrivedAt) : dateYear(r.arrived)}</Text>
                  {line(`from ${r.arrivedFrom ?? "-"} · ${r.purpose ?? "-"}`)}
                </Block>
                <Block label="Departure">
                  <Text style={[t.label, t.tab, { color: c.grey600 }]}>{r.departedAt ? when(r.departedAt) : "In house"}</Text>
                  {line(`to ${r.nextDestination ?? "-"}`)}
                </Block>
                <Block label="Portal numbers">
                  {r.reference ? <Text style={[t.label, t.tab, { color: c.ink900 }]}>{r.reference}</Text> : line("not filed", c.red700)}
                  {r.departedAt ? (r.departureReference
                    ? <Text style={[t.label, t.tab, { color: c.ink900 }]}>{r.departureReference}</Text>
                    : line("departure not filed", c.red700)) : null}
                </Block>
              </View>
            </RowCard>
          ))}
        </>
      )}
    </ListPage>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[t.caption, { letterSpacing: 0.36, textTransform: "uppercase", ...face[500] }]}>{label}</Text>
      {children}
    </View>
  );
}
