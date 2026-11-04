import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Check, ChevronLeft, DoorClosed, FileText, Inbox, Plus, Receipt, Wrench, X, type LucideIcon,
} from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { api, HeldError, send, type Hotel } from "../../core/api";
import { cash, DASH } from "../../core/format";
import { isOnline, type OutboxEntry } from "../../core/offline";
import { list, subscribe } from "../../core/outbox";
import { c, face, space, t } from "../../core/theme";
import { Capsule, Card, Head, ReadFailed, Screen, useRead } from "../../core/ui";
import { whyNotRepair } from "./roles";
import {
  cancelCostPath, closeBody, closedWords, empty, foot, heldStatus, isClosed, listPath, longDay, meta, ON_WEBSITE, orderPath, paise,
  pills, queued, SAY_WHAT, SENDING, startBody, startLabel, UPDATE_WHO, whyNotCancel, whyNotRecord, whyNotUpdate,
  type RepairCost, type Tone, type View as Which, type WorkOrder, type WorkOrderList,
} from "./workOrders";

/* ══════════════════════════════════════════════════════════════════
   WORK ORDERS on a phone — today's web at phone width (M-11; the picture
   .local/pms-shots/all/11-front-desk-work-orders.png), its code
   src/modules/housekeeping/pages/WorkOrders.tsx and flows/RepairCosts.tsx:
   Open · Closed with their counts, each repair's card, Start / Put back,
   Close as Fixed or Not needed with what was done, Raise one (the repair
   form, /housekeeping/<code>/repair), and Costs for those the API sends
   them to. Rules and words: ./workOrders.ts.
   Where the phone differs (MODULE.md): a held Start or Close is said and
   shown on its card, and the Close dialog shuts (the web says nothing and
   stays busy, PMS R-3); a grey button says why when tapped, the API's
   sentence first, where the web hides it; recording a cost and seeing its
   proof are on the website for now (a photo or a file; no picker here).
   ══════════════════════════════════════════════════════════════════ */

/** The web's tokens (src/styles/theme.css), named for this screen; the core's theme holds them since 4 Nov. */
const web = {
  grey400: c.grey400, success: c.success, success50: c.success50, yellow: c.yellow, red: c.red,
  /** bg-ink-950/25, the dialog's shade. */
  shade: "rgba(1,13,23,0.25)",
};
/** text-sm / text-base's line (21px): the core's t.label sets none. */
const line = { lineHeight: 21 };

type Said = { title: string; body?: string; tone: "ok" | "held" | "bad" };
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const heldSaid = (e: HeldError): Said => ({ title: "Saved on this phone", body: e.message, tone: "held" });

export function WorkOrders({ hotel, role, onBack }: { hotel: Hotel; role: string | null; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const [view, setView] = useState<Which>("open");
  const work = useRead(() => api<WorkOrderList>(listPath(code, view)), ["housekeeping", code, "work-orders", view]);
  const [held, setHeld] = useState<OutboxEntry[]>([]);
  const [closing, setClosing] = useState<WorkOrder | null>(null);
  const [costing, setCosting] = useState<string | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [raiseSaid, setRaiseSaid] = useState<string | null>(null);
  const [pulled, setPulled] = useState(false);
  /* The order whose Start / Put back is on its way: one tap, one change, one key (MHK-W2). */
  const [sending, setSending] = useState<string | null>(null);

  /* What this phone holds. The bar sends it, and re-reads every list when it has. */
  useEffect(() => {
    const read = () => { list().then(setHeld, () => setHeld([])); };
    read();
    return subscribe(read);
  }, []);
  useEffect(() => { if (!work.loading) setPulled(false); }, [work.loading]);
  useEffect(() => {
    if (!said) return;
    const timer = setTimeout(() => setSaid(null), 6000);
    return () => clearTimeout(timer);
  }, [said]);

  const refresh = () => void cache.invalidateQueries({ queryKey: ["housekeeping", code] });

  async function start(o: WorkOrder, status: string) {
    if (sending) return;
    setSending(o.id);
    try {
      await send("PATCH", orderPath(code, o.id), startBody(status));
      refresh();
    } catch (e) {
      setSaid(e instanceof HeldError ? heldSaid(e) : { title: "Not changed", body: message(e), tone: "bad" });
    } finally {
      setSending(null);
    }
  }

  const data = work.data;
  const orders = data?.orders ?? [];
  const offline = !isOnline();
  /* The dialog reads the order from the list, so a cancelled cost shows at once (the web's costingNow). */
  const costingNow = costing ? orders.find((o) => o.id === costing) ?? null : null;

  let body: ReactNode;
  if (!data) {
    body = !work.error ? <Text style={t.label}>Reading the work orders…</Text>
      : offline ? (
        <Card style={{ backgroundColor: c.yellow50, borderColor: c.yellow100, gap: 8 }}>
          <Text style={[t.heading, { color: c.yellow800 }]}>No connection</Text>
          <Text style={[t.label, { color: c.grey700 }]}>The work orders have not been read on this phone yet. They show once the line is back.</Text>
          <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={work.reload} /></View>
        </Card>
      ) : <ReadFailed what="the work orders" error={work.error} onRetry={work.reload} />;
  } else if (orders.length === 0) {
    const e = empty(view, data);
    /* The web's EmptyState: on the page, not on a tile. */
    body = (
      <View style={{ alignItems: "center", paddingVertical: 64, paddingHorizontal: 24 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Inbox size={20} color={web.grey400} />
        </View>
        <Text style={[t.heading, { textAlign: "center" }]}>{e.title}</Text>
        <Text style={[t.label, { color: c.grey500, textAlign: "center", marginTop: 6, lineHeight: 23 }]}>{e.body}</Text>
      </View>
    );
  } else {
    body = orders.map((o) => {
      const h = heldStatus(held, code, o.id);
      return (
        <OrderCard
          key={o.id} o={o} status={h ?? o.status} queued={queued(h)} mayUpdate={data.mayUpdate} sending={sending === o.id}
          onStart={(status) => void start(o, status)} onClose={() => setClosing(o)} onCosts={() => setCosting(o.id)}
        />
      );
    });
  }
  const footing = foot(view, data);

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && work.loading} onRefresh={() => { setPulled(true); work.reload(); }}>
        <Head
          title="Work orders"
          under="What needs fixing. Most of it does not take a room out of service."
          action={<Capsule label="Back" icon={<ChevronLeft size={16} color={c.grey700} />} onPress={onBack} />}
        />

        <View style={{ gap: 6, alignItems: "flex-start", marginBottom: 8 }}>
          <Btn label="Raise one" Icon={Plus} kind="primary" reason={whyNotRepair(role)} a11y="Raise a work order"
            onPress={() => router.push(`/housekeeping/${code}/repair`)} onRefused={setRaiseSaid} />
          {raiseSaid ? <Text style={[t.label, line]} accessibilityLiveRegion="polite">{raiseSaid}</Text> : null}
        </View>

        {/* The web's Segmented: 44px under a finger (its own pointer-coarse). */}
        <View style={{ flexDirection: "row", alignSelf: "flex-start", padding: 3, gap: 2, backgroundColor: c.grey100, borderRadius: 10, marginBottom: 8 }} accessibilityRole="tablist">
          {(["open", "closed"] as const).map((v) => {
            const on = view === v;
            const n = data ? ` ${v === "open" ? data.open : data.closed}` : "";
            return (
              <Pressable
                key={v} onPress={() => setView(v)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                style={[{ minHeight: 44, paddingHorizontal: 12, borderRadius: 7, justifyContent: "center" }, on ? tabOn : null]}
              >
                <Text style={[t.label, t.tab, { color: on ? c.ink900 : c.grey600 }]}>{v === "open" ? "Open" : "Closed"}{n}</Text>
              </Pressable>
            );
          })}
        </View>

        {data && work.error ? (
          <Text style={[t.caption, { color: offline ? c.yellow800 : c.red700 }]} accessibilityRole="alert">
            {offline ? "No connection. Showing the work orders as last read; pull down to read again."
              : `Could not read the work orders again: ${work.error} Showing what was last read.`}
          </Text>
        ) : null}
        {data && !data.mayUpdate ? <Text style={[t.label, line]}>{UPDATE_WHO}</Text> : null}

        {body}
        {footing ? <Text style={[t.label, line, { color: c.grey500, marginTop: 4 }]}>{footing}</Text> : null}
      </Screen>

      {said ? (
        <Pressable
          onPress={() => setSaid(null)} accessibilityLiveRegion="polite" accessibilityRole={said.tone === "bad" ? "alert" : "text"}
          style={{
            position: "absolute", left: space.side, right: space.side, bottom: 16, borderRadius: 12, borderWidth: 1,
            paddingHorizontal: space.cardX, paddingVertical: 12, gap: 2, ...SAID[said.tone].box,
          }}
        >
          <Text style={[t.label, { ...face[600], color: SAID[said.tone].fg }]}>{said.title}</Text>
          {said.body ? <Text style={[t.caption, { color: SAID[said.tone].fg }]}>{said.body}</Text> : null}
        </Pressable>
      ) : null}

      {closing ? (
        <CloseDialog code={code} order={closing} onClose={() => setClosing(null)}
          onDone={(s) => { setClosing(null); setSaid(s); refresh(); }} />
      ) : null}
      {costingNow && data ? (
        <CostsDialog code={code} order={costingNow} mayRecord={data.mayRecordCosts} onClose={() => setCosting(null)} />
      ) : null}
    </View>
  );
}

const tabOn = {
  backgroundColor: c.white, shadowColor: c.ink900, shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1,
};

const SAID = {
  ok: { box: { backgroundColor: c.ink900, borderColor: c.ink900 }, fg: c.white },
  held: { box: { backgroundColor: c.yellow50, borderColor: c.yellow100 }, fg: c.yellow800 },
  bad: { box: { backgroundColor: c.red50, borderColor: c.red100 }, fg: c.red700 },
};

/* ── One repair (the web's OrderCard) ──────────────────────────── */

function OrderCard({ o, status, queued: waiting, mayUpdate, sending, onStart, onClose, onCosts }: {
  o: WorkOrder; status: string; queued: string | null; mayUpdate: boolean; sending: boolean;
  onStart: (status: string) => void; onClose: () => void; onCosts: () => void;
}) {
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => setSaid(null), [status]);
  const m = meta(o);
  const why = whyNotUpdate(mayUpdate, status, sending);
  const costs = o.costs !== undefined;
  const closed = isClosed(o.status);
  return (
    <Card style={[{ gap: 12 }, waiting ? { backgroundColor: c.yellow50, borderColor: c.yellow800 } : null]}>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
          <Wrench size={16} color={c.grey600} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <Text style={[t.label, line, { color: c.ink900 }]}>{o.title}</Text>
            {pills(o, status).map((p) => <Pill key={p.label} tone={p.tone} door={p.door}>{p.label}</Pill>)}
          </View>
          {/* The web links to the item's page; the phone has none yet, so plain words. */}
          {o.equipment ? (
            <Text style={[t.label, line, { color: c.ink900, marginTop: 2 }]}>{o.equipment.name}<Text style={[t.tab, { color: c.grey500 }]}> · {o.equipment.tag}</Text></Text>
          ) : null}
          {o.detail ? <Text style={[t.label, line, { marginTop: 2 }]}>{o.detail}</Text> : null}
          <Text style={[t.label, line, { color: c.grey500, marginTop: 4 }]}>
            {m.head}
            {m.age ? <Text style={m.late ? { color: c.yellow800 } : null}>{m.age}</Text> : null}
            {m.tail}
          </Text>
          {closed && o.resolution ? <Text style={[t.label, line, { marginTop: 2 }]}>{o.resolution}</Text> : null}
          {/* THE MONEY, only where the list sent it; nothing recorded is a dash, never ₹0. */}
          {costs ? <Text style={[t.label, line, t.tab, { color: c.ink900, marginTop: 4 }]}>Cost {cash(o.costTotal)}</Text> : null}
          {waiting ? <Text style={[t.caption, { color: c.yellow800, marginTop: 4 }]}>{waiting}</Text> : null}
        </View>
      </View>

      {costs || !closed ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingLeft: 42 }}>
          {costs ? <Btn label="Costs" Icon={Receipt} a11y={`Costs of ${o.title}`} reason={null} onPress={onCosts} /> : null}
          {!closed ? (
            <>
              <Btn label={startLabel(status)} a11y={`${startLabel(status)}: ${o.title}`} reason={why} onPress={() => onStart(status)} onRefused={setSaid} />
              <Btn label="Close" Icon={Check} a11y={`Close ${o.title}`} reason={why} onPress={onClose} onRefused={setSaid} />
            </>
          ) : null}
        </View>
      ) : null}
      {said ? <Text style={[t.label, line, { paddingLeft: 42 }]} accessibilityLiveRegion="polite">{said}</Text> : null}
    </Card>
  );
}

/* ── Close: Fixed or Not needed, with what was done (the web's CloseDialog) ── */

function CloseDialog({ code, order, onClose, onDone }: {
  code: string; order: WorkOrder; onClose: () => void; onDone: (said: Said) => void;
}) {
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [tapSaid, setTapSaid] = useState<string | null>(null);

  async function finish(status: "done" | "cancelled") {
    const body = closeBody(status, resolution);
    if (!body) return;
    setBusy(true);
    setRefusal(null);
    try {
      await send("PATCH", orderPath(code, order.id), body);
      onDone({ ...closedWords(order, status), tone: "ok" });
    } catch (e) {
      /* Held is never a failure: the dialog shuts and says so (the web stays busy, R-3). */
      if (e instanceof HeldError) onDone(heldSaid(e));
      else setRefusal(message(e));
    } finally {
      setBusy(false);
    }
  }

  const why = busy ? SENDING : resolution.trim() ? null : SAY_WHAT;
  return (
    <Dialog title={order.title} under={order.room ? `Room ${order.room}` : "Not a room"} onClose={onClose}>
      <Field label="What was done" required hint="The line somebody reads the next time this breaks.">
        <TextInput
          value={resolution} onChangeText={(v) => { setResolution(v); setTapSaid(null); }} autoFocus multiline
          accessibilityLabel="What was done" placeholder="Washer replaced." placeholderTextColor={web.grey400} style={[input, { minHeight: 90 }]}
        />
      </Field>
      {order.equipment ? (
        <Text style={[t.label, line]}>Closing it puts {order.equipment.name} ({order.equipment.tag}) back in use - unless another repair on it is still open.</Text>
      ) : null}
      {order.blocksRoom ? (
        <Text style={[t.label, line, { color: c.yellow800 }]}>
          This one took the room out of service. Closing it does not put the room back - do that on the room itself, so somebody decides rather than assuming.
        </Text>
      ) : null}
      {order.costs !== undefined && order.costTotal == null ? (
        <Text style={[t.label, line]}>No cost is recorded yet. A bill that arrives after this is closed can still be recorded under Closed.</Text>
      ) : null}
      {refusal ? <Refused title="Not closed" body={refusal} /> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label="Cancel" tall grow reason={null} onPress={onClose} />
        <Btn label="Not needed" tall a11y="Close it as not needed" reason={why} onPress={() => void finish("cancelled")} onRefused={setTapSaid} />
        <Btn label="Fixed" tall grow kind="primary" a11y="Close it as fixed" reason={why} onPress={() => void finish("done")} onRefused={setTapSaid} />
      </View>
      {tapSaid ? <Text style={[t.label, line]} accessibilityLiveRegion="polite">{tapSaid}</Text> : null}
    </Dialog>
  );
}

/* ── Costs (the web's RepairCosts): only for those the list sent them to ── */

function CostsDialog({ code, order, mayRecord, onClose }: {
  code: string; order: WorkOrder; mayRecord: boolean; onClose: () => void;
}) {
  const cache = useQueryClient();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  /* Which grey button was tapped, and why it is grey. */
  const [tapSaid, setTapSaid] = useState<{ at: string; text: string } | null>(null);
  const costs = order.costs ?? [];

  async function cancel(k: RepairCost) {
    setBusy(true);
    setSaid(null);
    try {
      /* /repair-costs is not held offline (the web's offline.ts): refused at once, in its sentence. */
      await send("POST", cancelCostPath(code, k.id), { reason: why.trim() });
      setSaid({ title: "Cost cancelled", body: "It stays on the record, out of the total.", tone: "ok" });
      setCancelling(null);
      setWhy("");
      void cache.invalidateQueries({ queryKey: ["housekeeping", code] });
    } catch (e) {
      setSaid(e instanceof HeldError ? heldSaid(e) : { title: "Not cancelled", body: message(e), tone: "bad" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={`Costs · ${order.title}`}
      under={order.costTotal == null ? "Nothing recorded yet." : `${cash(order.costTotal)} recorded, each with its proof.`}
      onClose={onClose}
    >
      {costs.length > 0 ? (
        <View style={{ borderWidth: 1, borderColor: c.grey200, borderRadius: 10 }}>
          {costs.map((k, i) => (
            <View key={k.id} style={{ padding: 12, gap: 6, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey200 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", columnGap: 12 }}>
                <Text style={[t.label, line, t.tab, { color: k.cancelled ? c.grey500 : c.ink900 }, k.cancelled ? { textDecorationLine: "line-through" } : null]}>{paise(k.amount)}</Text>
                <Text style={[t.label, line, { color: c.grey500 }]}>{longDay(k.recordedAt)} · {k.recordedBy ?? DASH}</Text>
              </View>
              {k.note ? <Text style={[t.label, line]}>{k.note}</Text> : null}
              {k.cancelled ? <Text style={[t.label, line]}>Cancelled {longDay(k.cancelled.at)} by {k.cancelled.by ?? DASH}: {k.cancelled.reason}</Text> : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Btn label="See the proof" Icon={FileText} reason={ON_WEBSITE} onPress={() => undefined} onRefused={(text) => setTapSaid({ at: k.id, text })} />
                {!k.cancelled && cancelling !== k.id ? (
                  <Btn label="Cancel this cost" kind="ghost" reason={whyNotCancel(mayRecord)} onPress={() => { setCancelling(k.id); setWhy(""); setSaid(null); }}
                    onRefused={(text) => setTapSaid({ at: k.id, text })} />
                ) : null}
              </View>
              {tapSaid?.at === k.id ? <Text style={[t.label, line]} accessibilityLiveRegion="polite">{tapSaid.text}</Text> : null}
              {cancelling === k.id ? (
                <View style={{ gap: 8, paddingTop: 4 }}>
                  <Field label="Why is it cancelled?" required hint="It stays on the record with this reason, out of the total.">
                    <TextInput value={why} onChangeText={setWhy} autoFocus accessibilityLabel="Why is it cancelled?"
                      placeholder="Typed an extra zero" placeholderTextColor={web.grey400} style={[input, { minHeight: 48 }]} />
                  </Field>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Btn label="Keep it" grow reason={null} onPress={() => setCancelling(null)} />
                    <Btn label="Cancel the cost" grow kind="danger" reason={busy ? SENDING : why.trim() ? null : "Why is it cancelled? Say what was wrong with it."}
                      onPress={() => void cancel(k)} onRefused={(text) => setTapSaid({ at: k.id, text })} />
                  </View>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {said ? (said.tone === "bad" ? <Refused title={said.title} body={said.body ?? ""} /> : (
        <View style={{ gap: 2 }} accessibilityLiveRegion="polite">
          <Text style={[t.label, { ...face[600], color: said.tone === "held" ? c.yellow800 : c.ink900 }]}>{said.title}</Text>
          {said.body ? <Text style={[t.label, line]}>{said.body}</Text> : null}
        </View>
      )) : null}

      {/* Recording needs the bill's photo or file as proof (D17-6), and the phone has no picker yet. */}
      <View style={{ gap: 6 }}>
        <Text style={[t.label, { color: c.ink900 }]}>Record a cost</Text>
        <Text style={t.caption}>A photo or screenshot of the bill, the payment or the transaction. A cost is not recorded without it.</Text>
        <View style={{ flexDirection: "row", marginTop: 6 }}>
          <Btn label="Record the cost" tall grow kind="primary" reason={whyNotRecord(mayRecord)} onPress={() => undefined} />
        </View>
        <Text style={[t.label, line]}>{whyNotRecord(mayRecord)}</Text>
      </View>
    </Dialog>
  );
}

/* ── The pieces ────────────────────────────────────────────────── */

const input = {
  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white,
  fontSize: 16, color: c.ink900, textAlignVertical: "top" as const, ...face[500],
};

/** The web's DialogContent: centred, 16px from the sides, a head with its X.
    The X and the shade close it. */
function Dialog({ title, under, onClose, children }: { title: string; under: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, backgroundColor: web.shade, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 32 }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, maxHeight: "100%", width: "100%", maxWidth: 560, alignSelf: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16, paddingLeft: 20, paddingRight: 6, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={t.heading} accessibilityRole="header">{title}</Text>
                <Text style={[t.label, line, { color: c.grey500 }]}>{under}</Text>
              </View>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close"
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginTop: -10 }}>
                <X size={16} color={c.grey500} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The web's Field. */
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>{label}{required ? <Text style={{ color: web.red }}> *</Text> : null}</Text>
      {children}
      {hint ? <Text style={t.caption}>{hint}</Text> : null}
    </View>
  );
}

function Refused({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, backgroundColor: c.red50, borderColor: c.red100, padding: 12, gap: 4 }} accessibilityRole="alert">
      <Text style={[t.label, { ...face[600], color: c.red700 }]}>{title}</Text>
      <Text style={[t.label, line, { color: c.grey700 }]}>{body}</Text>
    </View>
  );
}

/** The web's Button variants (src/components/ui/Button.tsx): fill, pressed, ring, words. */
const KIND = {
  primary: { bg: c.orange600, down: c.orange700, ring: c.orange600, fg: c.white, offBg: c.grey300, offRing: c.grey300, offFg: c.grey600 },
  secondary: { bg: c.white, down: c.grey100, ring: c.grey300, fg: c.ink900, offBg: c.grey50, offRing: c.grey300, offFg: c.grey500 },
  ghost: { bg: "transparent", down: c.grey100, ring: "transparent", fg: c.grey600, offBg: "transparent", offRing: "transparent", offFg: c.grey500 },
  danger: { bg: web.red, down: c.red700, ring: web.red, fg: c.white, offBg: c.grey300, offRing: c.grey300, offFg: c.grey600 },
};

/** A capsule, 44px (`tall`: the dialogs' 48). Grey when `reason` is set: NOT
    `disabled`, because the tap is when a person asks why (the board's Act, D17-8). */
function Btn({ label, Icon, a11y, reason, onPress, onRefused, kind = "secondary", tall, grow }: {
  label: string; Icon?: LucideIcon; a11y?: string; reason: string | null; onPress: () => void;
  onRefused?: (reason: string) => void; kind?: keyof typeof KIND; tall?: boolean; grow?: boolean;
}) {
  const ready = reason == null;
  const k = KIND[kind];
  const fg = ready ? k.fg : k.offFg;
  return (
    <Pressable
      onPress={() => (ready ? onPress() : onRefused?.(reason))}
      accessibilityRole="button" accessibilityLabel={a11y ?? label} accessibilityState={{ disabled: !ready }} accessibilityHint={reason ?? undefined}
      style={({ pressed }) => ({
        minHeight: tall ? 48 : 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center",
        justifyContent: "center", gap: 8, ...(grow ? { flex: 1 } : null),
        borderColor: ready ? k.ring : k.offRing, backgroundColor: !ready ? k.offBg : pressed ? k.down : k.bg,
      })}
    >
      {Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[t.label, { color: fg }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

/** The web's StatusPill (src/components/ui/StatusPill.tsx): tint, ink, dot. */
const PILL: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: c.grey100, fg: c.grey600, dot: web.grey400 },
  info: { bg: c.info50, fg: c.info, dot: c.info },
  success: { bg: web.success50, fg: c.success600, dot: web.success },
  warning: { bg: c.yellow50, fg: c.yellow800, dot: web.yellow },
  danger: { bg: c.red50, fg: c.red700, dot: web.red },
};
function Pill({ tone, door, children }: { tone: Tone; door?: boolean; children: string }) {
  const p = PILL[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: p.bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.dot }} />
      {door ? <DoorClosed size={12} color={p.fg} /> : null}
      <Text style={[t.caption, { color: p.fg }]}>{children}</Text>
    </View>
  );
}
