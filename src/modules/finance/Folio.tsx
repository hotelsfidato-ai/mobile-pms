import { useQueryClient } from "@tanstack/react-query";
import * as Print from "expo-print";
import { ChevronLeft, Plus, Printer, Receipt, Split as SplitIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import type { Stay } from "../../core/types";
import { Capsule, Card, Head, ReadFailed, Row, Screen, s, useRead } from "../../core/ui";
import {
  billName, chargesToCome, closingWord, dateDay, headline, inSections, rupees, settleIsMain, whyNotAddTo,
  type BillLine, type DeskRules, type StayBill, type StayFolio,
} from "./bill";
import { AddChargeSheet, ChangeRateSheet, SplitSheet } from "./BillActs";
import { CheckOutPanel } from "./CheckOut";
import { readBill, readStay, type BillRead } from "./data";
import { TaxInvoices } from "./Issue";
import { Btn, Pill, rose, SaidCard, Sheet, success, type Said } from "./Kit";
import { LineActs } from "./LineActs";
import { billHtml, placeLine, TEST_DOCUMENT, totalRows } from "./paper";
import { whyNotChange, whyNotCharge, whyNotEdit, whyNotPay, whyNotReadBill } from "./roles";
import { SettleSheet } from "./Settle";

/* ══════════════════════════════════════════════════════════════════
   A STAY'S BILL — the web's FolioPanel (the Bill tab of the stay panel,
   src/modules/finance/flows/FolioPanel.tsx) as a screen of its own,
   /folio/<code>/<stayId>. Bill at the desk, Folio in Finance: these are
   the desk's words.

   EVERY FIGURE IS THE SERVER'S (MODULE.md): a line's own amount, each
   bill's balance, the bill's Net, tax rows, Total and Paid from
   app.stay_bill. Where the web adds lines itself the phone shows the
   server's figure instead, or none. Blocked is shown, with its reason
   (Rule 6), the API's sentence first: a grey button tells why when tapped.
   Every write here is REFUSED offline in the web's words: nothing is held.
   ══════════════════════════════════════════════════════════════════ */

type Open = "charge" | "settle" | "split" | "rate" | "bill" | null;

export function FolioScreen({ hotel, stayId, role, onBack, onLeft }: {
  hotel: Hotel & { deskRules?: DeskRules };
  stayId: string;
  role: string | null;
  onBack: () => void;
  /** Checked out: this bill's work is done (router.back, or In house). */
  onLeft: () => void;
}) {
  const stay = useRead(() => readStay(hotel.code, stayId), ["finance", hotel.code, "stay", stayId]);
  const back = <Capsule label="Back" icon={<ChevronLeft size={16} color={c.grey700} />} onPress={onBack} />;
  const refusal = whyNotReadBill(role);

  if (refusal) {
    return (
      <Screen refreshing={false} onRefresh={() => undefined}>
        <Head eyebrow="Bill" title={stay.data?.guest ?? "Bill"} action={back} />
        <View style={[s.card, { backgroundColor: c.grey50 }]} accessibilityRole="alert"><Text style={[t.label, { color: c.grey700 }]}>{refusal}</Text></View>
      </Screen>
    );
  }
  if (stay.data) return <Bill hotel={hotel} stay={stay.data} role={role} back={back} onRefresh={stay.reload} onLeft={onLeft} />;

  return (
    <Screen refreshing={stay.loading} onRefresh={stay.reload}>
      <Head eyebrow="Bill" title="Bill" action={back} />
      {stay.error ? <Failed what="this stay" error={stay.error} onRetry={stay.reload} />
        : stay.loading ? <Text style={t.label}>Reading the stay…</Text>
        : <Card><Text style={t.heading}>Reservation not found.</Text></Card>}
    </Screen>
  );
}

/** Four states: the read failed for want of a line, or failed in the server's words. */
function Failed({ what, error, onRetry }: { what: string; error: string; onRetry: () => void }) {
  if (isOnline()) return <ReadFailed what={what} error={error} onRetry={onRetry} />;
  return (
    <View style={[s.card, { backgroundColor: c.yellow50, borderColor: c.yellow100, gap: 8 }]} accessibilityRole="alert">
      <Text style={[t.heading, { color: c.yellow800 }]}>No connection</Text>
      <Text style={[t.label, { color: c.grey700 }]}>Reading {what}, taking a payment and checking out all need the connection. Try again when it is back.</Text>
      <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={onRetry} /></View>
    </View>
  );
}

function Bill({ hotel, stay, role, back, onRefresh, onLeft }: {
  hotel: Hotel & { deskRules?: DeskRules }; stay: Stay; role: string | null; back: ReactNode; onRefresh: () => void; onLeft: () => void;
}) {
  const code = hotel.code;
  const cache = useQueryClient();
  const read = useRead(() => readBill(code, stay.id), ["finance", code, "bill", stay.id]);
  const [only, setOnly] = useState<string | null>(null);
  const [open, setOpen] = useState<Open>(null);
  const [said, setSaid] = useState<Said | null>(null);

  /* After a write every read of this hotel's bills is asked again, the
     desk's lists too (their balance, the guest gone). */
  const reread = () => {
    void cache.invalidateQueries({ queryKey: ["finance", code] });
    void cache.invalidateQueries({ queryKey: ["front-desk", code] });
  };
  const done = (next: Said) => { setOpen(null); setSaid(next); reread(); };
  const refused = (why: string) => setSaid({ tone: "refused", title: why });
  const left = (title: string, text: string) => {
    reread();
    Alert.alert(title, text);
    onLeft();
  };

  const data = read.data;
  const balance = data?.folio?.balance ?? null;
  const folios = data?.folios ?? [];
  const split = folios.length > 1;
  const toCome = chargesToCome(stay, data?.bill?.nightsToCome ?? 0);
  const lines = !data ? [] : only === null ? data.lines : data.lines.filter((l) => l.folioId === only);
  const bill = only === null ? data?.bill ?? null : null;
  /* The tab's own balance, the server's; Everything is the stay's. */
  const closing = only === null ? balance : folios.find((f) => f.id === only)?.balance ?? null;
  const settleOff = split ? !folios.some((f) => f.balance > 0) : (balance ?? 0) <= 0;
  /* Who may take money, in the API's sentence: it wins over "nothing owed",
     so a refused role always hears why (AGENTS rule 1). */
  const mayNotPay = whyNotPay(role);

  return (
    <Screen refreshing={read.loading && Boolean(data)} onRefresh={() => { onRefresh(); read.reload(); }}>
      <Head eyebrow={`Room ${stay.roomNumber}`} title={stay.guest} under={stay.reference} action={back} />
      {said ? <SaidCard said={said} /> : null}
      {read.error ? <Failed what="the bill" error={read.error} onRetry={read.reload} /> : null}
      {!data && read.loading ? <Text style={t.label}>Reading the bill…</Text> : null}

      {data ? (
        <>
          <Headline stay={stay} balance={balance} toCome={toCome} />
          <BillStrip folios={folios} everything={balance} active={only} onPick={setOnly} />
          <Ledger
            lines={lines} data={data} bill={bill} closing={closing} toCome={toCome} stay={stay} folios={folios}
            role={role} code={code} onDone={done} onRefused={refused}
          />

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Btn label="Add charge" Icon={Plus} why={whyNotCharge(role) ?? whyNotAddTo(stay.status)} onRefused={refused} onPress={() => setOpen("charge")} />
            <Btn label="Settle" Icon={Receipt} kind={settleIsMain(stay.status, balance) ? "primary" : "secondary"} why={mayNotPay} off={mayNotPay === null && settleOff} onRefused={refused} onPress={() => setOpen("settle")} />
            <Btn label="Interim bill" Icon={Printer} kind="ghost" off={!data.bill} onPress={() => setOpen("bill")} />
            <Btn label="Split the bill" Icon={SplitIcon} why={whyNotCharge(role)} onRefused={refused} onPress={() => setOpen("split")} />
            <Btn label="Change rate" kind="ghost" why={whyNotEdit(role)} onRefused={refused} onPress={() => setOpen("rate")} />
          </View>
          {/* Disabled WITH its reason, in sight and not only on a tap. */}
          {mayNotPay ? <Text style={[t.caption, { color: c.grey700 }]}>{mayNotPay}</Text> : null}

          {stay.status === "checked-out" ? <TaxInvoices code={code} stayId={stay.id} role={role} onSaid={setSaid} onDone={done} /> : null}
          <CheckOutPanel hotel={hotel} stay={stay} balance={balance} role={role} onLeft={left} onSaid={setSaid} onReread={reread} />

          {open === "charge" ? <AddChargeSheet hotel={hotel} stay={stay} role={role} onClose={() => setOpen(null)} onDone={done} /> : null}
          {open === "split" ? <SplitSheet hotel={hotel} stay={stay} onClose={() => setOpen(null)} onDone={done} /> : null}
          {open === "rate" ? <ChangeRateSheet hotel={hotel} stay={stay} onClose={() => setOpen(null)} onDone={done} /> : null}
          {open === "settle" ? (
            <SettleSheet
              hotel={hotel} stayId={stay.id} payer={stay.guest} balance={balance} folios={folios} active={only}
              onClose={() => setOpen(null)} onReread={reread}
              onTaken={(amount, method) => done({ tone: "ok", title: `${rupees(amount)} received`, text: method })}
            />
          ) : null}
          {open === "bill" && data.bill ? <InterimBill bill={data.bill} test={Boolean(hotel.testOf)} onClose={() => setOpen(null)} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const FIGURE = { danger: c.red700, info: c.info, success, neutral: c.grey500 };

/** The headline (FolioPanel BalanceHeader): what the bill stands at, its word, whose it is. */
function Headline({ stay, balance, toCome }: { stay: Stay; balance: number | null; toCome: boolean }) {
  const h = headline(balance, toCome);
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
      <View>
        <Text style={t.label}>{h.label}</Text>
        <Text style={[t.lead, { fontSize: 26, color: FIGURE[h.tone] }]}>{balance === null ? "-" : rupees(Math.abs(balance))}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Pill tone={h.tone} label={h.pill} />
        <Text style={[t.caption, t.tab]}>Room {stay.roomNumber} · {stay.reference}</Text>
      </View>
    </View>
  );
}

/** The bills on this stay (FolioStrip): only once there is a second. */
function BillStrip({ folios, everything, active, onPick }: { folios: StayFolio[]; everything: number | null; active: string | null; onPick: (id: string | null) => void }) {
  if (folios.length < 2) return null;
  const tab = (key: string, id: string | null, label: string, balance: number | null) => {
    const on = active === id;
    return (
      <Pressable
        key={key} onPress={() => onPick(id)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${label}, ${rupees(balance)}`}
        style={{ minHeight: 44, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: on ? c.orange : c.grey200, backgroundColor: on ? c.orange50 : c.white }}
      >
        <Text style={t.label}>{label}</Text>
        <Text style={[t.heading, t.tab, face[500]]}>{rupees(balance)}</Text>
      </Pressable>
    );
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {tab("all", null, "Everything", everything)}
      {folios.map((f) => tab(f.id, f.id, billName(f), f.balance))}
    </ScrollView>
  );
}

function Ledger({ lines, data, bill, closing, toCome, stay, folios, role, code, onDone, onRefused }: {
  lines: BillLine[]; data: BillRead; bill: StayBill | null; closing: number | null; toCome: boolean; stay: Stay; folios: StayFolio[];
  role: string | null; code: string; onDone: (said: Said) => void; onRefused: (why: string) => void;
}) {
  if (lines.length === 0 && !toCome) {
    return <Text style={[t.label, { textAlign: "center", paddingVertical: 24 }]}>Nothing posted to this folio yet.</Text>;
  }
  const { sections, payments } = inSections(lines, toCome ? ["room"] : []);
  const row = (l: BillLine) => (
    <Line key={l.id} line={l} folios={folios} role={role} code={code} stayId={stay.id} onDone={onDone} onRefused={onRefused} />
  );

  return (
    <View style={{ gap: space.card }}>
      {sections.map((sec) => (
        <Section key={sec.key} title={sec.title}>
          {sec.lines.map(row)}
          {sec.key === "room" && toCome ? <ToCome stay={stay} bill={data.bill} /> : null}
        </Section>
      ))}

      {bill && sections.length > 0 ? (
        <View style={{ paddingHorizontal: 12 }}>
          {totalRows(bill).map(([label, value]) => <Row key={label} label={label} value={value} />)}
          <Row label="Total charges" value={rupees(bill.total)} strong />
        </View>
      ) : null}

      {payments.length > 0 ? (
        <Section title="Payments received">
          {payments.map(row)}
          {bill ? <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderTopWidth: 1, borderTopColor: c.grey200 }}><Row label="Received" value={rupees(bill.paid)} /></View> : null}
        </Section>
      ) : null}

      <View style={{ paddingHorizontal: 12 }}>
        <Row label={closingWord(closing, toCome)} value={closing === null ? "-" : rupees(Math.abs(closing))} strong />
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ borderWidth: 1, borderColor: c.grey200, borderRadius: 8, overflow: "hidden", backgroundColor: c.white }}>
      <View style={{ backgroundColor: c.grey50, borderBottomWidth: 1, borderBottomColor: c.grey200, paddingHorizontal: 12, paddingVertical: 8 }}>
        <Text style={t.eyebrow}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/** One line of the ledger: a reversal in rose, the line it reversed struck through. */
function Line({ line, folios, role, code, stayId, onDone, onRefused }: {
  line: BillLine; folios: StayFolio[]; role: string | null; code: string; stayId: string; onDone: (said: Said) => void; onRefused: (why: string) => void;
}) {
  const isReversal = line.kind === "reversal";
  const strike = line.reversed ? { textDecorationLine: "line-through" as const } : null;
  const colour = isReversal ? rose : line.amount < 0 ? success : c.ink900;
  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: c.grey100, opacity: line.reversed ? 0.55 : 1 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[t.label, { color: isReversal ? rose : c.ink900 }, strike]}>{line.description}</Text>
          <Text style={[t.caption, t.tab]}>{dateDay(line.businessDate)} · {line.category} · {line.user ?? "-"}</Text>
        </View>
        <Text style={[t.label, t.tab, { color: colour }, strike]}>{line.amount < 0 ? "−" : ""}{rupees(Math.abs(line.amount))}</Text>
      </View>
      <LineActs line={line} folios={folios} role={role} code={code} stayId={stayId} onDone={onDone} onRefused={onRefused} />
    </View>
  );
}

/** The nights not posted yet (FolioPanel ChargesToCome), as the server has
    them: how many, and tonight's night with its GST (D27-204, FIN-24). The
    web's own sums (the nights' total, "Due once they are posted") are not
    drawn: the phone adds nothing up (MODULE.md). */
function ToCome({ stay, bill }: { stay: Stay; bill: StayBill | null }) {
  const nights = bill?.nightsToCome ?? 0;
  const tonight = bill?.tonight;
  return (
    <View style={{ margin: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderStyle: "dashed", borderColor: c.grey300, gap: 4 }}>
      <Text style={[t.label, { color: c.ink900 }]}>Charges to come <Text style={{ color: c.grey500 }}>· not posted yet</Text></Text>
      <Text style={[t.label, t.tab, { color: c.grey700 }]}>{nights} {nights === 1 ? "night" : "nights"} × {rupees(stay.offeredTariff)}</Text>
      {tonight ? <Row label={tonight.description} value={rupees(tonight.amount)} /> : null}
      {tonight ? <Row label={`GST ${tonight.rate}%`} value={rupees(tonight.tax)} /> : null}
      <Text style={t.caption}>The first night is posted at check-in, each later night by the night audit.</Text>
    </View>
  );
}

/** The printed bill's preview (FolioPanel InvoiceDialog, BillPrint): drawn
    from `app.stay_bill`, sent to the phone's own print sheet (M-9). */
function InterimBill({ bill, test, onClose }: { bill: StayBill; test: boolean; onClose: () => void }) {
  const [refused, setRefused] = useState<string | null>(null);
  const print = () => {
    setRefused(null);
    Print.printAsync({ html: billHtml(bill, test) }).catch((e: unknown) => setRefused(e instanceof Error ? e.message : "Could not print."));
  };
  const place = placeLine(bill.hotel.address, bill.hotel.city, bill.hotel.state);
  return (
    <Sheet
      visible onClose={onClose} title="Interim bill" description="Print preview"
      footer={(
        <>
          <Btn label="Close" onPress={onClose} />
          <Btn kind="primary" label="Print" Icon={Printer} onPress={print} />
        </>
      )}
    >
      {test ? <Text style={[t.label, { color: c.red700, textAlign: "center", ...face[700] }]}>{TEST_DOCUMENT}</Text> : null}
      <View style={{ gap: 2 }}>
        <Text style={t.heading}>{bill.hotel.name}</Text>
        <Text style={t.caption}>{test ? place : `${place ? `${place} · ` : ""}GSTIN ${bill.hotel.gstin ?? "-"}`}</Text>
      </View>
      <View style={s.hairline} />
      <Row label="Guest" value={bill.stay.guest} />
      <Row label="Room" value={bill.stay.room ?? "-"} />
      <Row label="Stay" value={`${dateDay(bill.stay.checkIn)} – ${dateDay(bill.stay.checkOut)}`} />
      <View style={s.hairline} />
      {bill.lines.map((l, i) => <Row key={i} label={l.description} value={rupees(l.amount)} />)}
      <View style={s.hairline} />
      {totalRows(bill).map(([label, value]) => <Row key={label} label={label} value={value} />)}
      <Row label="Total" value={rupees(bill.total)} strong />
      <Row label="Paid" value={rupees(bill.paid)} />
      <Row label="Outstanding" value={rupees(bill.balance)} strong />
      {bill.tonight ? <Row label={`To be posted tonight · ${bill.tonight.description}`} value={rupees(bill.tonight.amount)} /> : null}
      {bill.tonight ? <Row label={`GST ${bill.tonight.rate}%`} value={rupees(bill.tonight.tax)} /> : null}
      {refused ? <Text style={[t.label, { color: c.red700 }]} accessibilityRole="alert">{refused}</Text> : null}
    </Sheet>
  );
}
