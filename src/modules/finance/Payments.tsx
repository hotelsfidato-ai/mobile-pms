import { Wallet } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import type { ExportTable } from "../../core/exportDoc";
import { DASH } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { Card, Screen, useRead } from "../../core/ui";
import { body, Empty, PageHead, Pill } from "../front-desk/kit";
import { Kept, NotRead } from "../front-desk/StayList";
import { dateTime } from "../guest-services/rules";
import { Line, Tile } from "../guests/kit";
import { rupees } from "./bill";
import { methodCounts, PAGE, receiptsNote, reversedNote, whyNotReadPayments, type PaymentRow } from "./books";
import { readPayments } from "./booksData";
import { More } from "./BooksKit";

/* ══════════════════════════════════════════════════════════════════
   PAYMENTS — the web's /h/:code/payments (src/modules/finance/pages/
   Billing.tsx PaymentsPage): every receipt against a folio, newest first;
   a reversed receipt stays on the list, struck through and said in words.
   READ ONLY, as the web: nothing moves money here. A refund is taken on
   the stay's own bill (the web's FolioPanel), not on this list.

   ONE TILE PER WAY OF PAYING, then Total received: on the web each figure
   is the browser's sum of the rows. The server sends none, so the phone
   counts the receipts (no rupee moves) and draws a dash for the figure
   (MODULE.md, asked of the PMS). Each receipt's amount is the server's,
   to the paisa; its time goes through `instant()` (MEMORY 7).
   ══════════════════════════════════════════════════════════════════ */

export function Payments({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const refusal = whyNotReadPayments(role);
  if (refusal) {
    return (
      <Screen refreshing={false} onRefresh={() => undefined}>
        <PageHead title="Payments" />
        <Card style={{ backgroundColor: c.grey50 }}><Text style={[t.label, { color: c.grey700 }]} accessibilityRole="alert">{refusal}</Text></Card>
      </Screen>
    );
  }
  return <List hotel={hotel} />;
}

function List({ hotel }: { hotel: Hotel }) {
  const code = hotel.code;
  const q = useRead(() => readPayments(code), ["finance", code, "payments"]);
  const [shown, setShown] = useState(PAGE);
  const rows = q.data;
  const methods = rows ? methodCounts(rows) : [];
  const note = rows ? reversedNote(rows) : null;

  /* The web's export (Billing.tsx PAYMENT_EXPORT): every receipt, reversals marked. */
  const table: ExportTable | null = rows ? {
    title: "Payments",
    subtitle: `${hotel.name} · every receipt, newest first`,
    columns: ["Taken", "Guest", "Room", "Reference", "Method", "Reversed", "Narration", "Taken by", "Amount"],
    rows: rows.map((p) => [dateTime(p.at), p.guest, p.roomNumber || DASH, p.reference, p.method, p.reversed ? "Reversed" : DASH, p.description, p.user ?? DASH, rupees(p.amount)]),
  } : null;

  return (
    <Screen refreshing={q.loading} onRefresh={q.reload}>
      <PageHead title="Payments" description="Every receipt against a folio, newest first. Reversed receipts stay on the list." />

      {rows ? (
        <View style={{ gap: space.tile }}>
          {methods.map((m) => <Tile key={m.method} icon={Wallet} tone="neutral" label={m.method} value={DASH} note={receiptsNote(m.count)} />)}
          <Tile icon={Wallet} tone="green" label="Total received" value={DASH} note="Reversals excluded" />
          <Text style={[t.caption, { lineHeight: 17 }]}>The website adds these up in the browser; the server sends no total yet, so the phone counts the receipts and shows each one's own amount below.</Text>
        </View>
      ) : null}

      <ExportButtons table={table} />

      {!rows ? (
        q.error ? <NotRead what="the payments" error={q.error} onRetry={q.reload} plural /> : <Text style={t.label}>Reading the payments…</Text>
      ) : rows.length === 0 ? (
        <Card><Empty title="No payments yet" line="Each payment taken on a guest's folio is listed here as it is taken." Icon={Wallet} /></Card>
      ) : (
        <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 }}>
          {rows.slice(0, shown).map((p, i) => <Receipt key={p.id} p={p} first={i === 0} />)}
        </View>
      )}
      {rows ? <More shown={shown} of={rows.length} onMore={() => setShown((n) => n + PAGE)} /> : null}
      {rows ? <Kept error={q.error} what="the payments" /> : null}

      {note ? <Text style={[t.caption, { lineHeight: 18 }]}>{note}</Text> : null}
    </Screen>
  );
}

/** DataTable's phone card of one receipt: Taken as its head, then Guest, Method, Narration, Taken by, Amount. */
function Receipt({ p, first }: { p: PaymentRow; first: boolean }) {
  const struck = p.reversed ? { textDecorationLine: "line-through" as const, color: c.grey500 } : null;
  return (
    <View
      accessible accessibilityLabel={`${dateTime(p.at)}, ${p.guest}, ${p.method}${p.reversed ? ", reversed" : ""}, ${rupees(p.amount)}`}
      style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}
    >
      <Text style={[t.label, t.tab, { color: c.grey600, ...face[500] }]}>{dateTime(p.at)}</Text>
      <Line label="Guest">
        <Text style={[body, { color: c.ink900 }, struck]} numberOfLines={1}>{p.guest}</Text>
        <Text style={[t.caption, t.tab]}>room {p.roomNumber} · {p.reference}</Text>
      </Line>
      <Line label="Method">
        {/* "Reversed" in words (QA FI-18): the strike-through alone was easy to miss. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          <Pill tone={p.reversed ? "neutral" : "info"}>{p.method}</Pill>
          {p.reversed ? <Pill tone="neutral">Reversed</Pill> : null}
        </View>
      </Line>
      <Line label="Narration">{p.description || DASH}</Line>
      <Line label="Taken by">{p.user ?? DASH}</Line>
      <Line label="Amount">
        <Text style={[body, t.tab, { color: c.ink900, ...face[500] }, struck]}>{rupees(p.amount)}</Text>
      </Line>
    </View>
  );
}
