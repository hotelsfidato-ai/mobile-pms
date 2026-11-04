import { router } from "expo-router";
import {
  ArrowLeftRight, Bell, ChevronDown, CircleOff, ClipboardCheck, ClipboardList, CornerUpLeft, History, Plus, Trash2, Upload,
} from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { Back, Box, Btn, body, Empty, Loading, NotYours, Pill, Select, Stale, Toast, type Said } from "../guest-services/kit";
import { LoadFailed } from "../laundry/kit";
import { Act, Transfer } from "./Act";
import { isRefused, readStore } from "./data";
import { ActionSheet, Figure, GroupHead, Tiles, type MenuChoice } from "./kit";
import { LOOK_ONLY, ON_THE_WEBSITE, whyNotChange, whyNotCorrect, whyNotSee } from "./roles";
import {
  averageText, belowLine, byCategory, cardLine, depositLine, headline, heldText, NEVER_MOVED, NOTHING_ON_HAND, ONLY_ONE_STORE,
  placesOf, rupees, shownItems, shownOnHand, storeLine, tileCounts, TILES, worthLabel, DASH,
  type StockItem, type StockKind, type StoreList, type StoreSummary, type Tile,
} from "./shelf";

/* ══════════════════════════════════════════════════════════════════
   THE STORE on a phone — the web's /h/:code/stores, the Shelf
   (src/modules/stores/pages/Stores.tsx; pictures pms-shots/all/31-store-
   and-equipment-store as the GM, roles/r-inventory-home as the Inventory
   Manager, who lands here). What is on the shelf, per store; each item's
   Receive · Issue · More; Count a store. The desk's set-up stays on the
   website, its buttons drawn grey with "On the website for now": Days,
   Reports, Import, Add an item, Set levels.
   Every figure is the server's (shelf.ts); the phone sums no rupees.
   ══════════════════════════════════════════════════════════════════ */

const ALL = "__all";

export function Store({ hotel, role, onBack }: { hotel: Hotel; role: string | null; onBack: () => void }) {
  const code = hotel.code;
  const refused = whyNotSee(role);
  const mayChange = whyNotChange(role) === null;
  const notCorrect = whyNotCorrect(role);
  const [storeId, setStoreId] = useState(ALL);
  const [tile, setTile] = useState<Tile | null>(null);
  const [more, setMore] = useState<StockItem | null>(null);
  const [acting, setActing] = useState<{ item: StockItem; kind: StockKind } | null>(null);
  const [moving, setMoving] = useState<StockItem | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);

  const q = useRead(() => (refused ? Promise.resolve(null) : readStore(code)), ["stores", code, "shelf"]);
  const off = isRefused(q.data) ? q.data.refused : null;
  const list: StoreList | null = q.data && !isRefused(q.data) ? q.data : null;

  if (refused || off) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title="Store" action={<Back onPress={onBack} />} />
        <NotYours title="Store" sentence={refused ?? off!} />
      </Screen>
    );
  }

  const places = placesOf(list ?? undefined);
  const inUseIds = new Set((list?.inUse ?? []).map((p) => p.id));
  const picked = places.find((s) => s.id === storeId) ?? null;
  const items = list ? shownItems(list, picked, tile) : [];
  const placesFor = (i: StockItem): StoreSummary[] => (i.crockery ? places : list?.stores ?? []);
  const countHref = `/stores/${code}/count${picked && !inUseIds.has(picked.id) ? `?store=${encodeURIComponent(picked.id)}` : ""}`;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Store" under={list ? headline(items) : undefined} action={<Back onPress={onBack} />} />

        {/* Shelf | Days, Reports, Import, Count a store, Add an item - the picture's order. */}
        <View style={{ gap: 6, marginTop: -4 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <ShelfDays />
            <Btn label="Reports" icon={ChevronDown} disabled onPress={() => undefined} />
            {mayChange ? (
              <>
                <Btn label="Import" icon={Upload} disabled onPress={() => undefined} />
                <Btn
                  label="Count a store" icon={ClipboardList} disabled={notCorrect !== null || !list || list.items.length === 0}
                  onPress={() => router.push(countHref as never)}
                />
                <Btn label="Add an item" icon={Plus} variant="primary" disabled onPress={() => undefined} />
              </>
            ) : null}
          </View>
          <Text style={[t.caption, { color: c.grey600 }]}>
            {mayChange ? "Days, Reports, Import and Add an item" : "Days and Reports"}: {ON_THE_WEBSITE}
          </Text>
          {mayChange && notCorrect ? <Text style={[t.caption, { color: c.grey600 }]}>Count a store: {notCorrect}</Text> : null}
        </View>

        {!mayChange ? <Text style={[body, { color: c.grey600 }]}>{LOOK_ONLY}</Text> : null}

        {list && list.stores.length > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={[t.label, { color: c.grey700 }]}>Store</Text>
            <View style={{ flex: 1, maxWidth: 260 }}>
              <Select<string>
                label="Store" value={picked?.id ?? ALL} onChange={setStoreId}
                options={[{ value: ALL, label: "All stores" }, ...places.map((s) => ({
                  value: s.id, label: `${s.name}${inUseIds.has(s.id) ? " (in use)" : ""}${s.isActive ? "" : " (switched off)"}`,
                }))]}
              />
            </View>
          </View>
        ) : null}

        {list && list.items.length > 0 ? <Tiles counts={tileCounts(list.items, picked, list.businessDate)} picked={tile} onPick={setTile} /> : null}

        {q.data === undefined ? (
          q.error ? (
            <LoadFailed
              title="The store did not load" error={q.error} onRetry={q.reload}
              offline="This device is offline, so the store cannot load. It loads by itself as soon as the connection is back."
            />
          ) : <Loading words="Reading the store…" />
        ) : !list ? null : (
          <>
            <Stale error={q.error} />
            {tile && items.length === 0 && list.items.length > 0 ? (
              <Box style={{ alignItems: "center", paddingBottom: 20 }}>
                <Empty compact title={`Nothing is ${TILES.find((x) => x.key === tile)!.label.toLowerCase()}`} description={picked ? `In ${picked.name}.` : "In any store."} />
                <Btn label="Show everything" onPress={() => setTile(null)} />
              </Box>
            ) : items.length === 0 ? (
              <Box>
                <Empty
                  title="Nothing in the store yet"
                  description={"Add what the property keeps and what it is counted in. Receiving a delivery is what gives it a quantity "
                    + `and a value - an item on its own has neither, and shows a dash rather than a zero. Add an item: ${ON_THE_WEBSITE}.`}
                />
              </Box>
            ) : byCategory(items).map(([category, group]) => (
              <View key={category} style={{ gap: space.card }}>
                <GroupHead title={category} n={group.length} />
                {group.map((i) => (
                  <ItemCard
                    key={i.id} item={i} stores={placesFor(i)} picked={picked} mayChange={mayChange}
                    onAct={(kind) => setActing({ item: i, kind })} onMore={() => setMore(i)}
                    onHistory={() => router.push(`/stores/${code}/history/${i.id}` as never)}
                  />
                ))}
              </View>
            ))}
          </>
        )}
      </Screen>

      {more && list ? (
        <ActionSheet title={more.name} onClose={() => setMore(null)} choices={moreFor(more, placesFor(more), picked, notCorrect, {
          act: (kind) => setActing({ item: more, kind }),
          move: () => setMoving(more),
          history: () => router.push(`/stores/${code}/history/${more.id}` as never),
        })} />
      ) : null}
      {acting && list ? (
        <Act
          code={code} list={list} item={acting.item} kind={acting.kind} startStoreId={picked?.id ?? null}
          onClose={() => setActing(null)} onDone={(s) => { setActing(null); setSaid(s); }}
        />
      ) : null}
      {moving && list ? (
        <Transfer
          code={code} list={list} item={moving} startFromId={picked?.id ?? null}
          onClose={() => setMoving(null)} onDone={(s) => { setMoving(null); setSaid(s); }}
        />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

/** Shelf | Days: Days is the desk's fourteen-day grid, on the website for now. */
function ShelfDays() {
  return (
    <View accessibilityRole="tablist" accessibilityLabel="Shelf or Days" style={{ flexDirection: "row", gap: 2, padding: 3, backgroundColor: c.grey100, borderRadius: 10 }}>
      <View accessibilityRole="tab" accessibilityState={{ selected: true }} style={{ minHeight: 38, paddingHorizontal: 12, borderRadius: 7, justifyContent: "center", backgroundColor: c.white }}>
        <Text style={[t.label, { color: c.ink900 }]}>Shelf</Text>
      </View>
      <View accessibilityRole="tab" accessibilityLabel={`Days: ${ON_THE_WEBSITE}`} accessibilityState={{ disabled: true }} style={{ minHeight: 38, paddingHorizontal: 12, justifyContent: "center" }}>
        <Text style={[t.label, { color: c.grey500 }]}>Days</Text>
      </View>
    </View>
  );
}

/** More (Stores.tsx 618-665): the rare acts, each with a word; a grey one says why. */
function moreFor(i: StockItem, stores: StoreSummary[], picked: StoreSummary | null, notCorrect: string | null,
  go: { act: (k: StockKind) => void; move: () => void; history: () => void }): MenuChoice[] {
  const held = shownOnHand(i, picked);
  const empty = held === null || held <= 0;
  const open = stores.filter((s) => s.isActive);
  const choices: MenuChoice[] = [
    { label: "Waste", icon: Trash2, onPress: () => go.act("wastage"), reason: empty ? NOTHING_ON_HAND : null },
    { label: "Return to supplier", icon: CornerUpLeft, onPress: () => go.act("return"), reason: empty ? NOTHING_ON_HAND : null },
    {
      label: i.crockery ? "Move into use, or to another store" : "Move to another store", icon: ArrowLeftRight, onPress: go.move,
      reason: empty ? NOTHING_ON_HAND : open.length < 2 ? ONLY_ONE_STORE : null,
    },
  ];
  if (i.crockery) choices.push({ label: "Broken", icon: CircleOff, onPress: () => go.act("breakage"), reason: empty ? NOTHING_ON_HAND : null });
  choices.push(
    { label: "Correct the count", icon: ClipboardCheck, onPress: () => go.act("adjustment"), reason: notCorrect },
    { label: i.cylinder ? "Set levels and deposit" : "Set levels", icon: Bell, onPress: () => undefined, reason: notCorrect ?? ON_THE_WEBSITE },
    { label: "History", icon: History, onPress: go.history, reason: i.movements === 0 ? NEVER_MOVED : null, gap: true },
  );
  return choices;
}

/** One thing on the shelf (ItemRow): the name on its own line, then On hand
    and Worth, then the buttons; what each store holds under a hairline. */
function ItemCard({ item, stores, picked, mayChange, onAct, onMore, onHistory }: {
  item: StockItem; stores: StoreSummary[]; picked: StoreSummary | null; mayChange: boolean;
  onAct: (k: StockKind) => void; onMore: () => void; onHistory: () => void;
}) {
  const onHand = shownOnHand(item, picked);
  const empty = onHand === null || onHand <= 0;
  const low = picked ? item.lowIn.includes(picked.id) : item.low;
  const emptiesShown = picked ? (item.emptiesByStore[picked.id] ?? null) : item.empties;
  const below = belowLine(item, stores, picked);
  const showStores = !picked && stores.length > 1;
  const foot = below || showStores || item.cylinder || (mayChange && empty);

  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: low ? c.yellow : c.grey200 }}>
      <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={t.heading}>{item.name}</Text>
            {low ? <Pill tone="warning">Low</Pill> : null}
          </View>
          <Text style={[body, { color: c.grey500 }]}>{cardLine(item, stores, picked)}</Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 24, rowGap: 12 }}>
          <Figure
            label={item.cylinder ? (picked ? `Full in ${picked.name}` : "Full") : picked ? `In ${picked.name}` : "On hand"}
            value={heldText(onHand, item.sizeMl)} unit={onHand !== null ? item.unit : null} grey={onHand === null}
          />
          {item.cylinder ? (
            <Figure label="Empty" value={heldText(emptiesShown)} unit={emptiesShown !== null ? item.unit : null} grey={emptiesShown === null} />
          ) : null}
          {/* A DASH: nothing received, nothing paid; zero would say it is worthless. */}
          <Figure label={worthLabel(picked)} value={item.value === null ? DASH : rupees(item.value)} grey={item.value === null} under={averageText(item)} />
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {mayChange ? (
            <>
              <Btn label="Receive" onPress={() => onAct("receipt")} />
              <Btn label="Issue" a11y={empty ? `Issue: ${NOTHING_ON_HAND}` : "Issue"} disabled={empty} onPress={() => onAct("issue")} />
              <Btn label="More" a11y={`More for ${item.name}`} icon={ChevronDown} onPress={onMore} />
            </>
          ) : (
            <Btn label="History" a11y={item.movements === 0 ? `History: ${NEVER_MOVED}` : "History"} disabled={item.movements === 0} onPress={onHistory} />
          )}
        </View>
      </View>

      {foot ? (
        <View style={{ borderTopWidth: 1, borderTopColor: c.grey100, paddingHorizontal: space.cardX, paddingVertical: 12, gap: 4 }}>
          {below ? <Text style={[body, t.tab, { color: c.yellow800 }]}>{below}</Text> : null}
          {showStores ? <Text style={[body, t.tab, { color: c.grey600 }]}>{storeLine(item, stores)}</Text> : null}
          {item.cylinder ? <Text style={[body, t.tab, { color: c.grey600 }]}>{depositLine(item)}</Text> : null}
          {mayChange && empty ? (
            <Text style={[body, { color: c.grey600 }]}>
              {picked ? `Nothing in ${picked.name} to issue - receive a delivery first.` : "Nothing on hand to issue - receive a delivery first."}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
