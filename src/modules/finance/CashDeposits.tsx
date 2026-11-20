import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, FileImage, PiggyBank, Plus, Undo2 } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { DateField } from "../../core/DateField";
import type { Picked } from "../../core/files";
import { dateLong } from "../../core/format";
import { c, face, t } from "../../core/theme";
import { Card, Screen } from "../../core/ui";
import {
  RECORD_DEPOSIT_REFUSED, dateDay, dayHint, depositActs, depositLine, depositState, depositTitle, depositsTable, differenceTone,
  explainHead, explanationLine, pointsLine, rupees, whyNotExport, whyNotReadDeposits,
  type CashDeposits as Deposits, type Deposit, type DepositDay,
} from "./desk";
import { attachSlip, explainDay, readDeposits, recordDeposit, reverseDeposit, slipPath, verifyDeposit } from "./deskData";
import { pickBill } from "./billPick";
import { BillField, useOpenStored } from "./BillPhoto";
import {
  CardHead, DeskExport, DeskSheet, Figure, Hair, PageHead, ReadState, RefusedCard, TonePill, failedSaid, useWrite, StopCard, useDeskRead, usePull, useStop, type Stop } from "./DeskKit";
import { Btn, Choice, Field, Input, Refused, SaidCard, type Said } from "./Kit";

/* ══════════════════════════════════════════════════════════════════
   CASH DEPOSITS on a phone — the web's /h/:code/cash-deposits
   (src/modules/finance/pages/CashDeposits.tsx, data/deposits.ts; the API's
   finance/deposits.ts; picture pms-shots/new/n-h-cash-deposits).
   Each closed day's cash to deposit per cash point, the deposits recorded
   against it, who verified them (D27-190, D27-191). Every figure is the
   server's, to the paisa; a cash point's figure the server does not know is
   a dash. A day stays red until somebody explains it. Append-only: a wrong
   line is reversed, never edited. Who may record and verify is the server's
   (canRecord, canVerify): a refused act is grey with its words. The slip's
   photo (M-16): added in Record or later from its line, opened from its
   line; a form, never held offline (deskData.ts). Deposited on: the
   phone's own date picker (core DateField), sent as the same text.
   Every write is refused offline in the web's words (unlisted).
   ══════════════════════════════════════════════════════════════════ */

type Sheet = { kind: "record"; date: string } | { kind: "explain"; day: DepositDay } | { kind: "reverse"; x: Deposit };

export function CashDeposits({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotReadDeposits(role);
  const q = useDeskRead(() => (refused ? Promise.resolve(null) : readDeposits(code)), ["finance", code, "desk", "deposits"]);
  const stop = useStop(`${code}/deposits`, q.began, q.reload);
  const [said, setSaid] = useState<Said | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const pulling = usePull(q.loading, () => { q.reload(); });
  const done = (s: Said | null) => { if (s) setSaid(s); void cache.invalidateQueries({ queryKey: ["finance", code] }); };
  const refusedSaid = (title: string) => (why: string) => setSaid({ tone: "refused", title, text: why });
  const d = q.data;

  return (
    <Screen refreshing={pulling.refreshing} onRefresh={pulling.pull}>
      <PageHead title="Cash deposits" under="Each day's cash to deposit, what was banked, and who verified it." />
      {refused ? <RefusedCard title="Cash deposits" why={refused} /> : (
        <>
          <DeskExport why={whyNotExport(role, "money")} table={d ? depositsTable(d, hotel.name) : null} />
          {said ? <SaidCard said={said} /> : null}
      <StopCard stop={stop} failed={Boolean(q.error)} />
          {!d ? <ReadState what="the cash deposits log" reading="Reading the cash deposits…" error={q.error} onRetry={q.reload} /> : (
            <>
              <Card style={{ gap: 12 }}>
                <CardHead title="Cash to deposit" under="Per closed day: the closing counts less the float kept, plus what went to the safe." />
                <Hair />
                {d.days.length === 0 ? (
                  <View style={{ alignItems: "center", gap: 6, paddingVertical: 12 }}>
                    <PiggyBank size={24} color={c.grey400} />
                    <Text style={t.heading}>Nothing to deposit yet</Text>
                    <Text style={[t.label, { textAlign: "center", lineHeight: 20 }]}>A day appears here once its cash points have closed with the float they kept, and the night audit has closed the day.</Text>
                  </View>
                ) : d.days.map((day, i) => (
                  <DayRow key={day.date} day={day} first={i === 0} canRecord={d.canRecord} onRefused={refusedSaid("Not yet")}
                    onRecord={() => setSheet({ kind: "record", date: day.date })} onExplain={() => setSheet({ kind: "explain", day })} />
                ))}
              </Card>
              <Card style={{ gap: 12 }}>
                <CardHead title="Deposits" under="Newest first. A wrong line is reversed, never edited." />
                <Hair />
                {d.deposits.length === 0 ? <Text style={[t.label, { color: c.grey500 }]}>No deposit has been recorded yet.</Text>
                  : d.deposits.map((x, i) => (
                    <DepositRow key={x.id} stop={stop} code={code} x={x} first={i === 0} d={d} onSaid={setSaid} onDone={done}
                      onRefused={refusedSaid} onReverse={() => setSheet({ kind: "reverse", x })} />
                  ))}
              </Card>
            </>
          )}
        </>
      )}
      {sheet?.kind === "record" && d ? <RecordSheet stop={stop} code={code} hotel={hotel} days={d.days} date={sheet.date} onClose={() => setSheet(null)} onDone={done} /> : null}
      {sheet?.kind === "explain" ? <ExplainSheet stop={stop} code={code} day={sheet.day} onClose={() => setSheet(null)} onDone={done} /> : null}
      {sheet?.kind === "reverse" ? <ReverseSheet stop={stop} code={code} x={sheet.x} onClose={() => setSheet(null)} onDone={done} /> : null}
    </Screen>
  );
}

function DayRow({ day, first, canRecord, onRecord, onExplain, onRefused }: {
  day: DepositDay; first: boolean; canRecord: boolean; onRecord: () => void; onExplain: () => void; onRefused: (why: string) => void;
}) {
  const tone = differenceTone(day);
  const said = explanationLine(day);
  const why = canRecord ? null : RECORD_DEPOSIT_REFUSED;
  return (
    <View style={{ gap: 8, paddingTop: first ? 0 : 12, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey200 }}>
      <View style={{ gap: 2 }}>
        <Text style={[t.label, { color: c.ink900, ...face[500] }]}>{dateLong(day.date)}</Text>
        <Text style={[t.label, t.tab, { color: c.grey600 }]}>{pointsLine(day)}</Text>
        {said ? <Text style={[t.caption, { color: c.grey600, lineHeight: 16 }]}>{said}</Text> : null}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 8 }}>
        <Figure label="To deposit" value={rupees(day.toDeposit)} />
        <Figure label="Deposited" value={rupees(day.deposited)} />
        <Figure label="Difference" value={rupees(day.difference)} tone={tone === "plain" ? undefined : tone} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Btn label="Record deposit" Icon={Plus} why={why} onRefused={onRefused} onPress={onRecord} />
        {day.red ? <Btn label="Explain" Icon={AlertTriangle} why={why} onRefused={onRefused} onPress={onExplain} /> : null}
      </View>
    </View>
  );
}

function DepositRow({ stop, code, x, first, d, onSaid, onDone, onRefused, onReverse }: {
  stop: Stop; code: string; x: Deposit; first: boolean; d: Deposits; onSaid: (s: Said) => void; onDone: (s: Said | null) => void;
  onRefused: (title: string) => (why: string) => void; onReverse: () => void;
}) {
  const w = useWrite(stop, "verified", "this deposit");
  const pw = useWrite(stop, "saved", SLIP_WHERE);
  const stored = useOpenStored((title, text) => onSaid({ tone: "refused", title, text }));
  const acts = depositActs(x, d);
  /* The web's addPhoto (attachSlip): one tap, one file; the screen's stop holds an unknown outcome. */
  const addSlip = async () => {
    if (stop.isBusy() || stop.isStuck()) return;
    const got = await pickBill("Add slip photo");
    if (!got) return;
    if ("problem" in got) return onSaid({ tone: "refused", title: "Photo not saved", text: got.problem });
    void pw.run(async () => {
      await attachSlip(code, x.id, got.file);
      onDone({ tone: "ok", title: "Slip photo saved", text: `Slip ${x.slipNo ?? "-"}.` });
    }, (e) => { onSaid(failedSaid(e, "Photo not saved", "saved", SLIP_WHERE)); onDone(null); });
  };
  const verify = () => void w.run(async () => {
    await verifyDeposit(code, x.id);
    onDone({ tone: "ok", title: "Verified", text: `${rupees(x.amount)} for ${dateDay(x.businessDate)}.` });
  }, (e) => { onSaid(failedSaid(e, "Not verified", "verified", "this deposit")); onDone(null); });
  const struck = x.reversed && !x.reversesId;
  return (
    <View style={{ gap: 6, paddingTop: first ? 0 : 12, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey200 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[t.label, { color: struck || x.reversesId ? c.grey500 : c.ink900, textDecorationLine: struck ? "line-through" : "none" }]}>{depositTitle(x)}</Text>
          <Text style={[t.caption, { color: c.grey600, lineHeight: 16 }]}>{depositLine(x)}</Text>
        </View>
        <Text style={[t.label, t.tab, { color: x.reversesId ? c.grey600 : c.ink900, ...face[500] }]}>{rupees(x.amount)}</Text>
      </View>
      {acts ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {x.reversed ? <TonePill tone="neutral" words="Reversed" /> : null}
          {x.verifiedAt ? <TonePill tone="success" words="Verified" /> : null}
          {x.slipId ? <Btn label={stored.opening ? "Opening…" : "Slip photo"} Icon={FileImage} busy={stored.opening !== null}
              onPress={() => void stored.open(slipPath(code, x.slipId!), "The photo needs the connection to open.")} />
            : !x.reversed ? <Btn label={pw.busy ? "Saving…" : "Add slip photo"} Icon={FileImage} busy={pw.busy} off={pw.stuck || pw.out}
              why={d.canRecord ? null : RECORD_DEPOSIT_REFUSED} onRefused={onRefused("Add slip photo")} onPress={() => void addSlip()} /> : null}
          {acts.verify ? <Btn label="Verify" kind="primary" Icon={Check} busy={w.busy} off={w.stuck || w.out} why={acts.verify.why} onRefused={onRefused("Not verified")} onPress={verify} /> : null}
          {acts.reverse ? <Btn label="Reverse" Icon={Undo2} why={acts.reverse.why} onRefused={onRefused("Not reversed")} onPress={onReverse} /> : null}
        </View>
      ) : null}
    </View>
  );
}

/** Where to look when a slip's photo is not known to have been saved. */
const SLIP_WHERE = "the deposit's line";

function RecordSheet({ stop, code, hotel, days, date, onClose, onDone }: { stop: Stop; code: string; hotel: Hotel; days: DepositDay[]; date: string; onClose: () => void; onDone: (s: Said | null) => void }) {
  const [f, setF] = useState({ day: date, amount: "", depositedOn: "", bank: "", slipNo: "" });
  const [file, setFile] = useState<Picked | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const [problem, setProblem] = useState<string | null>(null);
  const w = useWrite(stop, "recorded", "the deposits");
  const s = depositState(f);
  const close = () => { onClose(); onDone(null); };
  const submit = () => {
    if (!s.body) return;
    const sent = s.body;
    setProblem(null);
    const slip = file;
    void w.run(async () => {
      const r = await recordDeposit(code, sent);
      /* The deposit stands without the photo; it can be added from its line (the web's words). */
      let without: Said | null = null;
      if (slip && r.id) {
        try { await attachSlip(code, r.id, slip); } catch (e) {
          without = stop.lose(e, "saved", SLIP_WHERE)
            ? { tone: "warn", title: "Deposit recorded. Not known whether the slip's photo was saved", text: `${e instanceof Error ? e.message : String(e)} Look at ${SLIP_WHERE} before adding it again.` }
            : { tone: "refused", title: "Deposit recorded, photo not saved", text: e instanceof Error ? e.message : String(e) };
        }
      }
      onClose();
      onDone(without ?? { tone: "ok", title: "Deposit recorded", text: `${rupees(sent.amount)} for ${dateDay(sent.businessDate)}.` });
    }, (e, lost) => {
      const x = failedSaid(e, "Not recorded", "recorded", "the deposits");
      if (lost) { onClose(); onDone(x); return; }
      setProblem(x.text ? `${x.title}. ${x.text}` : x.title);
    });
  };
  return (
    <DeskSheet busy={w.out} title="Record a deposit" onClose={close} footer={(
      <>
        <Btn label="Cancel" off={w.out} onPress={close} />
        <Btn label="Record deposit" kind="primary" busy={w.busy} off={!s.ok || w.stuck || w.out} onPress={submit} />
      </>
    )}>
      <Field label="The day's cash it banks" hint={dayHint(days.find((x) => x.date === f.day))}>
        <Choice label="The day's cash it banks" value={f.day} onPick={set("day")} options={days.map((x) => ({ value: x.date, label: dateLong(x.date) }))} />
      </Field>
      <Field label="Amount deposited">
        <Input value={f.amount} onChange={set("amount")} label="Amount deposited" keyboard="decimal-pad" tabular />
        <Refused text={s.problem} />
      </Field>
      <DateField label="Deposited on" value={f.depositedOn} onChange={set("depositedOn")} hotel={hotel} disabled={w.out} />
      <Field label="Bank">
        <Input value={f.bank} onChange={set("bank")} label="Bank" />
      </Field>
      <Field label="Slip number" hint="As printed on the bank's slip. A slip for two days is one line per day, same number.">
        <Input value={f.slipNo} onChange={set("slipNo")} label="Slip number" />
      </Field>
      <BillField label="Photo of the slip" hint="It can be added later from its line; it is verified only once it is there." file={file} onFile={setFile} off={w.out} />
      <Refused text={problem} />
    </DeskSheet>
  );
}

function ExplainSheet({ stop, code, day, onClose, onDone }: { stop: Stop; code: string; day: DepositDay; onClose: () => void; onDone: (s: Said | null) => void }) {
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const w = useWrite(stop, "saved", "the day");
  const close = () => { onClose(); onDone(null); };
  const submit = () => {
    setProblem(null);
    void w.run(async () => {
      await explainDay(code, day.date, reason);
      onClose();
      onDone({ tone: "ok", title: "Explained", text: dateLong(day.date) });
    }, (e, lost) => { const x = failedSaid(e, "Not saved", "saved", "the day"); if (lost) { onClose(); onDone(x); return; } setProblem(x.text ? `${x.title}. ${x.text}` : x.title); });
  };
  return (
    <DeskSheet busy={w.out} title={`Why ${dateDay(day.date)} differs`} description={explainHead(day)} onClose={close} footer={(
      <>
        <Btn label="Cancel" off={w.out} onPress={close} />
        <Btn label="Save the explanation" kind="primary" busy={w.busy} off={!reason.trim() || w.stuck || w.out} onPress={submit} />
      </>
    )}>
      <Field label="Why" hint="What the owner or the accountant needs, in a sentence.">
        <Input value={reason} onChange={setReason} label="Why" multiline />
      </Field>
      <Refused text={problem} />
    </DeskSheet>
  );
}

function ReverseSheet({ stop, code, x, onClose, onDone }: { stop: Stop; code: string; x: Deposit; onClose: () => void; onDone: (s: Said | null) => void }) {
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const w = useWrite(stop, "reversed", "the deposits");
  const close = () => { onClose(); onDone(null); };
  const submit = () => {
    setProblem(null);
    void w.run(async () => {
      await reverseDeposit(code, x.id, reason);
      onClose();
      onDone({ tone: "ok", title: "Reversed", text: "Record it again with the right figures." });
    }, (e, lost) => { const f = failedSaid(e, "Not reversed", "reversed", "the deposits"); if (lost) { onClose(); onDone(f); return; } setProblem(f.text ? `${f.title}. ${f.text}` : f.title); });
  };
  return (
    <DeskSheet busy={w.out} title="Reverse this deposit?" onClose={close}
      description={`${rupees(x.amount)} for ${dateDay(x.businessDate)}, slip ${x.slipNo ?? "-"}. The line stays; a reversal is added beside it.`}
      footer={(
        <>
          <Btn label="Cancel" off={w.out} onPress={close} />
          <Btn label="Reverse it" kind="danger" busy={w.busy} off={!reason.trim() || w.stuck || w.out} onPress={submit} />
        </>
      )}>
      <Field label="Why" hint="This is the line somebody asks about.">
        <Input value={reason} onChange={setReason} label="Why" multiline />
      </Field>
      <Refused text={problem} />
    </DeskSheet>
  );
}
