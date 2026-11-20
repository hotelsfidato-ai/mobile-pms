import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { ArrowLeft, BedDouble, ChevronRight, Lock, ShoppingBag, UtensilsCrossed } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, Pressable, Text, View } from "react-native";
import { api, ApiError, HeldError, outcomeUnknown, send, type Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { notKnown, Screen, useScreenStop } from "../../core/ui";
import { parcelsStop } from "./floor";
import { Btn, Field, Input, ReadProblem, Refused, SaidBar, Stale, ty, useAccess, web, type Said } from "./TablesKit";
import {
  activeOutlets, declineTitle, guestDishes, guestTitle, lockedLine, openBody, orderHref, outletKey, outletName, precise, ringWhy,
  roomLine, terminalLine, terminalRowLine, tillLists, type GuestOrder, type PosOutlet, type TillRow,
} from "./till";
import { goToOrder, KotStrip, NewParcelSheet, Problem, ripple, shade, TillSheet } from "./TillKit";
import type { Order } from "./types";

/* ══════════════════════════════════════════════════════════════════
   THE TERMINAL on a phone — the web's /pos/:code/terminal (src/modules/
   pos/pages/Terminal.tsx, inside PosGate), drawn to its picture (M-11:
   reference/pms-shots/all/44, new/n-pos-terminal: the outlet's choice).

   The same till on a fixed screen: ONE OUTLET, chosen once and kept on
   this device; no frame (core menu.ts coversTheFrame); thumb-sized
   buttons. It writes through the same routes as the Till - "a terminal
   that could do something the till could not would be a second system".
   On the phone its bill pane is the order screen (OrderScreen.tsx,
   /pos/:code/order/:id, with Pay.tsx) and its menu the order pad
   (OrderPad.tsx): an opened order opens there, as the Till's does.

   Reads: GET /pos/outlets, GET /till/orders (every 30 s while on screen:
   "a terminal is left running"), GET /till/guest-orders (every 20 s, as
   GuestOrders.tsx), GET /guest-preferences, GET /till/kot-setup.
   Writes, through send(): POST /till/orders (Open the order, New parcel;
   tier "Order", held offline; no key: one tap one order, stuck after an
   unknown outcome), POST /till/orders/batch {guestOrderId} (Accept and
   send; the server refuses a second), POST /till/guest-orders/:id/decline
   (refused offline: not on the web's list).
   ══════════════════════════════════════════════════════════════════ */

const POLL_MS = 30_000;
const GUEST_MS = 20_000;

export function Terminal({ hotel, role, onConsole }: { hotel: Hotel; role: string | null; onConsole: () => void }) {
  const code = hotel.code;
  const access = useAccess(code);
  /* undefined while this device is asked; null when it has no answer yet. */
  const [outlet, setOutlet] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(outletKey(code)).then((v) => { if (live) setOutlet(v); }, () => { if (live) setOutlet(null); });
    return () => { live = false; };
  }, [code]);
  const choose = (o: string | null) => {
    setOutlet(o);
    void (o ? AsyncStorage.setItem(outletKey(code), o) : AsyncStorage.removeItem(outletKey(code))).catch(() => {});
  };

  /* posBridge.ts listPosOutlets: a 404 is no outlets (fetchOr). */
  const outlets = useQuery({
    queryKey: ["pos", code, "terminal", "outlets"],
    queryFn: async () => {
      try { return await api<PosOutlet[]>(`/api/hotels/${code}/pos/outlets`); } catch (e) {
        if (e instanceof ApiError && e.status === 404) return [];
        throw e;
      }
    },
  });

  if (access.isLoading || (access.data && !access.data.ok) || outlet === undefined) {
    return (
      <Screen refreshing={false} onRefresh={() => void access.refetch()}>
        <Text style={t.title} accessibilityRole="header">Terminal</Text>
        {access.data && !access.data.ok
          ? <Refused store title="The point of sale is not open to you here" reason={access.data.reason} />
          : <View style={{ height: 160, borderRadius: 12, backgroundColor: c.grey100 }} accessibilityLabel="Reading the terminal" />}
      </Screen>
    );
  }

  if (!outlet) {
    const active = activeOutlets(outlets.data ?? []);
    return (
      <Screen refreshing={false} onRefresh={() => void outlets.refetch()}>
        <View style={{ paddingTop: 24, gap: 8 }}>
          <Text style={[t.caption, ty.xs, { textTransform: "uppercase", letterSpacing: 0.5 }]}>Terminal setup</Text>
          <Text style={t.title} accessibilityRole="header">Terminal</Text>
          <Text style={[t.label, ty.md, { color: c.grey600 }]}>
            Which outlet is this terminal in? Asked once. This screen is meant to stay open on a fixed terminal, so the answer is remembered on this device rather than on the person signed into it.
          </Text>
        </View>
        {outlets.data === undefined ? (
          outlets.error ? <ReadProblem error={outlets.error} what="the outlets" onRetry={() => void outlets.refetch()} />
            : <View style={tile}><Text style={[t.label, ty.md, { textAlign: "center", color: c.grey500 }]}>Loading the outlets…</Text></View>
        ) : active.length === 0 ? (
          <View style={[tile, { alignItems: "center", gap: 8 }]}>
            <UtensilsCrossed size={24} color={c.grey300} />
            <Text style={[t.heading, { textAlign: "center" }]}>No outlet is configured</Text>
            <Text style={[t.label, ty.md, { textAlign: "center", color: c.grey500 }]}>A terminal has nothing to sell from until this property has an outlet.</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {active.map((o) => (
              <Pressable
                key={o.code} onPress={() => choose(o.code)} android_ripple={ripple}
                accessibilityRole="button" accessibilityLabel={`${o.name}, ${o.code}`}
                style={({ pressed }) => [tile, { minHeight: 80, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: shade(pressed) }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[t.heading, { fontSize: 18 }]}>{o.name}</Text>
                  <Text style={[t.label, ty.md, t.tab, { color: c.grey500 }]}>{o.code}</Text>
                </View>
                <ChevronRight size={20} color={web.grey400} />
              </Pressable>
            ))}
          </View>
        )}
        <Pressable onPress={onConsole} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start", marginTop: 12 }}>
          <Text style={[t.label, ty.md, { color: c.orange700 }]}>← Back to the console</Text>
        </Pressable>
      </Screen>
    );
  }

  return <TheTerminal hotel={hotel} role={role} outlet={outlet} outlets={outlets.data} onConsole={onConsole} onChange={() => choose(null)} />;
}

const tile = { backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, padding: 20 };

/** The terminal itself, its outlet chosen: start an order, or open one. */
function TheTerminal({ hotel, role, outlet, outlets, onConsole, onChange }: {
  hotel: Hotel; role: string | null; outlet: string; outlets: PosOutlet[] | undefined; onConsole: () => void; onChange: () => void;
}) {
  const code = hotel.code;
  const cache = useQueryClient();
  /* An order or a parcel whose outcome is unknown (MPOS-U1): let go by a read of the open orders begun after it. */
  const opening = useScreenStop(parcelsStop(code, outlet));
  const orders = useQuery({
    queryKey: ["pos", code, "till", "orders"],
    queryFn: opening.watch(() => api<{ businessDate: string; orders: TillRow[] }>(`/api/hotels/${code}/till/orders`)),
  });
  const [said, setSaid] = useState<Said | null>(null);
  const [parcel, setParcel] = useState(false);
  const [pulled, setPulled] = useState(false);
  const [visit, setVisit] = useState(0);
  const refresh = useCallback(() => { void cache.invalidateQueries({ queryKey: ["pos", code] }); }, [cache, code]);
  useFocusEffect(useCallback(() => {
    setVisit((v) => v + 1);
    void cache.invalidateQueries({ queryKey: ["pos", code, "till"] });
    void cache.invalidateQueries({ queryKey: ["pos", code, "terminal"] });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void cache.refetchQueries({ queryKey: ["pos", code, "till", "orders"] });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [cache, code]));
  useEffect(() => { if (!orders.isFetching) setPulled(false); }, [orders.isFetching]);
  useEffect(() => {
    if (!said || said.tone === "bad") return;
    const timer = setTimeout(() => setSaid(null), 6000);
    return () => clearTimeout(timer);
  }, [said]);

  const name = outletName(outlets, outlet);
  /* Every open order, as the web's (Terminal.tsx 420): not only this outlet's. */
  const open = tillLists(orders.data?.orders ?? []).open;
  const opened = (order: Order) => { refresh(); goToOrder(code, order); };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: space.side, minHeight: 64, borderBottomWidth: 1, borderBottomColor: c.grey200, backgroundColor: c.white }}>
        <UtensilsCrossed size={20} color={c.orange} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[t.heading, { fontSize: 18 }]} numberOfLines={1} accessibilityRole="header">{name}</Text>
          <Text style={[t.caption, ty.xs, t.tab]}>{terminalLine(open.length, orders.data?.businessDate)}</Text>
        </View>
        <Pressable
          onPress={onConsole} android_ripple={ripple} accessibilityRole="button" accessibilityLabel="Console"
          style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: c.grey300, backgroundColor: shade(pressed), flexDirection: "row", alignItems: "center", gap: 8, overflow: "hidden" })}
        >
          <ArrowLeft size={16} color={c.ink900} />
          <Text style={[t.label, ty.md, { color: c.ink900 }]}>Console</Text>
        </Pressable>
      </View>

      <Screen refreshing={pulled && orders.isFetching} onRefresh={() => { setPulled(true); refresh(); }}>
        {orders.error && orders.data !== undefined ? (
          <Stale error={orders.error} loadedAt={orders.dataUpdatedAt} onRetry={() => void orders.refetch()} />
        ) : null}
        <KotStrip code={code} role={role} onSay={setSaid} />

        {/* Guests' room-service orders first: they are waiting on somebody (D27-224). */}
        <GuestOrders code={code} role={role} onSay={setSaid} onAccepted={(id) => { refresh(); router.push(orderHref(code, id)); }} />

        <StartBig
          key={visit} code={code} outlet={outlet} role={role} onOpened={opened} onSay={setSaid}
          onParcel={() => { setSaid(null); setParcel(true); }}
        />

        {orders.isLoading ? (
          <View style={{ height: 160, borderRadius: 12, backgroundColor: c.grey100 }} accessibilityLabel="Reading the open orders" />
        ) : orders.data === undefined && orders.error ? (
          <ReadProblem error={orders.error} what="the open orders" onRetry={() => void orders.refetch()} />
        ) : null}

        {open.length > 0 ? (
          <View style={{ gap: 8, marginTop: 12 }}>
            <Caps>Open orders</Caps>
            {open.map((o) => (
              <Pressable
                key={o.id} onPress={() => router.push(orderHref(code, o.id))} android_ripple={ripple}
                accessibilityRole="button" accessibilityLabel={`${o.orderNo}, ${terminalRowLine(o)}, ${precise(o.gross)}`}
                style={({ pressed }) => ({
                  minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 12,
                  borderWidth: 1, borderColor: c.grey200, backgroundColor: shade(pressed), overflow: "hidden",
                })}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[t.label, ty.md, t.tab, { color: c.ink900 }]}>{o.orderNo}</Text>
                  <Text style={[t.caption, ty.xs]}>{terminalRowLine(o)}</Text>
                </View>
                <Text style={[t.label, ty.md, t.tab, { color: c.ink900 }]}>{precise(o.gross)}</Text>
                <ChevronRight size={20} color={web.grey400} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </Screen>

      <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: space.side, borderTopWidth: 1, borderTopColor: c.grey200, backgroundColor: c.grey50 }}>
        <Lock size={12} color={web.grey400} />
        <Text style={[t.caption, ty.xs, { flex: 1 }]} numberOfLines={2}>{lockedLine(name)}</Text>
        <Pressable onPress={onChange} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={[t.caption, ty.xs, { ...face[500], color: c.orange700 }]}>Change outlet</Text>
        </Pressable>
      </View>

      {said ? <SaidBar said={said} onDone={() => setSaid(null)} style={{ position: "absolute", left: space.side, right: space.side, bottom: 60 }} /> : null}

      {parcel ? (
        <NewParcelSheet
          code={code} outlet={outlet}
          onCancel={() => { setParcel(false); refresh(); }}
          onHeld={(word) => { setParcel(false); setSaid(word); }}
          onOpened={(order, who) => {
            setParcel(false);
            setSaid({ title: `Parcel for ${who}`, body: "Add the dishes and send them to the kitchen.", tone: "ok" });
            opened(order);
          }}
        />
      ) : null}
    </View>
  );
}

const Caps = ({ children }: { children: ReactNode }) => (
  <Text style={[t.caption, ty.xs, { textTransform: "uppercase", letterSpacing: 0.5 }]} accessibilityRole="header">{children}</Text>
);

/** A thumb's button: 64 px (the terminal is jabbed at across a counter). */
function Big({ label, onPress, primary, busy, off, hint, icon }: {
  label: string; onPress: () => void; primary?: boolean; busy?: boolean; off?: boolean; hint?: string; icon?: ReactNode;
}) {
  const fg = primary ? (off ? c.grey600 : c.white) : off ? c.grey500 : c.ink900;
  return (
    <Pressable
      onPress={onPress} disabled={busy} android_ripple={ripple} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}
      accessibilityState={{ disabled: Boolean(off || busy), busy: Boolean(busy) }}
      style={({ pressed }) => ({
        minHeight: 64, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden",
        backgroundColor: primary ? (off ? c.grey300 : pressed && !ripple ? c.orange700 : c.orange600) : off ? c.grey50 : shade(pressed),
        borderWidth: primary ? 0 : 1, borderColor: c.grey300, opacity: busy ? 0.7 : 1,
      })}
    >
      {busy ? <ActivityIndicator color={fg} /> : icon}
      <Text style={[{ fontSize: 18, lineHeight: 26 }, face[600], { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Start an order on the terminal's outlet (Terminal.tsx 542-570). One tap,
    one order; after an unknown outcome, no more until this screen is left
    and the list read again (MEMORY 16, the Till's rule). */
function StartBig({ code, outlet, role, onOpened, onSay, onParcel }: {
  code: string; outlet: string; role: string | null; onOpened: (order: Order) => void; onSay: (said: Said) => void; onParcel: () => void;
}) {
  const [table, setTable] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const inFlight = useRef(false);
  /* Kept by the outlet, outside this card (MPOS-U1): leaving the screen and coming back lets nothing go;
     a read of the open orders begun after the loss does. */
  const once = useScreenStop(parcelsStop(code, outlet));
  const where = "the open orders below - they are read again by pulling down";
  const unknown = notKnown("opened", where);
  const why = ringWhy(role);

  async function start() {
    if (why) { setProblem(why); return; }
    if (once.isStuck()) { setProblem(unknown.line); return; }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const order = await once.guard(() => send<Order & { ok: true }>("POST", `/api/hotels/${code}/till/orders`, openBody(outlet, table)));
      setTable("");
      onOpened(order);
    } catch (e) {
      if (e instanceof HeldError) { setTable(""); onSay({ title: "Saved on this phone", body: e.message, tone: "held" }); }
      else if (once.stop(e)) setProblem(`${unknown.title}. ${notKnown("opened", where, e).body}`);
      else setProblem(`Could not open. ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      <Caps>Start an order</Caps>
      <Input
        value={table} onChangeText={setTable} placeholder="Table 4" accessibilityLabel="Table, or where the food is going"
        autoCapitalize="characters" autoCorrect={false} returnKeyType="go" onSubmitEditing={() => void start()}
        style={{ minHeight: 64, paddingHorizontal: 16, fontSize: 18 }}
      />
      <Big label="Open the order" primary busy={busy} off={why != null || once.stuck} hint={why ?? (once.stuck ? unknown.line : undefined)} onPress={() => void start()} />
      <Big label="New parcel" icon={<ShoppingBag size={20} color={why || once.stuck ? c.grey500 : c.ink900} />} off={why != null || once.stuck} hint={why ?? (once.stuck ? unknown.line : undefined)}
        onPress={() => (why ? setProblem(why) : once.isStuck() ? setProblem(unknown.line) : onParcel())} />
      {problem ? <Problem text={problem} /> : null}
    </View>
  );
}

/* ── Room-service orders waiting (components/GuestOrders.tsx, D27-224) ──
   An order from a guest's own page waits here until whoever rings the
   till answers it. Its total is not drawn: the web adds the basket up in
   the browser, and the phone never totals (MODULE.md). */

function GuestOrders({ code, role, onSay, onAccepted }: {
  code: string; role: string | null; onSay: (said: Said) => void; onAccepted: (orderId: string) => void;
}) {
  const cache = useQueryClient();
  const list = useQuery({
    queryKey: ["pos", code, "terminal", "guest-orders"],
    queryFn: async () => (await api<{ orders: GuestOrder[] }>(`/api/hotels/${code}/till/guest-orders`)).orders,
    refetchInterval: GUEST_MS,
  });
  /* The guest in that room: food and allergy (RoomPreferences); a refusal is no preferences. */
  const prefs = useQuery({
    queryKey: ["pos", code, "terminal", "preferences"],
    queryFn: async () => (await api<{ stays: unknown }>(`/api/hotels/${code}/guest-preferences`)).stays,
    staleTime: 60_000,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [declining, setDeclining] = useState<GuestOrder | null>(null);
  const writing = useRef(new Set<string>());
  const why = ringWhy(role);
  const orders = list.data ?? [];
  if (orders.length === 0) return null;

  const done = () => void cache.invalidateQueries({ queryKey: ["pos", code, "terminal", "guest-orders"] });
  async function accept(o: GuestOrder) {
    if (why) { onSay({ title: "Not accepted", body: why, tone: "bad" }); return; }
    if (writing.current.has(o.id)) return;
    writing.current.add(o.id);
    setBusy(o.id);
    try {
      const order = await send<Order & { ok: true }>("POST", `/api/hotels/${code}/till/orders/batch`, { guestOrderId: o.id });
      onSay({ title: "Sent to the kitchen", body: "A room-service order for the guest's room.", tone: "ok" });
      onAccepted(order.id);
    } catch (e) {
      /* The server refuses a second accept ("already accepted"): read again and look. */
      onSay(e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" }
        : outcomeUnknown(e) ? { title: notKnown("accepted", "the open orders").title, body: notKnown("accepted", "the open orders", e).body, tone: "bad" }
          : { title: "Not accepted", body: e instanceof Error ? e.message : String(e), tone: "bad" });
    } finally {
      writing.current.delete(o.id);
      setBusy(null);
      done();
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Caps>Room-service orders waiting</Caps>
      {orders.map((o) => {
        const guest = roomLine(prefs.data, o.room);
        return (
          <View key={o.id} style={{ borderRadius: 12, borderWidth: 2, borderColor: c.orange, backgroundColor: c.white, padding: 12, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <BedDouble size={16} color={c.orange} />
              <Text style={t.heading}>{guestTitle(o.room)}</Text>
            </View>
            <Text style={[t.label, ty.md, { color: c.ink900 }]}>{guestDishes(o)}</Text>
            {o.note ? <Text style={[t.label, ty.sm, { color: c.orange700 }]}>{o.note}</Text> : null}
            {guest ? (
              <Text style={[t.label, ty.sm, { color: c.grey600 }]}>
                <Text style={{ color: c.grey500 }}>Guest in this room: </Text>
                {guest.allergy ? <Text style={{ ...face[600], color: c.red700 }}>Allergy: {guest.allergy}{guest.words.length ? " · " : ""}</Text> : null}
                {guest.words.join(" · ")}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Btn label="Accept and send" primary busy={busy === o.id} disabled={why != null} hint={why ?? undefined} onPress={() => void accept(o)} />
              </View>
              <Btn label="Decline" disabled={why != null} hint={why ?? undefined}
                onPress={() => (why ? onSay({ title: "Not declined", body: why, tone: "bad" }) : setDeclining(o))} />
            </View>
          </View>
        );
      })}
      {declining ? (
        <Decline code={code} order={declining} onClose={() => { setDeclining(null); done(); }} onDone={() => { setDeclining(null); done(); }} />
      ) : null}
    </View>
  );
}

/** Declined, with the reason the guest reads on their page (AskDialog's words). */
function Decline({ code, order, onClose, onDone }: { code: string; order: GuestOrder; onClose: () => void; onDone: () => void }) {
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const inFlight = useRef(false);
  async function go() {
    if (!why.trim()) { setProblem("Say why, in a line the guest will read."); return; }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await send("POST", `/api/hotels/${code}/till/guest-orders/${order.id}/decline`, { reason: why.trim() });
      onDone();
    } catch (e) {
      /* Refused offline with the web's sentence (send); the server refuses a second ("already answered"). */
      setProblem(outcomeUnknown(e) && !(e instanceof ApiError && e.status === 503)
        ? `${notKnown("declined", "the room-service orders once this is closed", e).title}. ${notKnown("declined", "the room-service orders once this is closed", e).body}`
        : `Not declined. ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <TillSheet
      open onClose={onClose} title={declineTitle(order.room)} description="The guest reads your reason on their page."
      footer={(
        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
          <Btn label="Cancel" size="md" onPress={onClose} />
          <Btn label="Decline" size="md" primary busy={busy} onPress={() => void go()} />
        </View>
      )}
    >
      <Field label="Why?" hint="Out of paneer tonight - the dal is ready now.">
        <Input value={why} onChangeText={setWhy} maxLength={200} autoFocus accessibilityLabel="Why?" returnKeyType="send" onSubmitEditing={() => void go()} />
      </Field>
      {problem ? <Problem text={problem} /> : null}
    </TillSheet>
  );
}
