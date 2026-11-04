import { useState } from "react";
import { Text, View } from "react-native";
import { ApiError, type Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { Row } from "../../core/ui";
import {
  asks, asksCredit, asksPan, billName, firstWay, owedLine, payingWays, rupees, startAmount, startBill, typed, typedShown,
  type DeskRules, type StayFolio,
} from "./bill";
import { takePayment } from "./data";
import { Btn, Choice, Field, Input, Refused, Sheet, Tick, useOnce } from "./Kit";

/* ══════════════════════════════════════════════════════════════════
   SETTLE — the web's SettleDialog (FolioPanel.tsx 1115-1347): which bill,
   the hotel's ways of paying, the amount, the PAN above ₹1,00,000 in cash
   (cashLimit.ts; the server decides, and refuses ₹2,00,000 or more in its
   own sentence). REFUSED OFFLINE: `send` says the web's sentence and
   nothing is held. Differences (MODULE.md): no "Remaining" (a sum the
   server did not make), and more than the bill is told by the server's
   own refusal with its figure, then the web's tick. Every figure here is
   the server's balance as it sent it - an overpaid bill says overpaid,
   never ₹0 outstanding (MFIN-4) - and ONE press is ONE request.
   ══════════════════════════════════════════════════════════════════ */

export function SettleSheet({ hotel, stayId, payer, balance, folios, active, onClose, onTaken, onReread }: {
  hotel: Hotel & { deskRules?: DeskRules };
  stayId: string;
  payer: string;
  /** The server's balance of the stay's one bill; null is no bill (a dash). */
  balance: number | null;
  folios: StayFolio[];
  /** The bill whose tab is open; null is Everything. */
  active: string | null;
  onClose: () => void;
  onTaken: (amount: number, method: string) => void;
  onReread: () => void;
}) {
  const ways = payingWays(hotel.deskRules);
  const split = folios.length > 1;
  /* The server's balance of the bill being paid, as sent: never clamped. */
  const owedOn = (id: string | null): number | null => (split ? folios.find((f) => f.id === id)?.balance ?? null : balance);
  const [folioId, setFolioId] = useState<string | null>(split ? startBill(folios, active) : null);
  const [method, setMethod] = useState(firstWay(hotel.deskRules));
  const [amount, setAmount] = useState(startAmount(owedOn(folioId)));
  const [pan, setPan] = useState("");
  const [form97, setForm97] = useState(false);
  /* The server's own sentence when this is more than the bill (D27-4), and the tick it asks. */
  const [credit, setCredit] = useState<string | null>(null);
  const [asCredit, setAsCredit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  /* One press, one request (MFIN-1). */
  const once = useOnce();

  const value = typed(amount);
  const owed = owedOn(folioId);
  const panAsked = asksPan(ways.find((w) => w.label === method)?.kind, value);
  const change = (text: string) => { setAmount(text); setCredit(null); setAsCredit(false); };

  async function take() {
    setBusy(true);
    setRefused(null);
    try {
      await takePayment(hotel.code, stayId, {
        method, amount: value, businessDate: hotel.businessDate,
        ...(panAsked ? (form97 ? { form97 } : { pan }) : {}),
        ...(asCredit ? { heldAsCredit: true } : {}),
        ...(split && folioId ? { folioId } : {}),
      });
      onTaken(value, method);
    } catch (e) {
      const said = e instanceof Error ? e.message : "Could not settle.";
      if (asks(e instanceof ApiError ? e.needs : undefined, "credit", said, asksCredit)) {
        setCredit(said);
      } else {
        setRefused(said);
        /* The bill may have moved under the sheet: read it again (the web's onDone). */
        onReread();
        /* The same payment tapped again keeps its key (MFIN-1, data.ts's keeper),
           so the server makes it once; emptied too, so a repeat is typed on
           purpose with the bill in view. */
        if (e instanceof ApiError && e.status === 503) change("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible onClose={onClose} title="Settle bill"
      description={`${owedLine(owed)} · ${split ? billName(folios.find((f) => f.id === folioId)) : payer}`}
      footer={(
        <>
          <Btn kind="ghost" label="Cancel" onPress={onClose} />
          <Btn kind="primary" label="Take payment" busy={busy} off={value <= 0 || (credit != null && !asCredit)} onPress={() => void once(take)} />
        </>
      )}
    >
      {split ? (
        <Field label="Which bill">
          <Choice
            label="Which bill" value={folioId ?? ""}
            options={folios.map((f) => ({ value: f.id, label: `${billName(f)} - ${owedLine(f.balance)}` }))}
            onPick={(id) => { setFolioId(id); change(startAmount(owedOn(id))); }}
          />
        </Field>
      ) : null}

      <Field label="Method">
        <Choice label="Method" value={method} options={ways.map((w) => ({ value: w.label, label: w.label }))} onPick={setMethod} />
      </Field>

      <Field label="Amount" {...(method === "Bill to company" ? { hint: "Transfers to the city ledger" } : {})}>
        <Input label="Amount" value={amount} onChange={change} keyboard="decimal-pad" tabular />
      </Field>

      {panAsked ? (
        <View style={{ gap: 8 }}>
          <Field label="Guest's PAN" hint="More than ₹1,00,000 in cash at once needs it (Income-tax Rule 159). Not asked of a guest from abroad.">
            <Input label="Guest's PAN" value={pan} onChange={(v) => setPan(v.toUpperCase())} off={form97} maxLength={10} placeholder="ABCDE1234F" caps="characters" />
          </Field>
          <Tick on={form97} onChange={setForm97} label="No PAN: Form 97 taken" />
        </View>
      ) : null}

      {credit ? (
        <View style={{ backgroundColor: c.yellow50, borderWidth: 1, borderColor: c.yellow100, borderRadius: 8, padding: space.card, gap: 8 }}>
          <Text style={[t.label, { color: c.yellow800, lineHeight: 20 }]}>{credit}</Text>
          <Tick on={asCredit} onChange={setAsCredit} label="Hold it as the guest's credit" />
        </View>
      ) : null}

      <View style={{ backgroundColor: c.grey50, borderWidth: 1, borderColor: c.grey200, borderRadius: 8, paddingHorizontal: space.card, paddingVertical: 8 }}>
        <Row label={owed != null && owed > 0 ? "Outstanding" : "Balance"} value={owed != null && owed > 0 ? rupees(owed) : owedLine(owed)} />
        <Row label="Paying" value={rupees(typedShown(amount))} />
      </View>

      <Refused text={refused} />
    </Sheet>
  );
}
