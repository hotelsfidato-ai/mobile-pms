import { useQueryClient } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { AlertTriangle, Check, Plus, Trash2, UserCheck } from "lucide-react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { ApiError, HeldError, type Hotel } from "../../core/api";
import { cash } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { Card, Screen, useRead } from "../../core/ui";
import { Day } from "../housekeeping/DayStepper";
import {
  allIn, byContract, discountIn, gstinProblem, inclusive, MARKET_SEGMENTS, OTHER, PLANS, priceLine, summary, TITLES, worthAsking,
  type DiscountMode, type Split, type Tariff,
} from "../front-desk/booking";
import { Companions } from "../front-desk/Companions";
import {
  assignRoom, checkIn, confirmWaiting, createBooking, readAccounts, readAssignable, readBeforeGst, readBilling, readContract, readEarly, readInventory, readModules,
  readPromotions, readReturning, readRooms, readSalesPeople, readSegments, readSources, readTariff, readTaxRate, rulesOf, said, timesOf, type Booked as Made,
} from "../front-desk/data";
import { addDays, day, moneyPrecise, nightsBetween, stayedWords } from "../front-desk/desk";
import { deskGuestId, guestIdPayload, guestIdState, type GuestId } from "../front-desk/guestId";
import { GuestIdFields } from "../front-desk/GuestIdFields";
import { body, Box, Button, Field, Fold, PageHead, Pick, Segmented, Tick, Toast, Toggle, WEBSITE, type Said } from "../front-desk/kit";
import { NotRead } from "../front-desk/StayList";
import {
  assignReasonFor, bookReason, checkInReasonFor, counted, departureHint, firstNight, isWalkIn, leftFor, linesBody, moveArrival, newLine, toAssign, totalRooms, withRooms,
  type Line,
} from "./book";
import { takeAdvance } from "./data";
import { mayGiveComp, OVER_LIMIT_WHO, whyNotBook, whyNotPay } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   NEW BOOKING — the web's one page, /h/:code/book (src/modules/
   reservations/pages/BookingPage.tsx, D27-158, D27-163; picture
   all/14-bookings-new-booking): the guest, the nights, one room line or
   more, the ID and an advance on one page; three buttons at the bottom.
   Opened from an empty Calendar cell (?room=&date=): that room and night,
   a walk-in tonight. More than one room becomes a group: the server makes
   it; the group itself and its master bill are on the website.
   Front desk's walk-in is the same page for one room tonight: its rules,
   data calls and kit are imported (front-desk/booking.ts, data.ts, kit.tsx).
   Money is the server's (MFD-3): the card shows each line's night price
   and the server's GST rate; the web's Room charges, GST and Due are the
   device's own sums, not shown (PMS request R-22 asks for a quote).
   ══════════════════════════════════════════════════════════════════ */

interface Done {
  made: Made;
  /** By reference: the room kept through assign or the check-in, or why not. */
  assigned: Record<string, { room: string } | { failed: string }>;
  checkedIn: { room: string } | { failed: string } | null;
  advance: { amount: number } | { failed: string } | null;
  waiting: boolean;
  arrivesToday: boolean;
}
interface LineQuote {
  q: { nightly: number | null; unpriced: string | null; differs: boolean; contract?: string | null; note?: string | null };
  split: Split | null; gross: number | null; contractRate: boolean; taxRate: number | null | undefined; tariff: Tariff | null;
}

const ROOM_STATE: Record<string, string> = { clean: "clean", inspected: "inspected", dirty: "needs cleaning" };
const wordOf = (e: unknown) => (e instanceof HeldError || e instanceof ApiError ? e.message : said(e));
const NONE: LineQuote["q"] = { nightly: null, unpriced: null, differs: false };

export function NewBooking({ hotel, role, room: walkRoom, date: walkDate }: { hotel: Hotel; role: string | null; room?: string; date?: string }) {
  const code = hotel.code;
  const today = hotel.businessDate;
  const rules = rulesOf(hotel);
  const times = timesOf(hotel);
  const cache = useQueryClient();
  const keeper = mayGiveComp(role);
  const walkIn = isWalkIn(walkRoom, walkDate, today);
  const [toast, setToast] = useState<Said | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [saving, setSaving] = useState(false);
  /* One tap, one booking (MEMORY 8): latched at the tap. */
  const latch = useRef(false);

  const [title, setTitle] = useState(rules?.defaultTitle ?? "");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyGstin, setCompanyGstin] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [returning, setReturning] = useState<{ id: string; name: string } | null>(null);
  const [whatsapp, setWhatsapp] = useState(false);
  const [offersAgreed, setOffersAgreed] = useState(false);
  const [singleLady, setSingleLady] = useState(false);
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("");
  const [guestId, setGuestId] = useState<GuestId>(() => deskGuestId(rules));
  const [sourceId, setSourceId] = useState("");
  const [prepaid, setPrepaid] = useState(true);
  const [businessSource, setBusinessSource] = useState("");
  const [marketSegment, setMarketSegment] = useState("");
  const [salesPick, setSalesPick] = useState("");
  const [salesOther, setSalesOther] = useState("");
  const [billTo, setBillTo] = useState<"guest" | "company">(rules?.defaultBillTo ?? "guest");
  const [companyId, setCompanyId] = useState("");
  const [waiting, setWaiting] = useState(rules?.defaultGuarantee === "tentative");
  const [expected, setExpected] = useState("");
  const [expectedOut, setExpectedOut] = useState("");
  const [groupName, setGroupName] = useState("");
  const [from, setFrom] = useState(() => firstNight(walkDate, today));
  const [to, setTo] = useState(() => addDays(firstNight(walkDate, today), 1));
  const [lines, setLines] = useState<Line[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [nextKey, setNextKey] = useState(1);
  const [mode, setMode] = useState<DiscountMode>("none");
  const [discountText, setDiscountText] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [promotionId, setPromotionId] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [notes, setNotes] = useState("");
  const [advance, setAdvance] = useState("");
  const [advanceBy, setAdvanceBy] = useState(rules?.defaultPaymentMethod ?? "Cash");
  const [earlyReason, setEarlyReason] = useState("");
  const [waiveEarly, setWaiveEarly] = useState(false);
  /* Over the company's credit limit (D27-275): the server's sentence, and which button. */
  const [overLimit, setOverLimit] = useState<{ reason: string; now: boolean } | null>(null);
  const [allowReason, setAllowReason] = useState("");

  const scope = ["reservations", code, "book"];
  const sources = useRead(() => readSources(code), [...scope, "sources"]);
  const inventory = useRead(() => readInventory(code, from, to), [...scope, "inventory", from, to]);
  const rooms = useRead(() => readRooms(code), [...scope, "rooms"]);
  const modules = useRead(() => readModules(code), [...scope, "modules"]);
  const accounts = useRead(() => readAccounts(code), [...scope, "accounts"]);
  const segments = useRead(() => readSegments(code), [...scope, "segments"]);
  const sales = useRead(() => readSalesPeople(code), [...scope, "sales"]);
  const promotions = useRead(() => readPromotions(code), [...scope, "promotions"]);
  const show = { company: modules.data?.["booking_company"] !== false, notes: modules.data?.["booking_notes"] !== false };
  const billable = useRead(() => (show.company && billTo === "company" ? readBilling(code) : Promise.resolve([])), [...scope, "billing", show.company && billTo === "company"]);

  const types = [...new Map((inventory.data?.cells ?? []).map((x) => [x.roomTypeId, { id: x.roomTypeId, name: x.roomType }])).values()];
  const typeName = (id: string) => types.find((x) => x.id === id)?.name ?? "";

  /* THE FIRST ROOM IS ALREADY THERE. A walk-in's is the room it was opened
     from; the Walk-in source only for tonight (D27-163). */
  useEffect(() => {
    if (seeded || types.length === 0) return;
    if (walkRoom) {
      if (!rooms.data || !sources.data) return;
      const type = types.find((x) => x.name === rooms.data!.find((r) => r.number === walkRoom)?.type);
      setLines([newLine(type?.id ?? types[0]!.id, 0, type ? walkRoom : "")]);
      const walkSource = sources.data.find((x) => x.kind === "walk_in" && x.isActive);
      if (walkSource && walkDate === today) setSourceId(walkSource.id);
    } else {
      setLines([newLine(types[0]!.id, 0)]);
    }
    setSeeded(true);
  }, [seeded, types, walkRoom, walkDate, today, rooms.data, sources.data]);

  const siteSource = sources.data?.find((x) => x.id === sourceId)?.kind === "ota";
  const nights = nightsBetween(from, to);
  const dayUse = from === to;
  const arrivesToday = from === today;
  const rooms_ = totalRooms(lines);
  const promotion = (promotions.data ?? []).find((p) => p.id === promotionId) ?? null;
  const discount = discountIn({ mode, text: discountText, reason: discountReason, promotion });
  const contractOf = show.company && billTo === "company" ? companyId : "";

  /* Each line's price: the server's figures, read in the web's order. */
  const priced = lines.map((l) => ({ k: l.key, t: l.roomTypeId, m: l.mealPlan, a: l.adults, ch: l.children, r: l.rate, i: l.inclusive, c: l.comp }));
  const quotes = useRead(async (): Promise<LineQuote[]> => Promise.all(lines.map(async (l): Promise<LineQuote> => {
    const party = { roomTypeId: l.roomTypeId, mealPlan: l.mealPlan, from, to, adults: l.adults, children: l.children };
    const tariff = !dayUse && !l.comp && l.rate.trim() === "" && l.roomTypeId
      ? await (contractOf ? readContract(code, party, contractOf) : readTariff(code, party)) : null;
    const gross = allIn(l, tariff);
    const split = inclusive(l, tariff) && !l.comp && (gross ?? 0) > 0 ? await readBeforeGst(code, gross!) : null;
    const q = priceLine(l, tariff, split, discount.off);
    const tax = q.nightly !== null && q.nightly > 0 ? await readTaxRate(code, q.nightly) : null;
    return { q, split, gross, contractRate: byContract(l, tariff), taxRate: tax?.rate, tariff };
  })), [...scope, "quotes", from, to, contractOf, mode, discountText, promotionId, JSON.stringify(priced)]);
  const quoteOf = (i: number) => (quotes.data && quotes.data.length === lines.length ? quotes.data[i] : undefined);

  const first = lines[0];
  const firstType = first ? typeName(first.roomTypeId) : "";
  const oneToday = arrivesToday && rooms_ === 1 && !waiting;
  const checkRooms = useRead(() => (oneToday && firstType ? readAssignable(code, firstType, today) : Promise.resolve([])), [...scope, "assignable", firstType, today, oneToday]);
  const early = useRead(() => (oneToday ? readEarly(code) : Promise.resolve(null)), [...scope, "early", oneToday]);
  const isEarly = oneToday && (early.data?.isEarly ?? false);
  const picked = checkRooms.data?.find((r) => r.number === first?.room);

  const advanceAmount = advance.trim() === "" ? null : Number(advance);
  const advanceProblem = advanceAmount !== null && !(Number.isFinite(advanceAmount) && advanceAmount > 0) ? "An advance is an amount above 0." : null;
  const salesPerson = salesPick === OTHER ? salesOther.trim() : salesPick;
  const idNow = guestIdState(guestId, today);

  const reasonToSave = whyNotBook(role) ?? bookReason({
    name: guestName, phone, email, gstin: companyGstin, showCompany: show.company, sourceId, dayUse, lines, discountProblem: discount.problem,
    billTo, companyId, salesPick, salesOther, advanceProblem,
    refusedSplits: lines.map((_, i) => { const s = quoteOf(i)?.split; return s && !s.ok && !lines[i]!.comp ? s.reason : null; }),
    required: rules?.requiredBookingFields ?? [],
    fields: {
      phone: ["The phone number", phone], email: ["The email", email], nationality: ["The nationality", guestId.nationality], address: ["The address", addressLine],
      expectedArrival: ["The expected arrival time", expected], marketSegment: ["The market segment", marketSegment],
      businessSource: ["The business source", businessSource], salesPerson: ["The sales person", salesPerson],
    },
  });
  const reasonToAssign = assignReasonFor(waiting, lines);
  const reasonToCheckIn = checkInReasonFor({
    waiting, arrivesToday, rooms: rooms_, room: first?.room ?? "", roomsFailed: checkRooms.error != null, picked, idBlocked: idNow.blocked, early: isEarly, earlyReason,
  });

  const submit = async (now: boolean, overLimitReason?: string) => {
    if (latch.current) return;
    latch.current = true;
    setSaving(true);
    setOverLimit(null);
    let made: Made;
    try {
      made = await createBooking(code, {
        ...(overLimitReason ? { overLimitReason } : {}),
        guestName: guestName.trim(), phone: phone.trim(), ...(email.trim() ? { email: email.trim() } : {}),
        bookingSourceId: sourceId, ...(siteSource ? { prepaidOnSite: prepaid } : {}),
        ...(businessSource ? { businessSource } : {}), ...(marketSegment ? { marketSegment } : {}), ...(salesPerson ? { salesPerson } : {}),
        ...(expected ? { expectedArrival: expected } : {}), ...(expectedOut ? { expectedDeparture: expectedOut } : {}),
        checkIn: from, checkOut: to, ...(groupName.trim() ? { groupName: groupName.trim() } : {}), ...(returning ? { guestId: returning.id } : {}),
        whatsappAgreed: whatsapp, offersAgreed, tentative: waiting,
        ...(show.company && billTo === "company" && companyId ? { companyId } : {}),
        ...(mode === "hand" && discountText.trim() ? { discount: { percent: Number(discountText), reason: discountReason.trim() } } : {}),
        ...(mode === "rupees" && discountText.trim() ? { discount: { amount: Number(discountText), reason: discountReason.trim() } } : {}),
        ...(mode === "promotion" && promotionId ? { discount: { promotionId } } : {}),
        ...(title ? { title } : {}), ...(guestId.nationality.trim() ? { nationality: guestId.nationality.trim() } : {}),
        address: { addressLine: addressLine.trim(), city: city.trim(), state: stateName.trim(), pincode: pincode.trim(), country: country.trim() },
        ...(show.notes && notes.trim() ? { notes: notes.trim() } : {}),
        ...(specialRequest.trim() ? { specialRequest: specialRequest.trim() } : {}),
        ...(singleLady ? { isSingleLady: true } : {}),
        ...(show.company && (companyName.trim() || companyGstin.trim() || companyAddress.trim())
          ? { guestCompany: { name: companyName.trim(), gstin: companyGstin.trim(), address: companyAddress.trim() } } : {}),
        lines: linesBody(lines, (l, i) => inclusive(l, quoteOf(i)?.tariff)),
      });
    } catch (e) {
      latch.current = false;
      setSaving(false);
      /* Over the credit limit: said under the buttons, with the allow. */
      if (e instanceof ApiError && e.needs === "credit-limit") { setOverLimit({ reason: e.message, now }); return; }
      /* The server's sentence: nothing was written. */
      setToast({ title: "Not booked", body: wordOf(e), tone: "bad" });
      return;
    }

    const lead = made.bookings[0];
    const assigned: Done["assigned"] = {};
    let advanceTaken: Done["advance"] = null;
    let checkedIn: Done["checkedIn"] = null;
    /* The advance FIRST (D27-328 (3)), on the first room's bill, held as credit. */
    if (advanceAmount !== null && lead?.id) {
      try {
        await takeAdvance(code, lead.id, { method: advanceBy, amount: advanceAmount, businessDate: today, heldAsCredit: true });
        advanceTaken = { amount: advanceAmount };
      } catch (e) { advanceTaken = { failed: wordOf(e) }; }
    }
    /* Check in now: front desk's own check-in, which gives the room itself. */
    if (now && lead?.id && first) {
      try {
        await checkIn(code, lead.id, {
          roomNumber: first.room, adults: first.adults, children: first.children, ratePlan: first.mealPlan,
          ...guestIdPayload(guestId), businessDate: today, earlyReason, waiveEarly, offersAgreed,
        });
        checkedIn = { room: first.room };
        assigned[lead.reference] = { room: first.room };
      } catch (e) { checkedIn = { failed: wordOf(e) }; }
    }
    /* A PICKED ROOM IS KEPT (D27-163), through the Calendar's Assign room. */
    for (const a of toAssign(lines, waiting)) {
      const b = made.bookings[a.at];
      if (!b?.id || assigned[b.reference]) continue;
      try {
        const r = await assignRoom(code, b.id, a.room);
        assigned[b.reference] = { room: r.room };
      } catch (e) { assigned[b.reference] = { failed: wordOf(e) }; }
    }
    latch.current = false;
    setSaving(false);
    void cache.invalidateQueries();
    setDone({ made, assigned, checkedIn, advance: advanceTaken, waiting, arrivesToday });
  };

  const another = () => (router.canGoBack() ? router.back() : router.replace(`/reservations/${code}` as Href));
  if (done) return <BookedCard hotel={hotel} done={done} onAnother={another} />;

  const description = walkIn ? `A walk-in into room ${walkRoom}. Check them in, or save the booking.` : "One guest, one set of nights. Save it, give it a room, or check them in.";
  if (!seeded) {
    return (
      <Screen refreshing={false} onRefresh={inventory.reload}>
        <PageHead title="New booking" description={inventory.error ? description : "Loading…"} />
        {inventory.error ? <NotRead what="the room types" error={inventory.error} onRetry={inventory.reload} plural /> : null}
        {!inventory.error && inventory.data && types.length === 0 ? <Text style={[t.label, body]}>No room types are set up yet. Add them in Room types.</Text> : null}
      </Screen>
    );
  }

  const company = (billable.data ?? []).find((x) => x.id === companyId) ?? null;
  const segmentNames = segments.data?.filter((m) => m.active).map((m) => m.label) ?? MARKET_SEGMENTS;
  const setLine = (key: number, next: Line) => setLines((ls) => ls.map((l) => (l.key === key ? next : l)));
  const addLine = () => {
    const t0 = types[0];
    if (!t0) return;
    setLines((ls) => [...ls, newLine(t0.id, nextKey)]);
    setNextKey((k) => k + 1);
  };
  const rates = lines.map((_, i) => { const q = quoteOf(i); return q ? summary(q.q, q.taxRate) : null; });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen refreshing={false} onRefresh={() => undefined}>
        <PageHead title="New booking" description={description} />

        <Section title="Guest">
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ width: 104 }}>
              <Field label="Salutation">
                <Pick value={title} onChange={setTitle} title="Salutation" tall options={[{ value: "", label: "None" }, ...TITLES.map((x) => ({ value: x, label: x }))]} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Full name" required><Box value={guestName} label="Full name" placeholder="Anil Sharma" tall onChange={setGuestName} /></Field>
            </View>
          </View>
          <Field label="Phone" hint="Needed for online check-in and WhatsApp.">
            <Box value={phone} label="Phone" keyboard="phone-pad" tall onChange={(v) => { setPhone(v); setReturning(null); }} />
          </Field>
          <Field label="Email">
            <Box value={email} label="Email" keyboard="email-address" tall onChange={(v) => { setEmail(v); setReturning(null); }} />
          </Field>
          <Returning
            code={code} phone={phone} email={email} chosen={returning} onChoose={setReturning}
            {...(show.company ? { onUseCompany: (x: { name: string | null; gstin: string | null; address: string | null }) => { setCompanyName(x.name ?? ""); setCompanyGstin(x.gstin ?? ""); setCompanyAddress(x.address ?? ""); } } : {})}
          />
          {show.company ? (
            <>
              <Field label="Company name"><Box value={companyName} label="Company name" max={200} tall onChange={setCompanyName} /></Field>
              <Field label="GSTIN" hint="With a GSTIN, the tax invoice is made out to the company. The guest still pays." error={companyGstin.trim().length === 15 ? gstinProblem(companyGstin) : null}>
                <Box value={companyGstin} label="GSTIN" max={15} upper tall onChange={(v) => setCompanyGstin(v.toUpperCase())} />
              </Field>
              <Field label="Company address"><Box value={companyAddress} label="Company address" max={500} tall onChange={setCompanyAddress} /></Field>
            </>
          ) : null}
          <Toggle value={whatsapp} onChange={setWhatsapp} label="Guest agreed to WhatsApp" description="Ask them. Unticked, messages go by email if there is one, else not at all." />
        </Section>

        <Section title="Stay" action={<Button label="Another room" Icon={Plus} size="sm" reason={types.length === 0 ? "No room types are set up yet." : null} onPress={addLine} />}>
          <Field label="Arrival">
            <Day label="Arrival" value={from} off={false} onChange={(v) => { const m = moveArrival(from, to, v, addDays); setFrom(m.from); setTo(m.to); }} />
          </Field>
          <Field label="Departure" hint={departureHint(from, to, nights, day)}>
            <Day label="Departure" value={to} min={from} off={false} onChange={setTo} />
          </Field>
          <Field label="Booking source" required hint="How it reached us. It cannot be filled in later.">
            <Pick
              value={sourceId} onChange={setSourceId} title="Booking source" placeholder="Choose one…" tall
              options={(sources.data ?? []).filter((x) => x.isActive).map((x) => ({ value: x.id, label: x.name }))}
            />
          </Field>
          {siteSource ? <Toggle value={prepaid} onChange={setPrepaid} label="Prepaid on the booking site" description="Untick when the guest pays at the hotel: the advance before check-in is then asked." /> : null}
          {rooms_ > 1 ? (
            <Field label="Group name" hint="More than one room becomes a group. Left empty, it is named after the guest.">
              <Box value={groupName} label="Group name" placeholder="Sharma Wedding, March" tall onChange={setGroupName} />
            </Field>
          ) : null}
          {lines.map((line, i) => (
            <View key={line.key} style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 16 } : null}>
              <RoomLine
                line={line} quote={quoteOf(i)} pricing={quotes.loading} nights={nights} dayUse={dayUse} types={types}
                left={leftFor(inventory.data?.cells ?? [], line.roomTypeId, from, to)} mayGive={keeper} waiting={waiting} removable={lines.length > 1}
                rate={rates[i]?.rate}
                rooms={(rooms.data ?? []).filter((r) => r.type === typeName(line.roomTypeId) && r.status !== "out-of-service").map((r) => {
                  const why = i === 0 ? checkRooms.data?.find((x) => x.number === r.number) : undefined;
                  return { number: r.number, state: !arrivesToday ? undefined : why && !why.allowed ? why.reason : ROOM_STATE[r.status] };
                })}
                onChange={(next) => setLine(line.key, next)}
                onRemove={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
              />
            </View>
          ))}
        </Section>

        <Section title="ID" description={arrivesToday ? "Recorded by Check in now. Save booking keeps only the nationality." : "The document is taken when they check in."}>
          <GuestIdFields value={guestId} onChange={setGuestId} today={today} idsOff={rules?.idTypesOff ?? []} withDocument={arrivesToday} />
          {isEarly ? (
            <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.yellow100, backgroundColor: c.yellow50, padding: 12, gap: 10 }}>
              <Text style={[t.label, body, { color: c.yellow800 }]}>
                {`Rooms are ready from ${early.data?.checkInTime ?? "-"}.`}
                {early.data?.charge == null ? " This property does not charge for an early arrival." : ` An early arrival is ${cash(early.data.charge)}.`}
              </Text>
              <Field label="Why the room is being given early" required>
                <Box value={earlyReason} label="Why the room is being given early" placeholder="Overnight train, room vacant and clean" onChange={setEarlyReason} />
              </Field>
              {early.data?.charge != null && early.data.mayWaive ? <Tick value={waiveEarly} onChange={setWaiveEarly} label="Waive the charge. The reason is still recorded." /> : null}
            </View>
          ) : null}
        </Section>

        <Section title="Advance" description="Held as the guest's credit until the nights are charged.">
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Amount"><Box value={advance} label="Amount" placeholder="-" keyboard="decimal-pad" tall onChange={setAdvance} /></Field></View>
            <View style={{ flex: 1 }}>
              <Field label="Paid by">
                <Pick
                  value={advanceBy} onChange={setAdvanceBy} title="Paid by" tall
                  options={(rules?.paymentMethods ?? [{ label: "Cash", kind: "cash" }, { label: "Card", kind: "card" }, { label: "UPI", kind: "upi" }])
                    .filter((m) => m.kind !== "city_ledger").map((m) => ({ value: m.label, label: m.label }))}
                />
              </Field>
            </View>
          </View>
          {advanceAmount !== null && whyNotPay(role) ? <Text style={[t.label, body, { color: c.grey600 }]}>{whyNotPay(role)}</Text> : null}
        </Section>

        <Fold title="More about the guest">
          <Toggle value={offersAgreed} onChange={setOffersAgreed} label="Guest agreed to offers" description="Ask them. Unticked, no offers are sent. Kept against this phone and email at every hotel of the group." />
          <Toggle value={singleLady} onChange={setSingleLady} label="Woman travelling alone" description="Placed away from stairwells and service corridors. Not announced at the desk." />
          <Field label="Address"><Box value={addressLine} label="Address" tall onChange={setAddressLine} /></Field>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="City"><Box value={city} label="City" tall onChange={setCity} /></Field></View>
            <View style={{ flex: 1 }}><Field label="State"><Box value={stateName} label="State" tall onChange={setStateName} /></Field></View>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="PIN code"><Box value={pincode} label="PIN code" keyboard="number-pad" tall onChange={setPincode} /></Field></View>
            <View style={{ flex: 1 }}><Field label="Country"><Box value={country} label="Country" tall onChange={setCountry} /></Field></View>
          </View>
        </Fold>

        <Fold title="Booking details">
          <Field label="The booking" hint={waiting ? "Waiting holds the room and sends the guest nothing until it is confirmed." : "Confirmed: the guest's voucher can go."}>
            <Segmented value={waiting ? "waiting" : "confirmed"} onChange={(v) => setWaiting(v === "waiting")}
              options={[{ value: "confirmed", label: "Confirmed" }, { value: "waiting", label: "Waiting for the hotel" }]} />
          </Field>
          <Field label="Expected check-in" hint={`If they said. The hotel's check-in is ${times.checkInTime ?? "-"}.`}>
            <Box value={expected} label="Expected check-in" placeholder="HH:MM" tall onChange={setExpected} />
          </Field>
          <Field label="Expected check-out" hint={`If they said. The hotel's check-out is ${times.checkOutTime ?? "-"}.`}>
            <Box value={expectedOut} label="Expected check-out" placeholder="HH:MM" tall onChange={setExpectedOut} />
          </Field>
          <Field label="Business source" hint="The account or agent behind it, if there is one.">
            <Pick value={businessSource} onChange={setBusinessSource} title="Business source" tall
              options={[{ value: "", label: "None" }, ...(accounts.data ?? []).map((x) => ({ value: x.name, label: x.name }))]} />
          </Field>
          <Field label="Market segment">
            <Pick value={marketSegment} onChange={setMarketSegment} title="Market segment" tall options={[{ value: "", label: "-" }, ...segmentNames.map((m) => ({ value: m, label: m }))]} />
          </Field>
          <Field label="Sales person">
            <Pick value={salesPick} onChange={setSalesPick} title="Sales person" tall
              options={[{ value: "", label: "None" }, ...(sales.data ?? []).map((p) => ({ value: p.name, label: p.name })), { value: OTHER, label: "Other…" }]} />
          </Field>
          {salesPick === OTHER ? <Field label="Sales person's name" required><Box value={salesOther} label="Sales person's name" tall onChange={setSalesOther} /></Field> : null}
          <Field label="Discount">
            <Pick value={mode} onChange={(v) => setMode(v as DiscountMode)} title="Discount" tall
              options={[{ value: "none", label: "None" }, { value: "hand", label: "Up to 10%" }, { value: "rupees", label: "₹ off" }, { value: "promotion", label: "Promotion" }]} />
          </Field>
          {mode === "hand" || mode === "rupees" ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ width: 96 }}><Box value={discountText} label={mode === "hand" ? "Discount percent" : "Rupees off each night"} placeholder={mode === "hand" ? "%" : "₹ a night"} keyboard="decimal-pad" onChange={setDiscountText} /></View>
              <View style={{ flex: 1 }}><Box value={discountReason} label="Why" placeholder="Why" onChange={setDiscountReason} /></View>
            </View>
          ) : null}
          {mode === "promotion" ? (
            <Pick value={promotionId} onChange={setPromotionId} title="Promotion" placeholder={(promotions.data ?? []).length ? "Choose one…" : "No promotions yet"}
              options={(promotions.data ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.percent !== null ? `${p.percent}%` : `₹${p.amount} a night`})` }))} />
          ) : null}
          {discount.problem ? <Text style={[t.label, body, { color: c.yellow800 }]}>{discount.problem}</Text> : null}
        </Fold>

        {show.company ? (
          <Fold title="Company">
            <Field label="Bill to">
              <Segmented value={billTo} onChange={setBillTo} options={[{ value: "guest", label: "Guest" }, { value: "company", label: "Company" }]} />
            </Field>
            {billTo === "company" ? (
              <Field label="Company" required>
                <Pick value={companyId} onChange={setCompanyId} title="Company" placeholder="Choose one…" tall options={(billable.data ?? []).map((x) => ({ value: x.id, label: x.name }))} />
              </Field>
            ) : null}
            {billTo === "company" && company ? (
              <Text style={[t.label, body, { color: c.grey600 }]}>
                {company.gstin ? `GSTIN ${company.gstin}, from ${company.name}'s record. The tax invoice prints it.` : `${company.name} has no GSTIN on its record.`}
              </Text>
            ) : null}
          </Fold>
        ) : null}

        <Fold title="Special request">
          <Field label="The guest's special request" hint="Printed on the booking voucher the guest receives.">
            <Box value={specialRequest} label="The guest's special request" max={500} multiline onChange={setSpecialRequest} />
          </Field>
        </Fold>
        {show.notes ? (
          <Fold title="Notes">
            <Field label="Notes on the booking" hint="The hotel's own. Never on the voucher."><Box value={notes} label="Notes on the booking" multiline onChange={setNotes} /></Field>
          </Fold>
        ) : null}

        {/* The web's card adds the room charges, their GST and Due itself: the
            phone shows each line's night price and the server's GST rate, and
            the bill carries the totals (MFD-3; PMS request R-22). */}
        <Section title="The booking">
          <View>
            <SumRow first label="Nights" value={dayUse ? "Day use" : String(nights)} />
            <SumRow label="Rooms" value={String(rooms_)} />
            {lines.map((l, i) => {
              const q = quoteOf(i)?.q ?? NONE;
              const rate = rates[i]?.rate;
              return (
                <SumRow key={l.key} label={`${l.rooms} × ${typeName(l.roomTypeId) || "-"}${l.comp ? ", complimentary" : ""}`}
                  value={q.nightly === null ? "-" : `${cash(q.nightly)} ${dayUse ? "for the day" : "a night"} · GST ${rate === null || rate === undefined ? "-" : `${rate}%`}`} />
              );
            })}
            {advanceAmount !== null && !advanceProblem ? <SumRow label="Advance" value={moneyPrecise(advanceAmount)} /> : null}
          </View>
          {lines.map((_, i) => quoteOf(i)?.q.unpriced).some(Boolean)
            ? <Text style={[t.label, body, { color: c.yellow800 }]}>{`No price for ${lines.map((_, i) => quoteOf(i)?.q.unpriced).filter(Boolean).join(", ")}. Set it on Rates, or type a rate on the line.`}</Text>
            : rates.some((r) => r?.noRule) ? <Text style={[t.label, body, { color: c.yellow800 }]}>The tax card has no rule for this rate. Set it before the night audit posts it.</Text>
              : <Text style={[t.label, body, { color: c.grey500 }]}>{`The bill carries the room charges, their GST and what is due, as the server charges them.${advanceAmount === null ? " Nothing is paid at booking." : ""}`}</Text>}
          {rooms_ > 1 ? <Text style={[t.label, body, { color: c.grey500 }]}>{`${rooms_} rooms are booked as one group.`}</Text> : null}
        </Section>

        {/* The three buttons: the one filled is the job the page was opened for. */}
        <View style={{ gap: 8 }}>
          <Button label="Save booking" kind={walkIn ? "secondary" : "primary"} size="lg" busy={saving} reason={reasonToSave} onPress={() => void submit(false)} />
          <Button label="Save and assign room" size="lg" busy={saving} reason={reasonToSave ?? reasonToAssign} onPress={() => void submit(false)} />
          <Button label="Check in now" kind={walkIn ? "primary" : "secondary"} size="lg" busy={saving} reason={reasonToSave ?? reasonToCheckIn} onPress={() => void submit(true)} />
          <View style={{ gap: 2 }}>
            {reasonToSave ? <Text style={[t.label, body, { color: c.grey600 }]}>{reasonToSave}</Text> : (
              <>
                {reasonToAssign ? <Text style={[t.label, body, { color: c.grey600 }]}>{`Save and assign room: ${reasonToAssign}`}</Text> : null}
                {reasonToCheckIn ? <Text style={[t.label, body, { color: c.grey600 }]}>{`Check in now: ${reasonToCheckIn}`}</Text> : null}
              </>
            )}
          </View>
          {overLimit ? (
            <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, padding: 12, gap: 8 }} accessibilityRole="alert">
              <Text style={[t.label, { color: c.ink900 }]}>{overLimit.reason}</Text>
              {keeper ? (
                <>
                  <Box value={allowReason} label="Why it is allowed" placeholder="Why it is allowed" onChange={setAllowReason} />
                  <Button label="Allow, with reason" busy={saving} reason={allowReason.trim() ? null : "Say why it is allowed."} onPress={() => void submit(overLimit.now, allowReason.trim())} />
                </>
              ) : <Text style={[t.label, body, { color: c.grey600 }]}>{OVER_LIMIT_WHO}</Text>}
            </View>
          ) : null}
        </View>
      </Screen>
      <Toast said={toast} onClose={() => setToast(null)} />
    </KeyboardAvoidingView>
  );
}

/** One room line (BookingPage.tsx RoomLine): the price beside the room, live. */
function RoomLine({ line, quote, pricing, nights, dayUse, types, left, mayGive, waiting, removable, rooms, rate, onChange, onRemove }: {
  line: Line; quote: LineQuote | undefined; pricing: boolean; nights: number; dayUse: boolean; types: Array<{ id: string; name: string }>;
  left: number | null; mayGive: boolean; waiting: boolean; removable: boolean; rooms: Array<{ number: string; state: string | undefined }>;
  rate: number | null | undefined; onChange: (l: Line) => void; onRemove: () => void;
}) {
  const over = left !== null && line.rooms > left;
  const contractRate = quote?.contractRate === true;
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label="Room type">
            <Pick value={line.roomTypeId} onChange={(v) => onChange({ ...line, roomTypeId: v, room: "" })} title="Room type" tall options={types.map((x) => ({ value: x.id, label: x.name }))} />
          </Field>
        </View>
        {removable ? (
          <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel="Remove this room"
            style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.grey100 : c.white })}>
            <Trash2 size={16} color={c.grey700} />
          </Pressable>
        ) : null}
      </View>
      <Field label="Meal plan"><Pick value={line.mealPlan} onChange={(v) => onChange({ ...line, mealPlan: v })} title="Meal plan" tall options={PLANS} /></Field>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}><Field label="Rooms"><Box value={String(line.rooms)} label="Rooms" keyboard="number-pad" tall onChange={(v) => onChange(withRooms(line, counted(v, 1)))} /></Field></View>
        <View style={{ flex: 1 }}><Field label="Adults"><Box value={String(line.adults)} label="Adults" keyboard="number-pad" tall onChange={(v) => onChange({ ...line, adults: counted(v, 1) })} /></Field></View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}><Field label="Children"><Box value={String(line.children)} label="Children" keyboard="number-pad" tall onChange={(v) => onChange({ ...line, children: counted(v, 0) })} /></Field></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Field label="Rate" hint={line.comp ? "Complimentary." : dayUse ? "Type the day's price." : "Empty uses the calendar."}>
            <Box value={line.comp ? "" : line.rate} label="Rate" placeholder="-" keyboard="decimal-pad" disabled={line.comp} tall onChange={(v) => onChange({ ...line, rate: v })} />
          </Field>
          {!line.comp ? <Tick value={line.inclusive && !contractRate} onChange={(v) => onChange({ ...line, inclusive: v })} label="Rate includes GST" disabled={contractRate} /> : null}
          {!line.comp && contractRate ? <Text style={t.caption}>Contract rates are before GST</Text> : null}
        </View>
      </View>
      {!line.comp ? <InclusiveNote split={quote?.split ?? null} gross={quote?.gross ?? null} /> : null}
      {line.rooms === 1 && !waiting ? (
        <Field label="Room" hint="Optional. A room picked is kept.">
          <Pick value={line.room} onChange={(v) => onChange({ ...line, room: v })} title="Room" tall
            options={[{ value: "", label: "Assign later" }, ...rooms.map((r) => ({ value: r.number, label: `Room ${r.number}${r.state ? ` · ${r.state}` : ""}` }))]} />
        </Field>
      ) : null}
      <Tick value={line.comp} onChange={(v) => onChange({ ...line, comp: v })} disabled={!mayGive} label={mayGive ? "Complimentary" : "Complimentary (owner, admin or GM only)"} />
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 12 }}>
          <Text style={[t.label, body, { color: over ? c.yellow800 : c.grey600 }, over ? face[500] : null]}>
            {left === null ? "-" : `${left} left`}{over ? " · this books more than that" : ""}
          </Text>
          {left !== null && left > 1 && line.rooms !== left ? <Button label={`All ${left} left`} kind="ghost" size="sm" onPress={() => onChange({ ...line, rooms: left, room: "" })} /> : null}
        </View>
        <PriceLine comp={line.comp} q={quote?.q ?? NONE} pricing={pricing} typed={line.rate.trim() !== ""} dayUse={dayUse} nights={nights} rate={rate} />
      </View>
    </View>
  );
}

/** A card with its head (Card, CardHeader, CardBody), as front desk's walk-in draws it. */
function Section({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card style={{ paddingHorizontal: 0, paddingVertical: 0 }}>
      <View style={{ paddingHorizontal: space.cardX, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.grey100, flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={t.heading} accessibilityRole="header">{title}</Text>
          {description ? <Text style={[t.label, body, { color: c.grey500 }]}>{description}</Text> : null}
        </View>
        {action}
      </View>
      <View style={{ paddingHorizontal: space.cardX, paddingVertical: 14, gap: 16 }}>{children}</View>
    </Card>
  );
}

/** The card's rows, a hairline between each (the picture's). */
function SumRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingVertical: 10 }, first ? null : { borderTopWidth: 1, borderTopColor: c.grey200 }]}>
      <Text style={[t.label, body, { flexShrink: 1, color: c.grey600 }]}>{label}</Text>
      <Text style={[t.label, body, t.tab, { color: c.ink900, flexShrink: 1, textAlign: "right" }]}>{value}</Text>
    </View>
  );
}

/** The line's price: the night's, and the server's GST rate; the tax is not worked out here (MFD-3). */
function PriceLine({ comp, q, pricing, typed, dayUse, nights, rate }: {
  comp: boolean; q: LineQuote["q"]; pricing: boolean; typed: boolean; dayUse: boolean; nights: number; rate: number | null | undefined;
}) {
  if (comp) return <Text style={[t.label, body, { color: c.grey600 }]}>Complimentary: no charge, nothing posted</Text>;
  if (q.unpriced) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <AlertTriangle size={14} color={c.yellow800} />
        <Text style={[t.label, face[500], { color: c.yellow800 }]}>{`No price for ${q.unpriced}`}</Text>
      </View>
    );
  }
  if (q.nightly === null) return <Text style={[t.label, body, { color: c.grey500 }]}>{pricing ? "Pricing…" : "-"}</Text>;
  return (
    <View>
      <Text style={[t.label, body, { color: c.grey600 }]}>
        {`${moneyPrecise(q.nightly)} ${dayUse ? "for the day" : "a night"} + tax (${rate === null || rate === undefined ? "-" : `${rate}%`})`}
        {typed ? ", agreed" : ""}
        {dayUse ? " · day use" : nights > 0 ? ` · ${nights} ${nights === 1 ? "night" : "nights"}` : ""}
      </Text>
      {q.differs ? <Text style={[t.label, body, { color: c.yellow800 }]}>The first night's price is kept for every night; the calendar differs later.</Text> : null}
      {q.contract && !typed ? <Text style={[t.label, body, { color: c.grey600 }]}>{`Contract: ${q.contract}`}<Text style={{ color: c.yellow800 }}>{q.note ? `. ${q.note}` : ""}</Text></Text> : null}
    </View>
  );
}

function InclusiveNote({ split, gross }: { split: Split | null; gross: number | null }) {
  if (!split || gross === null || !(gross > 0)) return null;
  const words = !split.ok ? split.reason : split.total < gross ? `${moneyPrecise(gross)} can't split exactly: the bill will say ${moneyPrecise(split.total)} a night.` : null;
  return words ? <Text style={[t.label, body, { color: c.yellow800 }]}>{words}</Text> : null;
}

/** ReturningGuest.tsx: never automatic; a blacklisted match only warns. */
function Returning({ code, phone, email, chosen, onChoose, onUseCompany }: {
  code: string; phone: string; email: string; chosen: { id: string; name: string } | null; onChoose: (g: { id: string; name: string } | null) => void;
  onUseCompany?: (x: { name: string | null; gstin: string | null; address: string | null }) => void;
}) {
  const ask = worthAsking(phone, email);
  const found = useRead(() => (ask ? readReturning(code, phone.trim(), email.trim()) : Promise.resolve([])), ["reservations", code, "returning", phone.trim(), email.trim()]);
  const matches = ask ? (found.data ?? []) : [];
  if (matches.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      {matches.filter((m) => m.blacklisted).map((m) => (
        <View key={`w-${m.guestId ?? m.name}`} accessibilityRole="alert" style={{ flexDirection: "row", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: c.red100, backgroundColor: c.red50, padding: 12 }}>
          <AlertTriangle size={16} color={c.red700} style={{ marginTop: 2 }} />
          <Text style={[t.label, { flex: 1, color: c.red700 }]}>
            {`${m.name} is blacklisted.`}<Text style={body}>{` Reason: ${m.blacklistReason ?? "-"}. The booking is not refused - you decide.`}</Text>
          </Text>
        </View>
      ))}
      {matches.filter((m) => m.suggested && m.guestId).map((m) => {
        const isChosen = chosen?.id === m.guestId;
        const company = isChosen && onUseCompany ? m.lastCompany : undefined;
        return (
          <View key={m.guestId} style={{ borderRadius: 12, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, padding: 12, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <UserCheck size={16} color={c.grey500} />
              <Text style={[t.label, body, { flex: 1, color: c.ink900 }]}>
                <Text style={face[500]}>{m.name}</Text>{`${m.visits == null ? "" : ` · ${stayedWords(m.visits)}`}${isChosen ? " - this booking is theirs." : " - same person?"}`}
              </Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              {isChosen ? <Button label="Not them" onPress={() => onChoose(null)} /> : <Button label="Same person" onPress={() => onChoose({ id: m.guestId!, name: m.name })} />}
            </View>
            {company ? (
              <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.grey200, paddingTop: 12 }}>
                <Text style={[t.label, body, { color: c.grey700 }]}>
                  {"Last company: "}<Text style={[face[500], { color: c.ink900 }]}>{company.name ?? m.name}</Text>{company.gstin ? ` · GSTIN ${company.gstin}` : ""}
                </Text>
                <View style={{ flexDirection: "row" }}><Button label="Use this company" onPress={() => onUseCompany!(company)} /></View>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** flows/BookedCard.tsx: what the desk does next, on the bookings just made.
    Each later step is said: the booking stands whatever they answered. */
function BookedCard({ hotel, done, onAnother }: { hotel: Hotel; done: Done; onAnother: () => void }) {
  const code = hotel.code;
  const lead = done.made.bookings[0];
  const inHouse = done.checkedIn != null && "room" in done.checkedIn;
  const [waiting, setWaiting] = useState(done.waiting);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Said | null>(null);
  /* The group's one confirmation is about its lead room, the first booked (D22-52). */
  const confirm = async () => {
    if (!lead?.id || busy) return;
    setBusy(true);
    try {
      await confirmWaiting(code, lead.id);
      setWaiting(false);
      setToast({ title: "Confirmed", body: "The voucher can go now.", tone: "ok" });
    } catch (e) { setToast({ title: "Not confirmed", body: wordOf(e), tone: "bad" }); } finally { setBusy(false); }
  };
  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={false} onRefresh={() => undefined}>
        <PageHead title="New booking" description="One guest, one set of nights. Save it, give it a room, or check them in." />
        <Section title={inHouse ? "Checked in" : waiting ? "Held, waiting for the hotel" : "Booked"} description={done.made.guest}>
          {done.made.bookings.map((b) => {
            const a = done.assigned[b.reference];
            return (
              <View key={b.reference} style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
                <Text style={[t.label, t.tab, { color: c.ink900 }]}>{b.reference}</Text>
                <Text style={[t.label, body, { color: c.grey600 }]}>{`${b.roomType}${a && "room" in a ? `, room ${a.room}` : ""}`}</Text>
                {a && "failed" in a ? <Text style={[t.label, body, { width: "100%", color: c.yellow800 }]}>{`No room given: ${a.failed} Assign one from Arrivals.`}</Text> : null}
              </View>
            );
          })}
          {done.checkedIn ? ("room" in done.checkedIn
            ? <Text style={[t.label, body, { color: c.grey600 }]}>{`In house, room ${done.checkedIn.room}.`}</Text>
            : <Text style={[t.label, body, { color: c.yellow800 }]}>{`Not checked in: ${done.checkedIn.failed} Check them in from Arrivals.`}</Text>) : null}
          {done.advance ? ("amount" in done.advance
            ? <Text style={[t.label, body, { color: c.grey600 }]}>{`Advance of ${moneyPrecise(done.advance.amount)} taken, held as the guest's credit.`}</Text>
            : <Text style={[t.label, body, { color: c.yellow800 }]}>{`Advance not taken: ${done.advance.failed} Take it on the bill.`}</Text>) : null}
          {/* Just checked in: the other adults (D27-382), as at the desk. */}
          {inHouse && lead?.id ? <Companions code={code} stayId={lead.id} today={hotel.businessDate} rules={rulesOf(hotel)} /> : null}
          {waiting ? (
            <View style={{ gap: 8 }}>
              <Text style={[t.label, body, { color: c.grey600 }]}>The room is held. Nothing is sent to the guest until the booking is confirmed.</Text>
              <Button label="Confirm the booking" kind="primary" Icon={Check} busy={busy} onPress={() => void confirm()} />
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Button label="The guest's page link" reason={WEBSITE} onRefused={(r) => setToast({ title: r, tone: "held" })} onPress={() => undefined} />
              <Button label="Send voucher" reason={WEBSITE} onRefused={(r) => setToast({ title: r, tone: "held" })} onPress={() => undefined} />
              {!inHouse ? <Button label="View voucher" reason={WEBSITE} onRefused={(r) => setToast({ title: r, tone: "held" })} onPress={() => undefined} /> : null}
              <Text style={t.caption}>{WEBSITE}</Text>
            </View>
          )}
          <View style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.grey200 }}>
            {done.arrivesToday && !waiting && done.made.bookings.length === 1 && lead?.id && !inHouse
              ? <Button label="Check in now" onPress={() => router.replace(`/front-desk/${code}/check-in/${lead.id}`)} /> : null}
            {/* A group opens its group page on the web: on the phone, its lead room. */}
            {lead?.id ? <Button label="Open the booking" onPress={() => router.replace(`/front-desk/${code}/stay/${lead.id}?offer=1` as Href)} /> : null}
            <Button label="Another booking" kind="ghost" onPress={onAnother} />
          </View>
        </Section>
      </Screen>
      <Toast said={toast} onClose={() => setToast(null)} />
    </View>
  );
}
