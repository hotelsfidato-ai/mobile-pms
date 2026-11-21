import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, KeyRound, UtensilsCrossed } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import type { ExportTable } from "../../core/exportDoc";
import { dateLong } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { Screen } from "../../core/ui";
import { rupees } from "./dayEndRules";
import { headPill, outletPill, refusals, refusedTitle, ticketPill, type PosOutlet, type PosTicket, type PosTickets } from "./roomChargesRules";
import { readOutlets, readTickets } from "./serviceData";
import { Empty, Labelled, Loading, PageHead, Panel, Pill } from "./ServiceKit";
import { whyNotReadRoomCharges } from "./serviceRoles";
import { ReadProblem, Refused, Stale, ty } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   CHARGES TO ROOMS on a phone — the web's /pos/:code/room-charges
   (src/modules/pos/pages/Pos.tsx, 16 Nov; pictures pms-shots
   all/48-point-of-sale-charges-to-rooms = new/n-pos-room-charges, the GM,
   31 Oct). Read only: what each restaurant sent to a room, what reached the
   guest's bill, and what was refused - the refusals first, because they
   are the only thing on it somebody has to act on. Each bill shows the
   server's two figures, before tax and tax, as sent; the web's own sum of
   them, and of the bills on folios, is not drawn (roomCharges.ts).
   ══════════════════════════════════════════════════════════════════ */

const figures = (x: Pick<PosTicket, "amount" | "tax">) => `${rupees(x.amount)} + ${rupees(x.tax)} tax`;

export function RoomChargesScreen({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const refused = whyNotReadRoomCharges(role);
  const [pulled, setPulled] = useState(false);
  const outlets = useQuery({ queryKey: ["pos", code, "pos-outlets"], queryFn: () => readOutlets(code), enabled: !refused });
  const tickets = useQuery({ queryKey: ["pos", code, "pos-tickets"], queryFn: () => readTickets(code), enabled: !refused });
  const reload = () => { setPulled(true); void outlets.refetch(); void tickets.refetch(); };
  const rows = tickets.data?.rows ?? [];
  const pill = tickets.data ? headPill(rows) : null;

  const head = (
    <PageHead title="Charges to rooms" pill={pill ? <Pill tone={pill.tone}>{pill.words}</Pill> : undefined}
      description="What each restaurant sent to a room, what reached the guest's bill, and what was refused.">
      {!refused ? <ExportButtons table={tickets.data ? exportOf(tickets.data) : null} /> : null}
    </PageHead>
  );
  if (refused) return <Screen refreshing={false} onRefresh={() => {}}>{head}<Refused title="Charges to rooms are not available" reason={refused} /></Screen>;
  const r = refusals(rows);

  return (
    <Screen refreshing={pulled && (outlets.isFetching || tickets.isFetching)} onRefresh={reload}>
      {head}
      <View style={{ flexDirection: "row", gap: 12, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, paddingHorizontal: space.cardX, paddingVertical: space.cardY }}>
        <UtensilsCrossed size={16} color={c.grey400} style={{ marginTop: 3 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[ty.md, face[500], { color: c.ink900 }]}>This is the outside door</Text>
          <Text style={[t.label, ty.sm]}>
            An outside point of sale presents a key and posts a finished bill here - a retry after a timeout returns the original
            posting rather than charging twice, and a void reverses rather than deleting. The PMS has its own till on the Till
            screen, and it comes through this same door.
          </Text>
        </View>
      </View>

      {r.count > 0 ? (
        <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 10, borderRadius: 12, borderWidth: 1, borderColor: c.red100, backgroundColor: c.red50, paddingHorizontal: space.cardX, paddingVertical: space.cardY }}>
          <AlertTriangle size={16} color={c.red700} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[t.label, ty.sm, face[600], { color: c.ink900 }]}>{refusedTitle(r.count)}</Text>
            {r.first.map((x) => (
              <View key={x.id}>
                <Text style={[t.label, ty.sm, t.tab, { color: c.grey700 }]}>{x.ticketRef} · {x.outlet} · {figures(x)}</Text>
                <Text style={[t.caption, ty.xs, { color: c.grey600 }]}>{x.reason}</Text>
              </View>
            ))}
            {r.more > 0 ? <Text style={[t.caption, ty.xs]}>…and {r.more} more in the list below.</Text> : null}
          </View>
        </View>
      ) : null}

      <Panel head={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center" }}><KeyRound size={14} color={c.grey600} /></View>
          <Text style={[t.heading, ty.md]} accessibilityRole="header">Outlets</Text>
        </View>
      }>
        {outlets.error && outlets.data ? <Stale error={outlets.error} loadedAt={outlets.dataUpdatedAt} onRetry={reload} /> : null}
        {!outlets.data ? (outlets.isLoading ? <Loading words="Loading the outlets…" /> : <ReadProblem error={outlets.error} what="the outlets" onRetry={reload} />)
          : outlets.data.length === 0 ? (
            <Empty icon={UtensilsCrossed} title="No outlet is configured"
              line="An outlet is created from the command line, which prints its API key once. Until one exists, nothing can charge a room." />
          ) : outlets.data.map((o, i) => <OutletRow key={o.code} o={o} first={i === 0} />)}
      </Panel>

      <View style={{ gap: 4 }}>
        <Text style={[t.heading, ty.md]} accessibilityRole="header">Bills</Text>
        <Text style={[t.label, ty.sm, { color: c.grey500 }]}>
          {tickets.data
            ? `${dateLong(tickets.data.from)} to ${dateLong(tickets.data.to)}. Refused bills are kept - they are how a dispute is settled.`
            : "Every bill sent, whatever became of it."}
        </Text>
      </View>
      {tickets.error && tickets.data ? <Stale error={tickets.error} loadedAt={tickets.dataUpdatedAt} onRetry={reload} /> : null}
      {!tickets.data ? (tickets.isLoading ? <Loading words="Loading the bills…" /> : <ReadProblem error={tickets.error} what="the bills" onRetry={reload} />)
        : rows.length === 0 ? (
          <Panel><Empty icon={UtensilsCrossed} title="No bill has been sent" line="Sattva still posts inside eZee. This fills when it posts here." /></Panel>
        ) : (
          <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>
            {rows.map((x, i) => <TicketRow key={x.id} x={x} first={i === 0} />)}
          </View>
        )}
    </Screen>
  );
}

function OutletRow({ o, first }: { o: PosOutlet; first: boolean }) {
  const p = outletPill(o);
  return (
    <View style={{ gap: 4, paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey200 }}>
      <Text style={[t.label, ty.md, { color: c.ink900 }]}>{o.name}</Text>
      <Text style={[t.caption, ty.xs, t.tab]}>{o.code}</Text>
      <Labelled label="Posts to">{o.category}</Labelled>
      <Labelled label="Bills">{String(o.bills)}</Labelled>
      <Labelled label=" ">
        <Pill tone={p.tone}>{p.words}</Pill>
        {p.why ? <Text style={[t.caption, ty.xs]}>{p.why}</Text> : null}
      </Labelled>
    </View>
  );
}

function TicketRow({ x, first }: { x: PosTicket; first: boolean }) {
  const p = ticketPill(x);
  return (
    <View style={{ gap: 4, paddingHorizontal: space.cardX, paddingVertical: space.cardY, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey200 }}>
      <Text style={[ty.md, face[500], t.tab, { color: c.ink900 }]}>{x.ticketRef}</Text>
      <Text style={[t.caption, ty.xs]}>{x.outlet}</Text>
      <Labelled label="Charged to">
        {x.guest ? (
          <>
            <Text style={[t.label, ty.md, { color: c.ink900 }]}>{x.guest}</Text>
            <Text style={[t.caption, ty.xs, t.tab]}>room {x.room ?? "-"}</Text>
          </>
        ) : <Text style={[t.caption, ty.xs]}>nobody - refused</Text>}
      </Labelled>
      <Labelled label="Received">
        <Text style={[t.label, ty.md, t.tab, { color: c.grey600 }]}>{x.receivedAt}</Text>
        <Text style={[t.caption, ty.xs, t.tab]}>{dateLong(x.businessDate)}</Text>
      </Labelled>
      <Labelled label="Amount">
        <Text style={[t.label, ty.md, t.tab, { color: x.status === "rejected" ? c.grey500 : c.ink900 }]}>{figures(x)}</Text>
        <Pill tone={p.tone}>{p.words}</Pill>
        {p.why && x.status !== "posted" ? <Text style={[t.caption, ty.xs]}>{p.why}</Text> : null}
      </Labelled>
    </View>
  );
}

/** The web's file (TICKET_EXPORT) without its Amount column, which the browser adds up: the server's two figures instead. */
function exportOf(d: PosTickets): ExportTable {
  return {
    title: "Charges to rooms",
    subtitle: `${d.from} to ${d.to}`,
    columns: ["Outlet", "Bill", "Guest", "Room", "Day", "Received", "Before tax", "Tax", "Status", "Why refused"],
    rows: d.rows.map((x) => [
      x.outletName, x.ticketRef, x.guest ?? "-", x.room ?? "-", x.businessDate, x.receivedAt, rupees(x.amount), rupees(x.tax),
      x.status === "posted" ? "On the bill" : x.status === "voided" ? "Voided" : "Refused", x.reason ?? "-",
    ]),
  };
}
