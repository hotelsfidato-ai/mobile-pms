import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Search, Trash2, WifiOff } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { api, HeldError, send, type Hotel } from "../../core/api";
import { cash } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { DishSheet } from "./DishSheet";
import { OrderPadCustomise } from "./OrderPadCustomise";
import {
  addToSent, asksFirst, batchBody, bump, clearDraft, customiseLine, dishPrice, draftKey, draftTotal, drop, footerLine,
  isBarDish, loadDraft, menuShown, nameWithAddons, putLine, saveDraft, sentDishes, type DraftLine,
} from "./pad";
import { whyNotRing } from "./roles";
import type { Floor, MenuCategory, MenuItem, NumberedAddon, Order, OrderLine } from "./types";
import { Btn, Caps, ReadProblem, Refused, RoundBtn, SaidBar, SheetHead, leaveSaid, useAccess, type Said } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   THE ORDER PAD on a phone — the web's OrderPad (src/modules/pos/flows/
   OrderPad.tsx), opened over Tables as a sheet. A round is built on the
   phone - nothing touches the network until Send - and sent as ONE
   request that takes every dish or none (POST /till/orders/batch,
   send:true). Three outcomes: sent (the docket number), refused (the
   server's sentence, the round kept), HELD (in the outbox: the kitchen
   does not have it, and nothing here says otherwise).
   Reference pictures 03 and 05. Not here (the web's): the banquet
   function picker (no function can be attached at this property; asked).
   The draft is kept IN MEMORY per table (pad.ts): closing the pad keeps
   it, closing the app loses it.
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
  const [addingTo, setAddingTo] = useState<OrderLine | null>(null);
  const [justAdded, setJustAdded] = useState<{ uid: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [side, setSide] = useState<"restaurant" | "bar">("restaurant");
  const [section, setSection] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);

  const menu = useQuery({
    queryKey: ["pos", code, "pad", "menu"],
    queryFn: async () => (await api<{ categories: MenuCategory[] }>(`/api/hotels/${code}/till/menu`)).categories,
  });
  const numbered = useQuery({
    queryKey: ["pos", code, "pad", "addons"],
    queryFn: async () => (await api<{ addons: NumberedAddon[] }>(`/api/hotels/${code}/till/numbered-addons`)).addons,
  });
  /* A second round: the dishes the kitchen already has, each takes add-ons (D27-291). */
  const existing = useQuery({
    queryKey: ["pos", code, "pad", "order", orderId],
    queryFn: () => api<Order>(`/api/hotels/${code}/till/orders/${orderId}`),
    enabled: Boolean(orderId),
    staleTime: 0,
  });
  const sent = sentDishes(existing.data?.lines ?? []);

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
  const { split, onSide, filtered } = useMemo(() => menuShown(categories, side, section, search), [categories, side, section, search]);
  const ringReason = whyNotRing(role);
  const noMenu = menu.isSuccess && categories.length === 0;

  const put = (item: MenuItem, qty: number, note: string, variationId?: string, addonIds?: string[], moreChoiceIds?: string[]) => {
    const next = putLine(lines, item, qty, note, variationId, addonIds, moreChoiceIds);
    setLines(next.lines);
    setJustAdded({ uid: next.uid, name: item.name });
    setAsking(null);
  };
  const tap = (item: MenuItem) => (asksFirst(item) ? setAsking(item) : put(item, 1, ""));

  async function sendRound() {
    if (lines.length === 0 || sending) return;
    if (ringReason) { setSaid({ title: table, body: ringReason, tone: "bad" }); return; }
    setSending(true);
    setSaid(null);
    /* The table's id, from the floor this phone last read; the name otherwise. */
    const floor = cache.getQueryData<Floor>(["pos", code, "tables", "floor"]);
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

  if (access.data && !access.data.ok) {
    return (
      <View style={{ flex: 1, backgroundColor: c.white }}>
        <SheetHead title={table} onClose={onClose} />
        <View style={{ padding: space.side }}><Refused store title="The point of sale is not open to you here" reason={access.data.reason} /></View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.white }}>
      <SheetHead
        title={table || "-"} onClose={onClose}
        description={orderId ? "Another round on this table's bill." : "A new order. Nothing is sent until you press Send."}
      />

      <ScrollView ref={scroll} onScroll={onScroll} scrollEventThrottle={64} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.side, gap: 16 }}>
        {/* ── The round ── */}
        <View onLayout={(e) => { at.current.round = e.nativeEvent.layout.y; }} style={{ gap: 12 }}>
          <Text style={t.heading} accessibilityRole="header">This round</Text>

          {sent.length > 0 ? (
            <View style={{ gap: 6 }}>
              <Caps>Already sent</Caps>
              <View>
                {sent.map((d) => (
                  <View key={d.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.grey100 }}>
                    <Text style={[t.label, { flex: 1, color: c.ink900 }]} numberOfLines={1}>{d.qty}× {d.name}</Text>
                    <Btn label="Customise" size={44} a11y={`Customise ${d.name}`} onPress={() => { setAddingTo(d); void numbered.refetch(); }} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {lines.length === 0 ? (
            <Text style={[t.label, { paddingVertical: 4 }]}>Tap a dish to start. Nothing reaches the kitchen until you press Send.</Text>
          ) : (
            <View onLayout={(e) => { at.current.list = e.nativeEvent.layout.y; }}>
              {lines.map((l) => (
                <View key={l.uid} onLayout={(e) => {
                  at.current.lines[l.uid] = e.nativeEvent.layout.y;
                  if (pending.current === l.uid) { pending.current = null; bringIntoView(l.uid); }
                }}
                  style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.grey100, gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.label, { fontSize: 16, color: c.ink900 }]}>{l.extraFor ? `+ ${l.name}` : nameWithAddons(l.name, l.numberedAddons ?? [])}</Text>
                      {l.extraFor ? <Text style={t.caption}>for {l.extraFor.dish}, already sent</Text> : null}
                      {l.variationLabel || l.addonLabels.length > 0
                        ? <Text style={t.caption}>{[l.variationLabel, ...l.addonLabels].filter(Boolean).join(" · ")}</Text> : null}
                      {l.note ? <Text style={[t.caption, { color: c.orange700 }]}>{l.note}</Text> : null}
                    </View>
                    <Text style={[t.label, t.tab, { fontSize: 16, color: c.ink900 }]}>{l.unitPrice === 0 && l.extraFor ? "Free" : cash(l.unitPrice * l.qty)}</Text>
                  </View>
                  {(l.customAddons ?? []).map((x, i) => (
                    <View key={i} style={{ flexDirection: "row", gap: 8, paddingLeft: 12 }}>
                      <Text style={[t.label, { flex: 1, color: c.grey700 }]}>+ {x.name} ×{x.qty}</Text>
                      <Text style={[t.label, t.tab, { color: c.grey700 }]}>{x.price === 0 ? "Free" : cash(x.price * x.qty)}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <RoundBtn a11y={`One less ${l.name}`} onPress={() => setLines((p) => bump(p, l.uid, -1))}><Minus size={16} color={c.grey600} /></RoundBtn>
                    <Text style={[t.label, t.tab, { width: 32, textAlign: "center", fontSize: 16, color: c.ink900, ...face[500] }]}>{l.qty}</Text>
                    <RoundBtn a11y={`One more ${l.name}`} onPress={() => setLines((p) => bump(p, l.uid, 1))}><Plus size={16} color={c.grey600} /></RoundBtn>
                    {!l.extraFor ? (
                      <Btn label="Customise" size={44} a11y={`Customise ${l.name}`} onPress={() => { setCustomising(l); void numbered.refetch(); }} />
                    ) : null}
                    <View style={{ flex: 1 }} />
                    <RoundBtn a11y={`Take ${l.name} off the pad`} tone="danger" onPress={() => setLines((p) => drop(p, l.uid))}><Trash2 size={16} color={c.grey500} /></RoundBtn>
                  </View>
                </View>
              ))}
            </View>
          )}

          {lines.length > 0 ? (
            <View style={{ flexDirection: "row", gap: 6, borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 12 }}>
              <WifiOff size={14} color={c.grey500} style={{ marginTop: 2 }} />
              <Text style={[t.caption, { flex: 1 }]}>Held on this device. Nothing has been sent - the kitchen sees it when you press Send.</Text>
            </View>
          ) : null}
        </View>

        {/* ── The menu ── */}
        <View style={{ justifyContent: "center" }}>
          <Search size={16} color={c.grey500} style={{ position: "absolute", left: 14, zIndex: 1 }} />
          <TextInput
            value={search} onChangeText={setSearch} placeholder="Search the menu" placeholderTextColor={c.grey500} accessibilityLabel="Search the menu"
            style={{ minHeight: 48, paddingLeft: 40, paddingRight: 12, borderRadius: 8, borderWidth: 1, borderColor: c.grey300, ...t.label, fontSize: 16, color: c.ink900 }}
          />
        </View>

        {!search.trim() && (split || onSide.length > 1) ? (
          <View style={{ gap: 12 }}>
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
          <Text style={t.label}>There is no menu yet. Nothing can be sold until the hotel enters what it sells - the prices are yours, this system ships none.</Text>
        ) : null}
        {menu.isPending ? <Text style={t.label}>Loading the menu…</Text> : null}
        {menu.data === undefined && menu.error ? <ReadProblem error={menu.error} what="the menu" onRetry={() => void menu.refetch()} /> : null}
        {!noMenu && filtered.length === 0 && search.trim() ? <Text style={t.label}>Nothing on the menu matches “{search.trim()}”.</Text> : null}

        {filtered.map((cat) => (
          <View key={cat.id} style={{ gap: 12 }}>
            <Text style={t.heading} accessibilityRole="header">{cat.name}</Text>
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
                      flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: off ? c.grey50 : pressed ? c.grey50 : c.white,
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[t.label, { fontSize: 16, color: off ? c.grey500 : c.ink900 }]} numberOfLines={1}>{item.name}</Text>
                      {off ? <Text style={[t.caption, { fontSize: 11 }]}>off the menu today</Text> : null}
                    </View>
                    <Text style={[t.label, t.tab, { fontSize: 16, color: c.ink900 }]}>{cash(price)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── The footer ── */}
      <View style={{ borderTopWidth: 1, borderTopColor: c.grey100, backgroundColor: c.grey50, paddingHorizontal: space.side, paddingVertical: 12, gap: 8 }}>
        {said ? <SaidBar said={said} onDone={() => setSaid(null)} /> : null}
        {justAdded && lines.some((l) => l.uid === justAdded.uid) ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 8, backgroundColor: "#eaf4f1", paddingLeft: 12, paddingRight: 6, paddingVertical: 6 }} accessibilityLiveRegion="polite">
            <Text style={[t.label, { flex: 1, color: c.ink900 }]} numberOfLines={1}>{justAdded.name} added</Text>
            <Btn label="Customise" size={44} onPress={() => {
              const l = lines.find((x) => x.uid === justAdded.uid);
              if (l) { setCustomising(l); void numbered.refetch(); }
              setJustAdded(null);
            }} />
          </View>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            {/* ⚠ THE PAD'S OWN ARITHMETIC, labelled as such: what the dishes come to. */}
            <Text style={[t.figure, { fontSize: 18 }]}>{lines.length === 0 ? "-" : cash(total)}</Text>
            <Text style={[t.caption, { fontSize: 11 }]}>{footerLine(lines)}</Text>
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
    </View>
  );
}

/** A menu section, or a side: orange when chosen (the web's chips). */
function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: 999, borderWidth: 1,
        borderColor: on ? c.orange : c.grey300, backgroundColor: on ? c.orange50 : c.white }}
    >
      <Text style={[t.label, { fontSize: 16, color: on ? c.orange700 : c.grey700 }]}>{label}</Text>
    </Pressable>
  );
}
