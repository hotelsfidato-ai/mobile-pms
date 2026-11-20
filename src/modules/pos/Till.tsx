import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { Calendar, Plus, ShoppingBag } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { api, HeldError, send, type Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { notKnown, Screen, useScreenStop } from "../../core/ui";
import { parcelsStop } from "./floor";
import { Btn, Field, Input, ReadProblem, Refused, SaidBar, Stale, ty, useAccess, web, type Said } from "./TablesKit";
import {
  EARLIER_FAILED, earlierAsked, earlierNone, earlierPath, openBody, openPill, orderHref, ringWhy, TILL_OUTLET, tillLists, type TillRow,
} from "./till";
import { goToOrder, KotStrip, ListCard, NewParcelSheet, OrderRow, Problem, TillStartHere } from "./TillKit";
import type { MenuCategory, Order } from "./types";

/* ══════════════════════════════════════════════════════════════════
   THE TILL on a phone — the web's /pos/:code/till (src/modules/pos/pages/
   Till.tsx TillPage, inside PosGate), drawn to its phone picture (M-11:
   reference/pms-shots/all/43, new/n-pos-till) and unclipped (R-15).

   HOW IT MEETS THE REST OF THE POS (nothing of theirs is edited):
     the web's Till is one page: the lists, and beside them the open
     order (OrderPanel) with the menu. On the phone the open order is the
     order screen (OrderScreen.tsx, /pos/:code/order/:id - the port of
     OrderPanel, with Pay.tsx's settling and printing) and the menu is the
     order pad (OrderPad.tsx, /pos/:code/pad?order=): a row opens the
     order; Open and New parcel open the order and its pad over it, as the
     web opens the order with its menu.

   Reads: GET /till/orders (open of any day, today's finished; the web's
   live stream is not on the phone: read again every 30 s on screen, and
   on coming back), GET /till/menu (only its "no menu" and failure cards,
   the pad's own read), GET /till/kot-setup, GET /till/bills?no=.
   Writes: POST /till/orders (Open, New parcel), through send(); the
   web's tier "Order" holds them offline. The route reads no key (R-13).
   ══════════════════════════════════════════════════════════════════ */

const POLL_MS = 30_000;

export function Till({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const access = useAccess(code);
  /* An order or a parcel whose outcome is unknown (MPOS-U1): let go by a read of the open orders begun after it. */
  const opening = useScreenStop(parcelsStop(code, TILL_OUTLET));
  const orders = useQuery({
    queryKey: ["pos", code, "till", "orders"],
    queryFn: opening.watch(() => api<{ businessDate: string; orders: TillRow[] }>(`/api/hotels/${code}/till/orders`)),
  });
  /* The pad's own read, under its key: here only "no menu yet" and its failure (Till.tsx 299-326). */
  const menu = useQuery({
    queryKey: ["pos", code, "pad", "menu"],
    queryFn: async () => (await api<{ categories: MenuCategory[] }>(`/api/hotels/${code}/till/menu`)).categories,
  });
  const [said, setSaid] = useState<Said | null>(null);
  const [parcel, setParcel] = useState(false);
  const [pulled, setPulled] = useState(false);
  /* Each return to this screen reads the list again and starts Open afresh (MEMORY 16). */
  const [visit, setVisit] = useState(0);

  const refresh = useCallback(() => { void cache.invalidateQueries({ queryKey: ["pos", code] }); }, [cache, code]);
  useFocusEffect(useCallback(() => {
    setVisit((v) => v + 1);
    void cache.invalidateQueries({ queryKey: ["pos", code, "till"] });
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

  const lists = tillLists(orders.data?.orders ?? []);
  const pill = orders.data ? openPill(lists.open.length) : null;
  const head = (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Text style={t.title} accessibilityRole="header">Till</Text>
        {pill ? (
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1,
            backgroundColor: pill.warning ? c.yellow50 : c.grey100, borderColor: pill.warning ? c.yellow100 : c.grey200,
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pill.warning ? c.yellow : web.grey400 }} />
            <Text style={[t.caption, { color: pill.warning ? c.yellow800 : c.grey600 }]}>{pill.text}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[t.label, ty.sm, { color: c.grey500 }]}>
        Open an order, add to it, settle it. Charges reach a guest's bill the same way an outside point of sale would.
      </Text>
    </View>
  );

  /* PosGate: the till's own answer first, once, for the whole service. */
  if (access.isLoading || (access.data && !access.data.ok)) {
    return (
      <Screen refreshing={false} onRefresh={() => void access.refetch()}>
        {head}
        {access.data && !access.data.ok
          ? <Refused store title="The point of sale is not open to you here" reason={access.data.reason} />
          : <View style={{ height: 160, borderRadius: 12, backgroundColor: c.grey100 }} accessibilityLabel="Reading the till" />}
      </Screen>
    );
  }

  /* POS-4: one line for the screen when a refresh failed but something is still shown. */
  const stale = [orders, menu].find((q) => q.error && q.data !== undefined);
  const opened = (order: Order) => { refresh(); goToOrder(code, order); };

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && orders.isFetching} onRefresh={() => { setPulled(true); refresh(); }}>
        {head}
        <TillStartHere code={code} role={role} onSay={setSaid} />
        <KotStrip code={code} role={role} onSay={setSaid} />
        {stale ? (
          <Stale error={stale.error} loadedAt={stale.dataUpdatedAt} onRetry={() => { void orders.refetch(); void menu.refetch(); }} />
        ) : null}

        {/* A menu that did not load is not "no menu yet". */}
        {menu.data === undefined && menu.error ? <ReadProblem error={menu.error} what="the menu" onRetry={() => void menu.refetch()} /> : null}
        {menu.data?.length === 0 ? (
          <View style={card}>
            <Text style={t.heading}>There is no menu yet</Text>
            <Text style={[t.label, ty.sm, { marginTop: 4 }]}>
              Nothing can be sold until the hotel enters what it sells. The prices are yours - this system ships none.
            </Text>
          </View>
        ) : null}

        <StartAnOrder
          key={visit} code={code} role={role} onOpened={opened} onSay={setSaid}
          onParcel={() => { setSaid(null); setParcel(true); }}
        />

        {orders.isLoading ? (
          <View style={{ height: 200, borderRadius: 12, backgroundColor: c.grey100 }} accessibilityLabel="Reading today's orders" />
        ) : orders.data === undefined && orders.error ? (
          <ReadProblem error={orders.error} what="today's orders" onRetry={() => void orders.refetch()} />
        ) : null}

        {lists.open.length > 0 ? (
          <ListCard title="Open orders">
            {lists.open.map((o) => <OrderRow key={o.id} row={o} onOpen={() => router.push(orderHref(code, o.id))} />)}
          </ListCard>
        ) : null}
        {lists.done.length > 0 ? (
          <ListCard title="Settled today">
            {lists.done.map((o) => <OrderRow key={o.id} row={o} onOpen={() => router.push(orderHref(code, o.id))} />)}
          </ListCard>
        ) : null}

        <EarlierBills code={code} onSay={setSaid} />
      </Screen>

      {said ? <SaidBar said={said} onDone={() => setSaid(null)} style={{ position: "absolute", left: space.side, right: space.side, bottom: 16 }} /> : null}

      {parcel ? (
        <NewParcelSheet
          code={code} outlet={TILL_OUTLET}
          onCancel={() => { setParcel(false); refresh(); }}
          onHeld={(word) => { setParcel(false); setSaid(word); }}
          onOpened={(order, name) => {
            setParcel(false);
            setSaid({ title: `Parcel for ${name}`, body: "Add the dishes and send them to the kitchen.", tone: "ok" });
            opened(order);
          }}
        />
      ) : null}
    </View>
  );
}

const card = { backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY };

/** Start an order (Till.tsx 335-366): a table number, or where the food is
    going, then Open; or a parcel. One tap, one order (latched); after an
    unknown outcome Open takes no more taps until the person has left this
    screen and come back to the list read again (the key above). */
function StartAnOrder({ code, role, onOpened, onSay, onParcel }: {
  code: string; role: string | null; onOpened: (order: Order) => void; onSay: (said: Said) => void; onParcel: () => void;
}) {
  const [table, setTable] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const inFlight = useRef(false);
  /* Kept by the outlet, outside this card (MPOS-U1): leaving the screen and coming back lets nothing go;
     a read of the open orders begun after the loss does. */
  const once = useScreenStop(parcelsStop(code, TILL_OUTLET));
  const where = "the open orders below - they are read again by pulling down";
  const unknown = notKnown("opened", where);
  const why = ringWhy(role);

  async function open() {
    if (why) { setProblem(why); return; }
    if (once.isStuck()) { setProblem(unknown.line); return; }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const order = await once.guard(() => send<Order & { ok: true }>("POST", `/api/hotels/${code}/till/orders`, openBody(TILL_OUTLET, table)));
      setTable("");
      onOpened(order);
    } catch (e) {
      if (e instanceof HeldError) { setTable(""); onSay({ title: "Saved on this phone", body: e.message, tone: "held" }); }
      else if (once.stop(e)) setProblem(`${unknown.title}. ${notKnown("opened", where, e).body}`);
      /* The server's own words: a table already running, the restaurant closed early, … */
      else setProblem(`Could not open an order. ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={[card, { gap: 12 }]}>
      <View style={{ gap: 4 }}>
        <Text style={t.heading} accessibilityRole="header">Start an order</Text>
        <Text style={[t.label, ty.sm]}>A table number, or where the food is going. It prints on the kitchen copy.</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Input
          value={table} onChangeText={setTable} placeholder="Table 4" accessibilityLabel="Table, or where the food is going"
          autoCapitalize="characters" autoCorrect={false} returnKeyType="go" onSubmitEditing={() => void open()}
          style={{ flexGrow: 1, flexBasis: 160 }}
        />
        <Btn label="Open" primary icon={<Plus size={16} color={why || once.stuck ? c.grey600 : c.white} />} busy={busy}
          disabled={why != null || once.stuck} hint={why ?? (once.stuck ? unknown.line : undefined)} onPress={() => void open()} />
        <Btn label="New parcel" icon={<ShoppingBag size={16} color={why || once.stuck ? c.grey500 : c.ink900} />} disabled={why != null || once.stuck} hint={why ?? (once.stuck ? unknown.line : undefined)}
          onPress={() => (why ? setProblem(why) : once.isStuck() ? setProblem(unknown.line) : onParcel())} />
      </View>
      {problem ? <Problem text={problem} /> : null}
    </View>
  );
}

/** An earlier day's bill (Till.tsx 533-581): to print a paid bill again,
    its number; it opens on the order screen, whose Print the bill prints
    BILL · DUPLICATE. The Day is the web's date picker: not installed on
    the phone, so it is shown and says where it is. */
function EarlierBills({ code, onSay }: { code: string; onSay: (said: Said) => void }) {
  const [no, setNo] = useState("");
  const asked = earlierAsked(no);
  const bills = useQuery({
    queryKey: ["pos", code, "till", "earlier", no.trim()],
    queryFn: async () => (await api<{ bills: TillRow[] }>(earlierPath(code, no))).bills,
    enabled: asked,
  });
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>
      <Text style={[t.heading, { paddingHorizontal: space.cardX, paddingVertical: space.cardY, borderBottomWidth: 1, borderBottomColor: c.grey100 }]}
        accessibilityRole="header">An earlier day's bill</Text>
      <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>
        <Text style={[t.label, ty.sm]}>To print a paid bill again: pick its day, or type its number. It prints as BILL · DUPLICATE.</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field label="Day">
              <Pressable
                onPress={() => onSay({ title: "Day", body: "On the website for now", tone: "held" })}
                accessibilityRole="button" accessibilityLabel="Day" accessibilityHint="On the website for now" accessibilityState={{ disabled: true }}
                style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.grey50, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <Text style={[{ fontSize: 16, ...face[500], color: web.grey400 }]}>dd-mm-yyyy</Text>
                <Calendar size={16} color={web.grey400} />
              </Pressable>
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Bill number">
              <Input value={no} onChangeText={setNo} placeholder="R-0012" maxLength={40} autoCapitalize="characters" autoCorrect={false}
                accessibilityLabel="Bill number" returnKeyType="search" />
            </Field>
          </View>
        </View>
        {asked && bills.isError ? <Problem text={EARLIER_FAILED} /> : null}
        {asked && bills.isLoading ? <Text style={[t.label, ty.sm]}>Looking for the bill…</Text> : null}
        {asked && bills.data && bills.data.length === 0 ? <Text style={[t.label, ty.sm]}>{earlierNone(no)}</Text> : null}
      </View>
      {asked && bills.data && bills.data.length > 0
        ? bills.data.map((o) => <OrderRow key={o.id} row={o} withDate onOpen={() => router.push(orderHref(code, o.id))} />)
        : null}
    </View>
  );
}
