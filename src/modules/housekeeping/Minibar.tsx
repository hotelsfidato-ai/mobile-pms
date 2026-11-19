import { useQueryClient } from "@tanstack/react-query";
import { GlassWater, Plus } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { currentSubject, outcomeUnknown, type Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import { newKey } from "../../core/offline";
import { c, space, t } from "../../core/theme";
import { Head, notKnown, Screen, useRead, useStuck } from "../../core/ui";
import { dateTime } from "../night-audit/audit";
import {
  changeItemBody, countable, countedText, decideBody, decidedWords, guestText, itemSavedWords, KEEP_REFUSED, lineText,
  listEmpty, listNote, money, newItemBody, NO_PRICE, priceInput, priceText, RECORD_COLUMNS, recordedLine, recordedOf,
  recordedPill, recordRow, shownItems, startStore, step, stockText, takeBody, takeLabel, takeLines, takenWords, waitingOf,
  waitingPill, whatWasTaken, whyNotDecline, whyNotOpenTake, whyNotSaveItem, whyNotTake, DESK_DECIDES,
  type Counts, type Minibar as MinibarData, type MinibarItem, type MinibarRecord,
} from "./care";
import { addMinibarItem, changeMinibarItem, decideMinibar, readMinibar, recordMinibar } from "./careData";
import {
  Act, Back, body, Box, Btn, Dialog, Empty, Failed, Field, Foot, Hairline, InDialog, Input, Loading, NotYours, Pill,
  saidOf, SectionHead, Select, Stale, Stepper, Tick, Toast, type Said,
} from "./careKit";
import { formKeeper } from "./repair";

/* ══════════════════════════════════════════════════════════════════
   MINIBAR on a phone - the web's /h/:code/minibar (16 Nov release,
   D27-383 item 10, D27-396): pages/Minibar.tsx and flows/MinibarFlow.tsx.
   No picture was taken of it (the set is of 31 Oct): built from the code.
   Three parts, the first the desk's:
     Waiting for the desk - a take housekeeping was not sure of, or one
       found after the guest had left: Charge to the bill, or Not charged
       with why.
     Recorded, the last 14 days - on the bill, not charged, or taken off
       the bill (the bill's own Reverse; nothing here undoes a charge).
     The list - each item, its price (a dash until typed), its store and
       what that store holds; Add an item and Change for those who keep it.
   Record for a room opens the take (MinibarFlow): how many of each, and
   "Not sure" to send it to the desk.
   WHO MAY is the server's answer (`mayRecord`, `mayKeep`, `mayDecide`): a
   control it refuses is grey with the sentence, never hidden (rules and
   words: ./care.ts). MONEY: each figure as the server sent it; the phone
   multiplies and adds nothing (the web's "₹X before tax" is a browser sum).
   Every write here is refused offline in the web's words (careData.ts).
   ══════════════════════════════════════════════════════════════════ */

/** Each time a read lands: a card stuck on an unknown outcome waits for one (MEMORY 16). */
function useReadEpoch(loading: boolean) {
  const [epoch, setEpoch] = useState(0);
  const was = useRef(loading);
  useEffect(() => {
    if (was.current && !loading) setEpoch((e) => e + 1);
    was.current = loading;
  }, [loading]);
  return epoch;
}

export function Minibar({ hotel, room, onBack }: { hotel: Hotel; room?: string; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const q = useRead(() => readMinibar(code), ["housekeeping", code, "minibar"]);
  const [taking, setTaking] = useState(Boolean(room));
  const [editing, setEditing] = useState<MinibarItem | "new" | null>(null);
  const [pulled, setPulled] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const unsay = useCallback(() => setSaid(null), []);
  const epoch = useReadEpoch(q.loading);
  useEffect(() => { if (!q.loading) setPulled(false); }, [q.loading]);

  const refresh = () => void cache.invalidateQueries({ queryKey: ["housekeeping", code, "minibar"] });
  const d = q.data;
  const refused = !d && q.error ? refusalOf(q.error) : null;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Minibar" under="What each room's minibar holds, what was taken, and what waits for the desk." action={<Back onPress={onBack} />} />
        {d ? (
          <View style={{ gap: 12 }}>
            <Act label="Record for a room" icon={GlassWater} variant="primary" reason={whyNotOpenTake(d)} onPress={() => setTaking(true)} />
            <ExportButtons table={{
              title: "Minibar", subtitle: `${hotel.name} · the last 14 days`, columns: RECORD_COLUMNS,
              rows: d.records.map((r) => recordRow(r, dateTime)),
            }} />
          </View>
        ) : null}
        <Stale error={d ? q.error : undefined} />

        {!d ? (
          refused ? <NotYours title="The minibar" sentence={refused} />
            : q.error ? <Failed title="The minibar did not load" error={q.error} onRetry={q.reload} />
              : <Loading words="Reading the minibar…" />
        ) : (
          <>
            <Waiting code={code} d={d} epoch={epoch} onDone={(s) => { setSaid(s); refresh(); }} onUnknown={refresh} />
            <Recorded records={recordedOf(d)} />
            <TheList d={d} onAdd={() => setEditing("new")} onChange={setEditing} />
          </>
        )}
      </Screen>
      <Toast said={said} onClose={unsay} />

      {taking && d ? (
        <TakeDialog code={code} items={d.items} room={room}
          onClose={() => { setTaking(false); refresh(); }}
          onDone={(s) => { setTaking(false); setSaid(s); refresh(); }} />
      ) : null}
      {editing && d ? (
        <ItemDialog code={code} d={d} item={editing === "new" ? null : editing}
          onClose={() => { setEditing(null); refresh(); }}
          onDone={(s) => { setEditing(null); setSaid(s); refresh(); }} />
      ) : null}
    </View>
  );
}

/** A read the server refused this person (403): its own sentence, the screen's state. */
function refusalOf(error: string): string | null {
  return /is for .*Ask one of them\.$/.test(error) ? error : null;
}

/* ── Waiting for the desk ───────────────────────────────────────── */

function Waiting({ code, d, epoch, onDone, onUnknown }: {
  code: string; d: MinibarData; epoch: number; onDone: (s: Said) => void; onUnknown: () => void;
}) {
  const waiting = waitingOf(d);
  return (
    <View style={{ gap: 12 }}>
      <SectionHead title="Waiting for the desk" pill={<Pill tone={waiting.length ? "warning" : "neutral"}>{String(waiting.length)}</Pill>} />
      {waiting.length === 0 ? (
        <Box><Empty compact title="Nothing waits for the desk" description="A take housekeeping is not sure of, or one found after the guest left, shows here." /></Box>
      ) : waiting.map((r) => (
        <WaitingCard key={r.id} code={code} r={r} mayDecide={d.mayDecide} epoch={epoch} onDone={onDone} onUnknown={onUnknown} />
      ))}
    </View>
  );
}

function WaitingCard({ code, r, mayDecide, epoch, onDone, onUnknown }: {
  code: string; r: MinibarRecord; mayDecide: boolean; epoch: number; onDone: (s: Said) => void; onUnknown: () => void;
}) {
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  /* The route reads no key: a lost reply then a second tap could charge twice
     but for the server's "already decided". Stuck until the list is read again. */
  const stuck = useStuck();
  const [stuckAt, setStuckAt] = useState<number | null>(null);
  const [unknownLine, setUnknownLine] = useState<string | null>(null);
  const held = stuckAt !== null && epoch <= stuckAt;

  async function decide(charge: boolean) {
    if (latch.current || held) return;
    if (!charge && whyNotDecline(note)) { setSaid({ title: whyNotDecline(note)!, tone: "bad" }); return; }
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await decideMinibar(code, r.id, decideBody(charge, note));
      onDone({ title: decidedWords(charge, r.room), tone: "ok" });
    } catch (e) {
      if (stuck.stop(e)) {
        const k = notKnown(charge ? "charged" : "decided", "this room's take once the list is read again", e);
        setUnknownLine(k.line);
        setStuckAt(epoch);
        onUnknown();
      } else setSaid(saidOf(charge ? "Not charged to the bill" : "Not decided", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.yellow100, backgroundColor: c.yellow50, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Text style={[t.figure]}>{r.room}</Text>
        <Pill tone="warning">{waitingPill(r)}</Pill>
      </View>
      <Text style={[body, { color: c.ink900, fontSize: 16, lineHeight: 24 }]}>{whatWasTaken(r)}</Text>
      {r.lines.map((l) => <Text key={l.item} style={[t.label, t.tab, { color: c.grey600, lineHeight: 20 }]}>{lineText(l)}</Text>)}
      <Text style={[t.label, { color: c.grey600, lineHeight: 20 }]}>{guestText(r)}</Text>
      <Text style={[t.label, { color: c.grey500, lineHeight: 20 }]}>{r.recordedBy ?? "-"}, {dateTime(r.recordedAt)}</Text>
      {!mayDecide ? (
        <Text style={[body, { marginTop: 4 }]}>{DESK_DECIDES}</Text>
      ) : held ? (
        <Text style={[body, { color: c.yellow800, marginTop: 4 }]} accessibilityRole="alert">{unknownLine}</Text>
      ) : declining ? (
        <View style={{ gap: 8, marginTop: 8 }}>
          <Input label="Why it is not charged" placeholder="Why it is not charged" value={note} onChangeText={setNote} rows={2} />
          <Foot>
            <Btn label="Cancel" grow onPress={() => { setDeclining(false); setSaid(null); }} />
            <Btn label="Not charged" variant="danger" grow busy={busy} disabled={!note.trim()} onPress={() => void decide(false)} />
          </Foot>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <Btn label="Charge to the bill" variant="primary" busy={busy} onPress={() => void decide(true)} />
          <Btn label="Not charged" onPress={() => setDeclining(true)} />
        </View>
      )}
      <InDialog said={said} />
    </View>
  );
}

/* ── Recorded, the last 14 days ─────────────────────────────────── */

function Recorded({ records }: { records: MinibarRecord[] }) {
  return (
    <View style={{ gap: 12 }}>
      <SectionHead title="Recorded, the last 14 days" />
      <Box>
        {records.length === 0 ? (
          <Empty compact title="Nothing recorded yet" description="What housekeeping or the desk records from a room shows here." />
        ) : records.map((r, i) => {
          const p = recordedPill(r);
          return (
            <View key={r.id}>
              {i ? <Hairline /> : null}
              <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
                  <Text style={[t.heading, t.tab, { width: 52 }]}>{r.room}</Text>
                  <Text style={[body, { flex: 1, color: c.ink900 }]}>{whatWasTaken(r)}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {/* What reached the bill WITH its tax: the server's figure, a dash when nothing did. */}
                  <Text style={[t.label, t.tab, { color: c.grey600 }]}>{money(r.charged)}</Text>
                  <Pill tone={p.tone}>{p.label}</Pill>
                </View>
                <Text style={[t.label, { color: c.grey500, lineHeight: 20 }]}>{recordedLine(r, dateTime)}</Text>
              </View>
            </View>
          );
        })}
      </Box>
    </View>
  );
}

/* ── The list ───────────────────────────────────────────────────── */

function TheList({ d, onAdd, onChange }: { d: MinibarData; onAdd: () => void; onChange: (i: MinibarItem) => void }) {
  const addWhy = !d.mayKeep ? KEEP_REFUSED : d.stock.length === 0 ? "Add the items to the Store first, then here." : null;
  return (
    <Box style={{ marginTop: 8 }}>
      <View style={{ paddingHorizontal: space.cardX, paddingTop: space.cardY, paddingBottom: 12, gap: 8 }}>
        <Text style={t.heading} accessibilityRole="header">The list</Text>
        <Text style={[body, { color: c.grey500 }]}>{listNote(d.mayKeep)}</Text>
        {d.mayKeep ? <Act label="Add an item" icon={Plus} reason={addWhy} onPress={onAdd} /> : null}
      </View>
      <Hairline />
      {d.items.length === 0 ? (
        <Empty compact title="No minibar list yet" description={listEmpty(d)} />
      ) : d.items.map((i, k) => (
        <View key={i.id}>
          {k ? <Hairline /> : null}
          <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text style={[body, { color: c.ink900, fontSize: 16 }]}>{i.name}</Text>
                {i.alcohol ? <Pill>VAT</Pill> : null}
                {!i.active ? <Pill>Off</Pill> : null}
              </View>
              <Text style={[t.label, t.tab, { color: c.ink900 }]}>{priceText(i)}</Text>
              <Text style={[t.caption, t.tab]}>{stockText(i)}</Text>
            </View>
            {d.mayKeep ? <Btn label="Change" variant="ghost" a11y={`Change ${i.name}`} onPress={() => onChange(i)} /> : null}
          </View>
        </View>
      ))}
    </Box>
  );
}

/* ── What was taken from a room (MinibarFlow) ───────────────────── */

function TakeDialog({ code, items, room: fixedRoom, onClose, onDone }: {
  code: string; items: MinibarItem[]; room?: string; onClose: () => void; onDone: (s: Said) => void;
}) {
  const [room, setRoom] = useState(fixedRoom ?? "");
  const [count, setCount] = useState<Counts>({});
  const [disputed, setDisputed] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  /* ONE TAKE, ONE KEY (D27-396): minted when the dialog opens and sent with
     every tap, so a double tap or a try after a lost reply is answered with
     the first record - never a second refill or charge. */
  const keys = useRef<ReturnType<typeof formKeeper> | null>(null);
  if (!keys.current) keys.current = formKeeper(newKey(), currentSubject);

  const shown = shownItems(items);
  const lines = takeLines(items, count);
  const why = whyNotTake(room, lines);

  async function save() {
    if (latch.current) return;
    if (why) { setSaid({ title: why, tone: "bad" }); return; }
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      const res = await recordMinibar(code, takeBody(room, lines, disputed), keys.current!);
      /* Closed BEFORE the list is read again, so a second tap has nothing to press. */
      onDone({ title: takenWords(room, res.data), tone: "ok" });
    } catch (e) {
      if (outcomeUnknown(e)) {
        /* Nothing came back: the counts empty, the KEY STAYS (this dialog's), so a
           new count sent from here is the same take if the first was made. */
        const k = notKnown("recorded", "Waiting for the desk and Recorded", e);
        setCount({});
        setSaid({ title: k.title, body: k.body, tone: "held" });
      } else setSaid(saidOf("Not recorded", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog title={fixedRoom ? `Minibar · Room ${fixedRoom}` : "Minibar"}
      description="How many of each were taken. It goes on the guest's bill, and the refill comes out of the store." onClose={onClose}>
      {!fixedRoom ? (
        <Field label="Room" required>
          <Input label="Room" value={room} onChangeText={setRoom} placeholder="204" autoCapitalize="characters" />
        </Field>
      ) : null}
      {shown.length === 0 ? (
        <Text style={t.label}>This hotel has no minibar list yet.</Text>
      ) : (
        <View>
          {shown.map((i, k) => (
            <View key={i.id}>
              {k ? <Hairline /> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[body, { color: c.ink900, fontSize: 16 }]} numberOfLines={2}>{i.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={[t.label, t.tab, { color: c.grey500 }]}>{countable(i) ? money(i.price) : NO_PRICE}</Text>
                    {i.alcohol ? <Pill>VAT</Pill> : null}
                  </View>
                </View>
                {countable(i) ? <Stepper n={count[i.id] ?? 0} name={i.name} onStep={(by) => { setCount((x) => step(x, i.id, by)); setSaid(null); }} /> : null}
              </View>
            </View>
          ))}
        </View>
      )}
      <Tick on={disputed} onChange={setDisputed} label="Not sure, or the guest says not theirs - the desk confirms it" />
      <Text style={[t.label, t.tab]}>{countedText(lines)}</Text>
      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" grow tall onPress={onClose} />
        {/* Grey until counted, and says why when tapped (the board's MarkButton). */}
        <Btn label={takeLabel(disputed)} variant="primary" grow tall busy={busy} style={why ? { opacity: 0.6 } : undefined} onPress={() => void save()} />
      </Foot>
    </Dialog>
  );
}

/* ── An item on the list (Minibar.tsx ItemDialog) ───────────────── */

function ItemDialog({ code, d, item, onClose, onDone }: {
  code: string; d: MinibarData; item: MinibarItem | null; onClose: () => void; onDone: (s: Said) => void;
}) {
  const [stockId, setStockId] = useState("");
  const [storeId, setStoreId] = useState(item?.storeId ?? "");
  const [price, setPrice] = useState(priceInput(item));
  const [active, setActive] = useState(item?.active ?? true);
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useStuck();
  const chosen = d.stock.find((s) => s.id === stockId);
  const why = stuck.stuck ? "Not known whether it was saved: close this and look at the list first." : whyNotSaveItem(!item, stockId, storeId);
  /* The stores the server sends; one the item has that is no longer listed still shows. */
  const stores = [...d.stores.map((s) => ({ value: s.id, label: s.name })),
    ...(item && !d.stores.some((s) => s.id === item.storeId) ? [{ value: item.storeId, label: item.store }] : [])];

  async function save() {
    if (latch.current || stuck.isStuck() || why) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      if (item) await changeMinibarItem(code, item.id, changeItemBody(price, storeId, active));
      else await addMinibarItem(code, newItemBody(stockId, price, storeId));
      onDone({ title: itemSavedWords(item?.name ?? chosen?.name ?? null, !item), tone: "ok" });
    } catch (e) {
      if (stuck.stop(e)) {
        const k = notKnown("saved", "the list", e);
        setSaid({ title: k.title, body: k.body, tone: "held" });
      } else setSaid(saidOf("Not saved", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog title={item ? item.name : "Add an item to the minibar"}
      description="The price is what the guest pays before tax. Leave it empty until it is decided: it cannot be charged until then." onClose={onClose}>
      {!item ? (
        <Field label="Store item" required>
          <Select label="Store item" value={stockId} placeholder="Choose one"
            options={d.stock.map((s) => ({ value: s.id, label: `${s.name} (${s.unit})` }))}
            onChange={(v) => { setStockId(v); const s = d.stock.find((x) => x.id === v); if (s) setStoreId(startStore(d.stores, s.alcohol)); }} />
        </Field>
      ) : null}
      <Field label="Price, before tax" hint="In rupees. Empty: no price yet">
        <Input label="Price, before tax" value={price} onChangeText={setPrice} placeholder="-" keyboardType="decimal-pad" inputMode="decimal" />
      </Field>
      <Field label="Refilled from" required>
        <Select label="Refilled from" value={storeId} placeholder="Choose a store" options={stores} onChange={setStoreId} />
      </Field>
      {item ? (
        <Field label="On the list">
          <Select label="On the list" value={active ? "on" : "off"} onChange={(v) => setActive(v === "on")}
            options={[{ value: "on", label: "On - housekeeping counts it" }, { value: "off", label: "Off - not in the minibar any more" }]} />
        </Field>
      ) : null}
      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" grow tall onPress={onClose} />
        <Btn label={item ? "Save" : "Add to the minibar"} variant="primary" grow tall busy={busy} disabled={Boolean(why)} onPress={() => void save()} />
      </Foot>
      {why && !said ? <Text style={[t.caption, { color: c.grey600 }]}>{why}</Text> : null}
    </Dialog>
  );
}
