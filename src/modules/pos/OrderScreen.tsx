import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import {
  ChevronLeft, CloudOff, Flame, Minus, Pause, Percent, Play, Plus, Receipt, Users, UtensilsCrossed, X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { api, HeldError, send, type Hotel } from "../../core/api";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Capsule, Card, Head, ReadFailed, Row, Screen, useRead } from "../../core/ui";
import {
  addonBreakdown, clearAct, closeButton, discountButton, fewerAct, figures, finished, headerSummary, holdAct, isOpen, kotWords,
  lineActs, lineAmount, lineName, live, orderPath, roundAct, roundButton, sendAct, sendButton, strikeAct, takenAct,
  type Act, type Ask,
} from "./order";
import { CustomiseSheet } from "./OrderCustomise";
import { AskSheet, Btn, DiscountSheet, HeaderSheet, type Outcome } from "./OrderSheets";
import { PayActions, PrintBill } from "./Pay";
import { whyNotRing } from "./roles";
import type { Order as TheOrder, OrderLine } from "./types";

/* ══════════════════════════════════════════════════════════════════
   THE ORDER on a phone — the web's Till order card (src/modules/pos/
   pages/Till.tsx OrderPanel 931-1349), at phone width and unclipped
   (R-15), with the Terminal's kitchen words and Taken per line
   (Terminal.tsx 815-830). Opened from Tables (the web's Eye) at
   /pos/<code>/order/<id>; a new round goes to the order pad.

   THE MONEY IS THE SERVER'S: every figure is a field of the order the
   API sent (./order.ts figures); after each write the server's order
   replaces the one on screen and is read again. Rules: ./order.ts.
   Who may: ./roles.ts, the API's lists and words; a refused button is
   grey and says why when tapped. Held writes (the web's tier "Order")
   are said as held, never as a failure; the bar above counts them.
   Not here: the banquet function picker (FunctionPicker) - MODULE.md.
   ══════════════════════════════════════════════════════════════════ */

/** The web's backstop poll (the floor's 30 s), while this screen is in front. */
const POLL_MS = 30_000;

type Said = { tone: "ok" | "held" | "bad"; title: string; body?: string };
type Asking = { ask: Ask; run: (reason: string) => Promise<Outcome> };

export function Order({ hotel, id, role, onBack }: { hotel: Hotel; id: string; role: string | null; onBack: () => void }) {
  const code = hotel.code;
  const key = ["pos", code, "order", id];
  const cache = useQueryClient();
  const read = useRead(() => api<TheOrder>(orderPath(code, id)), key);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  /* A refused button's reason, under the line or the actions it belongs to. */
  const [why, setWhy] = useState<{ at: string; text: string } | null>(null);
  const [asking, setAsking] = useState<Asking | null>(null);
  const [sheet, setSheet] = useState<"discount" | "header" | null>(null);
  const [customising, setCustomising] = useState<OrderLine | null>(null);
  const [pulled, setPulled] = useState(false);

  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void cache.refetchQueries({ queryKey: ["pos", code, "order", id] });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [cache, code, id]));
  useEffect(() => { if (!read.loading) setPulled(false); }, [read.loading]);
  useEffect(() => {
    if (said?.tone !== "ok") return;
    const timer = setTimeout(() => setSaid(null), 6000);
    return () => clearTimeout(timer);
  }, [said]);

  /** One write through send(): the server's order replaces the one shown,
      everything under ["pos", code] is read again. */
  async function write(act: Act, reason?: string): Promise<Outcome & { kotNo?: number | null }> {
    setBusy(true);
    setWhy(null);
    try {
      const res = await send<TheOrder & { kotNo?: number }>(act.method, act.path, act.body(reason));
      if (res && Array.isArray(res.lines)) cache.setQueryData(key, res);
      void cache.invalidateQueries({ queryKey: ["pos", code] });
      return { done: true, kotNo: res?.kotNo ?? null };
    } catch (e) {
      if (e instanceof HeldError) {
        setSaid({ tone: "held", title: "Saved on this phone", body: e.message });
        return { held: e.message };
      }
      /* An ApiError: the server's own words, or the web's refusal sentence (503). */
      return { refused: e instanceof Error ? e.message : String(e) };
    } finally {
      setBusy(false);
    }
  }

  /** A button's write: asked first when it asks, else at once; a refusal said on the order. */
  function go(act: Act, fail: string, ok?: (out: { kotNo?: number | null }) => Said | null) {
    if (busy) return;
    const run = async (reason?: string) => {
      const out = await write(act, reason);
      if ("done" in out) setSaid(ok ? ok(out) : null);
      return out;
    };
    if (act.ask) { setAsking({ ask: act.ask, run }); return; }
    void run().then((out) => { if ("refused" in out) setSaid({ tone: "bad", title: fail, body: out.refused }); });
  }

  const order = read.data;
  const offline = !isOnline();
  const head = (
    <Head
      eyebrow={hotel.name} title="Till"
      action={<Capsule label="Back" icon={<ChevronLeft size={16} color={c.grey700} />} onPress={onBack} />}
    />
  );

  if (!order) {
    return (
      <Screen refreshing={false} onRefresh={read.reload}>
        {head}
        {!read.error ? <Text style={t.label}>Reading the order…</Text>
          : offline ? (
            <Card style={{ backgroundColor: c.yellow50, borderColor: c.yellow100, gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <CloudOff size={16} color={c.yellow800} />
                <Text style={[t.heading, { color: c.yellow800 }]}>No connection</Text>
              </View>
              <Text style={[t.label, { color: c.grey700 }]}>This order has not been read on this phone yet. It shows once the line is back.</Text>
              <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={read.reload} /></View>
            </Card>
          ) : <ReadFailed what="this order" error={read.error} onRetry={read.reload} />}
      </Screen>
    );
  }

  const open = isOpen(order);
  const lines = live(order);
  const refuse = (at: string) => (text: string) => setWhy({ at, text });
  const send1 = sendButton(order, role);
  const discount = discountButton(order, role);
  const round = roundButton(order, role);
  const close = closeButton(order, role);
  const ringWhy = whyNotRing(role);
  const onChanged = () => { void cache.invalidateQueries({ queryKey: ["pos", code] }); };

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && read.loading} onRefresh={() => { setPulled(true); read.reload(); }}>
        {head}
        {read.error ? (
          <Text style={[t.caption, { color: offline ? c.yellow800 : c.red700 }]} accessibilityRole="alert">
            {offline ? "No connection. Showing the order as last read; pull down to read again."
              : `Could not read the order again: ${read.error} Showing what was last read.`}
          </Text>
        ) : null}

        <Card style={{ paddingHorizontal: 0, paddingVertical: 0 }}>
          {/* The order's number is the card's heading (the web's). */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: space.cardX, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: c.orange50, alignItems: "center", justifyContent: "center" }}>
              <Receipt size={16} color={c.orange700} />
            </View>
            <Text style={[t.heading, t.tab, { flex: 1 }]} numberOfLines={1} accessibilityRole="header">
              {order.orderNo}{order.table ? ` · ${order.table}` : ""}
            </Text>
            <Status status={order.status} />
          </View>

          <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>
            {/* The header: covers, waiter, customer; Hold. */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Pressable
                disabled={!open}
                onPress={() => (ringWhy ? setWhy({ at: "head", text: ringWhy }) : setSheet("header"))}
                accessibilityRole="button" accessibilityLabel={headerSummary(order)} accessibilityState={{ disabled: !open }}
                style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}
              >
                <Users size={14} color={open ? c.orange700 : c.grey500} />
                <Text style={[t.label, { color: open ? c.orange700 : c.grey500, flexShrink: 1 }]}>{headerSummary(order)}</Text>
              </Pressable>
              {order.heldAt ? <Text style={[t.eyebrow, { color: c.orange700 }]}>held</Text> : null}
              <View style={{ flex: 1 }} />
              {open ? (
                <Btn
                  label={order.heldAt ? "Resume" : "Hold"} Icon={order.heldAt ? Play : Pause} kind="ghost" busy={busy}
                  why={ringWhy} onRefused={refuse("head")}
                  onPress={() => go(holdAct(code, order), "Not changed", () => ({ tone: "ok", title: order.heldAt ? "Back on" : "Held" }))}
                />
              ) : null}
            </View>
            {why?.at === "head" ? <Said text={why.text} /> : null}

            {lines.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 20, gap: 8 }}>
                <UtensilsCrossed size={20} color={c.grey300} />
                <Text style={t.label}>Nothing on this bill yet.</Text>
              </View>
            ) : (
              <View style={{ gap: 4 }}>
                {order.lines.map((l) => (
                  <Line
                    key={l.id} line={l} order={order} role={role} busy={busy}
                    why={why?.at === l.id ? why.text : null} onRefused={refuse(l.id)}
                    onCustomise={() => setCustomising(l)}
                    onFewer={() => go(fewerAct(code, order, l), "Not changed")}
                    onStrike={() => go(strikeAct(code, order, l), "Could not strike that line")}
                    onTaken={() => go(takenAct(code, order, l), "Not taken")}
                  />
                ))}
              </View>
            )}

            {open ? (
              <Btn
                label="Add a round" Icon={Plus} why={ringWhy} onRefused={refuse("round")}
                onPress={() => router.push(`/pos/${code}/pad?order=${order.id}${order.table ? `&table=${encodeURIComponent(order.table)}` : ""}`)}
              />
            ) : null}
            {why?.at === "round" ? <Said text={why.text} /> : null}

            {/* The figures, the server's (./order.ts). */}
            <View style={{ borderTopWidth: 1, borderTopColor: c.grey200, paddingTop: 8 }}>
              {figures(order).map((f) => <Row key={f.label} label={f.label} value={f.value} strong={f.strong} />)}
            </View>
            {order.discountReason ? <Text style={t.label}>Discounted - {order.discountReason}</Text> : null}

            {!open ? (
              <View style={{ gap: 8 }}>
                <Text style={t.label}>{finished(order)}</Text>
                {order.status === "settled" ? <PrintBill hotel={hotel} orderId={order.id} /> : null}
                <Btn
                  label="Clear" busy={busy}
                  onPress={() => go(clearAct(code, order), "Not cleared", () => ({ tone: "ok", title: `${order.table ?? order.orderNo} is clear` }))}
                />
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <Btn
                  label={send1.label} Icon={Flame} kind="primary" off={send1.off} why={send1.why} onRefused={refuse("acts")} busy={busy}
                  onPress={() => go(sendAct(code, order), "Not sent", (out) => ({
                    tone: "ok", title: `Order ${out.kotNo ?? "-"} is with the kitchen`, body: "They can start on it now.",
                  }))}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Btn label={discount.label} Icon={Percent} off={discount.off} why={discount.why} onRefused={refuse("acts")} grow
                    onPress={() => setSheet("discount")} />
                  <Btn label={round.label} off={round.off} why={round.why} onRefused={refuse("acts")} busy={busy} grow
                    onPress={() => go(roundAct(code, order), "Not rounded")} />
                </View>
                <PayActions hotel={hotel} order={order} role={role} onChanged={onChanged} />
                <Btn label={close.label} kind="ghost" why={close.why} onRefused={refuse("acts")} busy={busy}
                  onPress={() => go(close.act(code), "Not closed")} />
                {why?.at === "acts" ? <Said text={why.text} /> : null}
              </View>
            )}
          </View>
        </Card>
      </Screen>

      {said ? (
        <Pressable
          onPress={() => setSaid(null)} accessibilityLiveRegion="polite" accessibilityRole={said.tone === "bad" ? "alert" : "text"}
          style={{
            position: "absolute", left: space.side, right: space.side, bottom: 16, borderRadius: 12, borderWidth: 1,
            paddingHorizontal: space.cardX, paddingVertical: 12, gap: 2, ...TONE[said.tone].box,
          }}
        >
          <Text style={[t.label, { ...face[600], color: TONE[said.tone].fg }]}>{said.title}</Text>
          {said.body ? <Text style={[t.caption, { color: TONE[said.tone].fg }]}>{said.body}</Text> : null}
        </Pressable>
      ) : null}

      <AskSheet ask={asking?.ask ?? null} onClose={() => setAsking(null)} onConfirm={(text) => asking!.run(text)} />
      {sheet === "discount" ? <DiscountSheet hotel={hotel} order={order} onClose={() => setSheet(null)} write={write} /> : null}
      {sheet === "header" ? <HeaderSheet hotel={hotel} order={order} onClose={() => setSheet(null)} write={write} /> : null}
      {customising ? (
        <CustomiseSheet hotel={hotel} order={order} line={customising} onClose={() => setCustomising(null)} write={write} />
      ) : null}
    </View>
  );
}

const TONE = {
  ok: { box: { backgroundColor: c.ink900, borderColor: c.ink900 }, fg: c.white },
  held: { box: { backgroundColor: c.yellow50, borderColor: c.yellow100 }, fg: c.yellow800 },
  bad: { box: { backgroundColor: c.red50, borderColor: c.red100 }, fg: c.red700 },
};

const Said = ({ text }: { text: string }) => (
  <Text style={[t.label, { color: c.grey600 }]} accessibilityLiveRegion="polite">{text}</Text>
);

/** open · settled · abandoned, as the web's pill says them. */
function Status({ status }: { status: TheOrder["status"] }) {
  const [bg, fg] = status === "open" ? [c.yellow100, c.yellow800] : status === "settled" ? [c.grey100, c.success600] : [c.grey100, c.grey700];
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: bg }}>
      <Text style={[t.caption, { color: fg, ...face[600] }]}>{status}</Text>
    </View>
  );
}

/** One line: qty × the dish and the server's price; under it its add-ons,
    the kitchen note, where the kitchen has it, and its buttons. A struck
    line stays, struck through (a manager settling a dispute sees it). */
function Line({ line: l, order, role, busy, why, onRefused, onCustomise, onFewer, onStrike, onTaken }: {
  line: OrderLine; order: TheOrder; role: string | null; busy: boolean; why: string | null; onRefused: (why: string) => void;
  onCustomise: () => void; onFewer: () => void; onStrike: () => void; onTaken: () => void;
}) {
  const acts = lineActs(l, order, role);
  const side = l.parentLineId !== null;
  const words = kotWords(l);
  return (
    <View style={{ paddingLeft: side ? 20 : 0, paddingVertical: 4, gap: 4, borderTopWidth: 1, borderTopColor: c.grey100, opacity: l.voided ? 0.45 : 1 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={[t.label, t.tab, { width: 28, color: c.grey500 }]}>{l.qty}×</Text>
        <Text style={[side ? t.label : t.heading, { flex: 1, ...face[500], color: side ? c.grey600 : c.ink900, textDecorationLine: l.voided ? "line-through" : "none" }]}>
          {lineName(l)}
        </Text>
        <Text style={[t.heading, t.tab, face[500]]}>{lineAmount(l)}</Text>
      </View>
      {l.numberedAddons ? <Text style={[t.caption, t.tab, { color: c.grey600, paddingLeft: 36 }]}>{addonBreakdown(l.numberedAddons)}</Text> : null}
      {l.note ? <Text style={[t.caption, { color: c.orange700, paddingLeft: 36 }]}>{l.note}</Text> : null}
      {words ? <Text style={[t.caption, { paddingLeft: 36 }]}>{words}</Text> : null}
      {acts.taken || acts.dish || acts.strike ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 36, flexWrap: "wrap" }}>
          {acts.taken ? (
            <>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: c.grey100 }}>
                <Text style={[t.caption, { color: c.success600, ...face[600] }]}>Ready</Text>
              </View>
              <Btn label="Taken" small a11y={`Taken: ${l.name}`} why={acts.whyNotRing} onRefused={onRefused} busy={busy} onPress={onTaken} />
            </>
          ) : null}
          {acts.dish ? (
            <Btn label="Customise" small a11y={`Customise ${l.name}`} why={acts.whyNotRing} onRefused={onRefused} onPress={onCustomise} />
          ) : null}
          <View style={{ flex: 1 }} />
          {acts.dish ? <Round label={`One fewer ${l.name}`} Icon={Minus} why={acts.whyNotTakeOff} onRefused={onRefused} onPress={onFewer} /> : null}
          {acts.strike ? <Round label={`Strike ${l.name}`} Icon={X} why={acts.whyNotTakeOff} onRefused={onRefused} onPress={onStrike} /> : null}
        </View>
      ) : null}
      {why ? <Said text={why} /> : null}
    </View>
  );
}

/** − and ×: 44px round buttons; refused ones grey, and the tap says why. */
function Round({ label, Icon, why, onRefused, onPress }: {
  label: string; Icon: typeof X; why: string | null; onRefused: (why: string) => void; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => (why ? onRefused(why) : onPress())}
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: why != null }} accessibilityHint={why ?? undefined}
      style={({ pressed }) => ({
        width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
        backgroundColor: why ? c.grey100 : pressed ? c.grey100 : "transparent",
      })}
    >
      <Icon size={18} color={why ? c.grey300 : c.grey600} />
    </Pressable>
  );
}

