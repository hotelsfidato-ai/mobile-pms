import { useState } from "react";
import { Text, View } from "react-native";
import { c, t } from "../../core/theme";
import { Card, useRead } from "../../core/ui";
import { owedLine, type Billable } from "./bill";
import { issueInvoice, readBillable, readSeries } from "./data";
import { Btn, Refused, Sheet, type Said, useOnce } from "./Kit";
import { whyNotInvoice } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   THE TAX INVOICE OF A DEPARTED STAY — the web's Invoices page, this
   stay's rows (pages/Invoices.tsx 223-273, flows/IssueInvoiceDialog.tsx).
   THE PHONE NEVER NUMBERS ANYTHING: it says the next number the server
   gives, and the server allocates it, with the VAT bill, in one
   transaction. REFUSED OFFLINE (the statutory series): `send` says the
   web's sentence and nothing is held. A split stay is one row per bill.
   ══════════════════════════════════════════════════════════════════ */

const whyNotYet = (b: Billable) =>
  b.status === "outstanding" ? "The folio still carries a balance. Settle it, or transfer it to the city ledger, before invoicing."
    : b.status === "overpaid" ? "The folio is overpaid. Refund the difference before invoicing." : null;

export function TaxInvoices({ code, stayId, role, onSaid, onDone }: {
  code: string; stayId: string; role: string | null; onSaid: (said: Said) => void; onDone: (said: Said) => void;
}) {
  const rows = useRead(() => readBillable(code, stayId), ["finance", code, "billable", stayId]);
  const [asking, setAsking] = useState<Billable | null>(null);
  if (!rows.data?.length) return null;

  return (
    <Card style={{ gap: 8 }}>
      <Text style={t.eyebrow}>Tax invoice</Text>
      {rows.data.map((b) => (
        <View key={b.folioId} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={t.heading}>{b.billTo}</Text>
            {/* The server's balance and its word: a settled bill is ₹0.00, a real zero, not a dash (MFIN-4). */}
            <Text style={[t.caption, t.tab]}>{owedLine(b.balance)}</Text>
          </View>
          {b.invoice ? <Text style={[t.caption, t.tab, { color: c.ink900 }]}>{b.invoice}</Text> : (
            <Btn
              label="Issue" why={whyNotInvoice(role) ?? whyNotYet(b)} a11y={`Issue the tax invoice to ${b.billTo}`}
              onRefused={(why) => onSaid({ tone: "refused", title: why })} onPress={() => setAsking(b)}
            />
          )}
        </View>
      ))}
      {asking ? <IssueSheet code={code} row={asking} onClose={() => setAsking(null)} onDone={(said) => { setAsking(null); onDone(said); }} /> : null}
    </Card>
  );
}

/** D27-117: a legal number is taken only after "are you sure" (IssueInvoiceDialog). */
function IssueSheet({ code, row, onClose, onDone }: { code: string; row: Billable; onClose: () => void; onDone: (said: Said) => void }) {
  const series = useRead(() => readSeries(code), ["finance", code, "series"]);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const next = series.data?.[0]?.next;

  const once = useOnce();
  async function issue() {
    setBusy(true);
    setRefused(null);
    try {
      const r = await issueInvoice(code, row.stayId, row.folioId);
      onDone({ tone: "ok", title: `Issued ${r.number ?? ""}${r.vatBill ? `, and VAT bill ${r.vatBill} for the alcohol` : ""}.` });
    } catch (e) {
      setRefused(e instanceof Error ? e.message : "The invoice was not issued. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible onClose={onClose} title="Issue this tax invoice?" description={`${row.guest} · room ${row.roomNumber} · ${row.reference}`}
      footer={(
        <>
          <Btn label="Keep it" onPress={onClose} />
          <Btn kind="primary" label="Issue the invoice" busy={busy} onPress={() => void once(issue)} />
        </>
      )}
    >
      <Text style={[t.label, { color: c.grey700, lineHeight: 20 }]}>
        Billed to {row.billTo}. It takes the next number in the GST series{next ? ` - ${next}` : ""}. An issued invoice is never edited: a wrong one needs a credit note.
      </Text>
      <Refused text={refused} />
    </Sheet>
  );
}
