import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Search, Trash2, WifiOff } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { api, HeldError, send, type Hotel } from "../../core/api";
import { cash } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { DishSheet } from "./DishSheet";
import { since, type FloorNow } from "./floor";
import { OrderPadCustomise } from "./OrderPadCustomise";
import {
  addToSent, asksFirst, batchBody, bump, clearDraft, customiseLine, dishPrice, draftKey, draftTotal, drop, footerLine, isBarDish,
  kotsSent, loadDraft, menuShown, nameWithAddons, onceMore, putLine, saveDraft, sentDishes, type DraftLine, type PadLine,
} from "./pad";
import { whyNotRing } from "./roles";
import type { MenuCategory, MenuItem, NumberedAddon, Order } from "./types";
import {
  Btn, Input, OVERLAY, ReadProblem, Refused, RoundBtn, SaidBar, SheetHead, leaveSaid, sheetCard, sheetFooter, takeSaid, ty, useAccess, web, type Said,
} from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   THE ORDER PAD on a phone — the web's OrderPad (src/modules/pos/flows/
   OrderPad.tsx), a dialog over Tables, drawn to the PMS's own phone picture
   (M-11). A round is built on the phone - nothing touches the network until
   Send - and sent as ONE request that takes every dish or none (POST
   /till/orders/batch, send:true). Three outcomes: sent (the docket number),
   refused (the server's sentence, the round kept), HELD (in the outbox: the
   kitchen does not have it, and nothing here says otherwise).
   Not here (the web's): the banquet function picker (no function to attach
   at this property; asked). The draft is kept IN MEMORY per table (pad.ts):
   closing the pad keeps it, closing the app loses it.
   ══════════════════════════════════════════════════════════════════ */

const OUTLET = "REST";

export function OrderPad({ hotel, role, table, orderId, onClose }: {
  hotel: Hotel; role: string | null; table: string; orderId?: string; onClose: () => void;
}) {
  const code = hotel.code;
  const cache = useQueryClient();
  const access = useAccess(code);
  const key = draftKey(code, OUTLET, table);
  const [lines, setLines] = useState<DraftLine[]>(() => loadDraft(key)?.lines ?? []);
  const [asking, setAsking] = useState<MenuItem | null>(null);
  const [customising, setCustomising] = useState<DraftLine | null>(null);
  const [addingTo, setAddingTo] = useState<PadLine | null>(null);
  const [justAdded, setJustAdded] = useState<{ uid: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [side, setSide] = useState<"restaurant" | "bar">("restaurant");
  const [section, setSection] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [asked, setAsked] = useState<string | null>(null);
  /* What Tables left for the pad: a parcel just opened. */
  const [said, setSaid] = useState<Said | null>(takeSaid);

  const menu = useQuery({
    queryKey: ["pos", code, "pad", "menu"],
    queryFn: async () => (await api<{ categories: MenuCategory[] }>(`/api/hotels/${code}/till/menu`)).categories,
  });
  const numbered = useQuery({
    queryKey: ["pos", code, "pad", "addons"],
    queryFn: async () => (await api<{ addons: NumberedAddon[] }>(`/api/hotels/${code}/till/numbered-addons`)).addons,
  });
  /* A second round: what the kitchen already has, and its KOTs. */
  const existing = useQuery({
    queryKey: ["pos", code, "pad", "order", orderId],
    queryFn: () => api<Order & { lines: PadLine[] }>(`/api/hotels/${code}/till/orders/${orderId}`),
    enabled: Boolean(orderId),
    staleTime: 0,
  });
  const orderLines = existing.data?.lines ?? [];
  const sent = sentDishes(orderLines);
  const kots = orderId ? kotsSent(orderLines) : [];

  /* Written down as it grows, not on Send. */
  useEffect(() => { saveDraft({ key, table, ...(orderId ? { orderId } : {}), lines, updatedAt: "" }); }, [key, table, orderId, lines]);

  /* On a narrow screen This round sits above the menu: its new line is brought into view. */
  const scroll = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const at = useRef({ round: 0, list: 0, lines: {} as Record<string, number> });
  const pending = useRef<string | null>(null);
  const bringIntoView = (uid: string) => {
    const y = at.current.round + at.current.list + (at.current.lines[uid] ?? 0);
    if (y < scrollY.current) scroll.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };
  /* A line already laid out (one more of a dish) at once; a new one when it is. */
  useEffect(() => {
    if (!justAdded) return;
    if (at.current.lines[justAdded.uid] !== undefined) bringIntoView(justAdded.uid);
    else pending.current = justAdded.uid;
  }, [justAdded]);

  const categories = menu.data ?? [];
  /* A Bar person (D27-324): the server gives them only what prints at the bar. */
  const { split, onSide, filtered } = useMemo(
    () => menuShown(categories, side, section, search, role === "bar"), [categories, side, section, search, role]);
  const ringReason = whyNotRing(role);
  const noMenu = menu.isSuccess && categories.length === 0;

  const put = (item: MenuItem, qty: number, note: string, variationId?: string, addonIds?: string[], moreChoiceIds?: string[]) => {
    const next = putLine(lines, item, qty, note, variationId, addonIds, moreChoiceIds);
    setLines(next.lines);
    setJustAdded({ uid: next.uid, name: item.name });
    setAsking(null);
  };
  const tap = (item: MenuItem) => (asksFirst(item) ? setAsking(item) : put(item, 1, ""));

  /** One more of a dish already sent (D27-349): on the pad, so it works with no connection too. */
  const again = (d: PadLine) => {
    const item = categories.flatMap((x) => x.items).find((i) => i.id === d.itemId);
    if (!item) { setSaid({ title: "Not added", body: `${d.name} is not on the menu now.`, tone: "bad" }); return; }
    const next = onceMore(lines, d, orderLines, item);
    setLines(next.lines);
    setJustAdded({ uid: next.uid, name: item.name });
  };

  /** A KOT printed again at the computer that prints its kind, never on this
      phone (KotStation.tsx KotsSent, D27-329): the screen says where it went. */
  async function reprint(k: (typeof kots)[number]) {
    setAsked(k.label);
    try {
      const { station } = await send<{ ok: true; station: { name: string; online: boolean; seenAt: string | null } }>(
        "POST", `/api/hotels/${code}/till/orders/${orderId}/kot/${k.no}/reprint`, { kind: k.kindId });
      setSaid(station.online
        ? { title: `${k.label} sent to ${station.name}`, body: "It prints there, marked REPRINT.", tone: "ok" }
        : { title: `${station.name} is offline`, body: `${k.label} waits there and prints when it is back. Not seen since ${since(station.seenAt)}.`, tone: "bad" });
    } catch (e) {
      setSaid(e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" }
        : { title: "Not reprinted", body: e instanceof Error ? e.message : String(e), tone: "bad" });
    } finally {
      setAsked(null);
    }
  }

  async function sendRound() {
    if (lines.length === 0 || sending) return;
    if (ringReason) { setSaid({ title: table, body: ringReason, tone: "bad" }); return; }
    setSending(true);
    setSaid(null);
    /* The table's id, from the floor this phone last read; the name otherwise. */
    const floor = cache.getQueryData<FloorNow>(["pos", code, "tables", "floor"]);
    const tableId = floor?.sections.flatMap((s) => s.tables).find((x) => x.label === table)?.id;
    try {
      const result = await send<Order & { ok: true; opened: boolean; kotNo?: number }>(
        "POST", `/api/hotels/${code}/till/orders/batch`,
        batchBody({ ...(orderId ? { orderId } : {}), outlet: OUTLET, ...(tableId ? { tableId } : { table }) }, lines),
      );
      clearDraft(key);
      setLines([]);
      leaveSaid({
        title: `${table} sent`,
        body: typeof result.kotNo === "number" ? `Kitchen docket ${result.kotNo}.` : "On the bill. Nothing went to the kitchen.",
        tone: "ok",
      });
      void cache.invalidateQueries({ queryKey: ["pos", code] });
      onClose();
    } catch (e) {
      if (e instanceof HeldError) {
        /* NOT "sent to the kitchen": no server has seen it and there is no docket. */
        clearDraft(key);
        setLines([]);
        leaveSaid({ title: `${table} is held`, body: "The kitchen does not have it yet. It goes as soon as the connection is back.", tone: "held" });
        onClose();
        return;
      }
      /* THE ROUND STAYS: the waiter changes that dish and sends again. */
      setSaid({ title: table, body: e instanceof Error ? e.message : String(e), tone: "bad" });
    } finally {
      setSending(false);
    }
  }

  const total = draftTotal(lines);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => { scrollY.current = e.nativeEvent.contentOffset.y; };

  /* Over the floor, never instead of it: the web's dialog, 16 px from the
     screen's edges (max-h-[calc(100vh-2rem)]), a tap outside closes it. */
  const frame = (children: ReactNode) => (
    <View style={{ flex: 1, backgroundColor: OVERLAY, justifyContent: "center", padding: 16 }}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <View style={sheetCard}>{children}</View>
    </View>
  );

  if (access.data && !access.data.ok) {
    return frame(
      <>
        <SheetHead title={table} onClose={onClose} />
        <View style={{ padding: space.side }}><Refused store title="The point of sale is not open to you here" reason={access.data.reason} /></View>
      </>,
    );
  }

  return frame(
    <>
      <SheetHead
        title={table || "-"} onClose={onClose}
        description={orderId ? "Another round on this table's bill." : "A new order. Nothing is sent until you press Send."}
      />

      <ScrollView ref={scroll} onScroll={onScroll} scrollEventThrottle={64} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space.side, paddingVertical: 16, gap: 16 }}>
        {/* ── The round ── */}
        <View onLayout={(e) => { at.current.round = e.nativeEvent.layout.y; }}>
          <Text style={[t.heading, ty.md, { marginBottom: 12 }]} accessibilityRole="header">This round</Text>

          {sent.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <Small>Already sent</Small>
              <Rows>
                {sent.map((d) => (
                  <View key={d.id} style={[row, { gap: 8, paddingVertical: 6 }]}>
                    <Text style={[t.label, ty.sm, { flex: 1, color: c.ink900 }]} numberOfLines={1}>{d.qty}× {d.name}</Text>
                    {/* One more of it, on this round (D27-349). */}
                    <RoundBtn a11y={`One more ${d.name}`} onPress={() => again(d)}><Plus size={16} color={c.grey600} /></RoundBtn>
                    <Btn label="Customise" size="md" a11y={`Customise ${d.name}`} onPress={() => { setAddingTo(d); void numbered.refetch(); }} />
                  </View>
                ))}
              </Rows>
            </View>
          ) : null}

          {/* The table's KOTs, printed again at the computer that prints each (D27-329). */}
          {kots.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <Small>KOTs sent</Small>
              <Rows>
                {kots.map((k) => (
                  <View key={`${k.no}:${k.kindId ?? ""}`} style={[row, { gap: 8, paddingVertical: 6 }]}>
                    <Text style={[t.label, ty.sm, t.tab, { flex: 1, color: c.ink900 }]} numberOfLines={1}>{k.label}</Text>
                    <Btn label="Reprint" size="md" a11y={`Reprint ${k.label}`} busy={asked === k.label} onPress={() => void reprint(k)} />
                  </View>
                ))}
              </Rows>
            </View>
          ) : null}

          {lines.length === 0 ? (
            <Text style={[t.label, ty.sm, { paddingVertical: 12, lineHeight: 23 }]}>Tap a dish to start. Nothing reaches the kitchen until you press Send.</Text>
          ) : (
            <View onLayout={(e) => { at.current.list = e.nativeEvent.layout.y; }} style={{ borderBottomWidth: 1, borderBottomColor: c.grey100 }}>
              {lines.map((l) => (
                <View key={l.uid} onLayout={(e) => {
                  at.current.lines[l.uid] = e.nativeEvent.layout.y;
                  if (pending.current === l.uid) { pending.current = null; bringIntoView(l.uid); }
                }}
                  style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.grey100 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.label, ty.sm, { color: c.ink900 }]}>{l.extraFor ? `+ ${l.name}` : nameWithAddons(l.name, l.numberedAddons ?? [])}</Text>
                      {l.extraFor ? <Text style={[t.caption, ty.xs, { color: c.grey600 }]}>for {l.extraFor.dish}, already sent</Text> : null}
                      {l.variationLabel || l.addonLabels.length > 0
                        ? <Text style={[t.caption, ty.xs, { color: c.grey600 }]}>{[l.variationLabel, ...l.addonLabels].filter(Boolean).join(" · ")}</Text> : null}
                      {l.note ? <Text style={[t.caption, ty.xs, { color: c.orange700 }]}>{l.note}</Text> : null}
                    </View>
                    <Text style={[t.label, ty.sm, t.tab, { color: c.ink900 }]}>{l.unitPrice === 0 && l.extraFor ? "Free" : cash(l.unitPrice * l.qty)}</Text>
                  </View>
                  {(l.customAddons ?? []).map((x, i) => (
                    <View key={i} style={{ flexDirection: "row", gap: 8, paddingLeft: 12, marginTop: 4 }}>
                      <Text style={[t.label, ty.sm, { flex: 1, color: c.grey700 }]}>+ {x.name} ×{x.qty}</Text>
                      <Text style={[t.label, ty.sm, t.tab, { color: c.grey700 }]}>{x.price === 0 ? "Free" : cash(x.price * x.qty)}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                    <RoundBtn a11y={`One less ${l.name}`} onPress={() => setLines((p) => bump(p, l.uid, -1))}><Minus size={16} color={c.grey600} /></RoundBtn>
                    <Text style={[t.label, ty.sm, t.tab, { width: 32, textAlign: "center", color: c.ink900 }]}>{l.qty}</Text>
                    <RoundBtn a11y={`One more ${l.name}`} onPress={() => setLines((p) => bump(p, l.uid, 1))}><Plus size={16} color={c.grey600} /></RoundBtn>
                    {!l.extraFor ? (
                      <Btn label="Customise" size="row" a11y={`Customise ${l.name}`} onPress={() => { setCustomising(l); void numbered.refetch(); }} />
                    ) : null}
                    <View style={{ flex: 1 }} />
                    <RoundBtn a11y={`Take ${l.name} off the pad`} tone="danger" onPress={() => setLines((p) => drop(p, l.uid))}><Trash2 size={16} color={c.grey500} /></RoundBtn>
                  </View>
                </View>
              ))}
            </View>
          )}

          {lines.length > 0 ? (
            <View style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
              <WifiOff size={14} color={c.grey500} style={{ marginTop: 2 }} />
              <Text style={[t.caption, { flex: 1, lineHeight: 20 }]}>Held on this device. Nothing has been sent - the kitchen sees it when you press Send.</Text>
            </View>
          ) : null}
        </View>

        {/* ── The menu ── */}
        <View>
          <View style={{ justifyContent: "center", marginBottom: 12 }}>
            <View style={{ position: "absolute", left: 12, zIndex: 1 }} pointerEvents="none"><Search size={16} color={web.grey400} /></View>
            <Input value={search} onChangeText={setSearch} placeholder="Search the menu" accessibilityLabel="Search the menu" style={{ paddingLeft: 36 }} />
          </View>

          {!search.trim() && (split || onSide.length > 1) ? (
            <View style={{ gap: 12, marginBottom: 16 }}>
              {split ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["restaurant", "bar"] as const).map((v) => (
                    <Chip key={v} label={v === "bar" ? "Bar" : "Restaurant"} on={side === v} onPress={() => { setSide(v); setSection(null); }} />
                  ))}
                </View>
              ) : null}
              {onSide.length > 1 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[{ id: null as string | null, name: "All" }, ...onSide].map((s) => (
                    <Chip key={s.id ?? "all"} label={s.name} on={section === s.id} onPress={() => setSection(section === s.id ? null : s.id)} />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {noMenu ? (
            <Text style={[t.label, ty.sm]}>There is no menu yet. Nothing can be sold until the hotel enters what it sells - the prices are yours, this system ships none.</Text>
          ) : null}
          {menu.isPending ? <Text style={[t.label, ty.sm, { color: c.grey500 }]}>Loading the menu…</Text> : null}
          {menu.data === undefined && menu.error ? <ReadProblem error={menu.error} what="the menu" onRetry={() => void menu.refetch()} /> : null}
          {!noMenu && filtered.length === 0 && search.trim() ? <Text style={[t.label, ty.sm]}>Nothing on the menu matches “{search.trim()}”.</Text> : null}

          <View style={{ gap: 20 }}>
            {filtered.map((cat) => (
              <View key={cat.id}>
                <Text style={[t.heading, ty.md, { marginBottom: 12 }]} accessibilityRole="header">{cat.name}</Text>
                <View style={{ gap: 8 }}>
                  {cat.items.map((item) => {
                    const off = !item.isActive;
                    const price = dishPrice(item);
                    return (
                      <Pressable
                        key={item.id} disabled={off} onPress={() => tap(item)}
                        accessibilityRole="button" accessibilityState={{ disabled: off }}
                        accessibilityLabel={`${item.name}, ${off ? "off the menu today" : cash(price)}`}
                        style={({ pressed }) => ({
                          minHeight: 56, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.grey200,
                          flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: off || pressed ? c.grey50 : c.white,
                        })}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[t.label, ty.sm, { color: c.ink900 }]} numberOfLines={1}>{item.name}</Text>
                          {off ? <Text style={[t.caption, ty.xs]}>off the menu today</Text> : null}
                        </View>
                        <Text style={[t.label, ty.sm, t.tab, { color: c.ink900 }]}>{cash(price)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── The footer ── */}
      <View style={[sheetFooter, { gap: 8 }]}>
        {said ? <SaidBar said={said} onDone={() => setSaid(null)} /> : null}
        {justAdded && lines.some((l) => l.uid === justAdded.uid) ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 10, backgroundColor: web.success50, paddingHorizontal: 12, paddingVertical: 6 }} accessibilityLiveRegion="polite">
            <Text style={[t.label, ty.sm, { flex: 1, color: c.ink900 }]} numberOfLines={1}>{justAdded.name} added</Text>
            <Btn label="Customise" size="row" onPress={() => {
              const l = lines.find((x) => x.uid === justAdded.uid);
              if (l) { setCustomising(l); void numbered.refetch(); }
              setJustAdded(null);
            }} />
          </View>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            {/* ⚠ THE PAD'S OWN ARITHMETIC, labelled as such: what the dishes come to. */}
            <Text style={[t.heading, t.tab, { lineHeight: 20 }]}>{lines.length === 0 ? "-" : cash(total)}</Text>
            <Text style={[t.caption, ty.xs]}>{footerLine(lines)}</Text>
          </View>
          <Btn label="Close" onPress={onClose} />
          <Btn label="Send" primary busy={sending} disabled={lines.length === 0 || ringReason != null} hint={ringReason ?? undefined} onPress={() => void sendRound()} />
        </View>
      </View>

      {asking ? (
        <DishSheet
          key={asking.id} item={asking} bar={isBarDish(categories, asking.id)} onCancel={() => setAsking(null)}
          onAdd={(qty, note, variationId, addonIds, moreChoiceIds) => put(asking, qty, note, variationId, addonIds, moreChoiceIds)}
        />
      ) : null}

      {customising ? (
        <OrderPadCustomise
          key={customising.uid} dish={customising.name} qty={customising.qty}
          base={customising.baseUnitPrice ?? customising.unitPrice} addons={numbered.data ?? []}
          chosen={customising.numberedAddons ?? []} customs={customising.customAddons ?? []}
          loading={numbered.isFetching} failed={numbered.isError} onRetry={() => void numbered.refetch()}
          onCancel={() => setCustomising(null)}
          onDone={(chosen, scope, customs) => { setLines((p) => customiseLine(p, customising.uid, chosen, scope, customs)); setCustomising(null); }}
        />
      ) : null}

      {addingTo ? (
        <OrderPadCustomise
          key={`sent-${addingTo.id}`} sent dish={addingTo.numberedAddons?.dish ?? addingTo.name} base={addingTo.unitPrice}
          addons={numbered.data ?? []} chosen={[]}
          loading={numbered.isFetching} failed={numbered.isError} onRetry={() => void numbered.refetch()}
          onCancel={() => setAddingTo(null)}
          onDone={(chosen, _scope, customs) => { setLines((p) => addToSent(p, addingTo, chosen, customs)); setAddingTo(null); }}
        />
      ) : null}
    </>,
  );
}

const row = { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: c.grey100 } as const;

/** "ALREADY SENT", "KOTS SENT": the web's small capitals over a list. */
function Small({ children }: { children: ReactNode }) {
  return <Text style={[t.caption, ty.xs, { textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }]}>{children}</Text>;
}
function Rows({ children }: { children: ReactNode }) {
  return <View style={{ borderBottomWidth: 1, borderBottomColor: c.grey100 }}>{children}</View>;
}

/** A menu section, or a side: orange when chosen (the web's chips). */
function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: 999, borderWidth: 1,
        borderColor: on ? c.orange : c.grey300, backgroundColor: on ? c.orange50 : c.white }}
    >
      <Text style={[ty.sm, face[500], { color: on ? c.orange700 : c.grey700 }]}>{label}</Text>
    </Pressable>
  );
}
