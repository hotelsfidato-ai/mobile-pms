import { useQueryClient } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { Check, FileText, Flag, ListChecks, Receipt, SearchX, Users, Wallet } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, Text, View } from "react-native";
import { type Hotel, outcomeUnknown } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Card, Head, notKnown, Screen, useRead } from "../../core/ui";
import { dateDay, rupees, type DeskRules } from "../finance/bill";
import { body, Button, Empty, Pill, Toast, WEBSITE, type Said } from "../front-desk/kit";
import { Kept, NotRead } from "../front-desk/StayList";
import { Back } from "../guest-services/kit";
import { Cell, Panel, ripple, shade, Tile } from "./GroupKit";
import { whyNotChangeBill, whyNotChangeBooking, whyNotCharge, whyNotInvoice, whyNotPay } from "./groupRoles";
import {
  billTo, groupLine, notYet, owed, routedNote, routedSaid, settleOff, stateOf, whyNotLead, whyNotRoute, type GroupRoom,
} from "./groupsRules";
import { issueHostInvoice, openHostAccount, readGroup, readSeries, routeRoom, setLead } from "./groupsData";
import { GroupSettle } from "./GroupSettle";

/* ══════════════════════════════════════════════════════════════════
   ONE GROUP — the web's /h/:code/groups/:id (src/modules/reservations/
   pages/GroupPanel.tsx; not pictured): its two accounts, its rooms (who
   pays for which, who leads), and the host's account with its lines, its
   Settle and its tax invoice (D27-305 (10)).
   TWO ACCOUNTS, NOT ONE TOTAL: the host's master bill and the rooms' own
   bills, each the server's figure, never added. The table is too wide for
   a phone: a card per room with its labelled figures, in the web's order.
   Every write is the API's to allow (greyed with its sentence), refused
   offline in the web's words, latched at the tap, and on an unknown
   outcome says "Not known whether …" and reads the group again.
   ══════════════════════════════════════════════════════════════════ */

const word = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function GroupPage({ hotel, role, id, onBack }: { hotel: Hotel & { deskRules?: DeskRules }; role: string | null; id: string; onBack: () => void }) {
  const code = hotel.code;
  const qc = useQueryClient();
  const read = useRead(() => readGroup(code, id), ["reservations", code, "group", id]);
  const [toast, setToast] = useState<Said | null>(null);
  const [settling, setSettling] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  /* One tap, one write (MEMORY 8): latched before `busy` can draw. */
  const going = useRef(false);

  /* Money or a bill moved: every read of this hotel's bookings and bills is asked again (the web's invalidateQueries). */
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["reservations", code] });
    void qc.invalidateQueries({ queryKey: ["front-desk", code] });
    void qc.invalidateQueries({ queryKey: ["finance", code] });
  };

  async function write(key: string, done: string, act: () => Promise<Said | void>, ok: Said, not: string) {
    if (going.current) return;
    going.current = true;
    setBusy(key);
    try {
      setToast((await act()) ?? ok);
    } catch (e) {
      /* Nothing came back, or the server failed: these are safe to repeat
         (the server answers the same), but the person is told and the group
         is read again before they try. Offline: the web's own sentence. */
      if (outcomeUnknown(e)) { const n = notKnown(done, "the group", e); setToast({ title: n.title, body: n.body, tone: "bad" }); }
      else setToast({ title: not, body: e instanceof Error ? e.message : String(e), tone: "bad" });
    } finally {
      going.current = false;
      setBusy(null);
      refresh();
    }
  }

  const g = read.data;
  if (g === undefined) {
    return (
      <Screen refreshing={false} onRefresh={read.reload}>
        <Head title="Group" action={<Back onPress={onBack} />} />
        {read.error ? <NotRead what="the group" error={read.error} onRetry={read.reload} /> : <ActivityIndicator color={c.orange} accessibilityLabel="Reading the group" />}
      </Screen>
    );
  }
  if (g === null) {
    return (
      <Screen refreshing={false} onRefresh={read.reload}>
        <Head title="Group" action={<Back onPress={onBack} />} />
        <Card><Empty title="No such group" line="It may belong to another property." Icon={SearchX} /></Card>
      </Screen>
    );
  }

  const m = g.master;
  const payer = billTo(g);
  const why = (reason: string) => setToast({ title: reason, tone: "bad" });
  const routeWhy = whyNotChangeBill(role);
  const unrouted = g.rooms.some((r) => whyNotRoute(g, r) !== null);
  const invoiceWhy = whyNotInvoice(role) ?? (notYet(g) || null);

  const openMaster = () => void write("master", "opened", async () => { await openHostAccount(code, g.id); },
    { title: "Host account open", body: "Room charges can now be routed to it.", tone: "ok" }, "Not opened");
  const lead = (r: GroupRoom) => void write(`lead:${r.reservationId}`, "changed", async () => { await setLead(code, g.id, r.reservationId); },
    { title: `${r.guest} leads the group`, body: "The group's confirmation and its review request go to them.", tone: "ok" }, "Not changed");
  const toggle = (r: GroupRoom) => void write(r.reservationId, "changed", async () => { await routeRoom(code, g.id, r.reservationId, !r.routed); },
    { title: routedSaid(r), body: "Nights already charged stay where they were posted.", tone: "ok" }, "Not changed");

  /* Invoices' own "are you sure" (IssueInvoiceDialog), as each phone's own dialog. */
  async function askInvoice() {
    if (!m) return;
    const next = await readSeries(code).then((s) => s[0]?.next ?? null).catch(() => null);
    Alert.alert(
      "Issue this tax invoice?",
      `${g!.name} · the host's account\n\nBilled to ${payer}. It takes the next number in the GST series${next ? ` - ${next}` : ""}. An issued invoice is never edited: a wrong one needs a credit note.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Issue the invoice",
          onPress: () => void write("invoice", "issued", async (): Promise<Said> => {
            const r = await issueHostInvoice(code, g!.id);
            return { title: "Tax invoice issued", ...(r.number ? { body: r.number } : {}), tone: "ok" };
          }, { title: "Tax invoice issued", tone: "ok" }, "Not issued"),
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={read.loading} onRefresh={read.reload}>
        <Head title={g.name} under={groupLine(g)} action={<Back onPress={onBack} />} />
        {/* D27-383 item 8: typed or read from the group's file, printed and downloaded - the website's. */}
        <View style={{ flexDirection: "row" }}>
          <Button label="Rooming list" Icon={ListChecks} reason={WEBSITE} onRefused={why} onPress={() => undefined} />
        </View>
        <Kept error={read.error} what="the group" />

        {/* ── The two balances: each warm while that side owes. Withheld from a role that reads no bills. ── */}
        {g.guestBalance != null ? (
          <View style={{ gap: space.card }}>
            <Tile
              icon={Wallet} tone={m && m.balance > 0 ? "orange" : "neutral"} label="The host"
              value={m ? rupees(m.balance) : "-"} missing={!m}
              note={m ? routedNote(g) : (
                <View style={{ gap: 8 }}>
                  <Text style={[t.caption, { color: c.grey500, lineHeight: 17 }]}>No host account. Every room settles its own.</Text>
                  <View style={{ flexDirection: "row" }}>
                    <Button label="Open a host account" busy={busy === "master"} reason={whyNotCharge(role)} onRefused={why} onPress={openMaster} />
                  </View>
                </View>
              )}
            />
            <Tile icon={Users} tone={g.guestBalance > 0 ? "orange" : "neutral"} label="The guests" value={rupees(g.guestBalance)}
              note={`Across ${word(g.rooms.length, "bill", "bills")}`} />
          </View>
        ) : null}

        <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>
          Two accounts, not one total. The host is billed for the rooms routed to them; each guest is billed for their own folio. Adding them would give a number nobody can be asked to pay.
        </Text>

        {/* ── The rooms ── */}
        <Panel title="Rooms" description="Tick a room to put its accommodation on the host's account.">
          {routeWhy || unrouted ? (
            <Text style={[t.caption, { color: c.grey500, paddingHorizontal: space.cardX, paddingTop: 10 }]}>
              {routeWhy ?? "This group has no open master folio yet. Open one, and the room charges will go to it."}
            </Text>
          ) : null}
          {g.rooms.map((r, i) => (
            <RoomCard
              key={r.reservationId} code={code} room={r} first={i === 0} businessDate={hotel.businessDate}
              routeWhy={routeWhy ?? whyNotRoute(g, r)} leadWhy={whyNotChangeBooking(role) ?? whyNotLead(r, g.leadId)}
              isLead={r.reservationId === g.leadId} busy={busy} onToggle={() => toggle(r)} onLead={() => lead(r)} onRefused={why}
            />
          ))}
        </Panel>

        {/* ── The host's account ── */}
        {m ? (
          <Panel title="The host's account" description={`Billed to ${payer}. Every line says which room it is for.`}>
            {m.lines.length === 0 ? (
              <Text style={[t.label, body, { color: c.grey500, padding: space.cardX, lineHeight: 21 }]}>
                Nothing has been charged to the host yet. Route a room above, and tonight's audit will post it here.
              </Text>
            ) : (
              <View style={{ paddingHorizontal: space.cardX }}>
                {m.lines.map((l, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
                    <Text style={[t.label, t.tab, { width: 92, color: c.grey500 }]}>{dateDay(l.date)}</Text>
                    <Text style={[t.label, { flex: 1, color: c.ink900 }]}>
                      {l.description}
                      {l.room ? <Text style={[body, { color: c.grey500 }]}>{`  Room ${l.room}`}</Text> : null}
                    </Text>
                    <Text style={[t.label, t.tab, face[600], { color: c.ink900 }]}>{rupees(l.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, padding: space.cardX, borderTopWidth: 1, borderTopColor: c.grey100 }}>
              <Button label="Settle" Icon={Receipt} kind={m.balance > 0 ? "primary" : "secondary"} reason={whyNotPay(role) ?? (settleOff(m) ? "" : null)}
                onRefused={(w) => { if (w) why(w); }} onPress={() => setSettling(true)} />
              {m.invoice ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 }}>
                  <FileText size={16} color={c.grey600} />
                  <Text style={[t.label, { color: c.ink900 }]}>Tax invoice <Text style={t.tab}>{m.invoice}</Text></Text>
                </View>
              ) : (
                <Button label="Issue tax invoice" Icon={FileText} kind={invoiceWhy ? "secondary" : "primary"} busy={busy === "invoice"}
                  reason={invoiceWhy} onRefused={why} onPress={() => void askInvoice()} />
              )}
            </View>
            {!m.invoice && notYet(g) && !whyNotInvoice(role) ? (
              <Text style={[t.caption, { color: c.grey500, paddingHorizontal: space.cardX, paddingBottom: space.cardY, marginTop: -6 }]}>{notYet(g)}</Text>
            ) : null}
          </Panel>
        ) : null}

        <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>
          Changing who pays affects nights <Text style={face[600]}>not yet charged</Text>. The audit posts one night at a time, so anything already on a folio stays where it was posted - moving it is a reversal and a re-post on the folio, with a reason beside it.
        </Text>
      </Screen>

      {settling && m ? (
        <GroupSettle
          hotel={hotel} groupId={g.id} payer={payer} balance={m.balance} role={role}
          onClose={() => setSettling(false)}
          onReread={refresh}
          onTaken={(amount, method, roundOff) => {
            setSettling(false);
            setToast({ title: `${rupees(amount)} received`, body: roundOff ? `${method} · round-off ${rupees(roundOff)}, kept with the payment by the server` : method, tone: "ok" });
            refresh();
          }}
        />
      ) : null}
      <Toast said={toast} onClose={() => setToast(null)} />
    </View>
  );
}

/** One room: GroupPanel's table row as a card, its cells in the web's order. */
function RoomCard({ code, room: r, first, businessDate, routeWhy, leadWhy, isLead, busy, onToggle, onLead, onRefused }: {
  code: string; room: GroupRoom; first: boolean; businessDate: string; routeWhy: string | null; leadWhy: string | null;
  isLead: boolean; busy: string | null; onToggle: () => void; onLead: () => void; onRefused: (why: string) => void;
}) {
  const state = stateOf(r, businessDate);
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 10, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      {/* It opens the stay: a link, so orange (the Tappable Rule). */}
      <Pressable {...ripple} onPress={() => router.push(`/front-desk/${code}/stay/${r.reservationId}` as Href)} accessibilityRole="link" accessibilityLabel={`${r.guest}, open the stay`}
        style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", backgroundColor: shade(pressed) })}>
        <Text style={[t.heading, face[500], { color: c.orange700 }]}>{r.guest}</Text>
        <Text style={[t.caption, t.tab]}>{r.reference}</Text>
      </Pressable>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        <View style={{ gap: 2, minWidth: 72 }}>
          <Text style={[t.caption, { color: c.grey500 }]}>Room</Text>
          {/* A dash once they have left: never a room they have vacated. */}
          <Text style={[t.label, t.tab, { color: r.room ? c.ink900 : c.grey500 }]}>{r.room ?? "-"}</Text>
          <Text style={t.caption}>{r.roomType}</Text>
        </View>
        <View style={{ gap: 2 }}>
          <Text style={[t.caption, { color: c.grey500 }]}>Dates</Text>
          <Text style={[t.label, t.tab, { color: c.ink900 }]}>{`${dateDay(r.checkIn)} → ${dateDay(r.checkOut)}`}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={t.caption}>{word(r.nights, "night", "nights")}</Text>
            <Pill tone={state.tone}>{state.label}</Pill>
          </View>
        </View>
        <Cell label="Rate" value={rupees(r.agreedRate)} />
        <Cell label="Own bill" value={owed(r.balance)} muted={r.balance == null} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Pressable onPress={() => { if (routeWhy) onRefused(routeWhy); }}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }}>
          <Switch
            value={r.routed} onValueChange={onToggle} disabled={routeWhy != null || busy === r.reservationId}
            accessibilityLabel={`Host pays for ${r.guest}`} accessibilityHint={routeWhy ?? undefined}
            trackColor={{ true: c.ink900, false: c.grey300 }} thumbColor={c.white}
          />
          <Text style={[t.label, { color: routeWhy ? c.grey500 : c.ink900 }]}>Host pays</Text>
        </Pressable>
        {isLead ? (
          <View accessibilityLabel={`${r.guest} leads the group`} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.ink900 }}>
            <Flag size={16} color={c.white} />
            <Text style={[t.label, { color: c.white }]}>Lead guest</Text>
            <Check size={14} color={c.white} />
          </View>
        ) : (
          <Button label="Lead guest" Icon={Flag} size="sm" busy={busy === `lead:${r.reservationId}`} reason={leadWhy ?? (busy !== null ? "" : null)}
            onRefused={(w) => { if (w) onRefused(w); }} onPress={onLead} />
        )}
      </View>
    </View>
  );
}
