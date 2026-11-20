import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { DateField } from "../../core/DateField";
import { ExportButtons } from "../../core/Export";
import type { ExportTable } from "../../core/exportDoc";
import { dateLong } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { Screen } from "../../core/ui";
import { billRows } from "./bill";
import {
  EMPTY, MODE_CHOICES, MODE_WORD, askProblem, countWords, guestOf, headingOf, modesWords, opening, stateOf, totalCell,
  type Ask, type BillHistory as History, type BillHistoryRow,
} from "./billHistory";
import { precise } from "./dayEnd";
import { PrintBill } from "./Pay";
import { readBillHistory, readOrder, readWaiters } from "./serviceData";
import { BottomSheet, Btn, Empty, Field, Input, Labelled, Loading, PageHead, Panel, Pill, Select } from "./ServiceKit";
import { whyNotReadBills, whyNotWideSearch } from "./serviceRoles";
import { ReadProblem, Refused, Stale, ty, useAccess } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   BILL HISTORY on a phone — the web's /pos/:code/bill-history
   (src/modules/pos/pages/BillHistory.tsx, 16 Nov; picture pms-shots
   new/n-pos-bill-history, the GM, 31 Oct). Every paid, voided and NC bill
   of any dates, found by number, table, guest, how it was paid, the waiter
   or the outlet; tap one to see it and print it again (BILL · DUPLICATE,
   the Till's own reprint: PrintBill, to the bill printer, else from the
   phone with expo-print, as the web prints). The managers, the Accountant
   and Reception only (D27-372): anyone else reads the server's sentence.
   Every figure is the server's row (billHistory.ts). The list exports as
   the web's file columns, through the phone's own print and share sheets.
   ══════════════════════════════════════════════════════════════════ */

const dayYear = (d: string) => {
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d.slice(8, 10))} ${M[Number(d.slice(5, 7)) - 1] ?? ""} ${d.slice(0, 4)}`;
};

export function BillHistoryScreen({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const access = useAccess(code);
  const refused = whyNotReadBills(role) ?? whyNotWideSearch(role);
  /* It opens on today's business day, as the Till does. */
  const [draft, setDraft] = useState<Ask>(() => opening(hotel.businessDate));
  const [applied, setApplied] = useState<Ask>(() => opening(hotel.businessDate));
  const [problem, setProblem] = useState("");
  const [opened, setOpened] = useState<string | null>(null);
  const [pulled, setPulled] = useState(false);
  const set = (k: keyof Ask) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const q = useQuery({ queryKey: ["pos", code, "bill-history", applied], queryFn: () => readBillHistory(code, applied), enabled: !refused, placeholderData: (p) => p });
  const waiters = useQuery({ queryKey: ["pos", code, "waiters"], queryFn: () => readWaiters(code), enabled: !refused });
  const reload = () => { setPulled(true); void q.refetch(); void waiters.refetch(); };

  const search = () => {
    const p = askProblem(draft);
    if (p) return setProblem(p);
    setProblem("");
    setApplied(draft);
  };
  const clear = () => { setDraft(EMPTY); setProblem(""); };
  const bills = q.data?.bills ?? [];
  const outletName = (o: string) => q.data?.outlets.find((x) => x.code === o)?.name ?? o;

  const head = (
    <PageHead title="Bill history" description="Every paid, voided and NC bill of any dates. Open one to see it and print it again.">
      {!refused ? <ExportButtons table={q.data ? exportOf(q.data, applied, outletName) : null} /> : null}
    </PageHead>
  );
  if (refused) return <Screen refreshing={false} onRefresh={() => {}}>{head}<Refused title="Bill history is not available" reason={refused} /></Screen>;
  if (access.data && !access.data.ok) {
    return <Screen refreshing={false} onRefresh={() => void access.refetch()}>{head}<Refused store title="The point of sale is not open to you here" reason={access.data.reason} /></Screen>;
  }

  return (
    <Screen refreshing={pulled && q.isFetching} onRefresh={reload}>
      {head}
      <Panel>
        <View style={{ gap: 12 }}>
          {/* The phone's own pickers (M-16): no later than the business date, as the web's max; blank is no bound. */}
          <DateField label="From" clearable value={draft.from} onChange={set("from")} max={hotel.businessDate} hotel={hotel} />
          <DateField label="To" clearable value={draft.to} onChange={set("to")} max={hotel.businessDate} hotel={hotel} />
          <Field label="Bill number">
            <Input value={draft.no} onChangeText={set("no")} maxLength={40} placeholder="R-0012" autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Bill number" />
          </Field>
          <Field label="Table">
            <Input value={draft.table} onChangeText={set("table")} maxLength={40} autoCorrect={false} accessibilityLabel="Table" />
          </Field>
          <Field label="Guest name, phone or room">
            <Input value={draft.guest} onChangeText={set("guest")} maxLength={60} autoCorrect={false} accessibilityLabel="Guest name, phone or room" />
          </Field>
          <Field label="Paid by"><Select label="Paid by" value={draft.mode} onChange={set("mode")} options={MODE_CHOICES} /></Field>
          <Field label="Waiter">
            <Select label="Waiter" value={draft.waiter} onChange={set("waiter")}
              options={[{ value: "", label: "Anyone" }, ...(waiters.data ?? []).map((w) => ({ value: w.id, label: w.name }))]} />
          </Field>
          <Field label="Outlet">
            <Select label="Outlet" value={draft.outlet} onChange={set("outlet")}
              options={[{ value: "", label: "All outlets" }, ...(q.data?.outlets ?? []).map((o) => ({ value: o.code, label: o.name }))]} />
          </Field>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Btn label="Show bills" icon={Search} onPress={search} busy={q.isFetching && !pulled} />
            <Btn ghost label="Clear" onPress={clear} />
          </View>
          {problem ? <Text accessibilityRole="alert" style={[t.label, ty.sm, { color: c.red700 }]}>{problem}</Text> : null}
        </View>
      </Panel>

      {q.error && q.data ? <Stale error={q.error} loadedAt={q.dataUpdatedAt} onRetry={reload} /> : null}
      {q.data ? <Text style={[t.label, ty.sm]}>{countWords(q.data)}</Text> : null}
      {!q.data ? (q.isLoading ? <Loading words="Loading the bills…" /> : <ReadProblem error={q.error} what="the bills" onRetry={reload} />)
        : bills.length === 0 ? (
          <Panel>
            <Empty title="No matches" line="Nothing matches the current search and filters. Try widening them." />
            <View style={{ alignItems: "center" }}><Btn label="Clear filters" onPress={() => { clear(); setApplied(opening(hotel.businessDate)); }} /></View>
          </Panel>
        ) : (
          <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>
            {bills.map((b, i) => <BillCard key={b.id} b={b} first={i === 0} outlet={outletName(b.outlet)} onOpen={() => setOpened(b.id)} />)}
          </View>
        )}
      {opened ? <OpenedBill hotel={hotel} id={opened} onClose={() => setOpened(null)} /> : null}
    </Screen>
  );
}

function BillCard({ b, first, outlet, onOpen }: { b: BillHistoryRow; first: boolean; outlet: string; onOpen: () => void }) {
  const total = totalCell(b, precise);
  const st = stateOf(b.status);
  const guest = guestOf(b);
  return (
    <Pressable
      onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Bill ${b.orderNo}, ${total.main}, ${st.words}. Open it`}
      android_ripple={{ color: c.grey200 }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: space.cardX, paddingVertical: space.cardY,
        borderTopWidth: first ? 0 : 1, borderTopColor: c.grey200, backgroundColor: pressed && Platform.OS === "ios" ? c.grey50 : c.white })}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[ty.md, face[500], t.tab, { color: c.ink900 }]}>{b.orderNo}</Text>
        <Labelled label="Date and time settled">{`${dayYear(b.businessDate)} · ${b.settledAt ?? "-"}`}</Labelled>
        <Labelled label="Outlet">{outlet}</Labelled>
        <Labelled label="Table">{b.table ?? "-"}</Labelled>
        <Labelled label="Guest">
          <Text style={[t.label, ty.md, { color: c.ink900 }]}>{guest ?? "-"}</Text>
          {b.room ? <Text style={[t.caption, ty.xs, t.tab]}>Room {b.room}</Text> : null}
          {b.phone ? <Text style={[t.caption, ty.xs, t.tab]}>{b.phone}</Text> : null}
        </Labelled>
        <Labelled label="Waiter">{b.waiter ?? "-"}</Labelled>
        <Labelled label="Paid by">{modesWords(b)}</Labelled>
        <Labelled label="Total">
          <Text style={[t.label, ty.md, t.tab, { color: total.struck ? c.grey500 : c.ink900, textDecorationLine: total.struck ? "line-through" : "none" }]}>{total.main}</Text>
          {total.notes.map((n) => <Text key={n} style={[t.caption, ty.xs]}>{n}</Text>)}
        </Labelled>
        <Labelled label="State"><Pill tone={st.tone}>{st.words}</Pill></Labelled>
      </View>
      <ChevronRight size={18} color={c.grey400} />
    </Pressable>
  );
}

/** The whole bill (the web's BillSlip in a dialog) and the Till's own reprint. */
function OpenedBill({ hotel, id, onClose }: { hotel: Hotel; id: string; onClose: () => void }) {
  const code = hotel.code;
  const q = useQuery({ queryKey: ["pos", code, "bill-history-order", id], queryFn: () => readOrder(code, id), staleTime: 0 });
  const o = q.data;
  const sums = o ? billRows(o) : null;
  return (
    <BottomSheet open onClose={onClose} title={o ? `Bill ${o.orderNo}` : "Bill"}
      footer={
        <View style={{ gap: 8 }}>
          {o ? <PrintBill hotel={hotel} orderId={o.id} onPrinted={() => void q.refetch()} /> : null}
          <Btn label="Close" onPress={onClose} />
        </View>
      }>
      {q.isLoading ? <Loading words="Loading the bill…" /> : !o || !sums ? <ReadProblem error={q.error} what="this bill" onRetry={() => void q.refetch()} /> : (
        <View style={{ gap: 10 }}>
          <View style={{ borderLeftWidth: 4, borderLeftColor: c.orange, paddingLeft: 8 }}>
            <Text style={[ty.md, face[700], { color: c.ink900, textTransform: "uppercase", letterSpacing: 0.8 }]}>{headingOf(o as { status: string; billsPrinted?: number })}</Text>
            <Text style={[t.caption, ty.xs, t.tab]}>{o.orderNo}</Text>
          </View>
          <Text style={[t.label, ty.sm]}>{o.hotelName} · {o.outletName}</Text>
          <View style={{ gap: 2 }}>
            {o.table ? <Labelled label="Table">{o.table}</Labelled> : null}
            <Labelled label="Date">{dateLong(o.businessDate)}</Labelled>
            <Labelled label="Served by">{o.openedBy ?? "-"}</Labelled>
            {o.settledBy ? <Labelled label="Settled by">{o.settledBy}</Labelled> : null}
          </View>
          <View style={{ borderTopWidth: 2, borderTopColor: c.ink900 }}>
            {o.lines.filter((l) => !l.voided).map((l) => (
              <View key={l.id} style={{ flexDirection: "row", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
                <Text style={[t.label, ty.sm, t.tab, { color: c.ink900, width: 32 }]}>{l.qty}×</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[t.label, ty.sm, { color: c.ink900 }]}>{l.extra ? `+ ${l.name}` : l.name}</Text>
                  {l.note ? <Text style={[t.caption, ty.xs]}>{l.note}</Text> : null}
                </View>
                {/* The paper's own line figure (BillSlip; bill.ts billHtml). */}
                <Text style={[t.label, ty.sm, t.tab, { color: c.ink900, ...face[600] }]}>{precise(l.qty * l.unitPrice)}</Text>
              </View>
            ))}
          </View>
          <View style={{ gap: 2 }}>
            {sums.rows.map(([k, v]) => (
              <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[t.label, ty.sm]}>{k}</Text><Text style={[t.label, ty.sm, t.tab, { color: c.ink900 }]}>{v}</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 2, borderTopColor: c.ink900, paddingTop: 6, marginTop: 4 }}>
              <Text style={[ty.md, face[700], { color: c.ink900 }]}>{sums.total[0]}</Text>
              <Text style={[ty.md, face[700], t.tab, { color: c.ink900 }]}>{sums.total[1]}</Text>
            </View>
          </View>
          <Text style={[t.label, ty.sm]}>
            {o.paymentMethod === "function" ? `Charged to ${o.eventTitle ?? "the function"}'s bill`
              : o.paymentMethod ? `Paid by ${MODE_WORD[o.paymentMethod] ?? o.paymentMethod}` : "-"}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

/** The web's file columns (BillHistory.tsx exportColumns), each cell as the screen writes it. */
function exportOf(h: History, a: Ask, outletName: (c: string) => string): ExportTable {
  return {
    title: "Bill history",
    subtitle: `${a.from || "start"} to ${a.to || "end"}`,
    columns: ["Bill", "Date", "Settled at", "Outlet", "Table", "Guest", "Room", "Phone", "Waiter", "Paid by", "Total", "Service charge", "Tip", "NC value", "State"],
    rows: h.bills.map((b) => [
      b.orderNo, b.businessDate, b.settledAt ?? "-", outletName(b.outlet), b.table ?? "-", guestOf(b) ?? "-", b.room ?? "-", b.phone ?? "-",
      b.waiter ?? "-", modesWords(b),
      /* An NC bill's value is its own column, so Total holds only what was paid (D27-394); a blank is not a zero. */
      b.status === "no_charge" ? "-" : precise(b.payable),
      b.serviceCharge ? precise(b.serviceCharge) : "-", b.tip ? precise(b.tip) : "-",
      b.status === "no_charge" ? precise(b.net) : "-", stateOf(b.status).words,
    ]),
    ...(h.capped ? { note: `Only the first ${h.cap} bills: more matched` } : {}),
  };
}
