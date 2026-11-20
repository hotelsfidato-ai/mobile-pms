import { useState } from "react";
import { Text, View } from "react-native";
import { ApiError, type Hotel, outcomeUnknown } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { Row } from "../../core/ui";
import { asks, asksCredit, asksPan, firstWay, overLimit, owedLine, payingWays, rupees, startAmount, typed, typedShown, type DeskRules } from "../finance/bill";
import { Btn, Choice, Field, Input, useOnce } from "../finance/Kit";
import { body, Toggle } from "../front-desk/kit";
import { Said, Sheet } from "./GroupKit";
import { mayAllowOverLimit } from "./groupRoles";
import { settleHost } from "./groupsData";
import { OVER_LIMIT_WHO } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   SETTLE THE HOST'S BILL — the web's SettleDialog (finance FolioPanel.tsx
   1282-1520) as GroupPanel.tsx opens it: payer the bill's addressee,
   credit "host", cash to the rupee (the server's round-off, D27-337 (c)),
   "Bill to company" to the City ledger of the company the master is billed
   to, over its credit limit the GM's "Allow, with reason" (D27-275,
   D27-305 (10)). POST /groups/:id/payments; REFUSED OFFLINE in the web's
   sentence (core/offline.ts "Payment"), nothing held.
   As the phone's Settle (finance/Settle.tsx): no "Remaining" and no
   round-off preview (sums the server did not send); more than the bill is
   said by the server's own refusal, then the web's tick. ONE press, ONE
   request (useOnce); the group's keeper keeps the key while the outcome is
   unknown, and on an unknown outcome the amount is EMPTIED and the bill
   read again (MEMORY 16), so a repeat is typed on purpose.
   ══════════════════════════════════════════════════════════════════ */

export function GroupSettle({ hotel, groupId, payer, balance, role, onClose, onTaken, onReread }: {
  hotel: Hotel & { deskRules?: DeskRules };
  groupId: string;
  payer: string;
  /** The master bill's balance as the server sent it. */
  balance: number;
  role: string | null;
  onClose: () => void;
  onTaken: (amount: number, method: string, roundOff: number | null) => void;
  onReread: () => void;
}) {
  const ways = payingWays(hotel.deskRules);
  const [method, setMethod] = useState(firstWay(hotel.deskRules));
  const [amount, setAmount] = useState(startAmount(balance));
  const [pan, setPan] = useState("");
  const [form97, setForm97] = useState(false);
  /* The server's own sentences: more than the bill (D27-4), over a credit limit (D27-275). */
  const [credit, setCredit] = useState<string | null>(null);
  const [asCredit, setAsCredit] = useState(false);
  const [limit, setLimit] = useState<string | null>(null);
  const [allowReason, setAllowReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const once = useOnce();
  const mayAllow = mayAllowOverLimit(role);

  const value = typed(amount);
  const panAsked = asksPan(ways.find((w) => w.label === method)?.kind, value);
  const change = (text: string) => { setAmount(text); setCredit(null); setAsCredit(false); setLimit(null); };

  async function take() {
    setBusy(true);
    setSaid(null);
    try {
      const r = await settleHost(hotel.code, groupId, {
        method, amount: value, businessDate: hotel.businessDate,
        ...(panAsked ? (form97 ? { form97 } : { pan }) : {}),
        ...(asCredit ? { heldAsCredit: true } : {}),
        ...(limit && allowReason.trim() ? { overLimitReason: allowReason.trim() } : {}),
      });
      onTaken(value, method, r.data?.roundOff ?? null);
    } catch (e) {
      const words = e instanceof Error ? e.message : "Could not settle.";
      const needs = e instanceof ApiError ? e.needs : undefined;
      if (asks(needs, "credit", words, asksCredit)) setCredit(words);
      else if (asks(needs, "credit-limit", words, overLimit)) setLimit(words);
      else {
        if (outcomeUnknown(e)) {
          change("");
          setSaid(`Not known whether it was taken. ${words} The bill is read again: check it before taking this payment again.`);
        } else setSaid(`Could not settle. ${words}`);
        /* The bill may have moved under the sheet: read it again (the web's onDone). */
        onReread();
      }
    } finally {
      setBusy(false);
    }
  }

  const allowing = limit != null && mayAllow;
  const off = value <= 0 || (credit != null && !asCredit) || (limit != null && (!mayAllow || allowReason.trim() === ""));

  return (
    <Sheet
      title="Settle bill" description={`${owedLine(balance)} · ${payer}`} onClose={onClose} busy={busy}
      foot={(
        <>
          <Btn kind="ghost" label="Cancel" off={busy} onPress={onClose} />
          <Btn kind="primary" label={allowing ? "Allow, with reason" : "Take payment"} busy={busy} off={off} onPress={() => void once(take)} />
        </>
      )}
    >
      <Field label="Method">
        <Choice label="Method" value={method} options={ways.map((w) => ({ value: w.label, label: w.label }))} onPick={(m) => { setMethod(m); setLimit(null); }} />
      </Field>

      <Field label="Amount" {...(method === "Bill to company" ? { hint: "Transfers to the city ledger" } : {})}>
        <Input label="Amount" value={amount} onChange={change} keyboard="decimal-pad" tabular />
      </Field>

      {panAsked ? (
        <View style={{ gap: 8 }}>
          <Field label="Guest's PAN" hint="More than ₹1,00,000 in cash at once needs it (Income-tax Rule 159). Not asked of a guest from abroad.">
            <Input label="Guest's PAN" value={pan} onChange={(v) => setPan(v.toUpperCase())} off={form97} maxLength={10} placeholder="ABCDE1234F" caps="characters" />
          </Field>
          <Toggle value={form97} onChange={setForm97} label="No PAN: Form 97 taken" />
        </View>
      ) : null}

      {credit ? (
        <View style={{ backgroundColor: c.yellow50, borderWidth: 1, borderColor: c.yellow100, borderRadius: 8, padding: space.card, gap: 8 }}>
          <Text style={[t.label, body, { color: c.yellow800, lineHeight: 20 }]}>{credit}</Text>
          <Toggle value={asCredit} onChange={setAsCredit} label="Hold it as the host's credit" />
        </View>
      ) : null}

      {limit ? (
        <View style={{ backgroundColor: c.grey50, borderWidth: 1, borderColor: c.grey200, borderRadius: 8, padding: space.card, gap: 8 }}>
          <Text style={[t.label, { color: c.ink900, lineHeight: 21 }]}>{limit}</Text>
          {mayAllow
            ? <Input label="Why it is allowed" placeholder="Why it is allowed" value={allowReason} onChange={setAllowReason} />
            : <Text style={[t.label, body, { color: c.grey600 }]}>{OVER_LIMIT_WHO}</Text>}
        </View>
      ) : null}

      <View style={{ backgroundColor: c.grey50, borderWidth: 1, borderColor: c.grey200, borderRadius: 8, paddingHorizontal: space.card, paddingVertical: 8 }}>
        <Row label={balance > 0 ? "Outstanding" : "Balance"} value={balance > 0 ? rupees(balance) : owedLine(balance)} />
        <Row label="Paying" value={rupees(typedShown(amount))} />
      </View>

      <Said text={said} />
    </Sheet>
  );
}
