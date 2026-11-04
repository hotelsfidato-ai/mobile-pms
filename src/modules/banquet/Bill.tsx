import { Receipt } from "lucide-react-native";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { ApiError, HeldError, type Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { asks, asksCredit, asksPan, firstWay, owedLine, payingWays, startAmount, typed, type DeskRules } from "../finance/bill";
import { Field, Input, Tick } from "../finance/Kit";
import { Btn, body, Dialog, Foot, InDialog, Select, SectionHead, message, saidOf, type Said } from "../guest-services/kit";
import { billFn, invoiceFn, payFn, reopenFn } from "./data";
import { Line, Panel } from "./kit";
import { ON_THE_WEBSITE, whyNotInvoice, whyNotMoney } from "./roles";
import { billActs, billRows, rupees, type Fn } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   THE FUNCTION'S BILL — the web's components/FunctionBill.tsx (BQ-1; the
   owner's D27-132 to D27-138, D27-154). Confirming opened it; from then:
     Take an advance   a payment on this bill (no GST receipt voucher yet)
     Bill the function the hall and every course under the Banquet GST rule
     Settle            a payment while the server's balance is owed
     Issue tax invoice finance's own invoice; its page stays on the website
     Reopen the bill   before the invoice only, with a reason
   Owner, Admin and GM take money and bill it; the Accountant may also issue
   the invoice (roles.ts). The web leaves out a button the role may not
   press; the phone shows it grey with the API's sentence (AGENTS rule 1).

   MONEY IS THE SERVER'S: every row is finance's folioBalance as sent, paise
   kept; a negative balance is "Paid ahead", never ₹0. Settle starts at the
   server's balance; more than the bill is told by the SERVER's own refusal
   (`needs: "credit"`), then the web's tick - the phone works out no
   difference itself. EVERY ONE IS REFUSED OFFLINE (no list names these
   paths): `send` says the web's sentence, nothing is held. ONE PRESS, ONE
   PAYMENT: latched at the tap, and a keeper per function (data.ts) keeps
   the key while the outcome is unknown; the server reads it (takeFolioPayment).
   ══════════════════════════════════════════════════════════════════ */

export function BillCard({ hotel, f, role, onDone }: {
  hotel: Hotel; f: Fn; role: string | null; onDone: (s: Said | null) => void;
}) {
  const [paying, setPaying] = useState(false);
  const [billing, setBilling] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const acts = billActs(f);
  const money = whyNotMoney(role), invoice = whyNotInvoice(role);
  const rows = billRows(f);
  const shown = acts.advance || acts.bill || acts.settle || acts.invoice || acts.reopen;
  const reasons = [...new Set([(acts.advance || acts.settle || acts.reopen) && money, acts.invoice && invoice].filter((x): x is string => Boolean(x)))];
  const owed = f.bill !== null && f.bill.balance > 0;

  return (
    <Panel>
      <View style={{ marginBottom: -12 }}><SectionHead title="The bill" /></View>
      {rows.length === 0 ? (
        <Text style={[body, { color: c.grey600 }]}>Nothing is on the bill yet.</Text>
      ) : (
        <View>
          {rows.slice(0, 3).map((r) => <Line key={r.label} label={r.label} value={r.value} />)}
          <View style={{ marginTop: 4, borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 8 }}>
            <Line label={rows[3]!.label} value={rows[3]!.value} strong />
          </View>
        </View>
      )}

      {f.status === "confirmed" ? (
        <Text style={[body, { color: c.grey600 }]}>
          An advance is a payment on this bill. No GST receipt voucher is issued for it yet: the CA has not answered on advances.
        </Text>
      ) : null}

      {f.invoice ? (
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Receipt size={14} color={c.grey400} />
            <Text style={[body, t.tab, { color: c.ink900 }]}>Tax invoice {f.invoice}</Text>
          </View>
          <Text style={[t.caption, { color: c.grey600 }]}>The invoice's page and its credit note: {ON_THE_WEBSITE}</Text>
        </View>
      ) : null}

      {shown ? (
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {acts.advance ? <Btn label="Take an advance" disabled={money != null} onPress={() => setPaying(true)} /> : null}
            {acts.bill ? <Btn label="Bill the function" variant="primary" disabled={money != null} onPress={() => setBilling(true)} /> : null}
            {acts.settle ? <Btn label="Settle" variant="primary" disabled={money != null} onPress={() => setPaying(true)} /> : null}
            {acts.invoice ? (
              <Btn label="Issue tax invoice" variant={owed ? "secondary" : "primary"} disabled={invoice != null} onPress={() => setInvoicing(true)} />
            ) : null}
            {/* D27-154: while no tax invoice stands; after it, a credit note. */}
            {acts.reopen ? <Btn label="Reopen the bill" variant="ghost" disabled={money != null} onPress={() => setReopening(true)} /> : null}
          </View>
          {reasons.map((r) => <Text key={r} style={[t.caption, { color: c.grey600 }]}>{r}</Text>)}
        </View>
      ) : null}

      {paying ? (
        <PayDialog
          hotel={hotel} f={f} advance={f.status !== "completed"} onClose={() => setPaying(false)}
          onTaken={(amount, method) => { setPaying(false); onDone({ title: `${rupees(amount)} received`, body: method, tone: "ok" }); }}
          onReread={() => onDone(null)}
        />
      ) : null}
      {billing ? (
        <Confirm
          title="Bill the function" act="Bill the function" onClose={() => setBilling(false)}
          text="The hall and every course go on this bill under the Banquet GST rate. After this the price, the courses and the restaurant orders are fixed."
          run={() => billFn(hotel.code, f.id)} done={() => { setBilling(false); onDone({ title: "Billed", tone: "ok" }); }}
        />
      ) : null}
      {invoicing ? (
        <Confirm
          title="Issue the tax invoice" act="Issue tax invoice" onClose={() => setInvoicing(false)}
          text={`A tax invoice is issued to ${f.hostName} (or the company the function is billed to), with the next number of the series. `
            + "A number once taken cannot be taken back."}
          run={() => invoiceFn(hotel.code, f.id)} done={() => { setInvoicing(false); onDone({ title: "Tax invoice issued", tone: "ok" }); }}
        />
      ) : null}
      {reopening ? (
        <Reopen
          code={hotel.code} f={f} onClose={() => setReopening(false)}
          onDone={() => {
            setReopening(false);
            onDone({ title: "Bill reopened", body: "The hall and courses are off the bill; change them and bill the function again.", tone: "ok" });
          }}
        />
      ) : null}
    </Panel>
  );
}

/** A refusal in a dialog: "Not done" and the server's words; offline, the web's sentence alone. */
const refusedAs = (title: string, e: unknown): Said =>
  e instanceof HeldError ? saidOf("", e)
    : e instanceof ApiError && e.status === 503 ? { title: message(e), tone: "bad" }
    : { title, body: message(e), tone: "bad" };

function useLatch() {
  const latch = useRef(false);
  const [busy, setBusy] = useState(false);
  const go = async (write: () => Promise<void>) => {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    try { await write(); } finally { latch.current = false; setBusy(false); }
  };
  return { busy, go };
}

function Confirm({ title, text, act, onClose, run, done }: {
  title: string; text: string; act: string; onClose: () => void; run: () => Promise<unknown>; done: () => void;
}) {
  const l = useLatch();
  const [said, setSaid] = useState<Said | null>(null);
  return (
    <Dialog title={title} onClose={onClose}>
      <Text style={[body, { color: c.grey700 }]}>{text}</Text>
      <InDialog said={said} />
      <Foot>
        <Btn label="Not now" tall grow onPress={onClose} />
        <Btn
          label={act} variant="primary" tall grow disabled={l.busy}
          onPress={() => void l.go(async () => {
            setSaid(null);
            try { await run(); done(); } catch (e) { setSaid(refusedAs("Not done", e)); }
          })}
        />
      </Foot>
    </Dialog>
  );
}

/* Reopening (D27-154): asks first, and the reason is required - it rides on every line taken off. */
function Reopen({ code, f, onClose, onDone }: { code: string; f: Fn; onClose: () => void; onDone: () => void }) {
  const [why, setWhy] = useState("");
  const l = useLatch();
  const [said, setSaid] = useState<Said | null>(null);
  return (
    <Dialog title="Reopen the bill?" description={f.title} onClose={onClose}>
      <Text style={[body, { color: c.grey700 }]}>
        The hall and every course come off the bill, so the price and the courses can be changed and the function billed again.
        Advances, payments and restaurant orders stay on it.
      </Text>
      <Field label="Why" required>
        <Input label="Why" value={why} onChange={setWhy} multiline />
      </Field>
      <InDialog said={said} />
      <Foot>
        <Btn label="Not now" tall grow onPress={onClose} />
        <Btn
          label="Reopen the bill" variant="primary" tall grow disabled={why.trim() === "" || l.busy}
          onPress={() => void l.go(async () => {
            setSaid(null);
            try { await reopenFn(code, f.id, why.trim()); onDone(); } catch (e) { setSaid(refusedAs("Not reopened", e)); }
          })}
        />
      </Foot>
    </Dialog>
  );
}

/* An advance before the bill, or settling after it (the web's PayDialog). */
function PayDialog({ hotel, f, advance, onClose, onTaken, onReread }: {
  hotel: Hotel; f: Fn; advance: boolean; onClose: () => void; onTaken: (amount: number, method: string) => void; onReread: () => void;
}) {
  const desk = (hotel as Hotel & { deskRules?: DeskRules }).deskRules;
  const ways = payingWays(desk);
  const balance = f.bill?.balance ?? null;
  const [method, setMethod] = useState(firstWay(desk));
  /* Settling starts at the server's balance when it owes; an advance is typed. */
  const [amount, setAmount] = useState(advance ? "" : startAmount(balance));
  const [pan, setPan] = useState("");
  const [form97, setForm97] = useState(false);
  /* The server's own sentence when this is more than the bill (D27-4), and the tick it asks. */
  const [credit, setCredit] = useState<string | null>(null);
  const [asCredit, setAsCredit] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const l = useLatch();

  const value = typed(amount);
  const panAsked = asksPan(ways.find((w) => w.label === method)?.kind, value);
  const change = (text: string) => { setAmount(text); setCredit(null); setAsCredit(false); };

  const take = () => l.go(async () => {
    setSaid(null);
    try {
      await payFn(hotel.code, f.id, {
        method, amount: value,
        ...(panAsked ? (form97 ? { form97 } : { pan }) : {}),
        ...(asCredit ? { heldAsCredit: true } : {}),
      });
      onTaken(value, method);
    } catch (e) {
      const words = message(e);
      if (asks(e instanceof ApiError ? e.needs : undefined, "credit", words, asksCredit)) {
        setCredit(words);
      } else {
        setSaid(refusedAs("Not taken", e));
        /* The bill may have moved under the dialog: read it again (the web's onDone). */
        onReread();
      }
    }
  });

  return (
    <Dialog
      title={advance ? "Take an advance" : "Settle the bill"}
      description={advance ? `${f.title} · a payment on the function's bill` : `${owedLine(balance)} · ${f.title}`}
      onClose={onClose}
    >
      <Field label="Method">
        <Select<string> label="Method" value={method} onChange={setMethod} options={ways.map((w) => ({ value: w.label, label: w.label }))} />
      </Field>
      <Field label="Amount">
        <Input label="Amount" value={amount} onChange={change} keyboard="decimal-pad" tabular />
      </Field>
      {panAsked ? (
        <View style={{ gap: 8 }}>
          <Field label="Payer's PAN" hint="More than ₹1,00,000 in cash at once needs it (Income-tax Rule 159).">
            <Input label="Payer's PAN" value={pan} onChange={(v) => setPan(v.toUpperCase())} off={form97} maxLength={10} placeholder="ABCDE1234F" caps="characters" />
          </Field>
          <Tick on={form97} onChange={setForm97} label="No PAN: Form 97 taken" />
        </View>
      ) : null}
      {credit ? (
        <View style={{ backgroundColor: c.yellow50, borderWidth: 1, borderColor: c.yellow100, borderRadius: 8, padding: space.card, gap: 8 }}>
          <Text style={[body, { color: c.yellow800 }]}>{credit}</Text>
          <Tick on={asCredit} onChange={setAsCredit} label="Hold it as the host's credit" />
        </View>
      ) : null}
      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn
          label="Take payment" variant="primary" tall grow disabled={l.busy || value <= 0 || (credit != null && !asCredit)}
          onPress={() => void take()}
        />
      </Foot>
    </Dialog>
  );
}
