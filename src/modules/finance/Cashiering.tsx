import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRightLeft, Check, Lock, Plus, Wallet } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { ON_THE_WEBSITE } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { Card, Screen } from "../../core/ui";
import {
  DENOMINATIONS, EXPENSE_CATEGORIES, MOVEMENTS, approvalLine, cashTaken, closeState, closedWords, countBody, dateDay, handedWords,
  lastClose, movementAmount, movementLine, movementOf, movementState, noteLine, openLabel, openingOf, receiptWords, rupees, saveLabel,
  seedCounts, varianceWords, whyNotClose, whyNotReadDrawer, whyNotRunDrawer,
  type CashierDrawer, type CashierDrawerView, type Counts, type MovementKind,
} from "./desk";
import { closeDrawer, countDrawer, openDrawer, readDrawer, recordMovement } from "./deskData";
import { CardHead, DeskSheet, Hair, Line, PageHead, ReadState, RefusedCard, TextAct, failedSaid, useWrite, StopCard, useDeskRead, useStop, type Stop } from "./DeskKit";
import { Btn, Choice, Field, Input, Refused, SaidCard, type Said } from "./Kit";

/* ══════════════════════════════════════════════════════════════════
   CASHIERING on a phone — the web's /h/:code/cashiering
   (src/modules/finance/pages/Cashiering.tsx, data/cashier.ts; the API's
   finance/cashier.ts; picture pms-shots/all/39-finance-cashiering).
   The drawer somebody is holding right now: open with a float counted by
   hand, take receipts, count, hand over. ONLY CASH REACHES THE DRAWER.
   Every figure is the server's (Expected, Counted, the difference, what to
   deposit), to the paisa; the one tally the phone makes is of the notes the
   person typed, shown on the button as theirs and sent as typed - a blank
   box is not a zero and a count of nothing is not saved. Closing is guarded
   exactly as the web's CloseDialog (desk.ts closeState). Every write is
   refused offline with the web's Payment sentence (core offline.ts), and
   stops once its outcome is unknown until the drawer is read again.
   ══════════════════════════════════════════════════════════════════ */

export function Cashiering({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotReadDrawer(role);
  const q = useDeskRead(() => (refused ? Promise.resolve(null) : readDrawer(code)), ["finance", code, "desk", "drawer"]);
  const stop = useStop(q.began);
  const [said, setSaid] = useState<Said | null>(null);
  /* Pulling down reads the drawer again: what was stuck on an unknown outcome is seen, and starts afresh. */
  const [pulled, setPulled] = useState(false);
  const pull = () => { setPulled(true); q.reload(); };
  const done = (s: Said | null) => { if (s) setSaid(s); void cache.invalidateQueries({ queryKey: ["finance", code] }); };
  const mayNot = whyNotRunDrawer(role);
  const data = q.data;

  return (
    <Screen refreshing={pulled && q.loading} onRefresh={pull}>
      <PageHead title="Cashiering" under={data ? `Your drawer · ${dateDay(data.businessDate)}` : "Your drawer"} />
      {said ? <SaidCard said={said} /> : null}
      <StopCard stop={stop} />
      {refused ? <RefusedCard title="Cashiering" why={refused} />
        : !data ? <ReadState what="your drawer" reading="Reading your drawer…" error={q.error} onRetry={q.reload} />
        : !data.shift
          ? <OpenDrawer stop={stop} code={code} view={data} mayNot={mayNot} onSaid={setSaid} onDone={done} />
          : <Shift key={data.shift.id} stop={stop} code={code} shift={data.shift} colleagues={data.colleagues} mayNot={mayNot} onSaid={setSaid} onDone={done} />}
    </Screen>
  );
}

type Acts = { stop: Stop; code: string; mayNot: string | null; onSaid: (s: Said) => void; onDone: (s: Said | null) => void };

/* ── No drawer open: a real state, not an error ── */
function OpenDrawer({ stop, code, view, mayNot, onSaid, onDone }: Acts & { view: CashierDrawerView }) {
  const [counts, setCounts] = useState<Counts>({});
  const w = useWrite(stop, "opened", "your drawer");
  const open = () => {
    const o = openingOf(counts);
    if (!o) return;
    if ("problem" in o) return onSaid({ tone: "refused", title: "Not opened", text: o.problem });
    void w.run(async () => {
      await openDrawer(code, o.opening);
      onDone({ tone: "ok", title: "Drawer open", text: `Starting with ${rupees(o.opening)}.` });
    }, (e) => { onSaid(failedSaid(e, "Not opened", "opened", "your drawer")); onDone(null); });
  };
  const last = lastClose(view.previous);
  return (
    <>
      <Card style={{ gap: 14 }}>
        <CardHead title="No drawer open" under="It opens by itself the first time you take cash. Count a float in here only when one is given to you by hand." />
        <Hair />
        <Text style={[t.label, { color: c.grey600, lineHeight: 21 }]}>{handedWords(view.waiting)}</Text>
        <NoteGrid counts={counts} onChange={setCounts} />
        <Btn
          label={w.busy ? "Opening…" : openLabel(counts)} kind="primary" Icon={Wallet} wide busy={w.busy}
          off={openingOf(counts) === null || w.stuck} why={mayNot} onRefused={(why) => onSaid({ tone: "refused", title: "Not opened", text: why })} onPress={open}
        />
      </Card>
      {last ? <Text style={[t.label, { color: c.grey600, lineHeight: 21 }]}>{last}</Text> : null}
    </>
  );
}

/* Notes and coins, one row each: the float at open and the drawer at the count. */
function NoteGrid({ counts, onChange }: { counts: Counts; onChange: (c: Counts) => void }) {
  return (
    <View style={{ gap: 8 }}>
      {DENOMINATIONS.map((value) => (
        <View key={value} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: c.grey200, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={[t.label, t.tab, { width: 52, color: c.ink900, ...face[500] }]}>₹{value}</Text>
          <Text style={[t.label, { color: c.grey500 }]}>×</Text>
          <View style={{ width: 96 }}>
            <Input value={counts[value] ?? ""} onChange={(v) => onChange({ ...counts, [value]: v })} label={`Number of ₹${value} notes`} keyboard="number-pad" placeholder="0" tabular />
          </View>
          {/* A dash, not a zero: nobody counted zero here. */}
          <Text style={[t.label, t.tab, { marginLeft: "auto", color: c.grey600 }]}>{noteLine(value, counts[value])}</Text>
        </View>
      ))}
    </View>
  );
}

/* ── The shift ── */
function Shift({ stop, code, shift, colleagues, mayNot, onSaid, onDone }: Acts & { shift: CashierDrawer; colleagues: { id: string; name: string }[] }) {
  const [counts, setCounts] = useState<Counts>(() => seedCounts(shift.denominations));
  const [sheet, setSheet] = useState<"movement" | "close" | null>(null);
  const w = useWrite(stop, "saved", "the drawer's count");
  const refused = (title: string) => (why: string) => onSaid({ tone: "refused", title, text: why });
  const body = countBody(counts);
  const save = () => {
    if (!body) return;
    void w.run(async () => {
      const r = await countDrawer(code, body);
      onDone({ tone: "ok", title: "Count saved", text: `${rupees(r.counted)} in the drawer.` });
    }, (e) => { onSaid(failedSaid(e, "Not saved", "saved", "the drawer's count")); onDone(null); });
  };
  const taken = cashTaken(shift.receipts);
  const v = varianceWords(shift.variance, shift.waiting ?? 0);
  const noClose = mayNot ?? whyNotClose(shift);

  return (
    <>
      <Card style={{ gap: 12 }}>
        <CardHead title="Taken this shift" under={`Open since ${shift.openedAt}.`} />
        {shift.receipts.length === 0 ? <Text style={[t.label, { color: c.grey500 }]}>Nothing has been taken yet this shift.</Text> : (
          <View>
            {shift.receipts.map((r, i) => (
              <View key={r.method} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.grey200 }}>
                <Line label={receiptWords(r)} value={rupees(r.amount)} />
              </View>
            ))}
          </View>
        )}
        <Text style={[t.caption, { lineHeight: 16 }]}>Only cash reaches the drawer. A card receipt and a bill left on a folio are business done - they are not in the tin.</Text>
      </Card>

      <Card style={{ gap: 14 }}>
        <CardHead title="Count the drawer" under="Notes and coins, as they come out." />
        <NoteGrid counts={counts} onChange={setCounts} />
        <Btn label={w.busy ? "Saving…" : saveLabel(counts)} kind="primary" wide busy={w.busy} off={!body || w.stuck} why={mayNot} onRefused={refused("Not saved")} onPress={save} />
      </Card>

      <Card style={{ gap: 12 }}>
        <CardHead title="In and out of the drawer" under="Money that was not a receipt."
          action={<Btn label="Record" Icon={Plus} why={mayNot} onRefused={refused("Not recorded")} onPress={() => setSheet("movement")} />} />
        {shift.movements.length === 0 ? <Text style={[t.label, { color: c.grey500 }]}>Nothing has gone in or out of the drawer this shift.</Text>
          : shift.movements.map((m, i) => {
            const waits = approvalLine(m);
            return (
              <View key={m.id} style={{ flexDirection: "row", gap: 12, paddingTop: i ? 12 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey200 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[t.label, { color: c.ink900 }]}>{m.reason}</Text>
                  <Text style={[t.caption, { lineHeight: 16 }]}>{movementLine(m)}</Text>
                  {m.kind === "expense" ? (
                    <View style={{ flexDirection: "row" }}>
                      <TextAct label={m.photo ? "Bill photo" : "Add the bill's photo"} why={ON_THE_WEBSITE} onRefused={refused(m.photo ? "Bill photo" : "Add the bill's photo")} onPress={() => undefined} />
                    </View>
                  ) : null}
                  {waits ? <Text style={[t.caption, { color: m.approval === "rejected" ? c.red700 : c.yellow800 }]}>{waits}</Text> : null}
                </View>
                <Text style={[t.label, t.tab, { color: c.ink900, ...face[500] }]}>{movementAmount(m)}</Text>
              </View>
            );
          })}
      </Card>

      {/* ── The sum: every figure the server's ── */}
      <Card style={{ gap: 4 }}>
        <CardHead title="The drawer" />
        <Line label="Opening float" value={rupees(shift.opening)} />
        {(shift.received ?? []).map((r) => (
          <Text key={r.closedAt + r.from} style={[t.caption, { color: c.grey600 }]}>{`${rupees(r.amount)} from ${r.from ?? "-"}'s close, ${r.closedAt}`}</Text>
        ))}
        <Line label="Cash taken" value={rupees(taken)} />
        {(shift.waiting ?? 0) > 0 ? <Line label="Paid out, waiting for a yes" value={rupees(shift.waiting)} tone="warn" /> : null}
        <Line label="Expected" value={rupees(shift.expected)} strong />
        <Line label="Counted" value={rupees(shift.counted)} strong />
        <VarianceBox v={v} />
        <View style={{ marginTop: 12, gap: 6 }}>
          <Btn label="Close and hand over" Icon={ArrowRightLeft} wide kind="secondary" why={noClose} onRefused={refused("Not yet")} onPress={() => setSheet("close")} />
          {shift.counted === null ? <Text style={[t.caption, { textAlign: "center" }]}>Save the count first.</Text> : null}
        </View>
      </Card>

      {sheet === "movement" ? <MovementSheet stop={stop} code={code} onClose={() => setSheet(null)} onDone={onDone} /> : null}
      {sheet === "close" ? <CloseSheet stop={stop} code={code} shift={shift} colleagues={colleagues} onClose={() => setSheet(null)} onDone={onDone} /> : null}
    </>
  );
}

function VarianceBox({ v }: { v: ReturnType<typeof varianceWords> }) {
  const look = v.tone === "none" ? { backgroundColor: c.grey50, borderColor: c.grey200 }
    : v.tone === "ok" ? { backgroundColor: c.success50, borderColor: c.success } : { backgroundColor: c.yellow50, borderColor: c.yellow };
  return (
    <View style={[{ marginTop: 12, borderWidth: 1, borderRadius: 8, paddingHorizontal: space.cardX, paddingVertical: 12, gap: 4 }, look]} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {v.tone === "ok" ? <Check size={16} color={c.success} /> : v.tone === "warn" ? <AlertTriangle size={16} color={c.yellow800} /> : null}
        <Text style={[t.label, t.tab, { color: v.tone === "none" ? c.grey600 : c.ink900, ...face[500] }]}>{v.title}</Text>
      </View>
      {v.lines.map((l) => <Text key={l} style={[t.caption, { color: c.grey600, lineHeight: 16 }]}>{l}</Text>)}
    </View>
  );
}

function MovementSheet({ stop, code, onClose, onDone }: { stop: Stop; code: string; onClose: () => void; onDone: (s: Said | null) => void }) {
  const [kind, setKind] = useState<MovementKind>("expense");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const w = useWrite(stop, "recorded", "the drawer");
  const state = movementState(kind, amount, reason, category);
  const chosen = movementOf(kind)!;
  const close = () => { onClose(); onDone(null); };
  const submit = () => {
    if (!state.body) return;
    const sent = state.body;
    setProblem(null);
    void w.run(async () => {
      await recordMovement(code, sent);
      onClose();
      onDone({ tone: "ok", title: "Recorded", text: `${chosen.label} - ${rupees(sent.amount)}` });
    }, (e, lost) => {
      const s = failedSaid(e, "Not recorded", "recorded", "the drawer");
      if (lost) { onClose(); onDone(s); return; }
      setProblem(s.text ? `${s.title}. ${s.text}` : s.title);
    });
  };
  return (
    <DeskSheet title="Money in or out" onClose={close} footer={(
      <>
        <Btn label="Cancel" onPress={close} />
        <Btn label="Record" kind="primary" busy={w.busy} off={!state.ok || w.stuck} onPress={submit} />
      </>
    )}>
      <Field label="What happened" hint={chosen.hint}>
        <Choice label="What happened" value={kind} onPick={setKind} options={MOVEMENTS.map((m) => ({ value: m.kind, label: m.label }))} />
      </Field>
      <Field label="How much">
        <Input value={amount} onChange={setAmount} label="How much" keyboard="decimal-pad" tabular />
      </Field>
      <Field label="What was it for" hint="This is the line somebody asks about tomorrow.">
        <Input value={reason} onChange={setReason} label="What was it for" multiline />
      </Field>
      {kind === "expense" ? (
        <>
          <Field label="Category">
            <Choice label="Category" value={category} onPick={setCategory} options={EXPENSE_CATEGORIES.map((x) => ({ value: x, label: x }))} />
          </Field>
          <Field label="Photo of the bill" hint={`${ON_THE_WEBSITE}: a photo needs a picker the phone app does not have yet. It can be added later on the website.`}>
            <Btn label="Take or pick a photo" off onPress={() => undefined} a11y={`Photo of the bill: ${ON_THE_WEBSITE}`} />
          </Field>
        </>
      ) : null}
      <Refused text={problem} />
    </DeskSheet>
  );
}

function CloseSheet({ stop, code, shift, colleagues, onClose, onDone }: {
  stop: Stop; code: string; shift: CashierDrawer; colleagues: { id: string; name: string }[]; onClose: () => void; onDone: (s: Said | null) => void;
}) {
  const [why, setWhy] = useState(shift.varianceReason ?? "");
  const [handOverTo, setHandOverTo] = useState("");
  const [kept, setKept] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const w = useWrite(stop, "closed", "your drawer");
  const s = closeState(shift, kept, handOverTo, why);
  const close = () => { onClose(); onDone(null); };
  const submit = () => {
    if (!s.body) return;
    const sent = s.body;
    setProblem(null);
    void w.run(async () => {
      const r = await closeDrawer(code, sent);
      onClose();
      onDone({ tone: "ok", title: "Shift closed", text: closedWords(colleagues.find((x) => x.id === sent.handOverTo)?.name ?? (sent.handOverTo ? "the next shift" : null), r.toDeposit) });
    }, (e, lost) => {
      const f = failedSaid(e, "Not closed", "closed", "your drawer");
      if (lost) { onClose(); onDone(f); return; }
      setProblem(f.text ? `${f.title}. ${f.text}` : f.title);
    });
  };
  return (
    <DeskSheet title="Close and hand over" onClose={close} footer={(
      <>
        <Btn label="Not yet" onPress={close} />
        <Btn label="Close the shift" kind="primary" Icon={Lock} busy={w.busy} off={!s.ok || w.stuck} onPress={submit} />
      </>
    )}>
      <VarianceBox v={varianceWords(shift.variance, shift.waiting ?? 0)} />
      {s.needsReason ? (
        <Field label="Why" hint="What a manager needs tomorrow is the sentence, not the number.">
          <Input value={why} onChange={setWhy} label="Why" multiline />
        </Field>
      ) : null}
      <Field label="Hand the drawer to" hint="A float kept waits for this person. Leave empty only when ₹0 is kept.">
        <Choice label="Hand the drawer to" value={handOverTo} onPick={setHandOverTo}
          options={[{ value: "", label: "Nobody" }, ...colleagues.map((x) => ({ value: x.id, label: x.name }))]} />
      </Field>
      <Field label="Float kept for the next shift" hint={s.hint}>
        <Input value={kept} onChange={setKept} label="Float kept for the next shift" keyboard="decimal-pad" tabular />
      </Field>
      <Refused text={problem} />
    </DeskSheet>
  );
}
