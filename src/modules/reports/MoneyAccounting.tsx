import { useQueryClient } from "@tanstack/react-query";
import { Landmark, ReceiptText, TriangleAlert, Wallet, type LucideIcon } from "lucide-react-native";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { ApiError, orNull, outcomeUnknown, send, api, type Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Card, Head, ReadFailed, notKnown, useRead } from "../../core/ui";
import { Box, Button, Field, Toast, type Said } from "../front-desk/kit";
import { readUndos } from "../night-audit/data";
import { dateYear } from "./figures";
import { FigureLine, Files, Nothing, RangeStep, ReadState, Refused, RowCard } from "./MoneyKit";
import {
  DAY_COLUMNS, FORMATS, bookFigure, cancelledLines, dayBookTable, isTally, monthStartOf, openDaysWords, quiet, rupees, whyNot,
  type DayBook, type ExportFormat, type TallyLedgers,
} from "./money";
import { whyNotAccounting } from "./moneyRoles";

/* ══════════════════════════════════════════════════════════════════
   THE ACCOUNTING EXPORT on a phone — the web's src/modules/accounting/
   pages/Accounting.tsx (/reports/accounting), top to bottom: the night
   audits cancelled lately, what to export (From, To, the format), the
   hotel's Tally ledger names, then the day book drawn from the same object
   the file is written from.
     GET /api/hotels/:code/accounting/day-book?from&to   the day book (its days and its total: the server's)
     GET /api/hotels/:code/accounting/tally-ledgers      the ledger names
     PUT /api/hotels/:code/accounting/tally-ledgers      saving them (refused offline: core/offline.ts UNLISTED)
     GET /api/hotels/:code/night-audit/undos              the cancels (night-audit's own read)
   Who: the owner, an administrator, the GM and the accountant
   (api/src/modules/accounting/routes.ts MAY_EXPORT). The day book as drawn
   here goes out as PDF, Excel (CSV) or print (src/core/Export.tsx, M-14);
   the chosen format's own file (the server's day-book layout, the Tally
   XML) is on the website for now.
   ══════════════════════════════════════════════════════════════════ */

interface Props { hotel: Hotel; role: string | null }

const DESCRIPTION = "Your month in the form your accountant takes. It reads the same figures the reports print and changes nothing.";
const TALLY_WORDS = [
  "One Sales voucher a day, what was paid on bills, refunds, bills moved to a company and each company receipt, for days the night audit has closed. The ledgers must already be in Tally: the file creates none. A name that does not match stops that voucher and Tally takes the rest, so read what Tally reports. Put the name right, export the day again and import it again.",
  "Not in the file: credit notes and cancelled VAT bills, which the day book does not count; NC bills, which have no value; supplier bills, cash expenses and cash banked. A day's voucher does not list each bill.",
  "If a closed day is corrected, export it again and its vouchers are replaced. A voucher the corrected day no longer has stays in Tally until it is deleted there.",
];

export function Accounting({ hotel, role }: Props) {
  const code = hotel.code;
  const refused = whyNotAccounting(role);
  const [range, setRange] = useState({ from: monthStartOf(hotel.businessDate), to: hotel.businessDate });
  const [format, setFormat] = useState<ExportFormat>("day-book-csv");
  const book = useRead<DayBook | null>(
    () => (refused ? Promise.resolve(null) : orNull<DayBook>(`/api/hotels/${code}/accounting/day-book?from=${range.from}&to=${range.to}`)),
    ["reports", code, "accounting-day-book", range.from, range.to, refused],
  );
  const ledgerKey = ["reports", code, "tally-ledgers", refused] as const;
  const ledgers = useRead<TallyLedgers | null>(
    () => (refused ? Promise.resolve(null) : api<TallyLedgers>(`/api/hotels/${code}/accounting/tally-ledgers`)), ledgerKey,
  );
  const undos = useRead(() => (refused ? Promise.resolve([]) : readUndos(code)), ["reports", code, "night-audit-undos", refused]);
  const [said, setSaid] = useState<Said | null>(null);

  if (refused) {
    return (
      <ScrollView style={{ backgroundColor: c.grey50 }} contentContainerStyle={{ padding: space.side, gap: space.card }}>
        <Head title="Accounting export" under={DESCRIPTION} />
        <Refused words={refused} />
      </ScrollView>
    );
  }

  const chosen = FORMATS.find((f) => f.key === format) ?? FORMATS[0]!;
  const b = book.data ?? null;
  const cancelled = cancelledLines(undos.data ?? [], Date.now());
  const reload = () => { book.reload(); ledgers.reload(); undos.reload(); };

  return (
    <View style={{ flex: 1 }}>
      {/* A form on the page: it lifts over the keyboard (docs/NATIVE.md). */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={{ backgroundColor: c.grey50 }} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 16, paddingHorizontal: space.side, paddingBottom: 40, gap: space.card }}
          refreshControl={<RefreshControl refreshing={book.loading} onRefresh={reload} tintColor={c.orange} colors={[c.orange]} />}
        >
          <Head title="Accounting export" under={DESCRIPTION} />
          <Files table={b && b.days.length ? dayBookTable(b, `${b.property.name} · ${dateYear(b.from)} to ${dateYear(b.to)}`) : null}
            refusal={null} more={`The ${chosen.label} file, in the layout the accountant takes`} />

          {cancelled.length ? (
            <Card style={{ backgroundColor: c.yellow50, borderColor: c.yellow100, gap: 8 }}>
              <Text style={t.heading}>Night audits cancelled</Text>
              {cancelled.map((l) => <Text key={l} style={[t.label, { color: c.yellow800, lineHeight: 21 }]}>{l}</Text>)}
            </Card>
          ) : null}

          <Card style={{ gap: 14 }}>
            <Text style={t.heading}>What to export</Text>
            <RangeStep from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })}
              hints={["This day is included.", "This day is included too."]} />
            <Text style={[t.label, face[600], { color: c.ink900 }]}>Format</Text>
            <View style={{ gap: 8 }} accessibilityRole="radiogroup">
              {FORMATS.map((f) => (
                <FormatTile key={f.key} label={f.label} what={f.what} on={f.key === format} why={whyNot(f.key, ledgers.data ?? undefined)} onPress={() => setFormat(f.key)} />
              ))}
            </View>
            {isTally(format) ? TALLY_WORDS.map((w) => <Text key={w} style={[t.label, { lineHeight: 21 }]}>{w}</Text>) : null}
          </Card>

          {ledgers.error && !ledgers.data
            ? <ReadFailed what="the ledger names" error={ledgers.error} onRetry={ledgers.reload} />
            : ledgers.data ? <LedgerNames key={code} code={code} answer={ledgers.data} queryKey={ledgerKey} onSaid={setSaid} reread={ledgers.reload} /> : null}

          <ReadState what="the day book" loading={book.loading} error={book.error} has={b !== null} onRetry={book.reload} />
          {b ? <DayBookCards book={b} />
            : book.data === null && !book.loading && !book.error ? <Nothing words="No such property. This is not a property you may export." /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

/** A format to tap: a tile on a hairline, the chosen one ringed in ink; a Tally one with a blank ledger says which. */
function FormatTile({ label, what, on, why, onPress }: { label: string; what: string; on: boolean; why: string | null; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label} accessibilityHint={what}
      android_ripple={{ color: c.grey200 }}
      style={({ pressed }) => ({ flexDirection: "row", gap: 12, alignItems: "flex-start", minHeight: 44, paddingHorizontal: 14, paddingVertical: 12,
        borderRadius: 10, borderWidth: on ? 2 : 1, borderColor: on ? c.ink900 : c.grey200, overflow: "hidden",
        backgroundColor: pressed && Platform.OS === "ios" ? c.grey50 : c.white })}
    >
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: on ? 5 : 1.5, borderColor: on ? c.orange600 : c.grey400, marginTop: 2 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.label, { color: c.ink900 }]}>{label}</Text>
        <Text style={[t.label, { color: c.grey500 }]}>{what}</Text>
        {why ? <Text style={[t.label, { color: c.yellow800 }]}>{why}</Text> : null}
      </View>
    </Pressable>
  );
}

/** The hotel's Tally ledger names, exactly as typed; no name is ever suggested (D27-382). */
function LedgerNames({ code, answer, queryKey, onSaid, reread }: {
  code: string; answer: TallyLedgers; queryKey: readonly unknown[]; onSaid: (s: Said) => void; reread: () => void;
}) {
  const qc = useQueryClient();
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  /* One tap, one write (MEMORY 8). */
  const latch = useRef(false);
  const value = (key: string, name: string | null) => typed[key] ?? name ?? "";
  const save = async () => {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    try {
      const next = await send<TallyLedgers>("PUT", `/api/hotels/${code}/accounting/tally-ledgers`,
        { names: Object.fromEntries(answer.ledgers.map((l) => [l.key, value(l.key, l.name)])) });
      qc.setQueryData(queryKey, next);
      setTyped({});
      onSaid({ title: "Ledger names saved", tone: "ok" });
    } catch (e) {
      if (outcomeUnknown(e)) {
        /* Saving the same names again changes nothing, so the typed names
           stay; the names are read again so the person sees what is there. */
        const n = notKnown("saved", "the ledger names", e);
        onSaid({ title: n.title, body: n.body, tone: "bad" });
        reread();
      } else {
        onSaid({ title: "The ledger names were not saved", body: e instanceof ApiError ? e.message : String(e), tone: "bad" });
      }
    } finally {
      latch.current = false;
      setBusy(false);
    }
  };
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 2 }}>
        <Text style={t.heading}>Tally ledger names</Text>
        <Text style={[t.label, { color: c.grey500, lineHeight: 21 }]}>Type each name exactly as it is in this hotel's Tally. No name is suggested, and none is made here.</Text>
      </View>
      {answer.ledgers.map((l) => (
        <Field key={l.key} label={l.label} hint={l.what}>
          <Box label={l.label} value={value(l.key, l.name)} max={200} onChange={(v) => setTyped((t0) => ({ ...t0, [l.key]: v }))} />
        </Field>
      ))}
      <View style={{ flexDirection: "row" }}>
        <Button label="Save ledger names" kind="primary" busy={busy} onPress={() => void save()} />
      </View>
    </Card>
  );
}

/* ── The file, drawn: each day a card, the server's total as tiles ── */

function Tile({ Icon, label, value, note }: { Icon: LucideIcon; label: string; value: string; note?: string }) {
  return (
    <Card style={{ flexBasis: "47%", flexGrow: 1, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon size={16} color={c.grey600} />
        <Text style={[t.label, { flexShrink: 1 }]}>{label}</Text>
      </View>
      <Text style={t.figure} adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1}>{value}</Text>
      {note ? <Text style={t.caption}>{note}</Text> : null}
    </Card>
  );
}

function DayBookCards({ book }: { book: DayBook }) {
  const open = openDaysWords(book);
  return (
    <>
      {open ? (
        <Card style={{ backgroundColor: c.yellow50, borderColor: c.yellow100, flexDirection: "row", gap: 10 }}>
          <TriangleAlert size={16} color={c.yellow800} style={{ marginTop: 2 }} />
          <Text style={[t.label, { flex: 1, color: c.yellow800, lineHeight: 21 }]}>{open}</Text>
        </Card>
      ) : null}
      {quiet(book) ? <Text style={[t.label, { lineHeight: 21 }]}>Nothing was charged or received in this range. The file will have a row for each day, all of them nil.</Text> : null}
      {book.days.length === 0 ? <Nothing words="No days in this range." /> : book.days.map((d) => (
        <RowCard key={d.date} title={dateYear(d.date)}>
          {DAY_COLUMNS.map(([k, label]) => {
            const v = d[k];
            return <FigureLine key={k} label={label} text={bookFigure(v)} missing={typeof v !== "number"} negative={typeof v === "number" && v < 0} />;
          })}
          <FigureLine label="Night audit" text={d.closed ? "Closed" : "Not run"} color={d.closed ? c.success600 : c.yellow800} />
        </RowCard>
      ))}
      {book.days.length > 0 ? (
        <>
          <Text style={[t.label, { lineHeight: 21 }]}>This counts what was charged and received each day. The Lodging tax report counts the bills that were issued, so a stay still in house appears here and not there.</Text>
          <Text style={[t.label, { lineHeight: 21 }]}>Food charged to a room is food on a bill: charged at the desk, or a restaurant bill charged to a room or a function. Other extras are laundry, the spa, drinks that are not alcohol, late check-out and the rest. What the restaurant took itself is under Restaurant.</Text>
          {/* The range's totals: the server's `total`, never the days added up here. */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.tile }}>
            <Tile Icon={ReceiptText} label="Sales" value={bookFigure(book.total.sales)} />
            <Tile Icon={Landmark} label="Tax" value={bookFigure(book.total.tax)} />
            <Tile Icon={Wallet} label="Receipts" value={bookFigure(book.total.receipt)} />
            <Tile Icon={Wallet} label="Received from companies" value={bookFigure(book.total.companyReceipt)} note="Apart from sales" />
          </View>
        </>
      ) : null}
      {(book.companyReceipts ?? []).length > 0 ? (
        <Card style={{ gap: 4 }}>
          <Text style={[t.heading, { marginBottom: 4 }]}>Received from companies</Text>
          {book.companyReceipts!.map((r, i) => (
            <View key={`${r.date}-${i}`} style={{ flexDirection: "row", alignItems: "baseline", gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey200 }}>
              <Text style={[t.label, t.tab, { color: c.grey600 }]}>{dateYear(r.date)}</Text>
              <Text style={[t.label, { flex: 1, color: c.ink900 }]}>{`${r.account} · ${r.method}${r.reference ? ` · ${r.reference}` : ""}`}</Text>
              <Text style={[t.label, t.tab, { color: r.amount < 0 ? c.red : c.ink900 }]}>{rupees(r.amount)}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </>
  );
}
