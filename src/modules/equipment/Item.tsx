import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Archive, ArrowRightLeft, CheckCircle2, Clock, Pencil, Plus, Wrench } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { currentSubject, type Hotel } from "../../core/api";
import type { KeyKeeper } from "../../core/keys";
import { newKey } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Head, notKnown, Screen, useRead } from "../../core/ui";
import { doubtStore, stillUnknown } from "../housekeeping/care";
import { formKeeper } from "../housekeeping/repair";
import { dateTime } from "../night-audit/audit";
import {
  Act, Back, body, Box, Btn, Failed, Hairline, IconChip, Inside, Loading, NotYours, Pill, Stale, Toast, type Said,
} from "../housekeeping/careKit";
import { isClosed, meta, pills, type WorkOrder } from "../housekeeping/workOrders";
import { readEquipmentApprovals, readItem, readRepairs } from "./data";
import { DecideButtons } from "./Decide";
import { EditDialog, MoveDialog, RepairDialog, RetireDialog, StatusDialog, type Done } from "./ItemDialogs";
import {
  actsOf, decisionLine, detailsOf, heldText, historyLine, historyNote, may, namesLine, notesOf, placeText, retireWaits,
  rupees, STATUS_LABEL, STATUS_TONE, whoMay, whyNotReport, type EquipmentItem,
} from "./registerRules";

/* ══════════════════════════════════════════════════════════════════
   ONE THING IN THE REGISTER on a phone - the web's /h/:code/equipment/:id
   (pages/EquipmentItem.tsx, housekeeping's components/ItemRepairs.tsx). No
   picture was taken of it: built from the code.
   What it is, where, what it cost, and everything that has happened to it,
   newest first (names only for those who may approve - the server sends a
   dash otherwise). A request that waits in the one approvals inbox is shown
   beside it, decided through the app's Approvals (Decide.tsx). Change
   details · Move (Ask to take out, for somebody who may only look and the
   thing is in a store) · Under repair / Back in use · Retire - grey with
   why when locked or not this person's. Its repairs: housekeeping's work
   orders on it, each with the server's cost where the list sends money;
   Report a repair (a tagged thing only). The web's "Cost recorded" total
   is a browser sum of the repairs' costs: the phone shows each repair's
   own (MODULE.md). Costs and their proofs stay in Work orders.
   ══════════════════════════════════════════════════════════════════ */

type Open = "edit" | "move" | "status" | "retire" | "repair" | null;

/** Each item's doubt and its repair's key, by hotel and item: outside React (the money review, 20 Nov). */
const DOUBTS = doubtStore<{ lostAt: number | null; repair: KeyKeeper | null }>();
const fresh = () => ({ lostAt: null, repair: null });

export function Item({ hotel, role, id, onBack }: { hotel: Hotel; role: string | null; id: string; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  /* Stamped with when the read BEGAN: an unknown outcome waits for a read begun after it (H3). */
  const q = useRead(async () => { const began = Date.now(); return { began, ...(await readItem(code, id)) }; }, ["equipment", code, "item", id]);
  /* What is in doubt is read from DOUBTS (outside React, by hotel and item), never this screen's
     state: leaving and coming back keeps the stop and the repair's key (the money review, 20 Nov). */
  const at = `${code}/${id}`;
  const [, redraw] = useState(0);
  const lostAt = DOUBTS.get(at)?.lostAt ?? null;
  const lost = stillUnknown(lostAt, q.data?.began);
  const setLostAt = (when: number) => { DOUBTS.keep(at, fresh); DOUBTS.lost(at, when); redraw((n) => n + 1); };
  /* The repair's one key: kept across reopening until a read begun after a lost reply has come
     back (POST /work-orders reads it; the review's H4). */
  const repairKeeper = () => { const e = DOUBTS.keep(at, fresh); return e.repair ?? (e.repair = formKeeper(newKey(), currentSubject)); };
  const inbox = useRead(() => readEquipmentApprovals(code), ["equipment", code, "approvals"]);
  const [open, setOpen] = useState<Open>(null);
  useEffect(() => { if (lostAt !== null && !lost && open === null && DOUBTS.settle(at, q.data?.began)) redraw((n) => n + 1); }, [at, lostAt, lost, open, q.data?.began]);
  const [pulled, setPulled] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const unsay = useCallback(() => setSaid(null), []);
  useEffect(() => { if (!q.loading) setPulled(false); }, [q.loading]);

  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ["equipment", code] });
    void cache.invalidateQueries({ queryKey: ["approvals", code] });
    void cache.invalidateQueries({ queryKey: ["housekeeping", code] });
  };
  const done = (d: Done) => {
    setOpen(null);
    /* Landed (or held with its key): this repair's key, and any doubt, are over. */
    if (open === "repair") DOUBTS.drop(at);
    setSaid(d.said);
    refresh();
    /* Part of a count went elsewhere as its own line: that line is what was just acted on. */
    if (d.landedOn !== id) router.replace(`/equipment/${code}/${d.landedOn}`);
  };
  /* A dialog closed after an unknown outcome reads the item again (MGS-3). */
  const close = () => { setOpen(null); refresh(); };

  const data = q.data;
  const refused = !data && q.error && /is for .*Ask one of them\.$/.test(q.error) ? q.error : null;

  if (!data) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title="Equipment" action={<Back onPress={onBack} />} />
        {refused ? <NotYours title="Equipment" sentence={refused} />
          : q.error ? <Failed title="This item could not be opened" error={q.error} onRetry={q.reload} />
            : <Loading words="Reading the item…" />}
      </Screen>
    );
  }

  const { item, history } = data;
  const acts = actsOf(item, role);
  /* Not known whether the last change was made: every act waits for the item read again. */
  const lostLine = lost ? notKnown("made", "this item once it is read again (pull down)").line : null;
  const approvalFor = (approvalId: string) => inbox.data?.find((a) => a.id === approvalId);

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); inbox.reload(); }}>
        <Head title={item.name} under={`${heldText(item)} · ${placeText(item)}${item.category ? ` · ${item.category}` : ""}`} action={<Back onPress={onBack} />} />
        <Pill tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Pill>
        <Stale error={q.error} />

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Btn label="Change details" icon={Pencil} disabled={acts.edit !== null || lost} onPress={() => setOpen("edit")} />
            <Btn label={acts.moveLabel} icon={ArrowRightLeft} disabled={acts.move !== null || lost} onPress={() => setOpen("move")} />
            <Btn label={acts.statusLabel} icon={item.status === "under_repair" ? CheckCircle2 : Wrench} disabled={acts.edit !== null || lost} onPress={() => setOpen("status")} />
            <Btn label="Retire" icon={Archive} disabled={acts.edit !== null || lost} onPress={() => setOpen("retire")} />
          </View>
          {/* One sentence for the grey ones, the web's line under the head. */}
          {lostLine ? <Text style={[body, { color: c.yellow800 }]} accessibilityRole="alert">{lostLine}</Text> : null}
          {acts.line ? <Text style={[body, { color: c.grey600 }]}>{acts.line}</Text> : null}
        </View>

        {notesOf(item).map((n) => {
          const approvalId = n.key === "leaving" ? item.leaving?.approvalId : n.key === "retireRequest" ? item.retireRequest?.approvalId : undefined;
          return (
            <View key={n.key} style={{ borderRadius: 12, borderWidth: 1, paddingHorizontal: space.cardX, paddingVertical: 14,
              borderColor: n.warm ? c.yellow100 : c.grey200, backgroundColor: n.warm ? c.yellow50 : c.white }}>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                {n.warm ? <IconChip Icon={Clock} tone="yellow" /> : null}
                <Text style={[body, { flex: 1, color: c.ink900 }]}><Text style={face[600]}>{n.title}</Text>{` ${n.text}`}</Text>
              </View>
              {approvalId ? (
                <>
                  {!approvalFor(approvalId) && inbox.data ? <Text style={[body, { color: c.grey600, marginTop: 6 }]}>{`It waits for the ${whoMay("approve")}.`}</Text> : null}
                  <DecideButtons code={code} approval={approvalFor(approvalId)} loading={inbox.loading && !inbox.data}
                    approveLabel={n.key === "leaving" ? "Approve - let it go" : "Approve - retire it"} onDone={(s) => { setSaid(s); refresh(); }} />
                </>
              ) : null}
            </View>
          );
        })}

        <Box>
          <Inside style={{ paddingBottom: 6 }}><Text style={t.heading} accessibilityRole="header">Details</Text></Inside>
          <Inside style={{ paddingTop: 0, gap: 0 }}>
            {detailsOf(item, hotel.businessDate).map((d, i) => (
              <View key={d.label} style={{ flexDirection: "row", gap: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey100 }}>
                <Text style={[t.label, { width: 130, color: c.grey500 }]}>{d.label}</Text>
                <Text style={[t.label, t.tab, { flex: 1, color: d.value === "-" ? c.grey500 : c.ink900 }]}>{d.value}</Text>
              </View>
            ))}
            {item.splitFrom ? (
              <View style={{ flexDirection: "row", gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.grey100 }}>
                <Text style={[t.label, { width: 130, color: c.grey500 }]}>Came from</Text>
                <Text style={[t.label, { flex: 1, color: c.orange700 }]} accessibilityRole="link" onPress={() => router.push(`/equipment/${code}/${item.splitFrom}`)}>the line it was taken from</Text>
              </View>
            ) : null}
          </Inside>
        </Box>

        <Box>
          <Inside style={{ paddingBottom: 6 }}><Text style={t.heading} accessibilityRole="header">What has happened to it</Text></Inside>
          <Inside style={{ paddingTop: 0, gap: 0 }}>
            {history.length === 0 ? <Text style={body}>Nothing is recorded yet.</Text> : history.map((h, i) => {
              const dl = decisionLine(h, dateTime);
              const note = historyNote(h);
              return (
                <View key={h.id} style={{ paddingVertical: 10, gap: 2, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey100 }}>
                  <Text style={[body, { color: c.ink900 }]}>{historyLine(h, item)}</Text>
                  {note ? <Text style={[body, { color: c.grey600 }]}>{note}</Text> : null}
                  <Text style={[t.caption]}>{`${dateTime(h.at)} · ${h.who ?? "-"}`}</Text>
                  {dl ? <Text style={[body, { color: dl.waiting ? c.yellow800 : c.grey600 }]}>{dl.text}</Text> : null}
                </View>
              );
            })}
            {!may(role, "approve") ? (
              <Text style={[t.caption, { borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 10, marginTop: 4 }]}>{namesLine()}</Text>
            ) : null}
          </Inside>
        </Box>

        <Repairs code={code} item={item} role={role} onReport={() => setOpen("repair")} />
      </Screen>
      <Toast said={said} onClose={unsay} />

      {open === "edit" ? <EditDialog code={code} hotel={hotel} item={item} onClose={close} onDone={done} onLost={setLostAt} /> : null}
      {open === "move" ? <MoveDialog code={code} item={item} mayEdit={may(role, "edit")} onClose={close} onDone={done} onLost={setLostAt} /> : null}
      {open === "status" ? <StatusDialog code={code} item={item} onClose={close} onDone={done} onLost={setLostAt} /> : null}
      {open === "retire" ? <RetireDialog code={code} item={item} waits={retireWaits(item, role)} onClose={close} onDone={done} onLost={setLostAt} /> : null}
      {open === "repair" ? <RepairDialog code={code} item={item} keeper={repairKeeper()} onClose={close} onDone={done} onLost={setLostAt} /> : null}
    </View>
  );
}

/* ── Its repairs (housekeeping's ItemRepairs, its pieces by import) ── */

function Repairs({ code, item, role, onReport }: { code: string; item: EquipmentItem; role: string | null; onReport: () => void }) {
  const repairs = useRead(() => readRepairs(code, item.id), ["housekeeping", code, "item-repairs", item.id]);
  const orders = repairs.data?.orders;
  const why = whyNotReport(item, role);
  return (
    <Box>
      <Inside>
        <Text style={t.heading} accessibilityRole="header">Repairs</Text>
        <Text style={[body, { color: c.grey500 }]}>Every repair on it, open and closed.</Text>
        <Act label="Report a repair" icon={Plus} reason={why} onPress={onReport} />
      </Inside>
      <Hairline />
      <Inside>
        {!orders ? (
          repairs.error ? <Failed title="Its repairs did not load" error={repairs.error} onRetry={repairs.reload} /> : <Loading words="Reading its repairs…" />
        ) : orders.length === 0 ? (
          <Text style={body}>No repair has been recorded on it.</Text>
        ) : orders.map((o) => <RepairLine key={o.id} o={o} />)}
      </Inside>
    </Box>
  );
}

function RepairLine({ o }: { o: WorkOrder }) {
  const m = meta(o);
  return (
    <View style={{ borderLeftWidth: 2, borderLeftColor: c.grey200, paddingLeft: 12, gap: 4 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <Text style={[body, { color: c.ink900, fontSize: 16 }]}>{o.title}</Text>
        {pills(o, o.status).map((p) => <Pill key={p.label} tone={p.tone}>{p.label}</Pill>)}
      </View>
      {isClosed(o.status) && o.resolution ? <Text style={[body, { color: c.grey600 }]}>{o.resolution}</Text> : null}
      <Text style={[t.caption]}>{`${m.head}${m.age ?? ""}${m.tail}`}</Text>
      {/* The money only where the list sent it: the server's figure, a dash for none. */}
      {o.costs !== undefined ? <Text style={[t.label, t.tab, { color: c.ink900 }]}>{`Cost ${rupees(o.costTotal ?? null)}`}</Text> : null}
    </View>
  );
}
