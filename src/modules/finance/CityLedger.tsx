import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Building2, Plus, Undo2 } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { dateLong, monthStart } from "../../core/format";
import { c, face, t } from "../../core/theme";
import { Card, Screen } from "../../core/ui";
import {
  accountKey, companyPaymentState, ledgerOwed, ledgerRows, ledgerTable, owedPill, paymentLine, paymentTitle, rupees, dateDay,
  whyNotExport, whyNotReadLedger, whyNotRecordCompanyPayment, whyNotReverseCompanyPayment,
  type CompanyPayment, type CompanyPaymentsView, type LedgerRow,
} from "./desk";
import { readCompanyPayments, readLedger, recordCompanyPayment, reverseCompanyPayment } from "./deskData";
import { CardHead, DeskExport, DeskSheet, Hair, PageHead, ReadState, RefusedCard, TextAct, TonePill, failedSaid, useWrite, StopCard, useDeskRead, useStop, type Stop } from "./DeskKit";
import { Btn, Choice, Field, Input, Refused, SaidCard, type Said } from "./Kit";

/* ══════════════════════════════════════════════════════════════════
   COMPANY ACCOUNTS on a phone — the web's /h/:code/city-ledger
   (src/modules/finance/pages/Billing.tsx PropertyCityLedgerPage,
   flows/CompanyPayments.tsx; picture pms-shots/all/40-finance-company-
   accounts). ONE FIGURE FOR A COMPANY, EVERYWHERE (D27-127): the City
   ledger report's own figures for the month of the business date, read
   through reports' door, each account a card of labelled figures in the
   web's order. What is owed is the report's own Total row; the web adds
   the balances up in the browser. A figure the report did not send is a
   dash, where the web's Number(v ?? 0) printed a zero. What each company
   paid is recorded here (D27-239), reversed by its own line (D27-125);
   both refused offline in the web's words (unlisted: core offline.ts).
   ══════════════════════════════════════════════════════════════════ */

const LABEL = { fontSize: 12, ...face[500], letterSpacing: 0.6, textTransform: "uppercase" as const, color: c.grey500 };

export function CityLedger({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotReadLedger(role);
  const from = monthStart(hotel.businessDate);
  const asOn = hotel.businessDate;
  const doc = useDeskRead(() => (refused ? Promise.resolve(null) : readLedger(code, from, asOn)), ["finance", code, "desk", "city-ledger", from, asOn]);
  const paid = useDeskRead(() => (refused ? Promise.resolve(null) : readCompanyPayments(code)), ["finance", code, "desk", "company-payments"]);
  const stop = useStop(paid.began);
  const [said, setSaid] = useState<Said | null>(null);
  const [sheet, setSheet] = useState<{ kind: "record" } | { kind: "reverse"; p: CompanyPayment } | null>(null);
  const [pulled, setPulled] = useState(false);
  const pull = () => { setPulled(true); doc.reload(); paid.reload(); };
  const done = (s: Said | null) => { if (s) setSaid(s); void cache.invalidateQueries({ queryKey: ["finance", code] }); };
  const refusedSaid = (title: string) => (why: string) => setSaid({ tone: "refused", title, text: why });

  const rows = doc.data ? ledgerRows(doc.data) : [];
  const owed = doc.data ? ledgerOwed(doc.data) : null;
  const pill = owedPill(owed);
  const period = `${dateLong(from)} to ${dateLong(asOn)}`;
  const mayNotRecord = whyNotRecordCompanyPayment(role);

  return (
    <Screen refreshing={pulled && (doc.loading || paid.loading)} onRefresh={pull}>
      <PageHead title="Company accounts" pill={pill ? <TonePill tone={pill.tone} words={pill.words} /> : null}
        under={`What each company or booking site owes and paid, ${period}.`} />
      {refused ? <RefusedCard title="Company accounts" why={refused} /> : (
        <>
          <View style={{ flexDirection: "row" }}>
            <Btn label="Record payment" kind="primary" Icon={Plus} why={mayNotRecord} off={!paid.data}
              onRefused={refusedSaid("Not recorded")} onPress={() => setSheet({ kind: "record" })} />
          </View>
          <DeskExport why={whyNotExport(role, "money")} table={doc.data ? ledgerTable(rows, owed, `${hotel.name} · ${period}`) : null} />
          {said ? <SaidCard said={said} /> : null}
      <StopCard stop={stop} />
          {!doc.data ? <ReadState what="the company accounts" reading="Reading the company accounts…" error={doc.error} onRetry={doc.reload} />
            : rows.length === 0 ? (
              <Card style={{ gap: 6, alignItems: "center", paddingVertical: 24 }}>
                <Building2 size={24} color={c.grey400} />
                <Text style={t.heading}>Nothing sent to an account yet</Text>
                <Text style={[t.label, { textAlign: "center", lineHeight: 20 }]}>Each company, agent and booking site shows here once a bill is settled "Bill to company".</Text>
              </Card>
            ) : rows.map((r, i) => <Account key={`${r.account}-${i}`} r={r} onStatement={() => router.push(`/reports/${code}/company-statement?account=${encodeURIComponent(r.account)}`)} />)}
          <View style={{ gap: 2 }}>
            <Text style={[t.caption, { lineHeight: 18 }]}>
              {`The same figures as the City ledger report under Reports. Opening is what was owed before ${dateLong(from)}; Received is what the account paid, by the day it reached the hotel. How old each balance is:`}
            </Text>
            <View style={{ flexDirection: "row" }}>
              <TextAct label="Money owed by age" underline tone="grey" onPress={() => router.push(`/reports/${code}/dues-by-age`)} />
            </View>
          </View>
          {!paid.data ? <ReadState what="the payments received" reading="Reading the payments received…" error={paid.error} onRetry={paid.reload} />
            : <Received view={paid.data} role={role} onReverse={(p) => setSheet({ kind: "reverse", p })} onRefused={refusedSaid("Not reversed")} />}
        </>
      )}
      {sheet?.kind === "record" && paid.data ? <RecordSheet stop={stop} code={code} view={paid.data} onClose={() => setSheet(null)} onDone={done} /> : null}
      {sheet?.kind === "reverse" ? <ReverseSheet stop={stop} code={code} p={sheet.p} onClose={() => setSheet(null)} onDone={done} /> : null}
    </Screen>
  );
}

function Account({ r, onStatement }: { r: LedgerRow; onStatement: () => void }) {
  const fig = (label: string, value: number | null, strong?: boolean) => (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12, paddingVertical: 3 }}>
      <Text style={[LABEL, { width: 170 }]}>{label}</Text>
      <Text style={[t.label, t.tab, { color: c.ink900, ...(strong ? face[600] : {}) }]}>{rupees(value)}</Text>
    </View>
  );
  return (
    <Card style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[t.heading, { flex: 1, ...face[500] }]}>{r.account}</Text>
        {/* D27-383: the account's statement, read by the same people as this screen (the reports lane's screen). */}
        <TextAct label="Statement" underline tone="grey" onPress={onStatement} />
      </View>
      {fig("Opening", r.opening)}
      {fig("Sent to the account", r.debit)}
      {fig("Received", r.credit)}
      {fig("Balance", r.closing, true)}
    </Card>
  );
}

/* What companies paid, newest first. A reversal stays beside its line. */
function Received({ view, role, onReverse, onRefused }: {
  view: CompanyPaymentsView; role: string | null; onReverse: (p: CompanyPayment) => void; onRefused: (why: string) => void;
}) {
  const mayNot = whyNotReverseCompanyPayment(role);
  return (
    <Card style={{ gap: 12 }}>
      <CardHead title="Payments received" under="Newest first. A wrong line is reversed, never edited." />
      <Hair />
      {view.payments.length === 0 ? <Text style={[t.label, { color: c.grey500, lineHeight: 21 }]}>No company has paid yet. Record a payment when one arrives.</Text>
        : view.payments.map((p, i) => (
          <View key={p.id} style={{ gap: 4, paddingTop: i ? 12 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey200 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[t.label, { color: p.reversed ? c.grey500 : c.ink900, textDecorationLine: p.reversed ? "line-through" : "none" }]}>{paymentTitle(p)}</Text>
                <Text style={[t.caption, { lineHeight: 16 }]}>{paymentLine(p)}</Text>
              </View>
              <Text style={[t.label, t.tab, { color: c.ink900, ...face[500] }]}>{rupees(p.amount)}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {p.reversed ? <TonePill tone="neutral" words="Reversed" /> : null}
              {!p.reversed && !p.reversesId ? <TextAct label="Reverse" Icon={Undo2} why={mayNot} onRefused={onRefused} onPress={() => onReverse(p)} /> : null}
            </View>
          </View>
        ))}
    </Card>
  );
}

function RecordSheet({ stop, code, view, onClose, onDone }: { stop: Stop; code: string; view: CompanyPaymentsView; onClose: () => void; onDone: (s: Said | null) => void }) {
  const [f, setF] = useState({ account: "", amount: "", receivedOn: "", method: "", reference: "", note: "" });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const [problem, setProblem] = useState<string | null>(null);
  const w = useWrite(stop, "recorded", "Payments received");
  const s = companyPaymentState(view, f);
  const close = () => { onClose(); onDone(null); };
  const submit = () => {
    if (!s.body) return;
    const sent = s.body;
    setProblem(null);
    void w.run(async () => {
      await recordCompanyPayment(code, sent);
      onClose();
      onDone({ tone: "ok", title: "Payment recorded", text: `${rupees(sent.amount)} from ${s.chosen?.name ?? "the account"}.` });
    }, (e, lost) => {
      const x = failedSaid(e, "Not recorded", "recorded", "Payments received");
      if (lost) { onClose(); onDone(x); return; }
      setProblem(x.text ? `${x.title}. ${x.text}` : x.title);
    });
  };
  return (
    <DeskSheet title="Record a company's payment" onClose={close} footer={(
      <>
        <Btn label="Cancel" onPress={close} />
        <Btn label="Record payment" kind="primary" busy={w.busy} off={!s.ok || w.stuck} onPress={submit} />
      </>
    )}>
      <Field label="Who paid" hint="The company or booking site the City ledger names.">
        <Choice label="Who paid" value={f.account} onPick={set("account")} options={view.accounts.map((a) => ({ value: accountKey(a), label: a.name }))} />
      </Field>
      <Field label="Amount received">
        <Input value={f.amount} onChange={set("amount")} label="Amount received" keyboard="decimal-pad" tabular />
      </Field>
      <Field label="Received on" hint="The day the money reached the hotel, as YYYY-MM-DD.">
        <Input value={f.receivedOn} onChange={set("receivedOn")} label="Received on" keyboard="numbers-and-punctuation" placeholder="YYYY-MM-DD" tabular />
      </Field>
      <Field label="How">
        <Choice label="How" value={f.method} onPick={set("method")} options={Object.entries(view.methods).map(([value, label]) => ({ value, label }))} />
      </Field>
      <Field label="Reference" hint="The bank's UTR or the cheque's number - what the accountant matches.">
        <Input value={f.reference} onChange={set("reference")} label="Reference" />
      </Field>
      <Field label="Note" hint="Optional.">
        <Input value={f.note} onChange={set("note")} label="Note" multiline />
      </Field>
      <Refused text={problem} />
    </DeskSheet>
  );
}

function ReverseSheet({ stop, code, p, onClose, onDone }: { stop: Stop; code: string; p: CompanyPayment; onClose: () => void; onDone: (s: Said | null) => void }) {
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const w = useWrite(stop, "reversed", "Payments received");
  const close = () => { onClose(); onDone(null); };
  const submit = () => {
    setProblem(null);
    void w.run(async () => {
      await reverseCompanyPayment(code, p.id, reason);
      onClose();
      onDone({ tone: "ok", title: "Reversed", text: "Record it again with the right figures." });
    }, (e, lost) => { const x = failedSaid(e, "Not reversed", "reversed", "Payments received"); if (lost) { onClose(); onDone(x); return; } setProblem(x.text ? `${x.title}. ${x.text}` : x.title); });
  };
  return (
    <DeskSheet title="Reverse this payment?" onClose={close}
      description={`${rupees(p.amount)} from ${p.account}, received ${dateDay(p.receivedOn)}. The line stays; a reversal is added beside it.`}
      footer={(
        <>
          <Btn label="Cancel" onPress={close} />
          <Btn label="Reverse it" kind="danger" busy={w.busy} off={!reason.trim() || w.stuck} onPress={submit} />
        </>
      )}>
      <Field label="Why" hint="This is the line somebody asks about.">
        <Input value={reason} onChange={setReason} label="Why" multiline />
      </Field>
      <Refused text={problem} />
    </DeskSheet>
  );
}
