import { useQueryClient } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { AlertTriangle, Plus, UserCheck } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { ApiError, HeldError, outcomeUnknown, type Hotel } from "../../core/api";
import { cash, dateLong } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { Card, notKnown, Screen, useRead, useStuck } from "../../core/ui";
import { Day } from "../housekeeping/DayStepper";
import {
  allIn, assignReason, byContract, checkInReason, discountIn, gstinProblem, inclusive, MARKET_SEGMENTS, OTHER, PLANS, priceLine, saveReason, summary, TITLES, worthAsking,
  type DiscountMode,
} from "./booking";
import { Companions } from "./Companions";
import {
  assignRoom, checkIn, createBooking, readAccounts, readAssignable, readBeforeGst, readBilling, readContract, readEarly, readInventory, readModules, readPromotions,
  readReturning, readRooms, readSalesPeople, readSegments, readSources, readTariff, readTaxRate, rulesOf, said, takeAdvance, timesOf, type Booked as Made,
} from "./data";
import { addDays, day, moneyPrecise, nightsBetween } from "./desk";
import { deskGuestId, guestIdPayload, guestIdState, type GuestId } from "./guestId";
import { GuestIdFields } from "./GuestIdFields";
import { body, Box, Button, Field, Fold, PageHead, Pick, Segmented, Tick, Toast, Toggle, WEBSITE, type Said } from "./kit";
import { mayGiveComp, whyNotBook, whyNotPay } from "./roles";
import { stayedWords } from "./desk";

/* ══════════════════════════════════════════════════════════════════
   A WALK-IN — New booking's one page (src/modules/reservations/pages/
   BookingPage.tsx, D27-158, D27-163, picture 14) opened from an empty
   room: that room, tonight, one night, the Walk-in source. Save booking =
   the booking call (a picked room kept through assign). Check in now = the
   booking call, the advance, then front desk's own check-in; when a later
   door refuses, the booking stands and the card says which step and why.
   A booking is refused offline (the web's tiers), so a walk-in waits for
   the line. One room at a time: Another room and groups are slice 10's.
   ══════════════════════════════════════════════════════════════════ */

interface Done {
  made: Made;
  /** Kept through assign, or why not. */
  assigned: { room: string } | { failed: string } | null;
  checkedIn: { room: string } | { failed: string } | null;
  /** `unknown`: nothing came back, or a 5xx - it may have been taken (MEMORY 16). */
  advance: { amount: number } | { failed: string; unknown: boolean } | null;
  waiting: boolean;
}

const ROOM_STATE: Record<string, string> = { clean: "clean", inspected: "inspected", dirty: "needs cleaning" };
const wordOf = (e: unknown) => (e instanceof HeldError || e instanceof ApiError ? e.message : said(e));

export function WalkIn({ hotel, role, room: walkRoom, onClose }: { hotel: Hotel; role: string | null; room: string; onClose: () => void }) {
  const code = hotel.code;
  const today = hotel.businessDate;
  const rules = rulesOf(hotel);
  const times = timesOf(hotel);
  const cache = useQueryClient();
  const [toast, setToast] = useState<Said | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [saving, setSaving] = useState(false);
  /* One tap, one booking (MEMORY 8); a booking whose outcome is unknown is
     never made again from here - POST bookings reads no key (MFD-8). */
  const latch = useRef(false);
  const once = useStuck();
  const unknownBooking = notKnown("booked", "Arrivals");

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
  const [sourceId, setSourceId] = useState<string | null>(null);
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
  const from = today;
  const [to, setTo] = useState(addDays(today, 1));
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
  const [mealPlan, setMealPlan] = useState("EP");
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [rate, setRate] = useState("");
  const [incl, setIncl] = useState(false);
  const [comp, setComp] = useState(false);
  const [room, setRoom] = useState(walkRoom);
  const [typeId, setTypeId] = useState<string | null>(null);

  const scope = ["front-desk", code, "walk-in"];
  const sources = useRead(() => readSources(code), [...scope, "sources"]);
  const inventory = useRead(() => readInventory(code, from, to), [...scope, "inventory", to]);
  const rooms = useRead(() => readRooms(code), [...scope, "rooms"]);
  const modules = useRead(() => readModules(code), [...scope, "modules"]);
  const accounts = useRead(() => readAccounts(code), [...scope, "accounts"]);
  const segments = useRead(() => readSegments(code), [...scope, "segments"]);
  const sales = useRead(() => readSalesPeople(code), [...scope, "sales"]);
  const promotions = useRead(() => readPromotions(code), [...scope, "promotions"]);
  const show = { company: modules.data?.["booking_company"] !== false, notes: modules.data?.["booking_notes"] !== false };
  const billable = useRead(() => (show.company && billTo === "company" ? readBilling(code) : Promise.resolve([])), [...scope, "billing", show.company && billTo === "company"]);
  const early = useRead(() => readEarly(code), ["front-desk", code, "early"]);

  /* The Walk-in source, tonight's only pre-choice (D27-163). */
  const walkSource = sources.data?.find((s) => s.kind === "walk_in" && s.isActive)?.id ?? "";
  const bookingSourceId = sourceId ?? walkSource;
  const siteSource = sources.data?.find((s) => s.id === bookingSourceId)?.kind === "ota";

  const types = [...new Map((inventory.data?.cells ?? []).map((x) => [x.roomTypeId, { id: x.roomTypeId, name: x.roomType }])).values()];
  const walkType = types.find((x) => x.name === rooms.data?.find((r) => r.number === walkRoom)?.type);
  const roomTypeId = typeId ?? walkType?.id ?? types[0]?.id ?? "";
  const typeName = types.find((x) => x.id === roomTypeId)?.name ?? "";
  const cells = (inventory.data?.cells ?? []).filter((x) => x.roomTypeId === roomTypeId && x.date >= from && x.date < to);
  const left = cells.length === 0 ? null : Math.min(...cells.map((x) => x.available));

  const nights = nightsBetween(from, to);
  const dayUse = from === to;
  const line = { rate, inclusive: incl, comp };
  const promotion = (promotions.data ?? []).find((p) => p.id === promotionId) ?? null;
  const discount = discountIn({ mode, text: discountText, reason: discountReason, promotion });
  const contractOf = show.company && billTo === "company" ? companyId : "";
  const partyNow = { roomTypeId, mealPlan, from, to, adults: Number(adults) || 1, children: Number(children) || 0 };

  /* The price of the line: the server's figures, read in the web's order. */
  const quote = useRead(async () => {
    const tariff = !dayUse && !comp && rate.trim() === "" && roomTypeId
      ? await (contractOf ? readContract(code, partyNow, contractOf) : readTariff(code, partyNow)) : null;
    const gross = allIn(line, tariff);
    const split = inclusive(line, tariff) && !comp && (gross ?? 0) > 0 ? await readBeforeGst(code, gross!) : null;
    const q = priceLine(line, tariff, split, discount.off);
    const tax = q.nightly !== null && q.nightly > 0 ? await readTaxRate(code, q.nightly) : null;
    return { q, split, gross, contractRate: byContract(line, tariff), taxRate: tax?.rate };
  }, [...scope, "quote", roomTypeId, mealPlan, to, adults, children, rate, incl, comp, contractOf, mode, discountText, promotionId]);
  const q = quote.data?.q ?? { nightly: null, unpriced: null, differs: false };

  const advanceAmount = advance.trim() === "" ? null : Number(advance);
  const advanceProblem = advanceAmount !== null && !(Number.isFinite(advanceAmount) && advanceAmount > 0) ? "An advance is an amount above 0." : null;
  const sum = summary(q, quote.data?.taxRate);

  const salesPerson = salesPick === OTHER ? salesOther.trim() : salesPick;
  const idNow = guestIdState(guestId, today);
  const checkRooms = useRead(() => (typeName ? readAssignable(code, typeName, today) : Promise.resolve([])), [...scope, "assignable", typeName]);
  const isEarly = early.data?.isEarly ?? false;
  const picked = checkRooms.data?.find((r) => r.number === room);

  const refused = whyNotBook(role);
  const reasonToSave = refused ?? saveReason({
    name: guestName, phone, email, gstin: companyGstin, showCompany: show.company, sourceId: bookingSourceId, dayUse, comp, rate, discountProblem: discount.problem,
    billTo, companyId, salesPick, salesOther, advanceProblem,
    inclusiveRefused: quote.data?.split && !quote.data.split.ok ? quote.data.split.reason : null,
    required: rules?.requiredBookingFields ?? [],
    fields: {
      phone: ["The phone number", phone], email: ["The email", email], nationality: ["The nationality", guestId.nationality], address: ["The address", addressLine],
      expectedArrival: ["The expected arrival time", expected], marketSegment: ["The market segment", marketSegment],
      businessSource: ["The business source", businessSource], salesPerson: ["The sales person", salesPerson],
    },
  });
  const reasonToAssign = assignReason(waiting, room);
  const reasonToCheckIn = checkInReason({
    waiting, arrivesToday: true, room, roomsFailed: checkRooms.error != null, picked, idBlocked: idNow.blocked, early: isEarly, earlyReason,
  });

  const roomOptions = (rooms.data ?? [])
    .filter((r) => r.type === typeName && r.status !== "out-of-service")
    .map((r) => {
      const why = checkRooms.data?.find((x) => x.number === r.number);
      const state = why && !why.allowed ? why.reason : ROOM_STATE[r.status];
      return { value: r.number, label: `Room ${r.number}${state ? ` · ${state}` : ""}` };
    });

  const submit = async (now: boolean) => {
    if (latch.current || once.isStuck()) return;
    latch.current = true;
    setSaving(true);
    let made: Made;
    try {
      made = await createBooking(code, {
        guestName: guestName.trim(), phone: phone.trim(), ...(email.trim() ? { email: email.trim() } : {}),
        bookingSourceId, ...(siteSource ? { prepaidOnSite: prepaid } : {}),
        ...(businessSource ? { businessSource } : {}), ...(marketSegment ? { marketSegment } : {}), ...(salesPerson ? { salesPerson } : {}),
        ...(expected ? { expectedArrival: expected } : {}), ...(expectedOut ? { expectedDeparture: expectedOut } : {}),
        checkIn: from, checkOut: to, ...(returning ? { guestId: returning.id } : {}),
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
        lines: [{
          roomTypeId, mealPlan, adults: Number(adults), children: Number(children), rooms: 1,
          ...(comp ? { complimentary: true } : {}),
          ...(comp || rate.trim() === "" ? {} : { agreedRate: Number(rate) }),
          ...(!comp && incl && !quote.data?.contractRate ? { rateIncludesGst: true } : {}),
        }],
      });
    } catch (e) {
      latch.current = false;
      setSaving(false);
      /* Nothing came back, or the server failed: it may be booked. No more
         taps until Arrivals is looked at (MEMORY 16). */
      if (once.stop(e)) {
        const n = notKnown("booked", "Arrivals", e);
        setToast({ title: n.title, body: n.body, tone: "bad" });
        return;
      }
      /* The server's sentence: nothing was written. */
      setToast({ title: "Not booked", body: wordOf(e), tone: "bad" });
      return;
    }

    const lead = made.bookings[0];
    let advanceTaken: Done["advance"] = null;
    let checkedIn: Done["checkedIn"] = null;
    let assigned: Done["assigned"] = null;

    /* The advance FIRST (D27-328 (3)): "Advance before check-in" refused a
       guest whose advance was typed here and not yet taken. */
    if (advanceAmount !== null && lead?.id) {
      try {
        await takeAdvance(code, lead.id, { method: advanceBy, amount: advanceAmount, businessDate: today, heldAsCredit: true });
        advanceTaken = { amount: advanceAmount };
      } catch (e) { advanceTaken = { failed: wordOf(e), unknown: outcomeUnknown(e) }; }
    }
    if (now && lead?.id) {
      try {
        await checkIn(code, lead.id, {
          roomNumber: room, adults: Number(adults), children: Number(children), ratePlan: mealPlan,
          ...guestIdPayload(guestId), businessDate: today, earlyReason, waiveEarly, offersAgreed,
        });
        checkedIn = { room };
      } catch (e) { checkedIn = { failed: wordOf(e) }; }
    }
    /* A picked room is kept, through the Calendar's Assign room. */
    if (room && !waiting && lead?.id && !(checkedIn && "room" in checkedIn)) {
      try {
        const a = await assignRoom(code, lead.id, room);
        assigned = { room: a.room };
      } catch (e) { assigned = { failed: wordOf(e) }; }
    }
    latch.current = false;
    setSaving(false);
    void cache.invalidateQueries();
    setDone({ made, assigned, checkedIn, advance: advanceTaken, waiting });
  };

  if (done) return <BookedCard hotel={hotel} done={done} onAnother={onClose} />;

  const company = (billable.data ?? []).find((x) => x.id === companyId) ?? null;
  const segmentNames = segments.data?.filter((m) => m.active).map((m) => m.label) ?? MARKET_SEGMENTS;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen refreshing={false} onRefresh={() => undefined}>
        <PageHead title="New booking" description={`A walk-in into room ${walkRoom}. Check them in, or save the booking.`} />

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

        <Section
          title="Stay"
          action={<Button label="Another room" Icon={Plus} size="sm" reason={WEBSITE} onRefused={(r) => setToast({ title: r, body: "A walk-in is one room on the phone; a group is New booking's, on the website.", tone: "held" })} onPress={() => undefined} />}
        >
          <Field label="Arrival"><Text style={[t.label, t.tab, { color: c.ink900, minHeight: 28 }]}>{dateLong(from)}</Text></Field>
          <Field
            label="Departure"
            hint={dayUse ? `Day use - in and out on ${day(from)}. Type the day's price; it is charged at check-in.` : `${nights} ${nights === 1 ? "night" : "nights"}`}
          >
            <Day label="Departure" value={to} min={from} off={false} onChange={setTo} />
          </Field>
          <Field label="Booking source" required hint="How it reached us. It cannot be filled in later.">
            <Pick
              value={bookingSourceId} onChange={setSourceId} title="Booking source" placeholder="Choose one…" tall
              options={(sources.data ?? []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>
          {siteSource ? <Toggle value={prepaid} onChange={setPrepaid} label="Prepaid on the booking site" description="Untick when the guest pays at the hotel: the advance before check-in is then asked." /> : null}
          <Field label="Room type">
            <Pick value={roomTypeId} onChange={(v) => { setTypeId(v); setRoom(""); }} title="Room type" tall options={types.map((x) => ({ value: x.id, label: x.name }))} />
          </Field>
          <Field label="Meal plan"><Pick value={mealPlan} onChange={setMealPlan} title="Meal plan" tall options={PLANS} /></Field>
          {/* The picture's grid: Rooms | Adults, Children | Rate. A walk-in is one room: its box is greyed at 1. */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Rooms"><Box value="1" label="Rooms" disabled tall onChange={() => undefined} /></Field></View>
            <View style={{ flex: 1 }}><Field label="Adults"><Box value={adults} label="Adults" keyboard="number-pad" tall onChange={setAdults} /></Field></View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Children"><Box value={children} label="Children" keyboard="number-pad" tall onChange={setChildren} /></Field></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Field label="Rate" hint={comp ? "Complimentary." : dayUse ? "Type the day's price." : "Empty uses the calendar."}>
                <Box value={comp ? "" : rate} label="Rate" placeholder="-" keyboard="decimal-pad" disabled={comp} tall onChange={setRate} />
              </Field>
              {!comp ? <Tick value={incl && !quote.data?.contractRate} onChange={setIncl} label="Rate includes GST" disabled={quote.data?.contractRate === true} /> : null}
              {!comp && quote.data?.contractRate ? <Text style={t.caption}>Contract rates are before GST</Text> : null}
            </View>
          </View>
          <InclusiveNote split={quote.data?.split ?? null} gross={quote.data?.gross ?? null} />
          {!waiting ? (
            <Field label="Room" hint="Optional. A room picked is kept.">
              <Pick value={room} onChange={setRoom} title="Room" tall options={[{ value: "", label: "Assign later" }, ...roomOptions]} />
            </Field>
          ) : null}
          <Tick value={comp} onChange={setComp} disabled={!mayGiveComp(role)} label={mayGiveComp(role) ? "Complimentary" : "Complimentary (owner, admin or GM only)"} />
          <View style={{ gap: 2 }}>
            <Text style={[t.label, body, { color: left !== null && 1 > left ? c.yellow800 : c.grey600 }]}>
              {left === null ? "-" : `${left} left`}{left !== null && 1 > left ? " · this books more than that" : ""}
            </Text>
            <PriceLine comp={comp} q={q} pricing={quote.loading} typed={rate.trim() !== ""} dayUse={dayUse} nights={nights} rate={sum.rate} />
          </View>
        </Section>

        <Section title="ID" description="Recorded by Check in now. Save booking keeps only the nationality.">
          <GuestIdFields value={guestId} onChange={setGuestId} today={today} idsOff={rules?.idTypesOff ?? []} />
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
            phone shows the night's price and the server's GST rate, and the
            bill carries the totals (MFD-3, a question for the owner). */}
        <Section title="The booking">
          <View>
            <SumRow first label="Nights" value={dayUse ? "Day use" : String(nights)} />
            <SumRow label="Rooms" value="1" />
            <SumRow
              label={`1 × ${typeName || "-"}${comp ? ", complimentary" : ""}`}
              value={q.nightly === null ? "-" : `${cash(q.nightly)} ${dayUse ? "for the day" : "a night"}`}
            />
            <SumRow label="GST" value={sum.rate === null || sum.rate === undefined ? "-" : `${sum.rate}%`} />
            {advanceAmount !== null && !advanceProblem ? <SumRow label="Advance" value={moneyPrecise(advanceAmount)} /> : null}
          </View>
          {q.unpriced ? <Text style={[t.label, body, { color: c.yellow800 }]}>{`No price for ${q.unpriced}. Set it on Rates, or type a rate on the line.`}</Text>
            : sum.noRule ? <Text style={[t.label, body, { color: c.yellow800 }]}>The tax card has no rule for this rate. Set it before the night audit posts it.</Text>
              : <Text style={[t.label, body, { color: c.grey500 }]}>{`The bill carries the room charges, their GST and what is due, as the server charges them.${advanceAmount === null ? " Nothing is paid at booking." : ""}`}</Text>}
        </Section>

        {/* The three buttons: the one filled is the job the page was opened for. */}
        <View style={{ gap: 8 }}>
          <Button label="Save booking" size="lg" busy={saving} reason={once.stuck ? unknownBooking.line : reasonToSave} onPress={() => void submit(false)} />
          <Button label="Save and assign room" size="lg" busy={saving} reason={once.stuck ? unknownBooking.line : reasonToSave ?? reasonToAssign} onPress={() => void submit(false)} />
          <Button label="Check in now" kind="primary" size="lg" busy={saving} reason={once.stuck ? unknownBooking.line : reasonToSave ?? reasonToCheckIn} onPress={() => void submit(true)} />
          <View style={{ gap: 2 }}>
            {reasonToSave ? <Text style={[t.label, body, { color: c.grey600 }]}>{reasonToSave}</Text> : (
              <>
                {reasonToAssign ? <Text style={[t.label, body, { color: c.grey600 }]}>{`Save and assign room: ${reasonToAssign}`}</Text> : null}
                {reasonToCheckIn ? <Text style={[t.label, body, { color: c.grey600 }]}>{`Check in now: ${reasonToCheckIn}`}</Text> : null}
              </>
            )}
          </View>
        </View>
      </Screen>
      <Toast said={toast} onClose={() => setToast(null)} />
    </KeyboardAvoidingView>
  );
}

/** A card with its head (Card, CardHeader, CardBody). */
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
      <Text style={[t.label, body, t.tab, { color: c.ink900 }]}>{value}</Text>
    </View>
  );
}

/** The line's price: the night's, and the server's GST rate; the tax is not worked out here (MFD-3). */
function PriceLine({ comp, q, pricing, typed, dayUse, nights, rate }: {
  comp: boolean; q: { nightly: number | null; unpriced: string | null; differs: boolean; contract?: string | null; note?: string | null }; pricing: boolean; typed: boolean;
  dayUse: boolean; nights: number; rate: number | null | undefined;
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

function InclusiveNote({ split, gross }: { split: { ok: true; total: number } | { ok: false; reason: string } | null; gross: number | null }) {
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
  const found = useRead(() => (ask ? readReturning(code, phone.trim(), email.trim()) : Promise.resolve([])), ["front-desk", code, "returning", phone.trim(), email.trim()]);
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

/** flows/BookedCard.tsx: what the desk does next, on the booking just made.
    Each later step is said: the booking stands whatever they answered. */
function BookedCard({ hotel, done, onAnother }: { hotel: Hotel; done: Done; onAnother: () => void }) {
  const code = hotel.code;
  const lead = done.made.bookings[0];
  const inHouse = done.checkedIn != null && "room" in done.checkedIn;
  return (
    <Screen refreshing={false} onRefresh={() => undefined}>
      <PageHead title="New booking" description="One guest, one set of nights. Save it, give it a room, or check them in." />
      <Section title={inHouse ? "Checked in" : done.waiting ? "Held, waiting for the hotel" : "Booked"} description={done.made.guest}>
        {done.made.bookings.map((b) => (
          <View key={b.reference} style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
            <Text style={[t.label, t.tab, { color: c.ink900 }]}>{b.reference}</Text>
            <Text style={[t.label, body, { color: c.grey600 }]}>
              {b.roomType}{inHouse ? `, room ${(done.checkedIn as { room: string }).room}` : done.assigned && "room" in done.assigned ? `, room ${done.assigned.room}` : ""}
            </Text>
            {done.assigned && "failed" in done.assigned ? <Text style={[t.label, body, { width: "100%", color: c.yellow800 }]}>{`No room given: ${done.assigned.failed} Assign one from Arrivals.`}</Text> : null}
          </View>
        ))}
        {done.checkedIn ? ("room" in done.checkedIn
          ? <Text style={[t.label, body, { color: c.grey600 }]}>{`In house, room ${done.checkedIn.room}.`}</Text>
          : <Text style={[t.label, body, { color: c.yellow800 }]}>{`Not checked in: ${done.checkedIn.failed} Check them in from Arrivals.`}</Text>) : null}
        {done.advance ? ("amount" in done.advance
          ? <Text style={[t.label, body, { color: c.grey600 }]}>{`Advance of ${moneyPrecise(done.advance.amount)} taken, held as the guest's credit.`}</Text>
          : <Text style={[t.label, body, { color: c.yellow800 }]}>{done.advance.unknown
            ? `Not known whether the advance was taken: ${done.advance.failed} Look at the bill before taking it again.`
            : `Advance not taken: ${done.advance.failed} Take it on the bill.`}</Text>) : null}
        {/* A walk-in just checked in: the other adults (D27-382), as at the desk. */}
        {inHouse && lead?.id ? <Companions code={code} stayId={lead.id} today={hotel.businessDate} rules={rulesOf(hotel)} /> : null}
        {done.waiting ? <Text style={[t.label, body, { color: c.grey600 }]}>The room is held. Nothing is sent to the guest until the booking is confirmed.</Text> : null}
        <View style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.grey200 }}>
          {!done.waiting ? <Button label="Send voucher" reason={WEBSITE} onPress={() => undefined} /> : null}
          {!done.waiting ? <Text style={t.caption}>{WEBSITE}</Text> : null}
          {!inHouse && !done.waiting && lead?.id ? <Button label="Check in now" onPress={() => router.replace(`/front-desk/${code}/check-in/${lead.id}`)} /> : null}
          {lead?.id ? <Button label="Open the booking" onPress={() => router.replace(`/front-desk/${code}/stay/${lead.id}?offer=1` as Href)} /> : null}
          <Button label="Another booking" kind="ghost" onPress={onAnother} />
        </View>
      </Section>
    </Screen>
  );
}
