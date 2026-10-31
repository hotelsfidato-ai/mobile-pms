import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, type Href } from "expo-router";
import { Globe, LogIn, LogOut, Mail, Phone, Printer, X } from "lucide-react-native";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { type Hotel } from "../../core/api";
import { cash } from "../../core/format";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { ReadFailed, useRead } from "../../core/ui";
import { Companions } from "./Companions";
import { readFolio, readGuestMarks, readStay, rulesOf, said, setWhatsapp, type DeskStay } from "./data";
import { day, foreignNationality, guestsWords, statusOf, stayedWords, whyNotYet } from "./desk";
import { body, Button, Pill, Tick, Toast, takeNote, WEBSITE, type Said } from "./kit";
import { maySettle, seesBills, whyNotCheckIn } from "./roles";
import { isHeldCheckIn, useHeld } from "./StayList";

/* ══════════════════════════════════════════════════════════════════
   THE STAY — the web's stay panel (src/modules/front-desk/flows/
   StayDrawer.tsx): the name and how to reach the guest; the act, at the
   top (Check in on an arrival, Settle and check out for somebody in the
   house); the booking in two columns; what is owed, pinned to the foot.
   The Bill tab, its payments and the check-out are the folio helper's, at
   /folio/<code>/<stayId>. A control the API would refuse shows greyed with
   its sentence (the web hides it: AGENTS rule 1).
   ══════════════════════════════════════════════════════════════════ */

export function StayScreen({ hotel, role, id, offer, onClose }: {
  hotel: Hotel; role: string | null; id: string; offer: boolean; onClose: () => void;
}) {
  const code = hotel.code;
  const today = hotel.businessDate;
  const read = useRead(() => readStay(code, id), ["front-desk", code, "stay", id]);
  const bills = seesBills(role);
  const folio = useRead(() => (bills ? readFolio(code, id) : Promise.resolve(null)), ["front-desk", code, "folio", id, bills]);
  const held = useHeld();
  const [toast, setToast] = useState<Said | null>(null);
  useFocusEffect(useCallback(() => { const n = takeNote(); if (n) setToast(n); }, []));
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const stay = read.data;
  if (!stay) {
    return (
      <Panel title="" onClose={onClose}>
        {read.loading ? <Text style={t.label}>Reading the stay…</Text>
          : read.error ? <ReadFailed what="the stay" error={read.error} onRetry={read.reload} />
            : <Text style={t.label}>{!isOnline() ? "No connection. This stay has not been read on this phone yet." : "This stay is not on the property's list."}</Text>}
      </Panel>
    );
  }

  const state = statusOf(stay);
  const arrived = stay.status === "in-house" || stay.status === "due-out";
  const isHeld = isHeldCheckIn(held, code, id);
  /* The web's order: who may, then whether it can yet. An arrival on a later
     date is allowed with a reason (CheckInFlow.tsx `allowed`). */
  const notYet = whyNotCheckIn(role)
    ?? (isHeld ? "This check-in is on this phone, waiting to sync." : null)
    ?? (stay.arrival > today ? null : whyNotYet(stay, today));

  return (
    <View style={{ flex: 1 }}>
      <Panel
        title={stay.guest} onClose={onClose}
        foot={bills ? <Totals stay={stay} folio={folio.data ?? null} loading={folio.loading} /> : undefined}
        under={<HeaderLine stay={stay} />}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <Pill tone={state.tone}>{state.label}</Pill>
          <Marks stay={stay} />
        </View>
        <GuestMarks code={code} stay={stay} role={role} onSaid={setToast} />

        {/* The act, then everything else: at the TOP, one orange button. */}
        <View style={{ gap: 6 }}>
          {offer && stay.status === "due-in" ? (
            <Button label="Check in" kind="primary" Icon={LogIn} reason={notYet} onPress={() => router.push(`/front-desk/${code}/check-in/${id}`)} />
          ) : null}
          {offer && stay.status === "due-in" && notYet ? <Text style={[t.label, body, { color: c.grey500 }]}>{notYet}</Text> : null}
          {arrived && maySettle(role) ? (
            <Button label="Settle and check out" kind="primary" Icon={LogOut} onPress={() => router.push(`/folio/${code}/${id}` as Href)} />
          ) : null}
          {arrived ? <Button label="Print registration card" Icon={Printer} reason={WEBSITE} onPress={() => undefined} /> : null}
          <Button label="More options" reason={WEBSITE} onPress={() => undefined} />
          <Text style={[t.caption, { color: c.grey500 }]}>{WEBSITE}</Text>
        </View>

        {/* The Bill tab is its own screen on a phone. */}
        {bills ? (
          <View style={{ flexDirection: "row", gap: 16, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
            <View style={{ minHeight: 44, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: c.orange, marginBottom: -1 }}>
              <Text style={[t.label, { color: c.ink900 }]}>Stay</Text>
            </View>
            <Pressable onPress={() => router.push(`/folio/${code}/${id}` as Href)} accessibilityRole="tab" style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={[t.label, { color: c.grey600 }]}>Bill</Text>
            </Pressable>
          </View>
        ) : null}

        <Facts stay={stay} />
        <Companions code={code} stayId={id} today={today} rules={rulesOf(hotel)} />
      </Panel>
      <Toast said={toast} onClose={() => setToast(null)} />
    </View>
  );
}

/** The panel's frame: the head with a close, what scrolls, a pinned foot. */
export function Panel({ title, under, onClose, foot, children }: {
  title: string; under?: ReactNode; onClose: () => void; foot?: ReactNode; children: ReactNode;
}) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.white }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: space.side, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[t.heading, face[600], { fontSize: 18 }]} accessibilityRole="header">{title}</Text>
          {under}
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <X size={20} color={c.grey600} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.side, gap: 20 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {foot ? <View style={{ paddingHorizontal: space.side, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.grey200, backgroundColor: c.white }}>{foot}</View> : null}
    </KeyboardAvoidingView>
  );
}

/** The reference, and every way to reach the guest the booking captured. */
function HeaderLine({ stay }: { stay: DeskStay }) {
  const nation = foreignNationality(stay.nationality);
  const item = { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 24 } as const;
  const words = [t.label, body, t.tab, { color: c.grey600 }];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 16, rowGap: 4 }}>
      <Text style={words}>{stay.reference}</Text>
      {stay.phone ? (
        <Pressable style={item} accessibilityRole="link" accessibilityLabel={`Call ${stay.phone}`} onPress={() => void Linking.openURL(`tel:${stay.phone}`)}>
          <Phone size={14} color={c.grey600} /><Text style={words}>{stay.phone}</Text>
        </Pressable>
      ) : null}
      {stay.email ? (
        <Pressable style={item} accessibilityRole="link" accessibilityLabel={`Email ${stay.email}`} onPress={() => void Linking.openURL(`mailto:${stay.email}`)}>
          <Mail size={14} color={c.grey600} /><Text style={words}>{stay.email}</Text>
        </Pressable>
      ) : null}
      {/* Only a foreign guest: "IN" is the default, not a fact somebody recorded. */}
      {nation ? (
        <View style={item}><Globe size={14} color={c.ink900} /><Text style={[t.label, { color: c.ink900 }]}>{nation}</Text></View>
      ) : null}
    </View>
  );
}

/** flows/StayMarks.tsx, every mark a clerk acts on. */
function Marks({ stay }: { stay: DeskStay }) {
  return (
    <>
      {stay.isComplimentary ? <Pill tone="accent">Complimentary</Pill> : null}
      {stay.isDayUse ? <Pill tone="neutral">Day use</Pill> : null}
      {stay.group ? <Pill tone="accent">{stay.group.rooms === 1 ? stay.group.name : `${stay.group.name} · one of ${stay.group.rooms} rooms`}</Pill>
        : stay.groupId ? <Pill tone="accent">Group</Pill> : null}
      {stay.isVip ? <Pill tone="accent">{stay.vipLevel ? `VIP · ${stay.vipLevel}` : "VIP"}</Pill> : null}
      {stay.isSingleLady ? <Pill tone="info">Single lady - placement</Pill> : null}
    </>
  );
}

/** flows/GuestMarks.tsx: the visits before this one, and the WhatsApp tick (customer edit). */
function GuestMarks({ code, stay, role, onSaid }: { code: string; stay: DeskStay; role: string | null; onSaid: (s: Said) => void }) {
  const key = ["front-desk", code, "guest-marks", stay.id];
  const marks = useRead(() => readGuestMarks(code, stay.id), key);
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const m = marks.data;
  if (!m) return null;
  const mayTick = role === "owner" || role === "admin" || role === "gm" || role === "hotel_manager" || role === "front_desk";
  const tick = async (agreed: boolean) => {
    setBusy(true);
    try {
      await setWhatsapp(code, stay.id, agreed);
      void cache.invalidateQueries({ queryKey: key });
    } catch (e) {
      onSaid({ title: "Not changed", body: said(e), tone: "bad" });
    }
    setBusy(false);
  };
  return (
    <View style={{ gap: 4 }}>
      {m.stayedBefore > 0 ? <View style={{ flexDirection: "row" }}><Pill tone="info">{stayedWords(m.stayedBefore)}</Pill></View> : null}
      {mayTick ? <Tick value={m.whatsappAgreed} onChange={(v) => void tick(v)} label="Agreed to WhatsApp" disabled={busy} /> : null}
    </View>
  );
}

const DASH = "-";

function Facts({ stay: s }: { stay: DeskStay }) {
  return (
    <View style={{ gap: 24 }}>
      <FactGroup title="Stay">
        <Fact label="Arrival" tab>{day(s.arrival)}</Fact>
        <Fact label="Departure" tab>{day(s.departure)}</Fact>
        <Fact label="Nights" tab>{s.isDayUse ? "Day use" : String(s.nights)}</Fact>
        {/* A booking is for a room TYPE; the number arrives when a room is given: said, not blank. */}
        <Fact label="Room">
          {s.roomNumber ? `${s.roomNumber} · ${s.givenRoomType ?? s.roomType}` : s.roomType}
          {s.roomNumber && s.givenRoomType ? <Text style={[body, { color: c.grey600 }]}>{` · booked ${s.roomType}`}</Text> : null}
          {s.roomNumber ? null : <Text style={[body, { color: c.grey600 }]}> · no room yet</Text>}
        </Fact>
        <Fact label="Guests">{guestsWords(s)}</Fact>
      </FactGroup>

      <FactGroup title="Rate">
        <Fact label="Rate plan">{s.ratePlan}</Fact>
        <Fact label="Per night" tab>{s.isComplimentary ? "Complimentary" : cash(s.offeredTariff)}</Fact>
        <Fact label="Rack rate" tab>{cash(s.rackTariff)}</Fact>
      </FactGroup>

      <FactGroup title="Booked through">
        <Fact label="Source">{s.source ?? DASH}</Fact>
        <Fact label="Business source">{s.businessSource ?? DASH}</Fact>
        <Fact label="Segment">{s.marketSegment ?? DASH}</Fact>
        {s.salesPerson ? <Fact label="Sold by">{s.salesPerson}</Fact> : null}
        {s.guestCompany ? (
          <Fact label="Guest's company">
            {s.guestCompany.name ?? DASH}
            {s.guestCompany.gstin ? <Text style={[body, t.tab, { color: c.grey600 }]}>{`\nGSTIN ${s.guestCompany.gstin}`}</Text> : null}
          </Fact>
        ) : null}
      </FactGroup>

      {s.voidReason ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: c.red100, backgroundColor: c.red50, paddingHorizontal: 16, paddingVertical: 14, gap: 4 }}>
          <Text style={[t.eyebrow, { color: c.red700 }]}>Voided</Text>
          <Text style={[t.label, body, { color: c.grey700, lineHeight: 21 }]}>
            {`${s.voidReason} - this booking is on the record as never having happened, and is left out of revenue and cancellation figures alike.`}
          </Text>
        </View>
      ) : null}
      {s.notes ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, paddingHorizontal: 16, paddingVertical: 14, gap: 4 }}>
          <Text style={[t.eyebrow, { color: c.grey600 }]}>Note</Text>
          <Text style={[t.label, body, { color: c.grey700, lineHeight: 21 }]}>{s.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

function FactGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text style={[t.eyebrow, { color: c.grey600, paddingBottom: 8, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: c.grey200 }]} accessibilityRole="header">{title}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 16, columnGap: 24 }}>{children}</View>
    </View>
  );
}

function Fact({ label, tab, children }: { label: string; tab?: boolean; children: ReactNode }) {
  return (
    <View style={{ width: "46%", gap: 2 }}>
      <Text style={[t.label, body, { color: c.grey600 }]}>{label}</Text>
      <Text style={[t.label, face[600], { color: c.ink900 }, tab ? t.tab : null]}>{children}</Text>
    </View>
  );
}

/** What is owed, pinned: the folio's own figures, a dash for none. "Charged",
    not "Total": nights post at the audit, and ₹0 would read as a free stay. */
function Totals({ stay, folio, loading }: { stay: DeskStay; folio: { balance: number; payments: number } | null; loading: boolean }) {
  if (!folio && loading) return <Text style={t.caption}>Reading the bill…</Text>;
  const balance = folio ? folio.balance : null;
  const label = balance !== null && balance < 0 ? (stay.status === "checked-out" ? "Overpaid" : "In advance") : "Balance";
  const tone = balance === null ? c.ink900 : balance > 0 ? c.red700 : balance < 0 ? c.info : c.success600;
  return (
    <View style={{ flexDirection: "row", gap: 16 }}>
      <Total label="Charged" value={folio ? folio.balance + folio.payments : null} />
      <Total label="Paid" value={folio ? folio.payments : null} />
      <Total label={label} value={balance === null ? null : Math.abs(balance)} big color={tone} />
    </View>
  );
}

function Total({ label, value, big, color }: { label: string; value: number | null; big?: boolean; color?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[t.label, body, { color: c.grey600, textAlign: big ? "right" : "left" }]}>{label}</Text>
      <Text style={[t.heading, t.tab, face[600], { color: color ?? c.ink900, fontSize: big ? 18 : 16, textAlign: big ? "right" : "left" }]}>{cash(value)}</Text>
    </View>
  );
}
