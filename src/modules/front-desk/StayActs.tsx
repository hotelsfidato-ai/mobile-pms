import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight, Ban, BedDouble, CalendarRange, Check, ChevronDown, DoorOpen, FileText, Gift, IndianRupee, Plus, Repeat, X, type LucideIcon,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { HeldError, type Hotel } from "../../core/api";
import { cash } from "../../core/format";
import { c, t } from "../../core/theme";
import { useRead } from "../../core/ui";
import { Day } from "../housekeeping/DayStepper";
import {
  addStayInclusion, amendStay, cancelConfirmed, cancelPreview, cancelWaiting, confirmWaiting, exchangeRooms, moveRoom, readExchangeable, readInclusions,
  readReasons, readStayInclusions, removeStayInclusion, said, unassignRoom, voidStay, type DeskStay,
} from "./data";
import { addDays, amendLine, amendWrong, day, MOVE_REASONS, nightsBetween } from "./desk";
import { body, Box, Button, Field, FormSheet, Pick, Pill, Sheet, Toggle, WEBSITE, type Said } from "./kit";
import { mayGiveComp, whyNotChange } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   MORE OPTIONS — the web's StayActions.tsx: everything that is not the
   obvious act, grouped, each saying why it cannot be picked. Order is by
   when it happens; destructive things last, in red. Each act is the web's
   flow: AmendStayFlow, MoveRoomFlow, ExchangeRoomFlow, InclusionsFlow,
   VoidFlow, and reservations' CancelConfirmedFlow and CancelWaitingFlow.
   Every one needs the server: refused offline with the web's words, but
   for Take them out of the room, which is held, warned (`unassign`).
   ══════════════════════════════════════════════════════════════════ */

type Act = "menu" | "amend" | "move" | "swap" | "inclusions" | "cancel" | "void";

export function MoreOptions({ hotel, stay, role, onSaid }: { hotel: Hotel; stay: DeskStay; role: string | null; onSaid: (s: Said) => void }) {
  const code = hotel.code;
  const [act, setAct] = useState<Act | null>(null);
  const cache = useQueryClient();
  const refused = whyNotChange(role);
  const arrived = stay.status === "in-house" || stay.status === "due-out";
  const over = stay.status === "no-show";
  const waiting = stay.status === "tentative";
  const done = (s: Said) => { setAct(null); onSaid(s); void cache.invalidateQueries(); };
  const close = () => setAct(null);

  const confirm = async () => {
    setAct(null);
    try {
      await confirmWaiting(code, stay.id);
      done({ title: "Confirmed", body: `${stay.reference}: the voucher can go now.`, tone: "ok" });
    } catch (e) { onSaid({ title: "Not confirmed", body: said(e), tone: "bad" }); }
  };

  const notArrived = over ? "This stay is over." : "They have not arrived yet.";
  const gone = arrived ? "They have arrived. Check them out instead." : null;
  return (
    <>
      <Button label="More options" Trail={ChevronDown} reason={refused} onRefused={(r) => onSaid({ title: r, tone: "held" })} onPress={() => setAct("menu")} />
      <Sheet open={act === "menu"} onClose={close} title="More options">
        <ScrollView>
          <Group title="The booking" />
          {waiting ? <Item Icon={Check} label="Confirm the booking" onPress={() => void confirm()} /> : null}
          <Item Icon={CalendarRange} label="Change dates or guests" reason={over ? "This stay is over." : null} onPress={() => setAct("amend")} />
          <Item Icon={FileText} label="View voucher" reason={stay.status !== "due-in" ? "Only a confirmed booking still to arrive has a voucher." : WEBSITE} onPress={close} />
          <Group title="The room" />
          <Item
            Icon={ArrowLeftRight} label="Move to another room" onPress={() => setAct("move")}
            reason={arrived ? null : over ? "This stay is over." : "They have not arrived yet - change the room with Assign room on the Calendar."}
          />
          <Item Icon={Repeat} label="Exchange with another guest" reason={arrived ? null : notArrived} onPress={() => setAct("swap")} />
          <Group title="The rate" />
          <Item Icon={Gift} label="What this booking includes" onPress={() => setAct("inclusions")} />
          {mayGiveComp(role) && stay.status === "due-in" ? <Item Icon={IndianRupee} label="Change rate" reason={WEBSITE} onPress={close} /> : null}
          <View style={{ height: 1, backgroundColor: c.grey200, marginVertical: 6 }} />
          <Item
            Icon={Ban} danger label="Cancel this booking" onPress={() => setAct("cancel")}
            reason={waiting || stay.status === "due-in" ? null : gone ?? "Only a booking that has not arrived can be cancelled."}
          />
          {!waiting ? (
            <Item
              Icon={Ban} danger label="Void this booking" onPress={() => setAct("void")}
              reason={stay.status === "due-in" ? null : gone ?? "Only a booking that has not arrived can be voided."}
            />
          ) : null}
        </ScrollView>
      </Sheet>

      {act === "amend" ? <Amend code={code} stay={stay} onClose={close} onDone={done} /> : null}
      {act === "move" ? <Move code={code} stay={stay} businessDate={hotel.businessDate} onClose={close} onDone={done} /> : null}
      {act === "swap" ? <Exchange code={code} stay={stay} businessDate={hotel.businessDate} onClose={close} onDone={done} /> : null}
      {act === "inclusions" ? <Inclusions code={code} stay={stay} onClose={close} /> : null}
      {act === "void" ? <VoidIt code={code} stay={stay} onClose={close} onDone={done} /> : null}
      {act === "cancel" ? <CancelIt code={code} stay={stay} waiting={waiting} role={role} onClose={close} onDone={done} /> : null}
    </>
  );
}

const Group = ({ title }: { title: string }) => <Text style={[t.eyebrow, { marginTop: 10, marginBottom: 2 }]}>{title}</Text>;

function Item({ Icon, label, onPress, reason, danger }: { Icon: LucideIcon; label: string; onPress: () => void; reason?: string | null | undefined; danger?: boolean }) {
  const off = reason != null;
  const ink = off ? c.grey500 : danger ? c.red700 : c.ink900;
  return (
    <Pressable
      onPress={off ? undefined : onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: off }} accessibilityHint={reason ?? undefined}
      style={({ pressed }) => ({ minHeight: 44, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: pressed && !off ? c.grey50 : c.white })}
    >
      <Icon size={16} color={ink} />
      <View style={{ flex: 1 }}>
        <Text style={[t.label, { color: ink }]}>{label}</Text>
        {reason ? <Text style={t.caption}>{reason}</Text> : null}
      </View>
    </Pressable>
  );
}

/** ReadyReasons.tsx: tapped, one fills the reason box. Nothing drawn while the hotel has none. */
function Ready({ code, kind, onPick }: { code: string; kind: "reason_void" | "reason_cancel"; onPick: (r: string) => void }) {
  const q = useRead(() => readReasons(code, kind), ["front-desk", code, "lists", kind]);
  const ready = (q.data ?? []).filter((r) => r.active);
  if (ready.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {ready.map((r) => <Button key={r.id} label={r.label} size="sm" onPress={() => onPick(r.label)} />)}
    </View>
  );
}

const Foot = ({ cancel = "Cancel", onCancel, children }: { cancel?: string; onCancel: () => void; children: ReactNode }) => (
  <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
    <Button label={cancel} size="lg" onPress={onCancel} />
    {children}
  </View>
);

/* ── Change dates or guests (AmendStayFlow.tsx) ──────────────────── */
function Amend({ code, stay, onClose, onDone }: { code: string; stay: DeskStay; onClose: () => void; onDone: (s: Said) => void }) {
  const [checkIn, setCheckIn] = useState(stay.arrival);
  const [checkOut, setCheckOut] = useState(stay.departure);
  const [adults, setAdults] = useState(String(stay.adults));
  const [children, setChildren] = useState(String(stay.children));
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState<Said | null>(null);
  const arrived = stay.status === "in-house" || stay.status === "due-out";
  const nights = nightsBetween(checkIn, checkOut);
  const was = nightsBetween(stay.arrival, stay.departure);
  const changed = checkIn !== stay.arrival || checkOut !== stay.departure || Number(adults) !== stay.adults || Number(children) !== stay.children;
  const wrong = amendWrong(adults, children, nights);
  const line = amendLine(was, nights, checkIn, wrong, stay.offeredTariff);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await amendStay(code, stay.id, { checkIn, checkOut, adults: Number(adults), children: Number(children) });
      onDone({
        title: "Stay amended", tone: "ok",
        body: r.nightsAfter === 0 && r.nightsBefore === 0 ? `${r.guest}: still a day use.`
          : r.nightsBefore === r.nightsAfter ? `${r.guest}: ${r.nightsAfter} nights, unchanged in length.`
            : `${r.guest}: ${r.nightsBefore} nights becomes ${r.nightsAfter}${r.roomHeld ? `, and ${r.roomHeld} is held to match.` : "."}`,
      });
    } catch (e) { setBusy(false); setBad({ title: "Not changed", body: said(e), tone: "bad" }); }
  };

  return (
    <FormSheet
      title={`Amend ${stay.guest}`} onClose={onClose} said={bad} onSaid={setBad}
      description={was === 0 ? `Day use, ${day(stay.arrival)}.` : `${was} ${was === 1 ? "night" : "nights"}, ${day(stay.arrival)} to ${day(stay.departure)}.`}
      foot={<Foot onCancel={onClose}><Button label="Save" kind="primary" size="lg" busy={busy} reason={!changed || wrong !== null || nights < 0 || (nights === 0) !== (was === 0) ? "" : null} onPress={() => void submit()} /></Foot>}
    >
      <Field label="Arrival" hint={arrived ? "They have already arrived." : null}><Day label="Arrival" value={checkIn} off={arrived} onChange={setCheckIn} /></Field>
      <Field label="Departure"><Day label="Departure" value={checkOut} min={checkIn} off={false} onChange={setCheckOut} /></Field>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Adults"><Box value={adults} label="Adults" keyboard="number-pad" tall onChange={setAdults} /></Field></View>
        <View style={{ flex: 1 }}><Field label="Children"><Box value={children} label="Children" keyboard="number-pad" tall onChange={setChildren} /></Field></View>
      </View>
      <Text style={[t.label, line.tone === "bad" ? { color: c.red700 } : line.tone === "strong" ? { color: c.ink900 } : [body, { color: c.grey600 }]]}>
        {line.text}{line.tail ? <Text style={[body, { color: c.grey600 }]}>{line.tail}</Text> : null}
      </Text>
      <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>
        The room hold moves with the booking. If it is taken for the nights being added, nothing changes at all and you will be told which. Added nights are charged at the rate already agreed - changing that is separate.
      </Text>
    </FormSheet>
  );
}

/* ── Move to another room (MoveRoomFlow.tsx) ─────────────────────── */
function Move({ code, stay, businessDate, onClose, onDone }: { code: string; stay: DeskStay; businessDate: string; onClose: () => void; onDone: (s: Said) => void }) {
  const lastMovable = addDays(stay.departure, -1);
  const [room, setRoom] = useState("");
  const [reason, setReason] = useState("move");
  const [rate, setRate] = useState("");
  /* The hotel's day, clamped into the stay. */
  const [from, setFrom] = useState(businessDate < stay.arrival ? stay.arrival : businessDate > lastMovable ? lastMovable : businessDate);
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState<Said | null>(null);
  const chosen = MOVE_REASONS.find((r) => r.value === reason)!;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await moveRoom(code, stay.id, { roomNumber: room.trim(), from, reason, ...(rate.trim() === "" ? {} : { agreedRate: Number(rate) }) });
      onDone({
        title: `Moved to ${r.to}`, tone: "ok",
        body: r.nightsBefore === 0 ? `${r.guest} is in ${r.to} for the whole stay.`
          : `${r.nightsBefore} ${r.nightsBefore === 1 ? "night" : "nights"} stay with ${r.from}, ${r.nightsAfter} in ${r.to}.`,
      });
    } catch (e) { setBusy(false); setBad({ title: "Not moved", body: said(e), tone: "bad" }); }
  };
  const unassign = async () => {
    setBusy(true);
    try {
      const r = await unassignRoom(code, stay.id);
      onDone({ title: "Out of the room", body: `${stay.guest} is no longer in ${r.room}. The booking still stands.`, tone: "ok" });
    } catch (e) {
      setBusy(false);
      if (e instanceof HeldError) onDone({ title: "Saved on this phone", body: e.message, tone: "held" });
      else setBad({ title: "Not changed", body: said(e), tone: "bad" });
    }
  };

  return (
    <FormSheet
      title={`Move ${stay.guest}`} description={`Currently in ${stay.roomNumber || "no room"}.`} onClose={onClose} said={bad} onSaid={setBad}
      foot={<Foot onCancel={onClose}><Button label="Move" kind="primary" size="lg" busy={busy} reason={room.trim() ? null : ""} onPress={() => void submit()} /></Foot>}
    >
      <Field label="To which room" required><Box value={room} label="To which room" placeholder="305" tall onChange={setRoom} /></Field>
      <Field label="From which night" hint={`The first night in the new room. Up to ${lastMovable} - the night of departure belongs to nobody.`}>
        <Day label="From which night" value={from} min={stay.arrival} off={false} onChange={(v) => setFrom(v > lastMovable ? lastMovable : v)} />
      </Field>
      <Field label="Why" hint={chosen.hint}><Pick value={reason} onChange={setReason} title="Why" tall options={MOVE_REASONS.map((r) => ({ value: r.value, label: r.label }))} /></Field>
      <Field label="New rate per night" hint="Optional. Leave empty and nothing about the money changes.">
        <Box value={rate} label="New rate per night" placeholder={String(stay.offeredTariff)} keyboard="decimal-pad" tall onChange={setRate} />
      </Field>
      <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>
        {`Moving rooms changes no charge on its own. Nights before tonight stay as they are - the guest slept in ${stay.roomNumber || "that room"} for them. A new rate applies from tonight forward; to change a night already billed, adjust it on the folio so there is a reason beside it.${stay.offeredTariff > 0 ? ` Currently ${cash(stay.offeredTariff)} a night.` : ""}`}
      </Text>
      <Pressable onPress={() => void unassign()} disabled={busy || !stay.roomNumber} accessibilityRole="button" style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, opacity: busy || !stay.roomNumber ? 0.5 : 1 }}>
        <DoorOpen size={14} color={c.grey600} />
        <Text style={[t.label, { flex: 1, color: c.grey600, textDecorationLine: "underline" }]}>Take them out of the room without assigning another</Text>
      </Pressable>
    </FormSheet>
  );
}

/* ── Exchange with another guest (ExchangeRoomFlow.tsx) ──────────── */
function Exchange({ code, stay, businessDate, onClose, onDone }: { code: string; stay: DeskStay; businessDate: string; onClose: () => void; onDone: (s: Said) => void }) {
  const others = useRead(() => readExchangeable(code, stay.id), ["front-desk", code, "exchangeable", stay.id]);
  const [withId, setWithId] = useState("");
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState(businessDate > stay.arrival ? businessDate : stay.arrival);
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState<Said | null>(null);
  const list = others.data ?? [];
  const chosen = list.find((o) => o.id === withId);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await exchangeRooms(code, stay.id, { withStayId: withId, from, reason: reason.trim() });
      onDone({ title: "Rooms exchanged", body: `${stay.guest} moves to ${r.to}, ${chosen?.guest ?? "the other guest"} to ${r.from}, from ${day(from)}.`, tone: "ok" });
    } catch (e) { setBusy(false); setBad({ title: "Not exchanged", body: said(e), tone: "bad" }); }
  };

  return (
    <FormSheet
      title={`Exchange ${stay.guest}'s room`} description={`${stay.reference} · currently in ${stay.roomNumber}`} onClose={onClose} said={bad} onSaid={setBad}
      foot={<Foot onCancel={onClose}><Button label="Exchange" kind="primary" size="lg" Icon={ArrowLeftRight} busy={busy} reason={withId && reason.trim() ? null : ""} onPress={() => void submit()} /></Foot>}
    >
      {list.length === 0 ? (
        <View style={{ gap: 6, paddingVertical: 24 }}>
          <Text style={[t.heading, { textAlign: "center" }]}>Nobody to swap with</Text>
          <Text style={[t.label, body, { color: c.grey500, textAlign: "center" }]}>An exchange trades two occupied rooms. There is no other guest in the house right now - to move this guest into an empty room, use a room move instead.</Text>
        </View>
      ) : (
        <>
          <View style={{ gap: 6 }}>
            <Text style={[t.label, body, { color: c.grey600 }]}>Swap with whom? Only guests currently in a room appear - an empty room is a move, not an exchange.</Text>
            <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled contentContainerStyle={{ gap: 6 }}>
              {list.map((o) => (
                <Pressable
                  key={o.id} onPress={() => setWithId(o.id)} accessibilityRole="button" accessibilityLabel={`Room ${o.room}, ${o.guest}`} accessibilityState={{ selected: o.id === withId }}
                  style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: o.id === withId ? c.orange : c.grey200, backgroundColor: o.id === withId ? c.orange50 : c.white }}
                >
                  <BedDouble size={16} color="#9aa2a9" />
                  <Text style={[t.label, t.tab, { color: c.ink900 }]}>{o.room}</Text>
                  <Text numberOfLines={1} style={[t.label, body, { flex: 1, color: c.ink900 }]}>{o.guest}</Text>
                  <Text style={[t.caption]}>{`out ${day(o.departs)}`}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <Field label="From which night" required hint="Nights already slept stay in the room they were slept in.">
            <Day label="From which night" value={from} min={stay.arrival} off={false} onChange={(v) => setFrom(v > stay.departure ? stay.departure : v)} />
          </Field>
          <Field label="Why" required hint="Two guests changed rooms - somebody will ask.">
            <Box value={reason} label="Why" placeholder="Couple wanted the quiet side" onChange={setReason} />
          </Field>
          {chosen ? (
            <Text style={[t.label, body, { color: c.grey600, lineHeight: 21, borderRadius: 10, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, padding: 12 }]}>
              {`From ${day(from)}, ${stay.guest} takes ${chosen.room} and ${chosen.guest} takes ${stay.roomNumber}. Either both move or neither does.`}
            </Text>
          ) : null}
        </>
      )}
    </FormSheet>
  );
}

/* ── What this booking includes (InclusionsFlow.tsx) ─────────────── */
function Inclusions({ code, stay, onClose }: { code: string; stay: DeskStay; onClose: () => void }) {
  const key = ["front-desk", code, "stay-inclusions", stay.id];
  const lines = useRead(() => readStayInclusions(code, stay.id), key);
  const catalogue = useRead(() => readInclusions(code), ["front-desk", code, "inclusions"]);
  const cache = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState<Said | null>(null);
  const refresh = () => { void cache.invalidateQueries({ queryKey: key }); };

  const add = async () => {
    setBusy(true);
    try {
      await addStayInclusion(code, stay.id, { ...(pick ? { inclusionId: pick } : { name: name.trim() }), quantity: Number(qty) || 1 });
      setAdding(false); setPick(""); setName(""); setQty("1");
      refresh();
    } catch (e) { setBad({ title: "Not added", body: said(e), tone: "bad" }); }
    setBusy(false);
  };
  const drop = async (lineId: string) => {
    try { await removeStayInclusion(code, stay.id, lineId); refresh(); }
    catch (e) { setBad({ title: "Not removed", body: said(e), tone: "bad" }); }
  };

  return (
    <FormSheet
      title="What this booking includes" description={`${stay.guest} · ${stay.reference}`} onClose={onClose} said={bad} onSaid={setBad}
      foot={<Button label="Done" size="lg" onPress={onClose} />}
    >
      {(lines.data ?? []).length === 0 && !adding ? (
        <View style={{ alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: c.grey300, backgroundColor: c.grey50, padding: 16 }}>
          <Gift size={20} color={c.grey300} />
          <Text style={[t.label, body, { color: c.ink900 }]}>Nothing recorded</Text>
          <Text style={[t.label, body, { color: c.grey500, textAlign: "center", lineHeight: 21 }]}>
            {`The rate plan is ${stay.ratePlan}. Anything promised beyond it - a pickup, a cake, a late checkout - belongs here so the next person on the desk can see it.`}
          </Text>
        </View>
      ) : (lines.data ?? []).map((l) => (
        <View key={l.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 10, borderWidth: 1, borderColor: c.grey200, padding: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <Text style={[t.label, body, { color: c.ink900 }]}>{l.name}</Text>
              {l.quantity > 1 ? <Text style={[t.label, body, t.tab, { color: c.grey500 }]}>{`× ${l.quantity}`}</Text> : null}
              {/* INCLUDED when there is no rate: not the same as costing zero. */}
              {l.rate === null ? <Pill tone="success">Included</Pill> : <Text style={[t.label, body, t.tab, { color: c.ink900 }]}>{cash(l.rate * l.quantity)}</Text>}
            </View>
            <Text style={[t.label, body, { color: c.grey500 }]}>{`${l.addedBy} · ${l.at}${l.notes ? ` · ${l.notes}` : ""}`}</Text>
          </View>
          <Pressable onPress={() => void drop(l.id)} accessibilityRole="button" accessibilityLabel={`Remove ${l.name}`} hitSlop={8} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", margin: -8 }}>
            <X size={16} color={c.grey500} />
          </Pressable>
        </View>
      ))}
      {adding ? (
        <View style={{ gap: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, padding: 12 }}>
          {(catalogue.data ?? []).length > 0 ? (
            <Field label="From the list">
              <Pick value={pick} onChange={setPick} title="From the list" options={[
                { value: "", label: "Something else" },
                ...(catalogue.data ?? []).map((i) => ({ value: i.id, label: `${i.name}${i.rate === null ? " - included" : ` - ${cash(i.rate)}`}` })),
              ]} />
            </Field>
          ) : null}
          {!pick ? (
            <Field label="What was promised" required hint="Anything agreed at the desk. It does not have to be on the list.">
              <Box value={name} label="What was promised" placeholder="Airport pickup, 06:10 arrival" onChange={setName} />
            </Field>
          ) : null}
          <Field label="How many"><Box value={qty} label="How many" keyboard="number-pad" onChange={setQty} /></Field>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label={busy ? "Adding…" : "Add"} kind="primary" reason={pick || name.trim() ? null : ""} busy={busy} onPress={() => void add()} />
            <Button label="Cancel" onPress={() => setAdding(false)} />
          </View>
        </View>
      ) : <Button label="Add an inclusion" Icon={Plus} onPress={() => setAdding(true)} />}
    </FormSheet>
  );
}

/* ── Void this booking (VoidFlow.tsx) ────────────────────────────── */
function VoidIt({ code, stay, onClose, onDone }: { code: string; stay: DeskStay; onClose: () => void; onDone: (s: Said) => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState<Said | null>(null);
  const submit = async () => {
    setBusy(true);
    try {
      await voidStay(code, stay.id, reason.trim());
      onDone({ title: "Voided", body: `${stay.reference} is on the record as never having happened.`, tone: "ok" });
    } catch (e) { setBusy(false); setBad({ title: "Not voided", body: said(e), tone: "bad" }); }
  };
  return (
    <FormSheet
      title="Void this booking" description="For one that never happened. Use Cancel if the guest cancelled." onClose={onClose} said={bad} onSaid={setBad}
      foot={<Foot cancel="Keep it" onCancel={onClose}><Button label="Void" kind="danger" size="lg" busy={busy} reason={reason.trim() ? null : ""} onPress={() => void submit()} /></Foot>}
    >
      <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>A voided booking stays on the record and is left out of revenue and out of cancellation figures. It holds no room from the moment you void it.</Text>
      <Field label="Why" required hint="“Entered twice”, “wrong property”, “test booking”.">
        <Box value={reason} label="Why" placeholder="Entered twice" onChange={setReason} />
      </Field>
      <Ready code={code} kind="reason_void" onPick={setReason} />
    </FormSheet>
  );
}

/* ── Cancel this booking (CancelConfirmedFlow.tsx, CancelWaitingFlow.tsx) ── */
function CancelIt({ code, stay, waiting, role, onClose, onDone }: {
  code: string; stay: DeskStay; waiting: boolean; role: string | null; onClose: () => void; onDone: (s: Said) => void;
}) {
  const [reason, setReason] = useState("");
  const [waive, setWaive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState<Said | null>(null);
  const mayWaive = mayGiveComp(role);
  const terms = useRead(() => (waiting ? Promise.resolve(null) : cancelPreview(code, stay.id)), ["front-desk", code, "cancel-preview", stay.id, waiting]);
  const preview = terms.data?.preview ?? null;
  const charge = preview?.charge ?? null;

  const submit = async () => {
    setBusy(true);
    try {
      if (waiting) {
        await cancelWaiting(code, stay.id, reason.trim());
        onDone({ title: "Cancelled", body: `${stay.reference}: the room is free again. No charge, and nothing was sent.`, tone: "ok" });
      } else {
        const r = await cancelConfirmed(code, stay.id, reason.trim(), mayWaive && waive);
        onDone({
          title: "Cancelled", tone: "ok",
          body: r.waived ? `${stay.reference}: the room is free again, and the charge was waived.`
            : r.charged ? `${stay.reference}: the room is free again. ${cash(r.charged)} is on the guest's bill under its terms.`
              : `${stay.reference}: the room is free again. No charge.`,
        });
      }
    } catch (e) { setBusy(false); setBad({ title: "Not cancelled", body: said(e), tone: "bad" }); }
  };

  return (
    <FormSheet
      title="Cancel this booking" onClose={onClose} said={bad} onSaid={setBad}
      description={waiting ? "It was waiting for the hotel and was never confirmed: no charge, and nothing goes to the guest."
        : "The guest cancelled. This room only; the terms it was booked under decide the charge."}
      foot={<Foot cancel="Keep it" onCancel={onClose}><Button label="Cancel the booking" kind="danger" size="lg" busy={busy} reason={reason.trim() && (waiting || preview) ? null : ""} onPress={() => void submit()} /></Foot>}
    >
      {!waiting ? (
        <Text style={[t.label, body, { color: c.ink900 }]}>
          {terms.loading ? "Reading the booking's terms…"
            : terms.error ? terms.error
              : !terms.data ? "The terms could not be read. Try again."
                : charge === null ? "This booking carries no cancellation terms, so nothing is charged."
                  : charge === 0 ? `Inside the free window of “${preview?.terms ?? "its terms"}”: nothing is charged.`
                    : `Under “${preview?.terms ?? "its terms"}”, ${cash(charge)} is kept and goes on the guest's bill. An advance already paid stays on the bill.`}
        </Text>
      ) : null}
      {!waiting && mayWaive && charge !== null && charge > 0 ? (
        <Toggle value={waive} onChange={setWaive} label="Waive the charge" description="Nothing goes on the bill. The reason below is kept with it." />
      ) : null}
      <Field label="Why" required hint={waiting ? "“Hotel full that week”, “guest changed plans”." : "“Guest changed plans”, “flight cancelled”."}>
        <Box value={reason} label="Why" onChange={setReason} />
      </Field>
      <Ready code={code} kind="reason_cancel" onPick={setReason} />
    </FormSheet>
  );
}
