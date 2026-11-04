import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, type Href } from "expo-router";
import { Globe, LogIn, LogOut, Mail, Phone, Printer, X } from "lucide-react-native";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { HeldError, type Hotel } from "../../core/api";
import { cash } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { useRead } from "../../core/ui";
import { Companions, IdPhoto } from "./Companions";
import { readFoot, readGuestMarks, readStay, readVipLevels, rulesOf, said, setVip, setWhatsapp, type DeskStay } from "./data";
import { day, foreignNationality, footOf, guestsWords, statusOf, stayedWords, whyNotYet } from "./desk";
import { body, Button, MarkLink, Pill, Sheet, Tick, Toast, takeNote, WEBSITE, type Said } from "./kit";
import { maySettle, seesBills, whyNotCheckIn, whyNotGuest } from "./roles";
import { MoreOptions } from "./StayActs";
import { isHeldCheckIn, NotRead, useHeld } from "./StayList";

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
  const held = useHeld();
  const [toast, setToast] = useState<Said | null>(null);
  useFocusEffect(useCallback(() => { const n = takeNote(); if (n) setToast(n); }, []));
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const stay = read.data;
  const foot = useRead(() => (bills && stay ? readFoot(code, stay) : Promise.resolve(null)), ["front-desk", code, "foot", id, bills, stay?.status]);
  if (!stay) {
    return (
      <Panel title="" onClose={onClose}>
        {read.loading ? <Text style={t.label}>Reading the stay…</Text>
          : read.error ? <NotRead what="the stay" error={read.error} onRetry={read.reload} />
            : <Text style={t.label}>This stay is not on the property's list.</Text>}
      </Panel>
    );
  }

  const state = statusOf(stay);
  const why = (reason: string) => setToast({ title: reason, tone: "held" });
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
        foot={bills ? <Totals foot={foot.data ?? null} loading={foot.loading} /> : undefined}
        under={<HeaderLine stay={stay} />}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <Pill tone={state.tone}>{state.label}</Pill>
          <Marks stay={stay} />
          {/* The toggle changes the guest rather than reporting them: beside the marks. */}
          {stay.guestId ? <VipToggle code={code} stay={stay} role={role} onSaid={setToast} /> : null}
          {stay.guestId ? <MarkLink label="Edit guest" reason={whyNotGuest(role) ?? WEBSITE} onPress={() => undefined} onRefused={why} /> : null}
          <GuestMarks code={code} stay={stay} role={role} onSaid={setToast} />
        </View>

        {/* The act, then everything else: at the TOP, one orange button; the rare acts in More options. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 8 }}>
          {offer && stay.status === "due-in" ? (
            <View style={{ gap: 6 }}>
              <Button label="Check in" kind="primary" Icon={LogIn} reason={notYet} onPress={() => router.push(`/front-desk/${code}/check-in/${id}`)} />
            </View>
          ) : null}
          {arrived && maySettle(role) ? (
            <Button label="Settle and check out" kind="primary" Icon={LogOut} onPress={() => router.push(`/folio/${code}/${id}` as Href)} />
          ) : null}
          {arrived || stay.status === "checked-out" ? <Button label="Print registration card" Icon={Printer} reason={WEBSITE} onPress={() => undefined} onRefused={why} /> : null}
          <MoreOptions hotel={hotel} stay={stay} role={role} onSaid={setToast} />
        </View>
        {offer && stay.status === "due-in" && notYet ? <Text style={[t.label, body, { color: c.grey500, marginTop: -12 }]}>{notYet}</Text> : null}

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
        <IdPhoto code={code} />
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
      {foot ? <View style={{ paddingHorizontal: space.side, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.grey200, backgroundColor: c.grey50 }}>{foot}</View> : null}
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
        <Pressable style={item} hitSlop={10} accessibilityRole="link" accessibilityLabel={`Call ${stay.phone}`} onPress={() => void Linking.openURL(`tel:${stay.phone}`)}>
          <Phone size={14} color={c.grey600} /><Text style={words}>{stay.phone}</Text>
        </Pressable>
      ) : null}
      {stay.email ? (
        <Pressable style={item} hitSlop={10} accessibilityRole="link" accessibilityLabel={`Email ${stay.email}`} onPress={() => void Linking.openURL(`mailto:${stay.email}`)}>
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

/** StayDrawer.tsx VipToggle: the moment somebody knows is when they are looking
    at the booking. The group's levels: with any, marking asks which. Held offline. */
function VipToggle({ code, stay, role, onSaid }: { code: string; stay: DeskStay; role: string | null; onSaid: (s: Said) => void }) {
  const levels = useRead(() => readVipLevels(code), ["front-desk", code, "vip-levels"]);
  const cache = useQueryClient();
  const [asking, setAsking] = useState(false);
  const active = (levels.data ?? []).filter((l) => l.active);
  const refused = whyNotGuest(role);
  const toggle = async (levelId?: string) => {
    setAsking(false);
    try {
      const r = await setVip(code, stay.guestId!, !stay.isVip, levelId);
      onSaid({ title: stay.isVip ? "No longer marked VIP" : "Marked VIP", body: `${r.guest} - this holds for their next visit too.`, tone: "ok" });
      void cache.invalidateQueries({ queryKey: ["front-desk", code] });
    } catch (e) {
      onSaid(e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" } : { title: "Not changed", body: said(e), tone: "bad" });
    }
  };
  return (
    <>
      <MarkLink
        label={stay.isVip ? "Remove VIP" : "Mark VIP"} reason={refused} onRefused={(r) => onSaid({ title: r, tone: "held" })}
        onPress={() => (!stay.isVip && active.length > 0 ? setAsking(true) : void toggle())}
      />
      <Sheet open={asking} onClose={() => setAsking(false)} title="Mark VIP">
        {active.map((l) => <Button key={l.id} label={l.label} onPress={() => void toggle(l.id)} />)}
      </Sheet>
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
    <>
      {m.stayedBefore > 0 ? <Pill tone="info">{stayedWords(m.stayedBefore)}</Pill> : null}
      <Tick value={m.whatsappAgreed} onChange={(v) => void tick(v)} label="Agreed to WhatsApp" disabled={busy || whyNotGuest(role) != null} />
    </>
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
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.red100, backgroundColor: c.red50, paddingHorizontal: 16, paddingVertical: 14, gap: 4 }}>
          <Text style={[t.eyebrow, { color: c.red700 }]}>Voided</Text>
          <Text style={[t.label, body, { color: c.grey700, lineHeight: 21 }]}>
            {`${s.voidReason} - this booking is on the record as never having happened, and is left out of revenue and cancellation figures alike.`}
          </Text>
        </View>
      ) : null}
      {s.notes ? (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, paddingHorizontal: 16, paddingVertical: 14, gap: 4 }}>
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

/** What is owed, pinned (FolioTotals): the server's figures, a dash for
    none (MFD-3). "Charged", not "Total": nights post at the audit. While
    nights are still to come the balance says Balance, grey, with "Charges to
    come" (D27-199): the phone adds none of them up. */
function Totals({ foot, loading }: { foot: ReturnType<typeof footOf> | null; loading: boolean }) {
  if (!foot && loading) return <Text style={t.caption}>Reading the bill…</Text>;
  const f = foot ?? footOf({ status: "", isComplimentary: true, offeredTariff: 0 }, null, null);
  const tone = { muted: c.grey600, plain: c.ink900, owed: c.red700, over: c.info, clear: c.success600 }[f.tone];
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", gap: 16 }}>
        <Total label="Charged" value={cash(f.charged)} />
        <Total label="Paid" value={cash(f.paid)} />
        <Total label={f.label} value={cash(f.balance)} big color={tone} />
      </View>
      {f.toCome ? <View style={{ flexDirection: "row", justifyContent: "flex-end" }}><Pill tone="neutral">Charges to come</Pill></View> : null}
    </View>
  );
}

function Total({ label, value, big, color }: { label: string; value: string; big?: boolean; color?: string }) {
  return (
    <View style={{ flex: big ? 1.4 : 1 }}>
      <Text style={[t.label, body, { color: c.grey600, textAlign: big ? "right" : "left" }]}>{label}</Text>
      <Text style={[t.heading, t.tab, { color: color ?? c.ink900, fontSize: big ? 18 : 16, textAlign: big ? "right" : "left" }]}>{value}</Text>
    </View>
  );
}
