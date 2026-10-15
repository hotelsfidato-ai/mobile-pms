import { useQueryClient } from "@tanstack/react-query";
import * as Print from "expo-print";
import {
  Banknote, BedDouble, CalendarHeart, CreditCard, Plus, Printer, Receipt, Smartphone, Split, Square, SquareCheck, X,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from "react-native";
import { ApiError, HeldError, api, send, type Hotel } from "../../core/api";
import { cash as money } from "../../core/format";
import { roleAt, useSession } from "../../core/session";
import { c, face, space, t } from "../../core/theme";
import { Row, s, useRead } from "../../core/ui";
import { billHtml, logoSrc, offlineAsk, sentWords, type BillHeading, type GroupLogo } from "./bill";
import {
  anotherRow, asksCashId, billsOn, firstRow, onFunctionWords, partBody, partButton, partSums, roomAsk, setMethod, settleBody,
  settledWords, whyNotOtherWays, whyNotSettle, type PartMethod, type PartRow, type RoomAsk,
} from "./PayRules";
import { whyNotRing } from "./roles";
import type { CashId, ChargeableRoom, Order } from "./types";

/* ══════════════════════════════════════════════════════════════════
   PAYING AND PRINTING — the contract between slice 3's screens (the
   mobile chat, 15 Oct), built by the pay helper. The order screen
   renders PayActions under its own buttons; the order screen and a
   table's tile render PrintBill.

   PayActions is the web's Till order card from "Charge to <function>"
   to "Part - pay two ways" (Till.tsx 1269-1346, SplitPanel 783-922),
   drawn whole at phone width (R-15: the web clips it). Its rules and
   words are ./PayRules.ts (not pay.ts: on Windows and macOS "./Pay"
   would find that file before this one, MPOS-1). Every figure is the
   server's: the phone sends the way it was paid, the server works out
   what that is and refuses what does not add up, in its own words.
   Offline (core offline.ts): cash, card, UPI, Part and a function are
   refused with the web's sentence and nothing is held; a bill wholly to
   a room is held, said with the room charge's own warning.
   ══════════════════════════════════════════════════════════════════ */

export interface PayProps {
  hotel: Hotel;
  order: Order;
  role: string | null;
  /** Re-read the order (and the floor) after a payment changed it. */
  onChanged: () => void;
}

type Method = "room" | "cash" | "card" | "upi" | "function";
type SettleOk = Order & { ok: true; guest?: string; room?: string };
type Said = { tone: "done" | "held" | "warn"; title: string; text?: string };

const METHODS = [
  { key: "cash" as const, label: "Cash", Icon: Banknote },
  { key: "card" as const, label: "Card", Icon: CreditCard },
  { key: "upi" as const, label: "UPI", Icon: Smartphone },
];

/** A write's failure in words: held is never a failure (core send). */
const failed = (title: string, e: unknown): Said =>
  e instanceof HeldError
    ? { tone: "held", title: "Saved on this phone", text: e.message }
    : { tone: "warn", title, text: e instanceof Error ? e.message : String(e) };

/** Charge to room, Cash · Card · UPI, Part - pay two ways: the web's Till
    (Till.tsx 1269-1346, Terminal.tsx 1000-1051) and its rules. */
export function PayActions({ hotel, order, role, onChanged }: PayProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  const path = `/api/hotels/${code}/till/orders/${order.id}/settle`;
  /* ⚠ KEPT (the web's POS-4/POS-6): a failed re-read leaves the last list
     on screen, so a room can be charged with the line down. */
  const roomsKey = ["pos", code, "pay", "rooms"];
  const rooms = useRead(() => api<{ rooms: ChargeableRoom[] }>(`/api/hotels/${code}/till/rooms`).then((b) => b.rooms), roomsKey);

  const [room, setRoom] = useState("");
  const [cashId, setCashId] = useState<CashId>({});
  const [splitting, setSplitting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [ask, setAsk] = useState<RoomAsk | null>(null);
  const [askRefused, setAskRefused] = useState<string | null>(null);

  const why = whyNotSettle(order, role);
  const other = whyNotOtherWays(order, role);
  const onFunction = order.eventId !== null;

  /* A refusal may mean the bill moved under this phone (a dish added at
     the till): read it again, so what is shown is what the server holds. */
  const reread = (e: unknown) => {
    if (e instanceof ApiError && e.status !== 503) void cache.invalidateQueries({ queryKey: ["pos", code] });
  };
  const refused = (e: unknown) => {
    setSaid(failed("Not settled", e));
    reread(e);
  };

  /** Paid: said as the web says it, then every screen showing it re-reads. */
  const finished = (words: string) => {
    setSaid({ tone: "done", title: "Settled", text: words });
    setSplitting(false);
    setCashId({});
    setRoom("");
    void cache.invalidateQueries({ queryKey: ["pos", code] });
    onChanged();
  };

  async function settle(method: Exclude<Method, "room">) {
    setBusy(method);
    setSaid(null);
    try {
      const res = await send<SettleOk>("POST", path, settleBody(method, undefined, undefined, cashId));
      finished(settledWords(method, order, res));
    } catch (e) {
      refused(e);
    } finally {
      setBusy(null);
    }
  }

  /* D27-117, D27-162: a room charge asks first, naming whose bill it lands
     on - and which, when the room has two. */
  function askRoom() {
    setSaid(null);
    setAskRefused(null);
    setAsk(roomAsk(room.trim(), money(order.gross), billsOn(rooms.data, room)));
  }

  async function charge(folioId?: string) {
    const r = room.trim();
    setBusy("room");
    setAskRefused(null);
    try {
      const res = await send<SettleOk>("POST", path, settleBody("room", r, folioId, cashId));
      setAsk(null);
      finished(settledWords("room", order, res));
    } catch (e) {
      if (e instanceof HeldError) {
        setAsk(null);
        setSaid(failed("Not settled", e));
        return;
      }
      /* The server's "which of the two?" carries its choices in the body,
         which the core's ApiError does not keep: read the rooms again (the
         same app.pos_chargeable_rooms) and ask whose when there are two. */
      if (!folioId && e instanceof ApiError && e.status === 409) {
        const fresh = await api<{ rooms: ChargeableRoom[] }>(`/api/hotels/${code}/till/rooms`).then((b) => b.rooms, () => null);
        if (fresh) cache.setQueryData(roomsKey, fresh);
        const bills = billsOn(fresh ?? undefined, r);
        if (bills.length > 1) return void setAsk(roomAsk(r, money(order.gross), bills));
      }
      setAskRefused(e instanceof Error ? e.message : String(e));
      reread(e);
    } finally {
      setBusy(null);
    }
  }

  async function settleParts(rows: PartRow[]) {
    setBusy("part");
    setSaid(null);
    try {
      const res = await send<SettleOk>("POST", path, partBody(rows, cashId));
      finished(`${money(res.payable)} across ${rows.length}`);
    } catch (e) {
      refused(e);
    } finally {
      setBusy(null);
    }
  }

  /* Held words go once the bill is settled: what was held has landed. */
  const notice = said && !(said.tone === "held" && order.status !== "open") ? <Notice said={said} /> : null;
  if (order.status !== "open") return notice;

  const typed = room.trim();
  const matches = typed ? (rooms.data ?? []).filter((r) => r.room.startsWith(typed) && r.room !== typed).slice(0, 8) : [];

  return (
    <View style={{ gap: 8 }}>
      {notice}
      {splitting ? (
        <PartPanel
          order={order} cashId={cashId} setCashId={setCashId} busy={busy === "part"}
          onSettle={(rows) => void settleParts(rows)} onCancel={() => setSplitting(false)}
        />
      ) : (
        <>
          {/* ON A FUNCTION'S BILL, paid there and nowhere else (D17-21). */}
          {onFunction ? (
            <>
              <Btn
                primary label={`Charge to ${order.eventTitle ?? "the function"}`} icon={CalendarHeart}
                busy={busy === "function"} disabled={busy != null || why != null} onPress={() => void settle("function")}
              />
              <Text style={[t.label, { lineHeight: 20 }]}>{onFunctionWords(order)}</Text>
            </>
          ) : null}

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={room} onChangeText={setRoom} placeholder="Room" placeholderTextColor={c.grey500}
              editable={other == null} accessibilityLabel="Room" autoCorrect={false} autoCapitalize="characters"
              style={{
                width: 96, minHeight: 44, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: c.grey300,
                backgroundColor: other == null ? c.white : c.grey50, fontSize: 16, color: c.ink900, ...face[500], ...t.tab,
              }}
            />
            <View style={{ flex: 1 }}>
              <Btn
                label="Charge to room" icon={BedDouble} busy={busy === "room" && ask == null}
                disabled={busy != null || other != null || !typed} onPress={askRoom}
              />
            </View>
          </View>
          {/* The web's datalist: the rooms with an open bill, as typed. */}
          {matches.length > 0 && other == null ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {matches.map((r) => (
                <Pressable
                  key={r.folioId} onPress={() => setRoom(r.room)} accessibilityRole="button" accessibilityLabel={`Room ${r.room}, ${r.guest}`}
                  style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: c.grey200, backgroundColor: pressed ? c.grey100 : c.grey50 })}
                >
                  <Text style={[t.caption, { color: c.grey700 }]}><Text style={[t.tab, { color: c.ink900 }]}>{r.room}</Text> · {r.guest}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {rooms.error && !rooms.data && other == null ? (
            <Text style={t.caption}>Could not read the rooms with a guest's bill open: {rooms.error}</Text>
          ) : null}

          {asksCashId(order) ? <CashIdFields value={cashId} onChange={setCashId} /> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {METHODS.map((m) => (
              <View key={m.key} style={{ flex: 1 }}>
                <Btn
                  label={m.label} icon={m.Icon} busy={busy === m.key}
                  disabled={busy != null || other != null} onPress={() => void settle(m.key)}
                />
              </View>
            ))}
          </View>
          <Btn label="Part - pay two ways" icon={Split} disabled={busy != null || other != null} onPress={() => { setSaid(null); setSplitting(true); }} />
          {why ? <Text style={[t.caption, { color: c.grey600 }]}>{why}</Text> : null}
        </>
      )}

      <Sheet
        open={ask != null} title={ask?.title ?? ""} body={ask?.body} refused={askRefused} busy={busy === "room"}
        confirm={ask?.choices ? undefined : "Charge to room"} onConfirm={() => void charge()}
        choices={ask?.choices?.map((ch) => ({ label: ch.label, onChoose: () => void charge(ch.folioId) }))}
        onClose={() => { if (busy !== "room") setAsk(null); }}
      />
    </View>
  );
}

/* ── Part - pay two ways (SplitPanel 783-922) ─────────────────────── */

function PartPanel({ order, cashId, setCashId, busy, onSettle, onCancel }: {
  order: Order; cashId: CashId; setCashId: (v: CashId) => void; busy: boolean;
  onSettle: (rows: PartRow[]) => void; onCancel: () => void;
}) {
  const [rows, setRows] = useState<PartRow[]>([firstRow()]);
  const sums = partSums(order, rows);
  const cashAt = rows.findIndex((r) => r.method === "cash");
  const set = (i: number, patch: Partial<PartRow>) => setRows((rs) => rs.map((r, n) => (n === i ? { ...r, ...patch } : r)));

  return (
    <View style={{ gap: 8 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ gap: 6, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.grey100 }}>
          <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="radiogroup">
            {(["cash", "card", "upi"] as PartMethod[]).map((m) => (
              <Pressable
                key={m} onPress={() => setRows((rs) => rs.map((x, n) => (n === i ? setMethod(x, m) : x)))}
                accessibilityRole="radio" accessibilityState={{ checked: r.method === m }} accessibilityLabel={`Payment ${i + 1}: ${METHODS.find((x) => x.key === m)!.label}`}
                style={{ flex: 1, minHeight: 44, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center",
                  borderColor: r.method === m ? c.ink900 : c.grey300, backgroundColor: r.method === m ? c.ink900 : c.white }}
              >
                <Text style={[t.label, { color: r.method === m ? c.white : c.grey700 }]}>{METHODS.find((x) => x.key === m)!.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Amount value={r.amount} onChange={(amount) => set(i, { amount })} placeholder="Amount" label={`Payment ${i + 1}: amount`} />
            {rows.length > 1 ? (
              <Pressable
                onPress={() => setRows((rs) => rs.filter((_, n) => n !== i))} accessibilityRole="button" accessibilityLabel="Remove this payment"
                style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.red50 : "transparent" })}
              >
                <X size={16} color={c.grey500} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}

      {cashAt >= 0 ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Text style={[t.label, { width: 96 }]}>Cash given</Text>
          <Amount value={rows[cashAt]!.tendered} onChange={(tendered) => set(cashAt, { tendered })} placeholder="500" label="Cash given" />
        </View>
      ) : null}

      <Btn ghost label="Another payment" icon={Plus} onPress={() => setRows((rs) => [...rs, anotherRow(sums.left)])} />

      {asksCashId(order) ? <CashIdFields value={cashId} onChange={setCashId} /> : null}

      <View style={{ borderTopWidth: 1, borderTopColor: c.grey200, paddingTop: 8 }}>
        <Row label="Bill" value={money(sums.bill)} />
        <Row label="Taken" value={money(sums.taken)} />
        {!sums.balanced ? <Row label={sums.left > 0 ? "Still to take" : "Over by"} value={money(Math.abs(sums.left))} strong /> : null}
        {sums.change != null && sums.change > 0 ? <Row label="Change due" value={money(sums.change)} strong /> : null}
      </View>

      <Btn primary label={partButton(sums)} icon={Receipt} busy={busy} disabled={busy || !sums.balanced} onPress={() => onSettle(rows)} />
      <Btn ghost label="Cancel" onPress={onCancel} />
    </View>
  );
}

/* ── More than ₹1,00,000 in cash (CashIdFields.tsx, D25-40, Rule 159) ── */

function CashIdFields({ value, onChange }: { value: CashId; onChange: (next: CashId) => void }) {
  const tick = (key: "form97" | "nonResident", label: string) => (
    <Pressable
      onPress={() => onChange({ ...value, [key]: !value[key] })} accessibilityRole="checkbox"
      accessibilityState={{ checked: value[key] === true }} accessibilityLabel={label}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 }}
    >
      {value[key] ? <SquareCheck size={20} color={c.orange} /> : <Square size={20} color={c.grey500} />}
      <Text style={[t.label, { color: c.ink900 }]}>{label}</Text>
    </Pressable>
  );
  return (
    /* A washed panel, not a box in a box: it sits inside the order's card. */
    <View style={{ borderRadius: 8, backgroundColor: c.grey50, paddingHorizontal: 14, paddingVertical: 12, gap: 8 }}>
      <Text style={t.label}>More than ₹1,00,000 in cash needs the guest's PAN, Form 97, or a guest from abroad.</Text>
      <TextInput
        value={value.pan ?? ""} onChangeText={(pan) => onChange({ ...value, pan: pan.toUpperCase() })}
        placeholder="PAN, like ABCDE1234F" placeholderTextColor={c.grey500} maxLength={10} autoComplete="off"
        autoCorrect={false} autoCapitalize="characters" accessibilityLabel="Guest's PAN"
        style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white, fontSize: 16, color: c.ink900, ...face[500] }}
      />
      {tick("form97", "No PAN: Form 97 taken")}
      {tick("nonResident", "Guest from abroad")}
    </View>
  );
}

/* ── Print the bill (flows/printBill.tsx, pages/Bill.tsx) ─────────── */

/** Print the bill: queued for the bill-printer computer (POST bill-print),
    else from the phone (expo-print, M-9). */
export function PrintBill({ hotel, orderId, onPrinted }: { hotel: Hotel; orderId: string; onPrinted?: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const session = useSession();
  const why = whyNotRing(session.who ? roleAt(session.who, code) : null);
  const base = `/api/hotels/${code}/till/orders/${orderId}`;
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const [ask, setAsk] = useState<{ title: string; body: string } | null>(null);

  /* The print is written down first (so the bill printer does not print
     it too, and the next one says DUPLICATE), then the paper, laid out by
     ./bill.ts from the server's order under the server's heading. */
  async function here() {
    const [order, group] = await Promise.all([
      api<Order>(base),
      api<{ name: string | null; logo: GroupLogo | null; hotelLogo?: GroupLogo | null }>(`/api/hotels/${code}/group`).catch(() => null),
    ]);
    const told = await send<{ ok: true; heading: BillHeading }>("POST", `${base}/bill-print/here`, {});
    const html = billHtml({
      order, heading: told.heading, test: Boolean(hotel.testOf),
      group: { name: group?.name ?? null, logo: logoSrc(group?.hotelLogo) ?? logoSrc(group?.logo) },
    });
    await Print.printAsync({ html });
  }

  async function print() {
    setBusy(true);
    setSaid(null);
    try {
      const res = await send<{ ok: true; heading: BillHeading; sentTo: { name: string; online: boolean } | null }>("POST", `${base}/bill-print`, {});
      /* An unpaid bill asked for is the floor's "Bill printed". */
      onPrinted?.();
      void cache.invalidateQueries({ queryKey: ["pos", code] });
      if (!res.sentTo) await here();
      else if (res.sentTo.online) setSaid({ tone: "done", title: sentWords(res.heading, res.sentTo.name) });
      else setAsk(offlineAsk(res.heading, res.sentTo.name));
    } catch (e) {
      setSaid(failed("Not printed", e));
    } finally {
      setBusy(false);
    }
  }

  async function printHere() {
    setBusy(true);
    try {
      await here();
      setAsk(null);
    } catch (e) {
      setAsk(null);
      setSaid(failed("Not printed", e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Btn label="Print the bill" icon={Printer} busy={busy && ask == null} disabled={busy || why != null} onPress={() => void print()} />
      {why ? <Text style={[t.caption, { color: c.grey600 }]}>{why}</Text> : null}
      {said ? <Notice said={said} /> : null}
      <Sheet
        open={ask != null} title={ask?.title ?? ""} body={ask?.body} busy={busy}
        confirm="Print here" onConfirm={() => void printHere()} onClose={() => { if (!busy) setAsk(null); }}
      />
    </View>
  );
}

/* ── The pieces ───────────────────────────────────────────────────── */

/** The web's Button at "lg": a 44px capsule. Primary is orange-600 (white
    on orange fails AA); secondary white on a grey-300 ring; ghost bare. */
function Btn({ label, icon: Icon, onPress, disabled, busy, primary, ghost }: {
  label: string; icon?: typeof Printer; onPress: () => void; disabled?: boolean; busy?: boolean; primary?: boolean; ghost?: boolean;
}) {
  const fg = primary ? (disabled ? c.grey600 : c.white) : disabled ? c.grey500 : ghost ? c.grey600 : c.ink900;
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(busy) }}
      style={({ pressed }) => ({
        minHeight: 44, paddingHorizontal: 12, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        borderWidth: primary || ghost ? 0 : 1, borderColor: c.grey300,
        backgroundColor: primary
          ? disabled ? c.grey300 : pressed ? c.orange700 : c.orange600
          : ghost ? (pressed ? c.grey100 : "transparent") : disabled ? c.grey50 : pressed ? c.grey100 : c.white,
      })}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[t.heading, { color: fg, ...face[primary ? 600 : 500] }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const TONE = {
  done: [c.white, c.grey200, c.ink900],
  held: [c.yellow50, c.yellow100, c.yellow800],
  warn: [c.red50, c.red100, c.red700],
} as const;

function Notice({ said }: { said: Said }) {
  const [bg, ring, fg] = TONE[said.tone];
  return (
    <View style={[s.card, { backgroundColor: bg, borderColor: ring, gap: 4 }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={[t.heading, { color: fg }]}>{said.title}</Text>
      {said.text ? <Text style={[t.label, { color: c.grey700 }]}>{said.text}</Text> : null}
    </View>
  );
}

function Amount({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <TextInput
      value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.grey500}
      keyboardType="decimal-pad" accessibilityLabel={label}
      style={{ flex: 1, minHeight: 44, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white, fontSize: 16, color: c.ink900, ...face[500], ...t.tab }}
    />
  );
}

/** AskDialog as a sheet from the bottom: a question, its answers, and a
    refusal read in the same box (D27-162). */
function Sheet({ open, title, body, refused, busy, confirm, onConfirm, choices, onClose }: {
  open: boolean; title: string; body?: string; refused?: string | null; busy: boolean;
  confirm?: string; onConfirm?: () => void; choices?: { label: string; onChoose: () => void }[]; onClose: () => void;
}) {
  const answers: ReactNode = choices ? (
    <View style={{ gap: 8 }}>
      {choices.map((ch) => <Btn key={ch.label} label={ch.label} disabled={busy} onPress={ch.onChoose} />)}
      <Btn ghost label="Cancel" disabled={busy} onPress={onClose} />
    </View>
  ) : (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ flex: 1 }}><Btn label="Cancel" disabled={busy} onPress={onClose} /></View>
      <View style={{ flex: 1 }}><Btn primary label={confirm ?? "OK"} busy={busy} disabled={busy} onPress={() => onConfirm?.()} /></View>
    </View>
  );
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space.side, paddingTop: 18, paddingBottom: 28, gap: 14 }}>
          <Text style={t.heading} accessibilityRole="header">{title}</Text>
          {body ? <Text style={[t.label, { color: c.grey700 }]}>{body}</Text> : null}
          {refused ? <Text style={[t.label, { color: c.red700 }]} accessibilityRole="alert">{refused}</Text> : null}
          {answers}
        </View>
      </View>
    </Modal>
  );
}

