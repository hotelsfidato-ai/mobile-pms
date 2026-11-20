import { useQueryClient } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { ChevronLeft, FileMinus, Printer, Send } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { DASH } from "../../core/format";
import { ON_THE_WEBSITE } from "../../core/menu";
import { c, face, t } from "../../core/theme";
import { Card, notKnown, Screen, useRead, useStuck } from "../../core/ui";
import { body } from "../front-desk/kit";
import { NotRead } from "../front-desk/StayList";
import { Line } from "../guests/kit";
import { rupees } from "./bill";
import {
  amountInWords, cancellable, invoiceTotals, creditable, dayOf, invoiceFacts, invoiceTitle, isTestHotel, placeAfter, placeLine,
  signed, supplyLine, TEST_DOCUMENT, vatTitle, whyNotCancelVat, whyNotCreditNote, whyNotReadBills,
  type VatBillDetail,
} from "./books";
import { cancelVatBill, issueCreditNote, readInvoice, readVatBill } from "./booksData";
import { Act, BookSheet } from "./BooksKit";
import { Field, Input, Refused, SaidCard, type Said } from "./Kit";

/* ══════════════════════════════════════════════════════════════════
   AN INVOICE'S OWN PAGE — the web's /h/:code/invoices/doc/<number>
   (pages/Invoice.tsx) and /h/:code/invoices/vat/<number> (pages/VatBill.tsx),
   here /finance/<code>/invoice?number=… and /finance/<code>/vat-bill?number=…
   (the number has slashes; the gate reads only lower-case [segments], so it
   rides as a query, never a catch-all).

   EVERY FIGURE IS READ, NONE COMPUTED: each line's own amount and tax, the
   invoice's stored taxable value, CGST, SGST, tax and total. Where the web
   works figures out in the browser - each line's CGST/SGST split, the tax
   by rate, Total charges, Total discount, Total payment, Balance - the
   phone prints the server's own figures instead (MODULE.md). A credit note
   is the invoice's figures negated, as the web signs them.

   "Cancel this invoice" issues a credit note (CreditNoteFlow), for the four
   of D22-33, with the reason the server requires; refused offline in the
   web's sentence; an unknown outcome stops it until the sheet is closed and
   the invoice read again (MEMORY 16; the server answers a repeat with the
   note already made). Print and Send are the website's for now.
   ══════════════════════════════════════════════════════════════════ */

function Back({ code }: { code: string }) {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace(`/finance/${code}/invoices` as Href))}
      accessibilityRole="link" accessibilityLabel="All invoices" hitSlop={8}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
    >
      <ChevronLeft size={16} color={c.orange700} />
      <Text style={[t.label, { color: c.orange700, ...face[500] }]}>All invoices</Text>
    </Pressable>
  );
}

function Refusal({ code, text }: { code: string; text: string }) {
  return (
    <Screen refreshing={false} onRefresh={() => undefined}>
      <Back code={code} />
      <Card style={{ backgroundColor: c.grey50 }}><Text style={[t.label, { color: c.grey700 }]} accessibilityRole="alert">{text}</Text></Card>
    </Screen>
  );
}

/** A panel on the document: a credit note says what it cancels, a cancelled one says so. */
function Panel({ children }: { children: ReactNode }) {
  return <View style={{ borderRadius: 8, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, paddingHorizontal: 12, paddingVertical: 10, gap: 2 }}>{children}</View>;
}

/** The masthead: the copy, the hotel, the document and its number, when. */
function Masthead({ copy, name, title, number, when, test }: { copy?: string; name: string; title: string; number: string; when: string[]; test: boolean }) {
  return (
    <View style={{ gap: 4 }}>
      {test ? <Text style={[t.label, { color: c.red700, ...face[700], letterSpacing: 1 }]}>{TEST_DOCUMENT}</Text> : null}
      {copy ? <Text style={[t.caption, { fontSize: 10, letterSpacing: 1.2, textAlign: "right", ...face[700] }]}>{copy}</Text> : null}
      <Text style={[t.heading, { fontSize: 18 }]}>{name}</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <Text style={t.title} accessibilityRole="header">{title}</Text>
        <Text style={[t.label, t.tab, { color: c.ink900, ...face[600] }]}>{number}</Text>
      </View>
      {when.map((w) => <Text key={w} style={[t.caption, t.tab]}>{w}</Text>)}
    </View>
  );
}

/** A label and the server's figure, the totals' rows (DocTotals). */
function Sum({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, minHeight: 28, alignItems: "center", ...(strong ? { borderTopWidth: 1, borderTopColor: c.ink900, marginTop: 4, paddingTop: 6 } : null) }}>
      <Text style={[t.label, strong ? { color: c.ink900, ...face[600] } : body]}>{label}</Text>
      <Text style={[t.label, t.tab, { color: c.ink900, ...face[strong ? 700 : 500] }]}>{value}</Text>
    </View>
  );
}

const Facts = ({ rows }: { rows: Array<[string, string]> }) => (
  <View style={{ gap: 6 }}>{rows.map(([l, v]) => <Line key={l} label={l}>{v}</Line>)}</View>
);

/* ── The tax invoice ─────────────────────────────────────────────── */

export function InvoiceDoc({ hotel, number, role }: { hotel: Hotel; number: string; role: string | null }) {
  const refusal = whyNotReadBills(role);
  return refusal ? <Refusal code={hotel.code} text={refusal} /> : <Invoice hotel={hotel} number={number} role={role} />;
}

function Invoice({ hotel, number, role }: { hotel: Hotel; number: string; role: string | null }) {
  const code = hotel.code;
  const q = useRead(() => readInvoice(code, number), ["finance", code, "invoice", number]);
  const [asking, setAsking] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const test = isTestHotel(hotel);
  const d = q.data;

  if (!d) {
    return (
      <Screen refreshing={q.loading} onRefresh={q.reload}>
        <Back code={code} />
        {q.error ? <NotRead what="that invoice" error={q.error} onRetry={q.reload} />
          : q.loading ? <Text style={t.label}>Reading the invoice…</Text>
          : <Card><Text style={t.heading}>That invoice could not be loaded</Text><Text style={[t.label, body]}>No invoice of that number at this property.</Text></Card>}
      </Screen>
    );
  }

  const note = d.creditsInvoiceId !== null;
  const sign = (n: number) => signed(note, n);
  const facts = invoiceFacts(d, test);
  const s = d.stay ?? null;
  const place = placeAfter(d.supplier.address, d.supplier.city, d.supplier.state);
  const payments = note ? [] : d.payments ?? [];

  return (
    <Screen refreshing={q.loading} onRefresh={q.reload}>
      <Back code={code} />
      <View style={{ gap: 8 }}>
        {creditable(d) ? (
          <Act label="Cancel this invoice" Icon={FileMinus} why={whyNotCreditNote(role)} onRefused={(why) => setSaid({ tone: "refused", title: why })} onPress={() => { setSaid(null); setAsking(true); }} />
        ) : null}
        {creditable(d) && whyNotCreditNote(role) ? <Text style={[t.caption, { lineHeight: 17 }]}>{whyNotCreditNote(role)}</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {creditable(d) && !d.masterBill ? <Act label="Send invoice" Icon={Send} off onPress={() => undefined} /> : null}
          <Act label="Print" Icon={Printer} off onPress={() => undefined} />
        </View>
        <Text style={[t.caption, { lineHeight: 17 }]}>{`${ON_THE_WEBSITE}: printing the tax invoice and sending it to the guest. The printed invoice splits each line's CGST and SGST, which the website works out; the phone shows the invoice's own totals.`}</Text>
      </View>

      {said ? <SaidCard said={said} /> : null}

      <Card style={{ gap: 14 }}>
        <Masthead copy="ORIGINAL FOR RECIPIENT" name={d.supplier.name} title={invoiceTitle(d)} number={d.number} when={[d.issuedAt]} test={test} />

        <View style={{ gap: 2 }}>
          {d.supplier.address || place ? <Text style={[t.caption, { lineHeight: 18 }]}>{[d.supplier.address, place].filter(Boolean).join(", ")}</Text> : null}
          <Contact phone={d.supplier.phone} email={d.supplier.email} website={d.supplier.website} />
          {!test ? (
            <Text style={[t.caption, { color: c.ink900 }]}>
              GSTIN <Text style={[t.tab, face[600]]}>{d.supplier.gstin ?? DASH}</Text>
              {d.supplier.pan ? <>{" · PAN "}<Text style={[t.tab, face[600]]}>{d.supplier.pan}</Text></> : null}
            </Text>
          ) : null}
        </View>

        {note ? (
          <Panel>
            <Text style={[t.label, { color: c.ink900 }]}><Text style={face[600]}>This is a credit note.</Text> It cancels tax invoice <Text style={t.tab}>{d.creditsNumber ?? DASH}</Text>.</Text>
            {d.reason ? <Text style={[t.label, body]}>{d.reason}</Text> : null}
          </Panel>
        ) : d.creditedBy ? (
          <Panel>
            <Text style={[t.label, { color: c.ink900 }]}><Text style={face[600]}>Cancelled.</Text> Credit note <Text style={t.tab}>{d.creditedBy}</Text> was issued against this invoice.</Text>
          </Panel>
        ) : null}

        <Facts rows={facts.left} />
        {facts.right.length ? <View style={{ borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 10 }}><Facts rows={facts.right} /></View> : null}

        <Text style={[t.caption, { lineHeight: 18 }]}>{supplyLine(d.sacCode)}</Text>
        {d.vatBill ? (
          <Text style={[t.label, body, { color: c.ink900 }]}>
            Alcohol on this stay is billed separately, under VAT: VAT bill{" "}
            <Text accessibilityRole="link" onPress={() => router.push(`/finance/${code}/vat-bill?number=${encodeURIComponent(d.vatBill!)}` as Href)} style={[t.tab, { color: c.orange700, ...face[600], textDecorationLine: "underline" }]}>{d.vatBill}</Text>.
          </Text>
        ) : null}

        {/* Every line, as the server sent it: its taxable value and its own tax. */}
        <View style={{ borderTopWidth: 1, borderTopColor: c.grey200 }}>
          {d.lines.length === 0 ? <Text style={[t.label, body, { paddingVertical: 10 }]}>No chargeable lines.</Text> : null}
          {d.lines.map((l, i) => (
            <View key={`${l.description}-${i}`} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.grey100, gap: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <Text style={[t.label, { color: c.ink900, ...face[600], flexShrink: 1 }]}>{`${i + 1}. ${l.description}`}</Text>
                <Text style={[t.label, t.tab, { color: c.ink900, ...face[600] }]}>{rupees(sign(l.amount))}</Text>
              </View>
              <Text style={[t.caption, t.tab]}>{`${dayOf(l.date)} · HSN/SAC ${l.sac ?? DASH}${l.category === "discount" ? " · discount" : ""}`}</Text>
              {l.vat ? (
                <Text style={[t.caption, t.tab]}>{`VAT ${l.vat.rate}% · ${rupees(l.vat.amount)}`}</Text>
              ) : (
                <Text style={[t.caption, t.tab]}>{`GST ${l.taxRate}% · ${rupees(sign(l.taxAmount))}`}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={{ gap: 2 }}>
          {/* The server's totals as stored: a credit note's are already negative (MFIN-B3). */}
          {invoiceTotals(d).map(([label, value], i, all) => <Sum key={label} label={label} value={value} strong={i === all.length - 1} />)}
        </View>

        <View style={{ gap: 2 }}>
          <Text style={t.eyebrow}>Total payable, in words</Text>
          <Text style={[t.label, { color: c.ink900, lineHeight: 21 }]}>{amountInWords(d.total)}</Text>
        </View>

        {payments.length > 0 ? (
          <View style={{ gap: 6 }}>
            <Text style={t.eyebrow}>Payments</Text>
            {payments.map((p, i) => (
              <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <Text style={[t.label, body, { flexShrink: 1 }]}>{`${dayOf(p.date)} · ${p.description}`}</Text>
                <Text style={[t.label, t.tab, { color: c.ink900 }]}>{rupees(p.amount)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 10 }}>
          {s ? <><Line label="Reception (C/I)">{s.checkedInBy ?? DASH}</Line><Line label="Cashier (C/O)">{s.checkedOutBy ?? DASH}</Line></> : null}
          <Line label="Issued by">{d.issuedBy ?? DASH}</Line>
          <Line label="Currency">INR (₹)</Line>
        </View>

        <Text style={[t.caption, { lineHeight: 18 }]}>
          {`A computer-generated document, series ${d.finYear}. An issued tax invoice is not amended: any correction is a credit note with its own number.`}
        </Text>
      </Card>

      {asking ? (
        <CancelSheet
          code={code} noun="invoice" number={d.number} total={rupees(d.total)}
          send={(reason) => issueCreditNote(code, d.number, reason)}
          onClose={() => { setAsking(false); q.reload(); }}
          onDone={(s) => { setAsking(false); setSaid(s); q.reload(); }}
        />
      ) : null}
    </Screen>
  );
}

/** How to reach the hotel: a tap rings or writes (docs/NATIVE.md). */
function Contact({ phone, email, website }: { phone?: string | null; email?: string | null; website?: string | null }) {
  if (!phone && !email && !website) return null;
  const link = (label: string, url: string) => (
    <Text accessibilityRole="link" onPress={() => void Linking.openURL(url)} style={{ color: c.orange700, textDecorationLine: "underline" }}>{label}</Text>
  );
  return (
    <Text style={[t.caption, { lineHeight: 22 }]}>
      {phone ? <>{"Phone "}{link(phone, `tel:${phone.replace(/[^\d+]/g, "")}`)}</> : null}
      {phone && (email || website) ? " · " : null}
      {email ? <>{"E-mail "}{link(email, `mailto:${email}`)}</> : null}
      {email && website ? " · " : null}
      {website ?? null}
    </Text>
  );
}

/* ── The VAT bill ────────────────────────────────────────────────── */

export function VatBillDoc({ hotel, number, role }: { hotel: Hotel; number: string; role: string | null }) {
  const refusal = whyNotReadBills(role);
  return refusal ? <Refusal code={hotel.code} text={refusal} /> : <VatBill hotel={hotel} number={number} role={role} />;
}

function VatBill({ hotel, number, role }: { hotel: Hotel; number: string; role: string | null }) {
  const code = hotel.code;
  const q = useRead(() => readVatBill(code, number), ["finance", code, "vat-bill", number]);
  const [asking, setAsking] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const test = isTestHotel(hotel);
  const d: VatBillDetail | null | undefined = q.data;

  if (!d) {
    return (
      <Screen refreshing={q.loading} onRefresh={q.reload}>
        <Back code={code} />
        {q.error ? <NotRead what="that VAT bill" error={q.error} onRetry={q.reload} />
          : q.loading ? <Text style={t.label}>Reading the VAT bill…</Text>
          : <Card><Text style={t.heading}>That VAT bill could not be loaded</Text><Text style={[t.label, body]}>No VAT bill of that number at this property.</Text></Card>}
      </Screen>
    );
  }

  const cancel = d.cancelsNumber !== null;
  const sign = (n: number) => signed(cancel, n);
  const place = placeLine(d.supplier.address, d.supplier.city, d.supplier.state);

  return (
    <Screen refreshing={q.loading} onRefresh={q.reload}>
      <Back code={code} />
      <View style={{ gap: 8 }}>
        {cancellable(d) ? (
          <Act label="Cancel this VAT bill" Icon={FileMinus} why={whyNotCancelVat(role)} onRefused={(why) => setSaid({ tone: "refused", title: why })} onPress={() => { setSaid(null); setAsking(true); }} />
        ) : null}
        {cancellable(d) && whyNotCancelVat(role) ? <Text style={[t.caption, { lineHeight: 17 }]}>{whyNotCancelVat(role)}</Text> : null}
        <Act label="Print" Icon={Printer} off onPress={() => undefined} />
        <Text style={[t.caption, { lineHeight: 17 }]}>{`${ON_THE_WEBSITE}: printing the VAT bill.`}</Text>
      </View>

      {said ? <SaidCard said={said} /> : null}

      <Card style={{ gap: 14 }}>
        <Masthead name={d.supplier.name} title={vatTitle(d)} number={d.number} when={[d.issuedAt, ...(d.businessDate ? [`business date ${dayOf(d.businessDate)}`] : [])]} test={test} />

        {cancel ? (
          <Panel>
            <Text style={[t.label, { color: c.ink900 }]}><Text style={face[600]}>This is a credit note.</Text> It cancels VAT bill <Text style={t.tab}>{d.cancelsNumber}</Text>.</Text>
            {d.reason ? <Text style={[t.label, body]}>{d.reason}</Text> : null}
          </Panel>
        ) : d.cancelledBy ? (
          <Panel>
            <Text style={[t.label, { color: c.ink900 }]}><Text style={face[600]}>Cancelled.</Text> Credit note <Text style={t.tab}>{d.cancelledBy}</Text> was issued against this VAT bill.</Text>
          </Panel>
        ) : null}

        <View style={{ gap: 6 }}>
          <Line label="Billed to">{d.recipient ?? DASH}</Line>
          <Line label="Issued with">
            {d.invoice ? (
              <Text style={[t.label, body, { color: c.ink900 }]}>
                {"Tax invoice "}
                <Text accessibilityRole="link" onPress={() => router.push(`/finance/${code}/invoice?number=${encodeURIComponent(d.invoice!)}` as Href)} style={[t.tab, { color: c.orange700, ...face[600], textDecorationLine: "underline" }]}>{d.invoice}</Text>
              </Text>
            ) : `Restaurant bill ${d.order ?? DASH}`}
          </Line>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: c.grey200 }}>
          {d.lines.map((l, i) => (
            <View key={`${l.description}-${i}`} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.grey100 }}>
              <Text style={[t.label, { color: c.ink900, ...face[600], flexShrink: 1 }]}>{`${l.description}${l.qty !== null ? ` × ${l.qty}` : ""}`}</Text>
              <Text style={[t.label, t.tab, { color: c.ink900, ...face[600] }]}>{rupees(sign(l.amount))}</Text>
            </View>
          ))}
        </View>

        <View style={{ gap: 2 }}>
          {d.discount !== 0 ? <Sum label="Discount" value={rupees(sign(-d.discount))} /> : null}
          <Sum label="Taxable value" value={rupees(d.taxableValue)} />
          {/* One line, never halved into CGST and SGST (D21-91). */}
          <Sum label={`VAT${d.vatRate === null ? "" : ` @ ${d.vatRate}%`}`} value={rupees(d.vatTotal)} />
          <Sum label="Total" value={rupees(d.total)} strong />
        </View>

        <View style={{ gap: 2 }}>
          <Text style={t.eyebrow}>Amount in words</Text>
          <Text style={[t.label, { color: c.ink900, lineHeight: 21 }]}>{amountInWords(d.total)}</Text>
        </View>

        <Text style={[t.caption, { lineHeight: 18 }]}>
          {`${place ? `${d.supplier.name} · ${place}. ` : ""}A computer-generated document. Issued${d.issuedBy ? ` by ${d.issuedBy}` : ""} against the VAT series ${d.finYear}. An issued VAT bill is not amended; a correction is a credit note carrying its own number.`}
        </Text>
      </Card>

      {asking ? (
        <CancelSheet
          code={code} noun="VAT bill" number={d.number} total={rupees(d.total)}
          send={(reason) => cancelVatBill(code, d.number, reason)}
          onClose={() => { setAsking(false); q.reload(); }}
          onDone={(s) => { setAsking(false); setSaid(s); q.reload(); }}
        />
      ) : null}
    </Screen>
  );
}

/* ── Cancelling: a credit note against it (CreditNoteFlow.tsx) ───── */

function CancelSheet({ code, noun, number, total, send, onClose, onDone }: {
  code: string; noun: "invoice" | "VAT bill"; number: string; total: string;
  send: (reason: string) => Promise<{ number?: string }>;
  onClose: () => void; onDone: (said: Said) => void;
}) {
  const qc = useQueryClient();
  /* The lists (Issued, ready to bill) read again too: a credited bill may be invoiced again. */
  const reread = () => { void qc.invalidateQueries({ queryKey: ["finance", code] }); };
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const going = useRef(false);
  const stuck = useStuck();
  const vat = noun === "VAT bill";

  async function submit() {
    if (going.current || stuck.isStuck() || !reason.trim()) return;
    going.current = true;
    setBusy(true);
    setRefused(null);
    try {
      const r = await send(reason.trim());
      reread();
      onDone({ tone: "ok", title: `Credit note ${r.number ?? ""}`, text: `${number} is cancelled. Both documents stay on the record.` });
    } catch (e) {
      /* Nothing came back, or the server failed: the note may have been made. */
      if (stuck.stop(e)) {
        /* The body keeps the error's own words: offline, the web's refusal sentence. */
        const n = notKnown("cancelled", `this ${noun} once it is read again`, e);
        setRefused(`${n.title}. ${n.body}`);
      }
      else setRefused(`Not cancelled. ${e instanceof Error ? e.message : ""}`.trim());
    } finally {
      going.current = false;
      setBusy(false);
    }
  }

  return (
    <BookSheet
      visible onClose={() => (busy ? undefined : onClose())} title={`Cancel ${noun} ${number}`}
      description="A credit note is issued against it. Neither document is deleted."
      footer={(
        <>
          <Act label="Keep it" onPress={onClose} off={busy} />
          <Act kind="primary" label="Issue credit note" busy={busy} off={!reason.trim() || stuck.stuck} onPress={() => void submit()} />
        </>
      )}
    >
      <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>
        {vat ? "VAT bill" : "Invoice"} <Text style={[t.tab, { color: c.ink900, ...face[500] }]}>{number}</Text> for{" "}
        <Text style={[t.tab, { color: c.ink900, ...face[500] }]}>{total}</Text> is not edited and not deleted - a {vat ? "VAT" : "GST"} document
        that changes after a guest was handed it is the one an auditor asks about. A credit note with its own number is issued against it, and both stay on the record.
      </Text>
      <Field label={`Why the ${noun} was wrong`} required hint="The line somebody is asked about a year from now.">
        <Input value={reason} onChange={setReason} label={`Why the ${noun} was wrong`} multiline maxLength={500} off={busy || stuck.stuck}
          placeholder="Billed to the wrong guest - charges belong to FH-2608-4858." />
      </Field>
      <Refused text={refused} />
    </BookSheet>
  );
}

