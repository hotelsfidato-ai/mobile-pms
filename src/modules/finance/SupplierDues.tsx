import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { HandCoins } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, t } from "../../core/theme";
import { Card, Screen } from "../../core/ui";
import { suggestedDue } from "../purchasing/purchase";
import {
  PAY_METHODS, TDS_SECTIONS, billFrom, creditBody, creditText, dateDay, differenceText, dueGroups, duesHead, duesTotals, isOverdue,
  money, payBody, paymentText, reverseBody, rupees, whyNotPaySupplier, whyNotReadDues,
  type DueGroup, type PayForm, type Reversing, type SupplierDue,
} from "./desk";
import { addCreditNote, paySupplier, readDues, readDuesReport, reverseDueEntry } from "./deskData";
import { DeskSheet, Figure, OnOff, PageHead, ReadState, RefusedCard, TextAct, failedSaid, useWrite, StopCard, useDeskRead, useStop, type Stop } from "./DeskKit";
import { Btn, Choice, Field, Input, Refused, SaidCard, Tick, type Said } from "./Kit";

/* ══════════════════════════════════════════════════════════════════
   SUPPLIER DUES on a phone — the web's /h/:code/supplier-dues
   (src/modules/purchasing/pages/SupplierDuesPage.tsx and components/
   SupplierDues.tsx, data/purchasing.ts; the API's purchasing/supplierDues.ts;
   picture pms-shots/new/n-h-supplier-dues). What we owe suppliers (D27-370,
   D27-372): every bill taken on credit with something left on it, by
   supplier. A payment pays all or part of what is left; a credit note,
   money only, lowers a bill or the supplier; a mistake is reversed with a
   reason. No cash drawer is touched. Each bill's figures are the server's;
   a supplier's total and the total owed are the Supplier dues report's own
   total rows for the same day (the web adds them up in the browser), a
   dash when that report is not read. The web's table becomes a card per
   bill, its columns as labelled figures in the web's order.
   ══════════════════════════════════════════════════════════════════ */

type Sheet = { kind: "pay"; bill: SupplierDue } | { kind: "credit"; bill: SupplierDue | null; supplierId: string; supplier: string } | { kind: "reverse"; entry: Reversing };

export function SupplierDues({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotReadDues(role);
  const q = useDeskRead(() => (refused ? Promise.resolve(null) : readDues(code)), ["finance", code, "desk", "dues"]);
  const stop = useStop(q.began);
  const today = q.data?.today ?? null;
  const rep = useDeskRead(() => (refused || !today ? Promise.resolve(null) : readDuesReport(code, today)), ["finance", code, "desk", "dues-report", today ?? ""]);
  const [said, setSaid] = useState<Said | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [pulled, setPulled] = useState(false);
  const pull = () => { setPulled(true); q.reload(); rep.reload(); };
  const done = (s: Said | null) => { if (s) setSaid(s); void cache.invalidateQueries({ queryKey: ["finance", code] }); };
  const why = whyNotPaySupplier(role);
  const refusedSaid = (title: string) => (w: string) => setSaid({ tone: "refused", title, text: w });
  const d = q.data;
  const totals = duesTotals(rep.data);

  return (
    <Screen refreshing={pulled && q.loading} onRefresh={pull}>
      <PageHead title="Supplier dues" under="What we owe suppliers: the bills taken on credit, what is paid and what is left." />
      {said ? <SaidCard said={said} /> : null}
      <StopCard stop={stop} />
      {refused ? <RefusedCard title="Supplier dues" why={refused} />
        : !d ? <ReadState what="the supplier dues" reading="Reading the supplier dues…" error={q.error} onRetry={q.reload} />
        : d.bills.length === 0 && d.credits.length === 0 ? (
          <Card style={{ alignItems: "center", gap: 6, paddingVertical: 24 }}>
            <HandCoins size={24} color={c.grey400} />
            <Text style={t.heading}>Nothing is owed to a supplier</Text>
            <Text style={[t.label, { textAlign: "center", lineHeight: 20 }]}>A delivery or a bar bill recorded on credit is listed here until it is paid.</Text>
          </Card>
        ) : (
          <>
            <Text style={[t.label, { color: c.ink900, fontSize: 16 }]}>
              {"Owed to suppliers: "}<Text style={[t.tab, face[600]]}>{duesHead(totals.total, d.bills.length).owed}</Text>
              <Text style={{ color: c.grey600 }}>{` · ${duesHead(totals.total, d.bills.length).count}`}</Text>
            </Text>
            {rep.error && !rep.data ? <Text style={t.caption}>{`The totals come from the Supplier dues report, which did not read: ${rep.error}`}</Text> : null}
            {dueGroups(d).map((g) => (
              <Group key={g.key} code={code} g={g} today={d.today} total={totals.of(g.name)} why={why} onRefused={refusedSaid}
                onSheet={setSheet} />
            ))}
          </>
        )}
      {sheet?.kind === "pay" && d ? <PaySheet stop={stop} code={code} bill={sheet.bill} today={d.today} onClose={() => setSheet(null)} onDone={done} /> : null}
      {sheet?.kind === "credit" && d ? <CreditSheet stop={stop} code={code} target={sheet} today={d.today} onClose={() => setSheet(null)} onDone={done} /> : null}
      {sheet?.kind === "reverse" ? <ReverseSheet stop={stop} code={code} entry={sheet.entry} onClose={() => setSheet(null)} onDone={done} /> : null}
    </Screen>
  );
}

function Group({ code, g, today, total, why, onRefused, onSheet }: {
  code: string; g: DueGroup; today: string; total: number | null; why: string | null;
  onRefused: (title: string) => (w: string) => void; onSheet: (s: Sheet) => void;
}) {
  const reverse = (entry: Reversing) => onSheet({ kind: "reverse", entry });
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 4 }}>
        <Text style={[t.heading, { flex: 1, minWidth: 140 }]}>{g.name}</Text>
        {g.supplierId ? (
          <>
            <TextAct label="Statement" underline tone="grey" onPress={() => router.push(`/reports/${code}/supplier-statement?supplier=${g.supplierId}`)} />
            <TextAct label="Credit note" tone="grey" why={why} onRefused={onRefused("Not recorded")}
              onPress={() => onSheet({ kind: "credit", bill: null, supplierId: g.supplierId!, supplier: g.name })} />
          </>
        ) : null}
        <Text style={[t.label, t.tab, { color: c.ink900, ...face[500] }]}>{rupees(total)}</Text>
      </View>
      {g.bills.map((b) => {
        const late = isOverdue(b, today);
        return (
          <View key={b.id} style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.grey200 }}>
            <View style={{ gap: 2 }}>
              <Text style={[t.label, { color: c.ink900 }]}>
                {`${b.billNo} · `}
                {b.from.kind === "order" ? (
                  <Text style={{ color: c.grey500, textDecorationLine: "underline" }} accessibilityRole="link"
                    onPress={() => router.push(`/purchasing/${code}/${(b.from as { id: string }).id}`)}>{billFrom(b)}</Text>
                ) : <Text style={{ color: c.grey500 }}>{billFrom(b)}</Text>}
              </Text>
              {/* The bill against its order (D27-383 item 11). */}
              {b.differences.length > 0 ? <Text style={[t.caption, { color: c.red700, ...face[500] }]}>{`Differs from the order: ${b.differences.map(differenceText).join("; ")}`}</Text> : null}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 8 }}>
              <Figure label="Bill date" value={dateDay(b.billDate)} />
              <Figure label="Due" value={`${dateDay(b.dueOn)}${late ? " · overdue" : ""}`} tone={late ? "danger" : undefined} />
              <Figure label="Amount" value={money(b.amount)} />
              <View style={{ gap: 0 }}>
                <Figure label="Left" value={money(b.owed)} />
                {b.status === "part-paid" ? <Text style={[t.caption, { fontSize: 11 }]}>Part-paid</Text> : null}
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <Btn label="Record payment" why={why} onRefused={onRefused("Not recorded")} onPress={() => onSheet({ kind: "pay", bill: b })} />
              <TextAct label="Credit note" why={why} onRefused={onRefused("Not recorded")} onPress={() => onSheet({ kind: "credit", bill: b, supplierId: b.supplierId ?? "", supplier: b.supplier })} />
              <TextAct label="Reverse" why={why} onRefused={onRefused("Not reversed")} onPress={() => reverse({ kind: "bill", id: b.id, what: `bill ${b.billNo}` })} />
            </View>
            {b.payments.map((p) => (
              <Entry key={p.id} text={paymentText(p)} reversed={p.reversed} why={why} onRefused={onRefused("Not reversed")}
                onReverse={() => reverse({ kind: "payment", id: p.id, what: `the payment of ${money(p.amount)}` })} />
            ))}
            {b.creditNotes.map((n) => (
              <Entry key={n.id} text={creditText(n)} reversed={false} why={why} onRefused={onRefused("Not reversed")}
                onReverse={() => reverse({ kind: "credit-note", id: n.id, what: `credit note ${n.noteNo}` })} />
            ))}
          </View>
        );
      })}
      {g.credits.map((n) => (
        <Entry key={n.id} text={creditText(n)} reversed={false} why={why} onRefused={onRefused("Not reversed")}
          onReverse={() => reverse({ kind: "credit-note", id: n.id, what: `credit note ${n.noteNo}` })} />
      ))}
    </Card>
  );
}

function Entry({ text, reversed, why, onRefused, onReverse }: { text: string; reversed: boolean; why: string | null; onRefused: (w: string) => void; onReverse: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12 }}>
      <Text style={[t.caption, { flex: 1, color: c.grey600, lineHeight: 16, textDecorationLine: reversed ? "line-through" : "none" }]}>{text}</Text>
      {!reversed ? <TextAct label="Reverse" tone="grey" why={why} onRefused={onRefused} onPress={onReverse} /> : null}
    </View>
  );
}

function PaySheet({ stop, code, bill, today, onClose, onDone }: { stop: Stop; code: string; bill: SupplierDue; today: string; onClose: () => void; onDone: (s: Said | null) => void }) {
  const [f, setF] = useState<PayForm>({ amount: bill.owed, method: "", reference: "", paidOn: today, handedOverBy: "", withTds: false, section: "", rate: "", tdsAmount: "", seen: false });
  const set = <K extends keyof PayForm>(k: K) => (v: PayForm[K]) => setF((o) => ({ ...o, [k]: v }));
  const [problem, setProblem] = useState<string | null>(null);
  const w = useWrite(stop, "recorded", "the bill");
  const close = () => { onClose(); onDone(null); };
  const submit = () => {
    const r = payBody(bill, f);
    if (!r.body) return setProblem(r.problem ?? null);
    const sent = r.body;
    setProblem(null);
    void w.run(async () => {
      await paySupplier(code, bill.id, sent);
      onClose();
      onDone({ tone: "ok", title: `Payment recorded on bill ${bill.billNo}`, text: `${rupees(sent.amount)} to ${bill.supplier}.` });
    }, (e, lost) => {
      const x = failedSaid(e, "Not recorded", "recorded", "the bill");
      if (lost) { onClose(); onDone(x); return; }
      setProblem(x.text ? `${x.title}. ${x.text}` : x.title);
    });
  };
  return (
    <DeskSheet title={`Pay bill ${bill.billNo}`} onClose={close}
      description={`${bill.supplier}: ${money(bill.owed)} left of ${money(bill.amount)}. Pay all of it or a part. Nothing changes in a cash drawer.`}
      footer={(
        <>
          <Btn label="Cancel" onPress={close} />
          <Btn label="Record payment" kind="primary" busy={w.busy} off={w.stuck} onPress={submit} />
        </>
      )}>
      {bill.differences.length > 0 ? (
        <View style={{ gap: 6, backgroundColor: c.yellow50, borderWidth: 1, borderColor: c.yellow100, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={[t.label, { color: c.ink900, ...face[600] }]}>This bill differs from its order</Text>
          {bill.differences.map((x) => <Text key={`${x.lineId}-${x.kind}`} style={[t.label, t.tab, { color: c.ink900 }]}>{differenceText(x)}</Text>)}
          <Tick on={f.seen} onChange={set("seen")} label="I have seen these differences, and this bill is to be paid as it is" />
        </View>
      ) : null}
      <Field label="Amount paid">
        <Input value={f.amount} onChange={set("amount")} label="Amount paid" keyboard="decimal-pad" tabular />
      </Field>
      <Field label="How">
        <Choice label="How" value={f.method} onPick={set("method")} options={PAY_METHODS} />
      </Field>
      <Field label="Reference" hint={f.method === "cash" ? "Optional for cash." : "Cheque, UTR or UPI number."}>
        <Input value={f.reference} onChange={set("reference")} label="Reference" />
      </Field>
      <Field label="Paid on" hint="As YYYY-MM-DD.">
        <Input value={f.paidOn} onChange={set("paidOn")} label="Paid on" keyboard="numbers-and-punctuation" placeholder="YYYY-MM-DD" tabular />
      </Field>
      <Field label="Handed over by" hint="Who gave the supplier the money or cheque.">
        <Input value={f.handedOverBy} onChange={set("handedOverBy")} label="Handed over by" />
      </Field>
      <OnOff value={f.withTds} onChange={set("withTds")} label="TDS deducted" />
      {f.withTds ? (
        <>
          <Field label="Section">
            <Choice label="Section" value={f.section} onPick={set("section")} options={TDS_SECTIONS.map((s) => ({ value: s, label: s }))} />
          </Field>
          <Field label="Rate, %">
            <Input value={f.rate} onChange={set("rate")} label="Rate, %" keyboard="decimal-pad" tabular />
          </Field>
          <Field label="TDS amount">
            <Input value={f.tdsAmount} onChange={set("tdsAmount")} label="TDS amount" keyboard="decimal-pad" tabular />
          </Field>
        </>
      ) : null}
      <Refused text={problem} />
    </DeskSheet>
  );
}

function CreditSheet({ stop, code, target, today, onClose, onDone }: {
  stop: Stop; code: string; target: { bill: SupplierDue | null; supplierId: string; supplier: string }; today: string; onClose: () => void; onDone: (s: Said | null) => void;
}) {
  const [f, setF] = useState({ issuedBy: "supplier" as "supplier" | "hotel", noteNo: "", noteDate: today, amount: "", reason: "" });
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((o) => ({ ...o, [k]: v }));
  const [problem, setProblem] = useState<string | null>(null);
  const w = useWrite(stop, "recorded", "the dues");
  const close = () => { onClose(); onDone(null); };
  const submit = () => {
    const r = creditBody(target, f);
    if (!r.body) return setProblem(r.problem ?? null);
    const sent = r.body;
    setProblem(null);
    void w.run(async () => {
      await addCreditNote(code, sent);
      onClose();
      onDone({ tone: "ok", title: `Credit note ${sent.noteNo} recorded`, text: `${rupees(sent.amount)} off what is owed to ${target.supplier}.` });
    }, (e, lost) => {
      const x = failedSaid(e, "Not recorded", "recorded", "the dues");
      if (lost) { onClose(); onDone(x); return; }
      setProblem(x.text ? `${x.title}. ${x.text}` : x.title);
    });
  };
  return (
    <DeskSheet title={target.bill ? `Credit note on bill ${target.bill.billNo}` : `Credit note from ${target.supplier}`} onClose={close}
      description="Money only: it lowers what is owed. Goods sent back leave the store as a store movement, separately."
      footer={(
        <>
          <Btn label="Cancel" onPress={close} />
          <Btn label="Record credit note" kind="primary" busy={w.busy} off={w.stuck} onPress={submit} />
        </>
      )}>
      <Field label="Whose note">
        <Choice label="Whose note" value={f.issuedBy} onPick={set("issuedBy")}
          options={[{ value: "supplier", label: "The supplier's" }, { value: "hotel", label: "Ours (a debit note to the supplier)" }]} />
      </Field>
      <Field label="Number"><Input value={f.noteNo} onChange={set("noteNo")} label="Number" /></Field>
      <Field label="Date" hint="As YYYY-MM-DD."><Input value={f.noteDate} onChange={set("noteDate")} label="Date" keyboard="numbers-and-punctuation" placeholder="YYYY-MM-DD" tabular /></Field>
      <Field label="Amount"><Input value={f.amount} onChange={set("amount")} label="Amount" keyboard="decimal-pad" tabular /></Field>
      <Field label="What it is for"><Input value={f.reason} onChange={set("reason")} label="What it is for" maxLength={200} /></Field>
      <Refused text={problem} />
    </DeskSheet>
  );
}

function ReverseSheet({ stop, code, entry, onClose, onDone }: { stop: Stop; code: string; entry: Reversing; onClose: () => void; onDone: (s: Said | null) => void }) {
  const [reason, setReason] = useState("");
  /* A wrong bill may be followed by its right one (D27-372): optional. */
  const [right, setRight] = useState({ billNo: "", billDate: "", amount: "", dueOn: "" });
  const [problem, setProblem] = useState<string | null>(null);
  const w = useWrite(stop, "reversed", "the dues");
  const close = () => { onClose(); onDone(null); };
  const submit = () => {
    const r = reverseBody(entry, reason, right);
    if (!r.body) return setProblem(r.problem ?? null);
    const sent = r.body;
    setProblem(null);
    void w.run(async () => {
      await reverseDueEntry(code, sent);
      onClose();
      onDone({ tone: "ok", title: `Reversed ${entry.what}` });
    }, (e, lost) => { const x = failedSaid(e, "Not reversed", "reversed", "the dues"); if (lost) { onClose(); onDone(x); return; } setProblem(x.text ? `${x.title}. ${x.text}` : x.title); });
  };
  return (
    <DeskSheet title={`Reverse ${entry.what}`} onClose={close}
      description="Nothing is deleted: the entry and its reversal both stay on the record, with your reason and your name."
      footer={(
        <>
          <Btn label="Cancel" onPress={close} />
          <Btn label="Reverse" kind="danger" busy={w.busy} off={w.stuck} onPress={submit} />
        </>
      )}>
      <Field label="Why"><Input value={reason} onChange={setReason} label="Why" maxLength={200} /></Field>
      {entry.kind === "bill" ? (
        <>
          <Text style={[t.label, { color: c.grey600 }]}>The right bill, if there is one (leave its number empty if not):</Text>
          <Field label="Bill number"><Input value={right.billNo} onChange={(v) => setRight((o) => ({ ...o, billNo: v }))} label="Bill number" /></Field>
          <Field label="Bill date" hint="As YYYY-MM-DD.">
            <Input value={right.billDate} label="Bill date" keyboard="numbers-and-punctuation" placeholder="YYYY-MM-DD" tabular
              onChange={(v) => setRight((o) => ({ ...o, billDate: v, dueOn: o.dueOn || suggestedDue(v) }))} />
          </Field>
          <Field label="Amount"><Input value={right.amount} onChange={(v) => setRight((o) => ({ ...o, amount: v }))} label="Amount" keyboard="decimal-pad" tabular /></Field>
          <Field label="Due on" hint="As YYYY-MM-DD.">
            <Input value={right.dueOn} onChange={(v) => setRight((o) => ({ ...o, dueOn: v }))} label="Due on" keyboard="numbers-and-punctuation" placeholder="YYYY-MM-DD" tabular />
          </Field>
        </>
      ) : null}
      <Refused text={problem} />
    </DeskSheet>
  );
}
