import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { ExportButtons } from "../../core/Export";
import { ON_THE_WEBSITE } from "../../core/menu";
import { c, face, t } from "../../core/theme";
import { Head, Screen, s as core, notKnown, useRead } from "../../core/ui";
import { getBackfill, removeBackfill } from "./data";
import { Btn, Empty, Failed, Field, Labelled, Loading, Pill, Refused, Segmented, Sheet, Stale, Toast, body, saidOf, useAct, useSaid, useStop, type Said, type Stop } from "./kit";
import { refusedBackfill } from "./roles";
import {
  DASH, ID_WORDS, dateShort, live, precise, removeWhy, trailWords,
  type BackfillBill, type BackfillCash, type BackfillKind, type BackfillStay, type BackfillView,
} from "./rules";
import type { AdminProps } from "./Route";

/* ══════════════════════════════════════════════════════════════════
   BACKFILL DATA on a phone — the web's Settings → Property → Backfill
   data, and /h/:code/backfill for the Accountant (backfill/BackfillPage.tsx,
   the owner's D27-398). What happened before this hotel's first day: its
   stays, restaurant bills and cash, from the hotel's paper records, kept
   apart from the live books. Not pictured.

   On the phone: the three registers, each line as the server sent it
   (paise kept, a dash for a figure nobody typed), with Remove (a reason,
   asked first; the line stays, marked) for whom the server says may write
   (`mayWrite`), and an export of each. Left on the website: Add and
   Correct (a day to pick, a room, an outlet, a returning guest; the date
   picker is a package not approved) and "Day by day" - the web adds that
   table up in the browser, and the phone never totals money (BRIEF-T3).
   ══════════════════════════════════════════════════════════════════ */

type Tab = "stays" | "bills" | "cash";

export function Backfill({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = refusedBackfill(role);
  const { said, say, close } = useSaid();
  const [tab, setTab] = useState<Tab>("stays");
  const [pulled, setPulled] = useState(false);
  const [removing, setRemoving] = useState<{ kind: BackfillKind; id: string; what: string } | null>(null);
  const key = ["admin", code, "backfill"];
  const [seenAt, setSeenAt] = useState(0);
  const view = useRead(async () => {
    if (refused) return null;
    const started = Date.now();
    const answer = await getBackfill(code);
    setSeenAt(started);
    return answer;
  }, key);
  /* Remove's stop, kept here so closing the sheet does not free it (MADM-3). */
  const stop = useStop(seenAt);
  const refresh = () => void cache.invalidateQueries({ queryKey: key });
  const v = view.data;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && view.loading} onRefresh={() => { setPulled(true); view.reload(); }}>
        <Head title="Backfill data" under="What happened before this hotel's first day in the system: stays, restaurant bills and cash, from the hotel's own records." />
        {refused ? <Refused sentence={refused} /> : v === undefined
          ? (view.error ? <Failed error={view.error} onRetry={view.reload} /> : <Loading what="the backfilled records" />)
          : v === null ? null : (
            <>
              <Stale error={view.error} />
              <View style={[core.card, { gap: 4 }]}>
                <Text style={[body, { color: c.ink900 }]}><Text style={face[600]}>{`First day in the system: ${dateShort(v.firstDay)}.`}</Text> Only what happened before it is entered here; from that day on, use the normal screens.</Text>
                <Text style={[body, { color: c.grey600 }]}>Kept apart from the live books: the night audit, reports, tax invoices, Form C, the cash drawers and Tally never count these. The hotel's own paper bill number is recorded; no new invoice is made.</Text>
              </View>
              <Segmented label="Register" value={tab} onChange={setTab} options={[
                { value: "stays", label: `Stays ${live(v.stays)}` }, { value: "bills", label: `Bills ${live(v.bills)}` }, { value: "cash", label: `Cash ${live(v.cash)}` },
              ]} />
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: "row" }}><Btn variant="primary" disabled label={tab === "stays" ? "Add a stay" : tab === "bills" ? "Add a restaurant bill" : "Add cash in or out"} onPress={() => undefined} /></View>
                <Text style={t.caption}>{v.mayWrite ? `Adding and correcting: ${ON_THE_WEBSITE.toLowerCase()}. Day by day: ${ON_THE_WEBSITE.toLowerCase()} (the website adds it up).` : "Only the owner, an administrator or the general manager enters and corrects these."}</Text>
              </View>
              <ExportButtons table={tableOf(v, tab, hotel.name)} />
              {tab === "stays" ? (v.stays.length === 0 ? <Empty title="No stays backfilled yet." /> : v.stays.map((s) => (
                <Stay key={s.id} s={s} v={v} stuck={stop.stuck} onRemove={() => setRemoving({ kind: "stays", id: s.id, what: `${s.guestName}'s stay` })} />
              ))) : tab === "bills" ? (v.bills.length === 0 ? <Empty title="No restaurant bills backfilled yet." /> : v.bills.map((b) => (
                <Bill key={b.id} b={b} v={v} stuck={stop.stuck} onRemove={() => setRemoving({ kind: "bills", id: b.id, what: `bill ${b.billNumber ?? DASH}` })} />
              ))) : (v.cash.length === 0 ? <Empty title="No cash backfilled yet." /> : v.cash.map((x) => (
                <Cash key={x.id} x={x} v={v} stuck={stop.stuck} onRemove={() => setRemoving({ kind: "cash", id: x.id, what: `the cash line "${x.purpose}"` })} />
              )))}
            </>
          )}
      </Screen>
      {removing ? <Remove stop={stop} code={code} r={removing} onSaid={say} onClose={() => { setRemoving(null); refresh(); }} /> : null}
      <Toast said={said} onClose={close} />
    </View>
  );
}

const struck = (r: { removedAt: string | null }) => (r.removedAt ? { textDecorationLine: "line-through" as const, color: c.grey500 } : null);

function Foot({ r, v, onRemove, stuck }: { r: BackfillStay | BackfillBill | BackfillCash; v: BackfillView; onRemove: () => void; stuck: boolean }) {
  const why = removeWhy(v, r) ?? (stuck ? notKnown("removed", "the register").line : null);
  const trail = trailWords(r);
  return (
    <>
      {trail ? <Text style={[body, { color: c.grey600 }]}>{trail}</Text> : null}
      <View style={{ gap: 4, borderTopWidth: 1, borderColor: c.grey100, paddingTop: 10 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn variant="ghost" label="Correct" disabled onPress={() => undefined} a11y={`Correct: ${ON_THE_WEBSITE}`} />
          <Btn label="Remove" disabled={Boolean(why)} onPress={onRemove} icon={<Trash2 size={16} color={why ? c.grey400 : c.red700} />} />
        </View>
        {why ? <Text style={t.caption}>{why}</Text> : null}
      </View>
    </>
  );
}

function Stay({ s, v, onRemove, stuck }: { s: BackfillStay; v: BackfillView; onRemove: () => void; stuck: boolean }) {
  return (
    <View style={[core.card, { gap: 10 }]}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Text style={[t.label, t.tab, { color: c.ink900 }, struck(s)]}>{`${dateShort(s.arrival)} – ${dateShort(s.departure)} · Room ${s.room}`}</Text>
        {s.removedAt ? <Pill tone="neutral">Removed</Pill> : null}
      </View>
      <Labelled label="Guest">
        <Text style={[body, { color: c.ink900, ...face[600] }]}>{s.guestName}</Text>
        <Text style={[t.caption, { lineHeight: 17 }]}>{`${ID_WORDS[s.idType] ?? s.idType} ${s.idNumber ?? ""}${s.nationality !== "IN" ? ` · ${s.nationality} · ${s.formCReference ? `Form C ${s.formCReference}` : "Form C not recorded"}` : ""}`}</Text>
      </Labelled>
      <Labelled label="Room charges" value={precise(s.roomCharges)} />
      {s.otherCharges !== null ? <Labelled label="Other charges" value={`${precise(s.otherCharges)} ${s.otherChargesFor ?? ""}`.trim()} /> : null}
      <Labelled label="GST" value={precise(s.gst)} />
      <Labelled label="Paid" value={s.paid === null ? DASH : `${precise(s.paid)}${s.paidBy ? ` · ${s.paidBy}` : ""}`} />
      <Labelled label="Hotel's bill" value={s.billNumber ?? DASH} />
      {s.sendBill ? <Pill tone={s.message?.status === "sent" ? "success" : "danger"}>{s.message?.status === "sent" ? `Sent ${s.message.at ?? ""}`.trim() : "Not sent"}</Pill> : null}
      <Foot r={s} v={v} onRemove={onRemove} stuck={stuck} />
    </View>
  );
}

function Bill({ b, v, onRemove, stuck }: { b: BackfillBill; v: BackfillView; onRemove: () => void; stuck: boolean }) {
  return (
    <View style={[core.card, { gap: 10 }]}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Text style={[t.label, t.tab, { color: c.ink900 }, struck(b)]}>{`${dateShort(b.billDate)} · ${b.outlet}`}</Text>
        {b.removedAt ? <Pill tone="neutral">Removed</Pill> : null}
      </View>
      <Labelled label="Hotel's bill" value={b.billNumber ?? DASH} />
      <Labelled label="Before GST" value={precise(b.amount)} />
      <Labelled label="GST" value={precise(b.gst)} />
      <Labelled label="Total" value={precise(b.total)} strong />
      <Labelled label="Paid by" value={b.paidBy ?? DASH} />
      <Labelled label="Note" value={b.note ?? DASH} />
      <Foot r={b} v={v} onRemove={onRemove} stuck={stuck} />
    </View>
  );
}

function Cash({ x, v, onRemove, stuck }: { x: BackfillCash; v: BackfillView; onRemove: () => void; stuck: boolean }) {
  return (
    <View style={[core.card, { gap: 10 }]}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Text style={[t.label, t.tab, { color: c.ink900 }, struck(x)]}>{`${dateShort(x.cashDate)} · ${x.direction === "in" ? "Money in" : "Money out"}`}</Text>
        {x.removedAt ? <Pill tone="neutral">Removed</Pill> : null}
      </View>
      <Labelled label="Amount" value={precise(x.amount)} strong />
      <Labelled label="What for" value={x.purpose} />
      <Labelled label="Who" value={x.person} />
      <Foot r={x} v={v} onRemove={onRemove} stuck={stuck} />
    </View>
  );
}

/** RemoveDialog: the reason asked first; the line stays, marked. */
function Remove({ stop, code, r, onSaid, onClose }: { stop: Stop; code: string; r: { kind: BackfillKind; id: string; what: string }; onSaid: (s: Said) => void; onClose: () => void }) {
  const act = useAct(undefined, stop);
  const [reason, setReason] = useState("");
  const submit = () => act.run(() => removeBackfill(code, r.kind, r.id, reason.trim()), {
    ok: () => { onSaid({ title: "Removed", body: "It stays on the list, marked removed.", tone: "ok" }); onClose(); },
    no: (e) => onSaid(saidOf(e, "Not removed")),
    unknown: (e) => onSaid({ ...notKnown("removed", "the register", e), tone: "bad" }),
  });
  return (
    <Sheet open title={`Remove ${r.what}?`} onClose={onClose} closable={!act.busy}
      description="It stays on the list, marked removed, with your reason. It no longer counts in the summary."
      footer={<>
        <Btn label="Cancel" onPress={onClose} disabled={act.busy} grow />
        <Btn label={act.busy ? "…" : "Remove"} variant="danger" disabled={!reason.trim() || act.busy || act.stuck} onPress={() => void submit()} grow />
      </>}>
      <Field label="Why it is being removed" required multiline maxLength={300} value={reason} onChangeText={setReason} />
      {act.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("removed", "the register").line} Close this to read it again.</Text> : null}
    </Sheet>
  );
}

/** Each register's file, as the web's CSV has it (the trail columns kept). */
function tableOf(v: BackfillView, tab: Tab, hotel: string) {
  const trail = (r: BackfillStay | BackfillBill | BackfillCash) => [r.enteredBy ?? DASH, r.changedBy ?? DASH, r.changeReason ?? DASH, r.removedBy ?? DASH, r.removedReason ?? DASH];
  const TRAIL = ["Entered by", "Corrected by", "Correction reason", "Removed by", "Removal reason"];
  const sub = `${hotel} · before ${dateShort(v.firstDay)}`;
  if (tab === "stays") return {
    title: "Backfill stays", subtitle: sub,
    columns: ["Arrival", "Departure", "Room", "Guest", "ID", "Room charges", "GST", "Other charges", "Paid", "Paid by", "Hotel's bill number", ...TRAIL],
    rows: v.stays.map((s) => [dateShort(s.arrival), dateShort(s.departure), s.room, s.guestName, `${ID_WORDS[s.idType] ?? s.idType} ${s.idNumber ?? ""}`.trim(),
      precise(s.roomCharges), precise(s.gst), precise(s.otherCharges), precise(s.paid), s.paidBy ?? DASH, s.billNumber ?? DASH, ...trail(s)]),
  };
  if (tab === "bills") return {
    title: "Backfill restaurant bills", subtitle: sub,
    columns: ["Date", "Restaurant", "Hotel's bill number", "Before GST", "GST", "Total", "Paid by", "Note", ...TRAIL],
    rows: v.bills.map((b) => [dateShort(b.billDate), b.outlet, b.billNumber ?? DASH, precise(b.amount), precise(b.gst), precise(b.total), b.paidBy ?? DASH, b.note ?? DASH, ...trail(b)]),
  };
  return {
    title: "Backfill cash", subtitle: sub,
    columns: ["Date", "In or out", "Amount", "What for", "Who", ...TRAIL],
    rows: v.cash.map((x) => [dateShort(x.cashDate), x.direction === "in" ? "Money in" : "Money out", precise(x.amount), x.purpose, x.person, ...trail(x)]),
  };
}
