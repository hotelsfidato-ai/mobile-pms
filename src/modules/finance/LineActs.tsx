import { ArrowLeftRight, Pencil, Undo2 } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { c, t } from "../../core/theme";
import { billName, editable, moveTargets, rupees, typed, whyNotEditLine, whyNotReverseLine, type BillLine, type StayFolio } from "./bill";
import { editLine, moveLine, reverseLine } from "./data";
import { Btn, Field, IconBtn, Input, ReadyReasons, Refused, Sheet, type Said, useOnce } from "./Kit";
import { whyNotChange, whyNotEdit, whyNotReversePayment } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   A LINE'S OWN ACTS — the web's EditButton, TransferButton and
   ReverseButton (FolioPanel.tsx 597-689, 804-901, 1651-1709). The ledger
   is append-only: each of these is a line of its own on the server, and
   nothing is edited or deleted. All refused offline (core offline.ts),
   in the web's words; nothing is held.
   ══════════════════════════════════════════════════════════════════ */

type Act = { code: string; stayId: string; onDone: (said: Said) => void };

/** A line's amount with its tax, as the server sent the two, for a heading. */
const worded = (l: BillLine) => `${l.description} · ${rupees(Math.abs(l.amount))}${l.tax ? ` + ${rupees(Math.abs(l.tax))} tax` : ""}`;

export function LineActs({ line, folios, role, code, stayId, onDone, onRefused }: Act & {
  line: BillLine; folios: StayFolio[]; role: string | null; onRefused: (why: string) => void;
}) {
  const [open, setOpen] = useState<"edit" | "move" | "reverse" | null>(null);
  const close = () => setOpen(null);
  const done = (said: Said) => { close(); onDone(said); };
  const act = { code, stayId, onDone: done };
  const targets = moveTargets(line, folios);
  const mayChange = whyNotChange(role);
  const payment = line.kind === "payment";

  return (
    <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
      {editable(line) ? (
        <IconBtn Icon={Pencil} label={`Edit ${line.description}`} why={whyNotEdit(role) ?? whyNotEditLine(line)} onRefused={onRefused} onPress={() => setOpen("edit")} />
      ) : null}
      {targets.length > 0 ? (
        <IconBtn Icon={ArrowLeftRight} label={`Move ${line.description} to another bill`} why={mayChange} onRefused={onRefused} onPress={() => setOpen("move")} />
      ) : null}
      <IconBtn
        Icon={Undo2} label={`Reverse ${line.description}`}
        why={mayChange ?? (payment ? whyNotReversePayment(role) : null) ?? whyNotReverseLine(line)}
        onRefused={onRefused} onPress={() => setOpen("reverse")}
      />

      {open === "edit" ? <EditSheet {...act} line={line} onClose={close} /> : null}
      {open === "move" ? <MoveSheet {...act} line={line} targets={targets} onClose={close} /> : null}
      {open === "reverse" ? <ReverseSheet {...act} line={line} onClose={close} /> : null}
    </View>
  );
}

function ReverseSheet({ code, stayId, line, onClose, onDone }: Act & { line: BillLine; onClose: () => void }) {
  const payment = line.kind === "payment";
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  const once = useOnce();
  async function reverse() {
    setBusy(true);
    setRefused(null);
    try {
      await reverseLine(code, stayId, line.id, reason.trim());
      onDone({ tone: "ok", title: "Posting reversed", text: "The reversal is its own line - nothing was edited." });
    } catch (e) {
      setRefused(e instanceof Error ? e.message : "Could not reverse.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible onClose={onClose} title={payment ? "Reverse this payment?" : "Reverse this charge?"} description={worded(line)}
      footer={(
        <>
          <Btn label="Keep it" onPress={onClose} />
          <Btn kind="danger" label="Reverse" busy={busy} off={!reason.trim()} onPress={() => void once(reverse)} />
        </>
      )}
    >
      <Text style={[t.label, { color: c.grey700, lineHeight: 20 }]}>
        {payment ? "The receipt stays on the bill, struck through, and the money is owed again." : "The charge stays on the bill, struck through, and comes off the balance."} Nothing is deleted - the reversal is its own line.
      </Text>
      <Field label="Why" required hint="Kept on the reversal's line. The guest's bill never shows it.">
        <Input label="Why" value={reason} onChange={setReason} multiline placeholder="Posted to the wrong room" />
      </Field>
      <ReadyReasons code={code} onPick={setReason} />
      <Refused text={refused} />
    </Sheet>
  );
}

function EditSheet({ code, stayId, line, onClose, onDone }: Act & { line: BillLine; onClose: () => void }) {
  const room = line.category === "room";
  const [words, setWords] = useState(line.description);
  const [price, setPrice] = useState(String(line.amount));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const value = typed(price);
  const changed = words.trim() !== line.description || value !== line.amount;

  const once = useOnce();
  async function save() {
    setBusy(true);
    setRefused(null);
    try {
      await editLine(code, stayId, line.id, { description: words.trim(), amount: value, reason: reason.trim() });
      onDone({ tone: "ok", title: "Charge corrected", text: "The old line is reversed with the reason, and the corrected one posted." });
    } catch (e) {
      setRefused(e instanceof Error ? e.message : "Not changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible onClose={onClose} title="Edit this charge" description={worded(line)}
      footer={(
        <>
          <Btn label="Keep it" onPress={onClose} />
          <Btn kind="primary" label="Correct the charge" busy={busy} off={!reason.trim() || !(value > 0) || !words.trim() || !changed} onPress={() => void once(save)} />
        </>
      )}
    >
      <Field label="Words" {...(room ? { hint: "A room night's words count its nights, so only its price changes." } : {})}>
        <Input label="Words" value={words} onChange={setWords} off={room} />
      </Field>
      <Field label="Price before tax" hint={room ? "The tax follows the room's slab on the price a night." : "The tax stays at the rate it was charged."}>
        <Input label="Price before tax" value={price} onChange={setPrice} keyboard="decimal-pad" tabular />
      </Field>
      <Field label="Why" required hint="Kept on the reversed line. The guest's bill never shows it.">
        <Input label="Why" value={reason} onChange={setReason} multiline />
      </Field>
      <ReadyReasons code={code} onPick={setReason} />
      <Refused text={refused} />
    </Sheet>
  );
}

function MoveSheet({ code, stayId, line, targets, onClose, onDone }: Act & { line: BillLine; targets: StayFolio[]; onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [refused, setRefused] = useState<string | null>(null);

  const once = useOnce();
  async function move(toFolioId: string) {
    setBusy(toFolioId);
    setRefused(null);
    try {
      await moveLine(code, stayId, line.id, toFolioId);
      onDone({ tone: "ok", title: "Moved", text: "Reversed on one bill and posted on the other - nothing was edited." });
    } catch (e) {
      setRefused(e instanceof Error ? e.message : "Not moved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet visible onClose={onClose} title="Move to" description={line.description} footer={<Btn label="Keep it" onPress={onClose} />}>
      {targets.map((f) => (
        <Btn key={f.id} wide label={billName(f)} busy={busy === f.id} off={busy !== null} onPress={() => void once(() => move(f.id))} />
      ))}
      <Refused text={refused} />
    </Sheet>
  );
}
