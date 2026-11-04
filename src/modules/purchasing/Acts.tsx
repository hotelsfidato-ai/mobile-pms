import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { c } from "../../core/theme";
import { Btn, body, Dialog, Field, Foot, InDialog, Input, saidOf, Select, type Said } from "../guest-services/kit";
import { cancelRequest, priceLine, sendOrder } from "./data";
import { Tick } from "./kit";
import { cancelProblem, isFree, priceBody, sendProblem, sentWords, type PurchaseLine } from "./purchase";

/* ══════════════════════════════════════════════════════════════════
   THREE SMALL ACTS ON ONE ORDER — the web's SendDialog, CancelDialog and
   LineRow (pages/PurchaseRequest.tsx), their words and checks. Each is one
   write through `send()` (refused offline with the web's sentence), latched
   at the tap (MEMORY 8), with the request's keeper (data.ts). A refusal is
   the server's own sentence, inside the dialog, which stays open.
   ══════════════════════════════════════════════════════════════════ */

/** One tap, one write: the latch, the busy flag and what was said. */
function useWrite() {
  const latch = useRef(false);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  async function run(go: () => Promise<void>) {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try { await go(); } catch (e) { setSaid(saidOf("Not done", e)); } finally { latch.current = false; setBusy(false); }
  }
  return { busy, said, setSaid, run };
}

/* ── Send the order (D18-3): who it is to; sent BY HAND after that ── */
export function SendDialog({ code, id, suppliers, onClose, onDone }: {
  code: string; id: string; suppliers: { id: string; name: string }[]; onClose: () => void; onDone: (said: string) => void;
}) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const w = useWrite();
  const submit = () => {
    const problem = sendProblem(supplierId);
    if (problem) { w.setSaid({ title: problem, tone: "bad" }); return; }
    void w.run(async () => {
      const out = await sendOrder(code, id, supplierId);
      onDone(sentWords(out.request.reference));
    });
  };
  return (
    <Dialog title="Send the order" onClose={onClose}>
      {suppliers.length === 0 ? (
        <Text style={[body, { color: c.grey600 }]}>
          This property has no supplier entered yet. Add one in Places and suppliers first - an order has to say who it is to.
        </Text>
      ) : (
        <Field label="Order it from">
          <Select label="Order it from" value={supplierId} onChange={setSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
        </Field>
      )}
      <Text style={[body, { color: c.grey600 }]}>
        This records the order and produces it as a PDF in the group&apos;s layout. It is sent BY HAND - printed, or attached to a message by whoever orders.
      </Text>
      <InDialog said={w.said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={w.busy ? "Sending…" : "Send the order"} variant="primary" tall grow disabled={w.busy || suppliers.length === 0} onPress={submit} />
      </Foot>
    </Dialog>
  );
}

/* ── Cancel, with a reason: it stays on the record ── */
export function CancelDialog({ code, id, reference, onClose, onDone }: {
  code: string; id: string; reference: string; onClose: () => void; onDone: (said: string) => void;
}) {
  const [reason, setReason] = useState("");
  const w = useWrite();
  const submit = () => {
    const problem = cancelProblem(reason);
    if (problem) { w.setSaid({ title: problem, tone: "bad" }); return; }
    void w.run(async () => {
      await cancelRequest(code, id, reason.trim());
      onDone(`${reference} is cancelled.`);
    });
  };
  return (
    <Dialog title={`Cancel ${reference}?`} onClose={onClose}>
      <Text style={[body, { color: c.grey600 }]}>It stays on the record, cancelled, with the reason. Nothing is removed.</Text>
      <Field label="Why">
        <Input label="Why" value={reason} onChangeText={setReason} placeholder="Bought locally instead" />
      </Field>
      <InDialog said={w.said} />
      <Foot>
        <Btn label="Keep it" tall grow onPress={onClose} />
        <Btn label={w.busy ? "Cancelling…" : "Cancel the order"} variant="danger" tall grow disabled={w.busy} onPress={submit} />
      </Foot>
    </Dialog>
  );
}

/* ── One line's agreed price (LineRow). The web types it in the row and
   saves on leaving the box; a phone has no reliable "leaving", so it is a
   small dialog with Save. Blank puts it back to "not agreed": a dash, and
   an order that waits. ₹0 only when ticked Free (D27-120). ── */
export function PriceDialog({ code, id, line, onClose, onDone }: {
  code: string; id: string; line: PurchaseLine; onClose: () => void; onDone: () => void;
}) {
  const [free, setFree] = useState(isFree(line));
  const [price, setPrice] = useState(isFree(line) ? "" : line.unitPrice ?? "");
  const w = useWrite();
  const submit = () => {
    const out = priceBody(price, free, line.unitPrice);
    if ("problem" in out) { w.setSaid({ title: out.problem, tone: "bad" }); return; }
    if ("same" in out) { onClose(); return; }
    void w.run(async () => {
      await priceLine(code, id, line.id, out.body);
      onDone();
    });
  };
  return (
    <Dialog title={`Agreed price for ${line.item}`} onClose={onClose}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          {free ? (
            <Text style={[body, { color: c.grey500 }]} accessibilityLabel={`Agreed price for ${line.item}: free`}>0</Text>
          ) : (
            <Input label={`Agreed price for ${line.item}`} keyboardType="numbers-and-punctuation" value={price} onChangeText={setPrice} placeholder="-" />
          )}
        </View>
        <Tick label="Free" on={free} onChange={setFree} disabled={w.busy} />
      </View>
      <Text style={[body, { color: c.grey600 }]}>Leave it blank where nothing has been agreed. It reads &quot;-&quot;, never 0.</Text>
      <InDialog said={w.said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={w.busy ? "Saving…" : "Save the price"} variant="primary" tall grow disabled={w.busy} onPress={submit} />
      </Foot>
    </Dialog>
  );
}
