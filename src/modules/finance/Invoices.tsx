import { useQueryClient } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { Clock, FileCheck2, FileText, Percent, Receipt } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import type { ExportTable } from "../../core/exportDoc";
import { DASH } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { Capsule, Card, notKnown, Screen, useRead, useStuck } from "../../core/ui";
import { body, Empty, PageHead, Pill } from "../front-desk/kit";
import { Kept, NotRead } from "../front-desk/StayList";
import { Line } from "../guests/kit";
import { IconChip } from "../reports/kit";
import { rupees } from "./bill";
import {
  issuedState, PAGE, readyToBill, vatState, whyNotIssueYet, whyNotReadBills, type BillableRow, type IssuedInvoice,
  type IssuedVatBill, type SeriesState,
} from "./books";
import { readInvoices } from "./booksData";
import { Act, BookSheet, More, Note } from "./BooksKit";
import { issueInvoice } from "./data";
import { Refused, SaidCard, type Said } from "./Kit";
import { whyNotInvoice } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   INVOICES — the web's /h/:code/invoices (src/modules/finance/pages/
   Invoices.tsx): departed stays ready to bill, one row per bill (QA FI-1),
   and every number this property has issued, a credit note beside the
   invoice it cancels; the VAT bills for alcohol where a hotel has any.

   THE PHONE NEVER NUMBERS ANYTHING: Issue asks first in the web's words
   (D27-117), naming who and the next number the server gives, and the
   server allocates it in one transaction. Refused offline (the statutory
   series), in the web's sentence. A repeat is answered by the server with
   the invoice already made; an unknown outcome stops the button until the
   sheet is closed and the list read again (MEMORY 16). Every figure is
   the server's, to the paisa.
   ══════════════════════════════════════════════════════════════════ */

export function Invoices({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const refusal = whyNotReadBills(role);
  if (refusal) {
    return (
      <Screen refreshing={false} onRefresh={() => undefined}>
        <PageHead title="Invoices" />
        <Card style={{ backgroundColor: c.grey50 }}><Text style={[t.label, { color: c.grey700 }]} accessibilityRole="alert">{refusal}</Text></Card>
      </Screen>
    );
  }
  return <Lists hotel={hotel} role={role} />;
}

const openDoc = (code: string, kind: "invoice" | "vat-bill", number: string) =>
  router.push(`/finance/${code}/${kind}?number=${encodeURIComponent(number)}` as Href);

function DocLink({ number, onPress }: { number: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`Open ${number}`} hitSlop={8} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
      <Text style={[t.label, t.tab, { color: c.orange700, ...face[600], textDecorationLine: "underline" }]}>{number}</Text>
    </Pressable>
  );
}

function Lists({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const qc = useQueryClient();
  const q = useRead(() => readInvoices(code), ["finance", code, "invoices"]);
  const [said, setSaid] = useState<Said | null>(null);
  const [asking, setAsking] = useState<BillableRow | null>(null);
  const [shownBills, setShownBills] = useState(PAGE);
  const [shownIssued, setShownIssued] = useState(PAGE);
  const d = q.data;
  const ready = d ? readyToBill(d.billable) : 0;
  const mayInvoice = whyNotInvoice(role);
  const seeTaxRules = role != null && ["owner", "admin", "gm", "finance"].includes(role);

  /* The web's export of Issued (ISSUED_EXPORT): every number, as on screen. */
  const table: ExportTable | null = d ? {
    title: "Invoices issued",
    subtitle: `${hotel.name} · every number issued, newest first`,
    columns: ["Number", "Billed to", "Issued", "Tax", "Total", "State"],
    rows: d.issued.map((i) => [i.number, i.recipient ?? DASH, i.issuedAt, rupees(i.taxTotal), rupees(i.total), i.isCreditNote ? "Credit note" : i.creditedBy ? `Cancelled by ${i.creditedBy}` : DASH]),
  } : null;

  const reread = () => { void qc.invalidateQueries({ queryKey: ["finance", code] }); };

  return (
    <Screen refreshing={q.loading} onRefresh={q.reload}>
      <PageHead
        title="Invoices"
        pill={d ? <Pill tone={ready ? "success" : "neutral"}>{`${ready} ready to bill`}</Pill> : undefined}
        description="Departed stays ready to bill, and every number this property has issued."
      />

      {/* E-invoicing, named, not silent (Invoices.tsx 297-337). */}
      <Note icon={<IconChip icon={Clock} />} title="E-invoicing (IRN and signed QR) - coming soon">
        <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>
          Not required of this group: registering each B2B invoice with the government portal begins above ₹5 crore of annual
          turnover, and this group is under it. Invoices issued here are complete and valid GST invoices without an IRN.
          <Text style={{ color: c.ink900, ...face[500] }}> Tell us the year this group crosses ₹5 crore</Text>
          {" "}- from the April after that, every B2B invoice needs an IRN before it reaches the guest, and this is where it will appear.
        </Text>
      </Note>

      <Note icon={<IconChip icon={FileText} />} title="Numbers come from the database, in sequence">
        <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>
          The number is allocated and written against the folio in one transaction, so the GST series cannot gain a hole. An
          issued invoice is never edited - a wrong one is corrected with a credit note carrying its own number, and both remain.
        </Text>
        {(d?.series ?? []).map((s: SeriesState) => (
          <Text key={`${s.prefix}-${s.finYear}`} style={[t.caption, { marginTop: 8, lineHeight: 18 }]}>
            {`${s.finYear} - next `}<Text style={[t.label, t.tab, { color: c.ink900, ...face[500] }]}>{s.next}</Text>{` · ${s.note}`}
          </Text>
        ))}
      </Note>

      {said ? <SaidCard said={said} /> : null}

      {!d ? (
        q.error ? <NotRead what="the invoices" error={q.error} onRetry={q.reload} plural /> : <Text style={t.label}>Reading the invoices…</Text>
      ) : (
        <>
          {d.billable.length === 0 ? (
            <Card><Empty title="Nothing has departed yet" line="A folio becomes billable when the guest checks out." Icon={Receipt} /></Card>
          ) : (
            <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 }}>
              {d.billable.slice(0, shownBills).map((b, i) => (
                <Billable
                  key={b.folioId} b={b} first={i === 0} why={mayInvoice ?? whyNotIssueYet(b.status)}
                  onIssue={() => { setSaid(null); setAsking(b); }} onRefused={(why) => setSaid({ tone: "refused", title: why })}
                  onOpen={(n) => openDoc(code, "invoice", n)}
                />
              ))}
            </View>
          )}
          <More shown={shownBills} of={d.billable.length} onMore={() => setShownBills((n) => n + PAGE)} />

          <View style={{ gap: 2, marginTop: space.section - space.card }}>
            <Text style={t.heading} accessibilityRole="header">Issued</Text>
            <Text style={[t.label, body, { color: c.grey500, lineHeight: 21 }]}>Every number allocated at this property, newest first. A credit note sits beside the invoice it cancels.</Text>
          </View>
          <ExportButtons table={table} />
          {d.issued.length === 0 ? (
            <Card><Empty title="No invoice has been issued" line="The series above is waiting at its first number." Icon={FileText} /></Card>
          ) : (
            <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 }}>
              {d.issued.slice(0, shownIssued).map((i, n) => <Issued key={i.number} i={i} first={n === 0} onOpen={() => openDoc(code, "invoice", i.number)} />)}
            </View>
          )}
          <More shown={shownIssued} of={d.issued.length} onMore={() => setShownIssued((n) => n + PAGE)} />

          {/* D22-44: only where a hotel has issued one. */}
          {d.vat.length > 0 ? (
            <>
              <View style={{ gap: 2, marginTop: space.section - space.card }}>
                <Text style={t.heading} accessibilityRole="header">VAT bills</Text>
                <Text style={[t.label, body, { color: c.grey500, lineHeight: 21 }]}>Alcohol, billed under VAT from its own series, each beside the GST document of the same sale.</Text>
              </View>
              <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 }}>
                {d.vat.map((v, n) => <Vat key={v.number} v={v} first={n === 0} onOpen={() => openDoc(code, "vat-bill", v.number)} />)}
              </View>
            </>
          ) : null}
          <Kept error={q.error} what="the invoices" />
        </>
      )}

      {/* D23-1: the four who may set a rate see the tax card on the web (TaxRulesCard); on the phone it is the
          Taxes page, which the accountant may open too (roleGate GST; mobile/m13-set-money, MSET-M4). */}
      {seeTaxRules ? (
        <Note icon={<IconChip icon={Percent} />} title="GST and VAT rates">
          <View style={{ gap: 8 }}>
            <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>The rates the front desk and the till bill at, and each heading's HSN/SAC code, are set on Taxes.</Text>
            <View style={{ flexDirection: "row" }}><Capsule label="Open Taxes" onPress={() => router.push(`/settings/${code}/taxes` as Href)} /></View>
          </View>
        </Note>
      ) : null}

      {asking ? (
        <IssueSheet
          code={code} row={asking} series={d?.series ?? []}
          onClose={() => { setAsking(null); reread(); }}
          onDone={(s) => { setAsking(null); setSaid(s); reread(); }}
        />
      ) : null}
    </Screen>
  );
}

/** A bill ready to invoice: the guest, its room and reference, then Billed to, Nights, Charges, Tax, Balance, and Issue or its number. */
function Billable({ b, first, why, onIssue, onRefused, onOpen }: {
  b: BillableRow; first: boolean; why: string | null; onIssue: () => void; onRefused: (why: string) => void; onOpen: (number: string) => void;
}) {
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <View>
        <Text style={[t.label, { color: c.ink900 }]} numberOfLines={1}>{b.guest}</Text>
        <Text style={[t.caption, t.tab]}>room {b.roomNumber} · {b.reference}</Text>
      </View>
      <Line label="Billed to">{b.billTo}</Line>
      <Line label="Nights">{String(b.nights)}</Line>
      <Line label="Charges">{rupees(b.charges)}</Line>
      <Line label="Tax">{rupees(b.tax)}</Line>
      <Line label="Balance">
        {/* The server's balance, a settled ₹0.00 included (MFIN-4); the web prints a dash for it. */}
        <Text style={[body, t.tab, b.balance !== 0 ? { color: c.red700, ...face[500] } : { color: c.ink900 }]}>{rupees(b.balance)}</Text>
      </Line>
      <Line label="">
        {b.invoice ? <DocLink number={b.invoice} onPress={() => onOpen(b.invoice!)} /> : (
          <View style={{ gap: 4 }}>
            <Act label="Issue" a11y={`Issue the tax invoice to ${b.billTo}`} why={why} onRefused={onRefused} onPress={onIssue} />
            {why ? <Text style={[t.caption, { lineHeight: 17 }]}>{why}</Text> : null}
          </View>
        )}
      </Line>
    </View>
  );
}

function Issued({ i, first, onOpen }: { i: IssuedInvoice; first: boolean; onOpen: () => void }) {
  const state = issuedState(i);
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 6, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <Line label="Number">
        <DocLink number={i.number} onPress={onOpen} />
        {i.isCreditNote ? <Text style={[t.caption, { color: c.red700 }]}>credit note</Text> : null}
      </Line>
      <Line label="Billed to">{i.recipient ?? DASH}</Line>
      <Line label="Issued">{i.issuedAt}</Line>
      <Line label="Tax">{rupees(i.taxTotal)}</Line>
      <Line label="Total"><Text style={[body, t.tab, { color: i.total < 0 ? c.red700 : c.ink900, ...face[500] }]}>{rupees(i.total)}</Text></Line>
      <Line label="">
        {state ? (
          <View style={{ gap: 2, alignItems: "flex-start" }}>
            <Pill tone={state.tone}>{state.label}</Pill>
            {state.note ? <Text style={[t.caption, t.tab]}>{state.note}</Text> : null}
          </View>
        ) : <Text style={t.caption}>{DASH}</Text>}
      </Line>
    </View>
  );
}

function Vat({ v, first, onOpen }: { v: IssuedVatBill; first: boolean; onOpen: () => void }) {
  const state = vatState(v);
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 6, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <Line label="Number">
        <DocLink number={v.number} onPress={onOpen} />
        {v.isCancellation ? <Text style={[t.caption, { color: c.red700 }]}>credit note</Text> : null}
      </Line>
      <Line label="Billed to">{v.recipient ?? DASH}</Line>
      <Line label="Issued">{v.issuedAt}</Line>
      <Line label="VAT">{rupees(v.vatTotal)}</Line>
      <Line label="Total"><Text style={[body, t.tab, { color: v.total < 0 ? c.red700 : c.ink900, ...face[500] }]}>{rupees(v.total)}</Text></Line>
      <Line label="">
        {state ? (
          <View style={{ gap: 2, alignItems: "flex-start" }}>
            <Pill tone={state.tone}>{state.label}</Pill>
            {state.note ? <Text style={[t.caption, t.tab]}>{state.note}</Text> : null}
          </View>
        ) : <Text style={t.caption}>{DASH}</Text>}
      </Line>
    </View>
  );
}

/** "Are you sure", before a legal number is taken (IssueInvoiceDialog, D27-117). */
function IssueSheet({ code, row, series, onClose, onDone }: {
  code: string; row: BillableRow; series: SeriesState[]; onClose: () => void; onDone: (said: Said) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const going = useRef(false);
  const stuck = useStuck();
  const next = series[0]?.next;

  async function issue() {
    if (going.current || stuck.isStuck()) return;
    going.current = true;
    setBusy(true);
    setRefused(null);
    try {
      const r = await issueInvoice(code, row.stayId, row.folioId);
      onDone({ tone: "ok", title: `Issued ${r.number ?? ""}${r.vatBill ? `, and VAT bill ${r.vatBill} for the alcohol` : ""}.` });
    } catch (e) {
      /* Nothing came back, or the server failed: it may have been issued. */
      if (stuck.stop(e)) {
        /* The body keeps the error's own words: offline, the web's refusal sentence. */
        const n = notKnown("issued", "the Issued list", e);
        setRefused(`${n.title}. ${n.body}`);
      }
      else setRefused(e instanceof Error ? e.message : "The invoice was not issued. Nothing was changed.");
    } finally {
      going.current = false;
      setBusy(false);
    }
  }

  return (
    <BookSheet
      visible onClose={() => (busy ? undefined : onClose())} title="Issue this tax invoice?" description={`${row.guest} · room ${row.roomNumber} · ${row.reference}`}
      footer={(
        <>
          <Act label="Keep it" onPress={onClose} off={busy} />
          <Act kind="primary" label="Issue the invoice" busy={busy} off={stuck.stuck} onPress={() => void issue()} />
        </>
      )}
    >
      <Text style={[t.label, body, { color: c.grey700, lineHeight: 21 }]}>
        Billed to <Text style={{ color: c.ink900, ...face[500] }}>{row.billTo}</Text>. It takes the next number in the GST series
        {next ? <>{" - "}<Text style={[t.tab, { color: c.ink900, ...face[500] }]}>{next}</Text></> : null}. An issued invoice is never edited: a wrong one needs a credit note.
      </Text>
      <Refused text={refused} />
      {stuck.stuck ? <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><FileCheck2 size={16} color={c.grey500} /><Text style={t.caption}>Close this and look at the list: it is read again.</Text></View> : null}
    </BookSheet>
  );
}
