import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone } from "lucide-react-native";
import { useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import { HeldError, outcomeUnknown, type Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import type { ExportTable } from "../../core/exportDoc";
import { c, t } from "../../core/theme";
import { Screen, notKnown, useStuck } from "../../core/ui";
import { stepDay } from "./billHistory";
import { actOnBooking, bookOutsideDiner, readTableBookings } from "./serviceData";
import { BottomSheet, Btn, DayField, Field, Input, Loading, PageHead, Panel, Pill, Select, Why } from "./ServiceKit";
import { whyNotAnswerTable, whyNotReadBills } from "./serviceRoles";
import {
  ACT, answer, dayWords, detailLine, lists, offers, people, statusOf, tableLabel,
  type Asking, type Diner, type TableBooking, type TableBookingList,
} from "./tableBookings";
import { ReadProblem, Refused, SaidBar, Stale, ty, useAccess, type Said } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   TABLE BOOKINGS on a phone — the web's /pos/:code/table-bookings
   (src/modules/pos/pages/TableBookings.tsx, 16 Nov; picture pms-shots
   new/n-pos-table-bookings, the GM, 31 Oct - older than New booking and
   the day, which follow today's code). Waiting first, then the chosen day,
   then what comes after; read again every minute, as the web does.
   Answered by the till's people (roleGate TABLE_ANSWER); for anyone else
   every act is grey with the API's sentence (the web hides them: rule 1).
   Every write is refused offline with the web's sentence (core offline.ts
   holds none of them). Each act on the night is refused by the server from
   a state it may not be done in, so a lost reply is safe to repeat; a new
   booking is not, so a lost reply stops Book until the sheet is closed
   and the list read again (MEMORY 16).
   ══════════════════════════════════════════════════════════════════ */

type Tables = TableBookingList["tables"];

function failed(title: string, e: unknown, done: string): Said {
  if (e instanceof HeldError) return { tone: "held", title: "Saved on this phone", body: e.message };
  if (outcomeUnknown(e)) { const n = notKnown(done, "the table bookings", e); return { tone: "bad", title: n.title, body: n.body }; }
  return { tone: "bad", title, body: e instanceof Error ? e.message : String(e) };
}

export function TableBookingsScreen({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const access = useAccess(code);
  const refused = whyNotReadBills(role);
  const why = whyNotAnswerTable(role);
  /* "" is the hotel's today, as the server reckons it. */
  const [day, setDay] = useState("");
  const [booking, setBooking] = useState(0);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  const q = useQuery({ queryKey: ["pos", code, "table-bookings", day], queryFn: () => readTableBookings(code, day), enabled: !refused, refetchInterval: 60_000 });
  const reload = () => { setPulled(true); void q.refetch(); };
  const changed = () => { void cache.invalidateQueries({ queryKey: ["pos", code] }); };

  const today = q.data?.today ?? "";
  const shown = day || today;
  const all = q.data?.bookings ?? [];
  const l = lists(all, shown);
  const tables = q.data?.tables ?? [];

  const head = (
    <PageHead title="Table bookings"
      description="Hotel guests ask for a table from their own page: confirm each one, or decline it with a reason they will read. Book anybody else here, and mark each booking on the night.">
      {!refused ? (
        <View style={{ gap: 8 }}>
          <ExportButtons table={q.data ? exportOf(all, shown) : null} />
          <Btn primary label="New booking" disabled={why !== null || !q.data} onPress={() => { setSaid(null); setBooking((n) => n + 1); }} style={{ alignSelf: "flex-start" }} />
          <Why>{why}</Why>
        </View>
      ) : null}
    </PageHead>
  );
  if (refused) return <Screen refreshing={false} onRefresh={() => {}}>{head}<Refused title="Table bookings are not available" reason={refused} /></Screen>;
  if (access.data && !access.data.ok) {
    return <Screen refreshing={false} onRefresh={() => void access.refetch()}>{head}<Refused store title="The point of sale is not open to you here" reason={access.data.reason} /></Screen>;
  }

  return (
    <Screen refreshing={pulled && q.isFetching} onRefresh={reload}>
      {head}
      {said ? <SaidBar said={said} onDone={() => setSaid(null)} /> : null}
      <View style={{ gap: 8 }}>
        <DayField label="Day" value={shown} placeholder={today || "2026-11-06"}
          onChange={(v) => setDay(v === today ? "" : v)} step={(by) => { const v = stepDay(shown, by, today); setDay(v === today ? "" : v); }} />
        {day ? <Btn ghost label="Back to today" onPress={() => setDay("")} style={{ alignSelf: "flex-start" }} /> : null}
      </View>
      {q.error && q.data ? <Stale error={q.error} loadedAt={q.dataUpdatedAt} onRetry={reload} /> : null}
      {!q.data ? (q.isLoading ? <Loading words="Loading the table bookings…" /> : <ReadProblem error={q.error} what="the table bookings" onRetry={reload} />) : (
        <>
          <List title="Waiting" empty="Nothing is waiting for an answer." rows={l.waiting} today={today} code={code} tables={tables} why={why} onChanged={changed} />
          <List title={shown === today ? "Today" : dayWords(shown, today)} empty={shown === today ? "No table booked for today." : "No table booked for that day."}
            rows={l.todays} today={today} code={code} tables={tables} why={why} onChanged={changed} />
          <List title="Upcoming" empty="Nothing booked after that." rows={l.later} today={today} code={code} tables={tables} why={why} onChanged={changed} />
        </>
      )}
      {booking > 0 && q.data ? (
        <NewBooking key={booking} code={code} today={today} tables={tables} sections={q.data.sections ?? []}
          onClose={(s) => { setBooking(0); if (s) setSaid(s); changed(); }} />
      ) : null}
    </Screen>
  );
}

function List({ title, empty, rows, ...rest }: {
  title: string; empty: string; rows: TableBooking[]; today: string; code: string; tables: Tables; why: string | null; onChanged: () => void;
}) {
  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      <Text style={[t.heading, { fontSize: 18 }]} accessibilityRole="header">{title}</Text>
      {rows.length === 0 ? <Text style={[t.label, ty.md, { color: c.grey500 }]}>{empty}</Text>
        : rows.map((b) => <BookingCard key={b.id} b={b} {...rest} />)}
    </View>
  );
}

function BookingCard({ b, today, code, tables, why, onChanged }: {
  b: TableBooking; today: string; code: string; tables: Tables; why: string | null; onChanged: () => void;
}) {
  const [asking, setAsking] = useState<Asking | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const latch = useRef(false);
  const st = statusOf(b.status);
  const can = offers(b);
  const detail = detailLine(b);

  /* Arrived and No-show: one tap, one write (MEMORY 8); the server refuses a second. */
  async function mark(act: "arrive" | "no-show") {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await actOnBooking(code, `${b.id}/${act}`, {});
      setSaid({ tone: "ok", title: act === "arrive" ? `${b.guest} has arrived` : `${b.guest}: a no-show` });
      onChanged();
    } catch (e) {
      setSaid(failed("Not marked", e, "marked"));
      if (outcomeUnknown(e)) onChanged();
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Panel>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[t.heading, ty.md]}>{dayWords(b.date, today)} · {b.time}</Text>
            <Text style={[t.label, ty.sm]}>{people(b.party)} · {b.outlet}{b.section ? ` · ${b.section.name}` : ""}</Text>
          </View>
          <Pill tone={st.tone}>{st.words}</Pill>
        </View>
        {b.outside ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 6 }}>
            <Text style={[t.label, ty.md, { color: c.ink900 }]}>{b.guest} ·</Text>
            {b.phone ? (
              <Text onPress={() => void Linking.openURL(`tel:${b.phone!.replace(/[^\d+]/g, "")}`)} accessibilityRole="link"
                accessibilityLabel={`Call ${b.guest}, ${b.phone}`} style={[t.label, ty.md, t.tab, { color: c.orange700, paddingVertical: 10 }]}>
                <Phone size={14} color={c.orange700} /> {b.phone}
              </Text>
            ) : <Text style={[t.label, ty.md]}>-</Text>}
            <Text style={[t.label, ty.sm, { color: c.grey500 }]}>· not staying</Text>
          </View>
        ) : (
          <Text style={[t.label, ty.md, { color: c.ink900 }]}>
            {b.guest} · room {b.room ?? "-"} <Text style={[ty.sm, { color: c.grey500 }]}>· {b.reference}</Text>
          </Text>
        )}
        {b.note ? <Text style={[t.label, ty.sm, { color: c.grey700 }]}>"{b.note}"</Text> : null}
        {detail ? <Text style={[t.label, ty.sm]}>{detail}</Text> : null}
        {can.answer ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
            <Btn primary label="Confirm" disabled={why !== null} onPress={() => setAsking("confirm")} />
            <Btn label="Decline" disabled={why !== null} onPress={() => setAsking("decline")} />
          </View>
        ) : null}
        {can.seat ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
            <Btn primary label="Seat" disabled={why !== null || busy} onPress={() => setAsking("seat")} />
            {can.arrived ? <Btn label="Arrived" busy={busy} disabled={why !== null} onPress={() => void mark("arrive")} /> : null}
            {can.noShow ? <Btn label="No-show" busy={busy} disabled={why !== null} onPress={() => void mark("no-show")} /> : null}
            <Btn ghost label="Cancel booking" disabled={why !== null || busy} onPress={() => setAsking("cancel")} />
          </View>
        ) : null}
        {can.answer || can.seat ? <Why>{why}</Why> : null}
        {said ? <SaidBar said={said} onDone={() => setSaid(null)} /> : null}
      </View>
      {asking ? <AnswerSheet b={b} code={code} tables={tables} act={asking} onClose={(s) => { setAsking(null); if (s) setSaid(s); onChanged(); }} /> : null}
    </Panel>
  );
}

function AnswerSheet({ b, code, tables, act, onClose }: { b: TableBooking; code: string; tables: Tables; act: Asking; onClose: (s?: Said) => void }) {
  const [table, setTable] = useState(act === "seat" ? b.table?.id ?? "" : "");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const latch = useRef(false);
  const A = ACT[act];
  async function go() {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      const { path, body } = answer(act, b.id, table, why);
      await actOnBooking(code, path, body);
      const label = tables.find((x) => x.id === table)?.label;
      onClose({ tone: "ok", title: A.done, body: act === "seat" ? `At table ${label ?? ""}: its bill is open on Tables.` : act === "cancel" ? undefined : "The guest sees it on their page." });
    } catch (e) {
      setSaid(failed("Not done", e, A.done.toLowerCase()));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }
  return (
    <BottomSheet open onClose={() => { if (!busy) onClose(); }} title={A.title}
      description={`${b.guest}, ${people(b.party)}, ${dayWords(b.date, "")} at ${b.time}.`}
      footer={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label="Back" style={{ flex: 1 }} tall disabled={busy} onPress={() => onClose()} />
          <Btn primary label={A.button} style={{ flex: 1 }} tall busy={busy} disabled={(act === "seat" && !table) || (act === "decline" && !why.trim())} onPress={() => void go()} />
        </View>
      }>
      {act === "confirm" || act === "seat" ? (
        <Field label={act === "seat" ? "Table *" : "Table"}
          hint={act === "seat" ? "A free table: its bill opens with the party as its covers." : "If you know it now. The guest is not shown the table."}>
          <Select label="Table" value={table} onChange={setTable}
            options={[{ value: "", label: act === "seat" ? "Choose a table" : "Not yet" }, ...tables.map((x) => ({ value: x.id, label: tableLabel(x) }))]} />
        </Field>
      ) : (
        <Field label={act === "decline" ? "Reason *" : "Reason"} hint={act === "decline" ? "The guest reads this on their page." : "If they gave one."}>
          <Input value={why} onChangeText={setWhy} maxLength={200} autoFocus accessibilityLabel="Reason" />
        </Field>
      )}
      {said ? <SaidBar said={said} onDone={() => setSaid(null)} /> : null}
    </BottomSheet>
  );
}

/* A table for somebody not staying (259): confirmed as it is taken; every refusal is the server's sentence. */
function NewBooking({ code, today, tables, sections, onClose }: {
  code: string; today: string; tables: Tables; sections: { id: string; name: string }[]; onClose: (s?: Said) => void;
}) {
  const [v, setV] = useState<Diner>({ name: "", phone: "", party: "", date: today, time: "", tableId: "", sectionId: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const latch = useRef(false);
  const stuck = useStuck();
  const set = (k: keyof Diner) => (x: string) => setV((o) => ({ ...o, [k]: x }));
  async function book() {
    if (latch.current || stuck.isStuck()) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await bookOutsideDiner(code, v);
      onClose({ tone: "ok", title: "Booked", body: `${v.name}, ${v.party} at ${v.time}.` });
    } catch (e) {
      /* A second POST books a second table: no more taps until closed and read again. */
      stuck.stop(e);
      setSaid(failed("Not booked", e, "booked"));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }
  return (
    <BottomSheet open onClose={() => { if (!busy) onClose(); }} title="A table for somebody not staying"
      description="Confirmed as you take it. A hotel guest books from their own page."
      footer={
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn label="Back" style={{ flex: 1 }} tall disabled={busy} onPress={() => onClose()} />
            <Btn primary label="Book the table" style={{ flex: 1 }} tall busy={busy} disabled={stuck.stuck} onPress={() => void book()} />
          </View>
          {stuck.stuck ? <Why>{notKnown("booked", "the table bookings").line}</Why> : null}
        </>
      }>
      <Field label="Name *"><Input value={v.name} onChangeText={set("name")} maxLength={60} autoFocus textContentType="name" autoComplete="name" accessibilityLabel="Name" /></Field>
      <Field label="Phone *"><Input value={v.phone} onChangeText={set("phone")} keyboardType="phone-pad" inputMode="tel" textContentType="telephoneNumber" accessibilityLabel="Phone" /></Field>
      <Field label="People *"><Input value={v.party} onChangeText={set("party")} keyboardType="number-pad" inputMode="numeric" maxLength={2} accessibilityLabel="People" /></Field>
      <DayField label="Day *" value={v.date} onChange={set("date")} step={(by) => set("date")(stepDay(v.date, by, today))} />
      {/* A time picker needs @react-native-community/datetimepicker (9.1.0), not approved: typed as the web's input sends it. */}
      <Field label="Time *" hint="Written 20:30, on the hotel's clock.">
        <Input value={v.time} onChangeText={set("time")} placeholder="20:30" keyboardType="numbers-and-punctuation" maxLength={5} accessibilityLabel="Time" />
      </Field>
      <Field label="Table" hint="If you know it now.">
        <Select label="Table" value={v.tableId} onChange={set("tableId")} options={[{ value: "", label: "Not yet" }, ...tables.map((x) => ({ value: x.id, label: tableLabel(x) }))]} />
      </Field>
      <Field label="Area" hint="Where they would like to sit, with no table yet.">
        <Select label="Area" value={v.sectionId} onChange={set("sectionId")} disabled={Boolean(v.tableId)}
          options={[{ value: "", label: "Anywhere" }, ...sections.map((x) => ({ value: x.id, label: x.name }))]} />
      </Field>
      <Field label="Note"><Input value={v.note} onChangeText={set("note")} maxLength={200} accessibilityLabel="Note" /></Field>
      {said ? <SaidBar said={said} onDone={() => setSaid(null)} /> : null}
    </BottomSheet>
  );
}

/** The web's file (BOOKING_EXPORT), each cell as the screen writes it. */
function exportOf(rows: readonly TableBooking[], from: string): ExportTable {
  return {
    title: "Table bookings",
    subtitle: `From ${from}`,
    columns: ["Date", "Time", "Party", "Guest", "Booking", "Room", "Phone", "Outlet", "Table or area", "Status", "Answer", "Answered by", "Arrived at", "Bill", "Note"],
    rows: rows.map((b) => [
      b.date, b.time, String(b.party), b.guest, b.reference ?? "-", b.room ?? "-", b.phone ?? "-", b.outlet,
      b.table?.label ?? b.section?.name ?? "-", statusOf(b.status).words, b.answer ?? "-", b.answeredBy ?? "-",
      b.arrivedAt ?? "-", b.order?.orderNo ?? "-", b.note ?? "-",
    ]),
  };
}

