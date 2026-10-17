import { Redirect, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { api } from "../../../../src/core/api";
import { cash } from "../../../../src/core/format";
import { SignIn } from "../../../../src/core/SignIn";
import { roleAt, useSession } from "../../../../src/core/session";
import { t } from "../../../../src/core/theme";
import { Card, Head, ReadFailed, Row, Screen, useRead } from "../../../../src/core/ui";
import { PayActions, PrintBill } from "../../../../src/modules/pos/Pay";
import type { Order } from "../../../../src/modules/pos/types";

/* ⚠ THE PAY HELPER'S TEST ROUTE, NOT A SCREEN: /pos/5EL/pay-test/<order id>
   draws PayActions and PrintBill under the server's figures, so they can be
   pressed before the order screen exists. Signed out, it signs in here (the
   waiter's Tables is another helper's). The mobile chat removes it at merge. */
export default function PayTest() {
  const s = useSession();
  const { code, id } = useLocalSearchParams<{ code: string; id: string }>();
  const hotel = s.who?.hotels.find((h) => h.code === code);
  const read = useRead(() => api<Order>(`/api/hotels/${code}/till/orders/${id}`), ["pos", code, "order", id]);
  if (!s.who) return <SignIn onDev={s.signInAs} busy={s.busy} error={s.error} />;
  if (!hotel) return <Redirect href="/all" />;
  const o = read.data;
  return (
    <Screen refreshing={read.loading} onRefresh={read.reload}>
      <Head eyebrow="Pay helper's test route" title={o ? `${o.orderNo}${o.table ? ` · ${o.table}` : ""}` : "Order"} under={o?.status} />
      {read.error ? <ReadFailed what="the order" error={read.error} onRetry={read.reload} /> : null}
      {o ? (
        <Card style={{ gap: 8 }}>
          {o.lines.filter((l) => !l.voided).map((l) => <Text key={l.id} style={t.label}>{l.qty}× {l.name} {cash(l.qty * l.unitPrice)}</Text>)}
          <Row label="Net" value={cash(o.net)} />
          {o.discount > 0 ? <Row label="Discount" value={`-${cash(o.discount)}`} /> : null}
          <Row label="Tax" value={cash(o.tax)} />
          {o.roundOff !== 0 ? <Row label="Round off" value={cash(o.roundOff)} /> : null}
          <Row label="Total" value={cash(o.payable)} strong />
          <PayActions hotel={hotel} order={o} role={roleAt(s.who, hotel.code)} onChanged={read.reload} />
          <PrintBill hotel={hotel} orderId={o.id} />
        </Card>
      ) : null}
    </Screen>
  );
}
