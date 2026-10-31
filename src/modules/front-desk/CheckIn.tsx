import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { BedDouble, Camera, Check, Info } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ApiError, HeldError, type Hotel } from "../../core/api";
import { cash } from "../../core/format";
import { isOnline } from "../../core/offline";
import { c, face, t } from "../../core/theme";
import { ReadFailed, useRead } from "../../core/ui";
import { Companions } from "./Companions";
import {
  checkIn, readAssignable, readDesk, readEarly, readExpress, readStay, readTaxRate, rulesOf, said, type DeskStay,
} from "./data";
import {
  checkInBlocked, day, idWord, isBigMove, mealPlanChoices, moveWords, partyProblem, partyWords, whyNotYet, type Assignable,
} from "./desk";
import { deskGuestId, guestIdPayload, guestIdState, noGuestId, type GuestId } from "./guestId";
import { GuestIdFields } from "./GuestIdFields";
import { body, Box, Button, Field, leaveNote, Pick, Pill, Tick, Toast, Toggle, WEBSITE, type Said } from "./kit";
import type { Tone } from "./desk";
import { whyNotCheckIn } from "./roles";
import { Panel } from "./Stay";
import { Blacklist } from "./StayList";

/* ══════════════════════════════════════════════════════════════════
   CHECK IN — the web's one page under one Check in (src/modules/front-desk/
   flows/CheckInFlow.tsx, D27-163, D27-236), its two columns one above the
   other at phone width: the room, the ID, the other adults, an early
   arrival, offers; then the stay. Only a clean or inspected room can take a
   guest; the rest are shown with the reason. The one button says why it is
   greyed, under it. A check-in is `queue-warn` offline: held and said so.
   The ID photo needs a camera package: shown greyed (report).
   ══════════════════════════════════════════════════════════════════ */

export function CheckInScreen({ hotel, role, id, onClose }: { hotel: Hotel; role: string | null; id: string; onClose: () => void }) {
  const code = hotel.code;
  const read = useRead(() => readStay(code, id), ["front-desk", code, "stay", id]);
  if (!read.data) {
    return (
      <Panel title="Check in" onClose={onClose}>
        {read.loading ? <Text style={t.label}>Reading the stay…</Text>
          : read.error ? <ReadFailed what="the stay" error={read.error} onRetry={read.reload} />
            : <Text style={t.label}>{!isOnline() ? "No connection. This stay has not been read on this phone yet." : "This stay is not on the property's list."}</Text>}
      </Panel>
    );
  }
  return <Form key={read.data.id} hotel={hotel} role={role} stay={read.data} onClose={onClose} />;
}

function Form({ hotel, role, stay, onClose }: { hotel: Hotel; role: string | null; stay: DeskStay; onClose: () => void }) {
  const code = hotel.code;
  const businessDate = hotel.businessDate;
  const rules = rulesOf(hotel);
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Said | null>(null);

  /* As typed (FD-8): "abc" used to become 0 adults. */
  const [adultsText, setAdults] = useState(String(stay.adults));
  const [childrenText, setChildren] = useState(String(stay.children));
  const party = partyProblem(adultsText, childrenText);
  const [roomNumber, setRoomNumber] = useState(stay.roomNumber);
  const [guestId, setGuestId] = useState<GuestId>(() => deskGuestId(rules, stay.nationality));
  const idNow = guestIdState(guestId, businessDate);
  const [earlyReason, setEarlyReason] = useState("");
  const [waiveEarly, setWaiveEarly] = useState(false);
  const [offersAgreed, setOffersAgreed] = useState(false);
  const [ratePlan, setRatePlan] = useState(stay.ratePlan);
  const [changing, setChanging] = useState<{ party?: boolean; plan?: boolean; room?: boolean }>({});
  const [prepaid, setPrepaid] = useState<boolean | undefined>(undefined);
  const [otherId, setOtherId] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const scope = ["front-desk", code, "check-in", stay.id];
  const express = useRead(() => readExpress(code, stay.id, prepaid), [...scope, "express", prepaid]);
  const early = useRead(() => readEarly(code), ["front-desk", code, "early"]);
  const rooms = useRead(() => readAssignable(code, stay.roomType, businessDate, stay.roomNumber, stay.departure), [...scope, "rooms"]);
  const desk = useRead(() => readDesk(code), [...scope, "desk"]);

  const byExpress = (express.data?.express ?? false) && !otherId;
  const earlyByDate = stay.arrival > businessDate;
  const earlyByClock = early.data?.isEarly ?? false;
  const isEarly = earlyByClock || earlyByDate;
  const bigMove = isBigMove(stay.arrival, businessDate);
  const gst = useRead(
    () => (bigMove && !stay.isComplimentary && stay.offeredTariff > 0 ? readTaxRate(code, stay.offeredTariff) : Promise.resolve(null)),
    [...scope, "gst", bigMove],
  );

  const chosen = (rooms.data ?? []).find((r) => r.number === roomNumber);
  const refused = whyNotCheckIn(role) ?? (earlyByDate ? null : whyNotYet(stay, businessDate));
  const blocked = refused ?? checkInBlocked({
    party, room: roomNumber, chosen, idBlocked: idNow.blocked, byExpress, early: isEarly, earlyReason,
    advanceWords: express.data?.advance?.words ?? null,
  });

  const submit = async () => {
    setBusy(true);
    const body = {
      roomNumber, adults: Number(adultsText), children: Number(childrenText), ratePlan,
      /* By express the nationality only: the server checks the document itself (D27-242). */
      ...guestIdPayload(byExpress ? noGuestId(stay.nationality ?? "IN") : guestId),
      businessDate, earlyReason, waiveEarly, offersAgreed,
      ...(prepaid === undefined ? {} : { prepaidOnSite: prepaid }),
      ...(bigMove ? { confirmMove: true } : {}),
    };
    try {
      await checkIn(code, stay.id, body);
      /* Read back: the server decides the final state; another type is said out loud (D27-328). */
      const after = await readStay(code, stay.id).catch(() => null);
      const given = after?.givenRoomType;
      leaveNote({
        title: `${stay.guest} is in house`, tone: "ok",
        body: `Room ${roomNumber} · the arrivals count has dropped.${given ? ` Note: ${given} is not the room type they booked.` : ""}`,
      });
      void cache.invalidateQueries();
      onClose();
    } catch (e) {
      setBusy(false);
      if (e instanceof HeldError) {
        leaveNote({ title: "Saved on this phone", body: e.message, tone: "held" });
        onClose();
      } else {
        setConfirming(false);
        setToast({ title: "Could not check in", body: e instanceof ApiError ? e.message : said(e), tone: "bad" });
      }
    }
  };

  const foot = confirming ? (
    <View style={{ gap: 8 }}>
      <Text style={[t.label, body, { color: c.yellow800 }]}>{moveWords(stay, businessDate, gst.data?.rate)}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button label="Cancel" style={{ flex: 1 }} onPress={() => setConfirming(false)} reason={busy ? "" : null} />
        <Button label="Confirm" kind="primary" Icon={Check} style={{ flex: 1 }} busy={busy} reason={gst.loading ? "" : null} onPress={() => void submit()} />
      </View>
    </View>
  ) : (
    <View style={{ gap: 6 }}>
      <Button label="Check in" kind="primary" Icon={Check} busy={busy} reason={blocked} onPress={() => (bigMove ? setConfirming(true) : void submit())} />
      {blocked ? <Text style={[t.label, body, { color: c.grey600 }]}>{blocked}</Text> : null}
    </View>
  );

  const showChosen = chosen?.allowed && !changing.room;

  return (
    <View style={{ flex: 1 }}>
      <Panel
        title={`Check in ${stay.guest}`} onClose={onClose} foot={foot}
        under={<Text style={[t.label, body, { color: c.grey500 }]}>{`${stay.reference} · ${stay.roomType}`}</Text>}
      >
        {/* CRM-3: a booking site's guest on a blacklisted phone or email. */}
        <Blacklist code={code} from={stay.arrival} to={stay.arrival} ids={[stay.id]} />

        <View style={{ gap: 8 }}>
          {showChosen ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={[t.label, body, { flex: 1, color: c.grey600 }]}>
                  <Text style={[face[500], { color: c.ink900 }]}>{`Room ${chosen.number}`}</Text>
                  {` · ${chosen.label ?? cap(chosen.housekeeping)}`}
                  {chosen.type !== stay.roomType ? <Text style={{ color: c.yellow800 }}>{` · ${chosen.type} (different type)`}</Text> : null}
                </Text>
                <Button label="Change room" size="sm" onPress={() => setChanging((x) => ({ ...x, room: true }))} />
              </View>
              {/* Who has not left yet. */}
              {chosen.reason ? <Text style={[t.label, body, { color: c.yellow800 }]}>{chosen.reason}</Text> : null}
            </>
          ) : (
            <>
              <Explained title="Room">
                Only a clean or inspected room can take a guest; the rest are shown with the reason. A room of a different type is an upgrade: the booked rate stays.
              </Explained>
              {rooms.error && !rooms.data ? <ReadFailed what="the rooms" error={rooms.error} onRetry={rooms.reload} /> : null}
              {!rooms.data && !rooms.error ? <Text style={t.label}>Reading the rooms…</Text> : null}
              {(rooms.data ?? []).map((room) => (
                <RoomChoice
                  key={room.number} room={room} booked={stay.roomType} selected={room.number === roomNumber}
                  onPick={() => { setRoomNumber(room.number); setChanging((x) => ({ ...x, room: false })); }}
                />
              ))}
            </>
          )}
        </View>

        <View style={{ gap: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.grey200 }}>
          {byExpress ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={[t.label, body, { flex: 1, color: c.ink900 }]}>
                {"ID confirmed from online check-in: "}
                <Text style={face[500]}>{`${idWord(express.data!.document!.type)} ${express.data!.document!.number}`}</Text>
              </Text>
              <Button label="Use a different ID" size="sm" onPress={() => setOtherId(true)} />
            </View>
          ) : (
            <>
              <Explained title="ID">Indian properties must record a guest's identity document. It can be skipped, but the reason is kept in the stay's note.</Explained>
              {(desk.data?.waiting ?? []).some((d) => d.reference === stay.reference) ? (
                <Text style={[t.label, body, { color: c.ink900 }]}>
                  {"This guest sent their ID details online - "}
                  <Text onPress={() => router.push(`/guest-services/${code}/online-checkin`)} style={[face[500], { color: c.orange700 }]}>check them on Online check-in</Text>
                </Text>
              ) : null}
              <GuestIdFields value={guestId} onChange={setGuestId} today={businessDate} idsOff={rules?.idTypesOff ?? []} />
            </>
          )}
          {/* D27-210: the desk adds the ID photo for a guest who sent none. */}
          {desk.data?.idPhotos ? (
            <View style={{ gap: 6 }}>
              <Text style={[t.label, { color: c.ink900 }]}>A photo of the ID</Text>
              {desk.data.idPhotos.on ? (
                <>
                  <Button label="Add the photo" Icon={Camera} reason={WEBSITE} onPress={() => undefined} />
                  <Text style={t.caption}>{WEBSITE}</Text>
                </>
              ) : <Text style={[t.label, body, { color: c.grey600 }]}>{desk.data.idPhotos.off}</Text>}
            </View>
          ) : null}
        </View>

        <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: c.grey200 }}>
          <Companions
            code={code} stayId={stay.id} today={businessDate} rules={rules}
            adults={party ? undefined : Number(adultsText)} leadAnswers={guestId.particulars}
          />
        </View>

        {/* Arriving early: only when the property says so, on its own clock. */}
        {isEarly ? (
          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: c.yellow100, backgroundColor: c.yellow50, padding: 12, gap: 10 }}>
            <Text style={[t.label, body, { color: c.yellow800 }]}>
              {earlyByDate ? `This booking is for ${day(stay.arrival)}. Checking in now moves it to today, so tonight is charged.`
                : `Rooms are ready from ${early.data?.checkInTime ?? ""}.`}
              {earlyByClock ? (early.data?.charge == null ? " This property does not charge for an early arrival." : ` An early arrival is ${cash(early.data.charge)}.`) : ""}
            </Text>
            <Field label="Why the room is being given early" required>
              <Box value={earlyReason} label="Why the room is being given early" placeholder="Overnight train, room vacant and clean" onChange={setEarlyReason} />
            </Field>
            {/* The waive is a manager's, by the server's own mayWaive, and refused again there. */}
            {earlyByClock && early.data?.charge != null && early.data.mayWaive ? (
              <Tick value={waiveEarly} onChange={setWaiveEarly} label="Waive the charge. The reason is still recorded, and its absence from the bill is visible." />
            ) : null}
          </View>
        ) : null}

        {express.data?.bookingSite ? (
          <Toggle
            value={prepaid ?? express.data.prepaidOnSite ?? true} onChange={setPrepaid} label="Prepaid on the booking site"
            description="Untick when the guest pays at the hotel: the advance before check-in is then asked."
          />
        ) : null}
        <Toggle
          value={offersAgreed} onChange={setOffersAgreed} label="Guest agreed to offers"
          description="Ask them. Unticked, no offers are sent. Kept against their phone and email at every hotel of the group."
        />

        {/* The stay: its dates, the party, the meal plan and the rate. */}
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, padding: 12, gap: 12 }}>
          <Text style={[t.label, body, { color: c.ink900 }]}>
            {`${day(stay.arrival)} – ${day(stay.departure)}`}
            <Text style={{ color: c.grey500 }}>{` · ${stay.isDayUse ? "day use" : `${stay.nights} ${stay.nights === 1 ? "night" : "nights"}`}`}</Text>
          </Text>
          {changing.party ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Field label="Adults"><Box value={adultsText} label="Adults" keyboard="number-pad" onChange={setAdults} /></Field></View>
              <View style={{ flex: 1 }}><Field label="Children"><Box value={childrenText} label="Children" keyboard="number-pad" onChange={setChildren} /></Field></View>
            </View>
          ) : (
            <Changeable what="adults and children" onChange={() => setChanging((x) => ({ ...x, party: true }))}>{partyWords(adultsText, childrenText)}</Changeable>
          )}
          {party ? <Text style={[t.label, face[500], { color: c.red700 }]}>{party}</Text> : null}
          {changing.plan ? (
            <Field label="Meal plan">
              <Pick value={ratePlan} onChange={setRatePlan} title="Meal plan" options={mealPlanChoices(ratePlan).map((p) => ({ ...p }))} />
            </Field>
          ) : (
            <Changeable what="meal plan" onChange={() => setChanging((x) => ({ ...x, plan: true }))}>
              {mealPlanChoices(ratePlan).find((p) => p.value === ratePlan)?.label ?? ratePlan}
            </Changeable>
          )}
          <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: c.grey200, gap: 6 }}>
            <Line label="Rack rate" value={cash(stay.rackTariff)} muted />
            <Line label="Offered" value={stay.isComplimentary ? "Complimentary" : cash(stay.offeredTariff)} bold />
          </View>
        </View>
      </Panel>
      <Toast said={toast} onClose={() => setToast(null)} />
    </View>
  );
}

const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

function roomTone(room: Assignable): Tone {
  return room.label ? "warning" : room.housekeeping === "inspected" ? "success" : room.housekeeping === "clean" ? "info" : room.housekeeping === "dirty" ? "warning" : "neutral";
}

function RoomChoice({ room, booked, selected, onPick }: { room: Assignable; booked: string; selected: boolean; onPick: () => void }) {
  const [why, setWhy] = useState(false);
  return (
    <View style={{ gap: 2 }}>
      <Pressable
        onPress={() => (room.allowed ? onPick() : setWhy(true))} accessibilityRole="button"
        accessibilityLabel={`Room ${room.number}, ${room.label ?? room.housekeeping}`} accessibilityState={{ selected, disabled: !room.allowed }} accessibilityHint={room.reason}
        style={{
          minHeight: 44, flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
          borderColor: selected ? c.orange : c.grey200, backgroundColor: selected ? c.orange50 : room.allowed ? c.white : c.grey50, opacity: room.allowed ? 1 : 0.6,
        }}
      >
        <BedDouble size={16} color="#9aa2a9" />
        <Text style={[t.label, t.tab, { color: c.ink900 }]}>{room.number}</Text>
        <View style={{ marginLeft: "auto" }}><Pill tone={roomTone(room)} dot={false}>{room.label ?? room.housekeeping}</Pill></View>
        {room.type !== booked ? <Text style={[t.caption, { width: "100%", paddingLeft: 24, color: c.yellow800 }]}>{`${room.type} (different type)`}</Text> : null}
      </Pressable>
      {/* The web's tooltip needs a pointer: the tap says it. */}
      {why && room.reason ? <Text style={[t.caption, { color: c.grey600 }]}>{room.reason}</Text> : null}
    </View>
  );
}

function Line({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
      <Text style={[t.label, body, { color: muted ? c.grey500 : c.grey700 }]}>{label}</Text>
      <Text style={[t.label, t.tab, bold ? face[600] : body, { color: c.ink900 }]}>{value}</Text>
    </View>
  );
}

/** A fact as it stands, with its Change (D27-236 3.1). */
function Changeable({ what, children, onChange }: { what: string; children: ReactNode; onChange: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={[t.label, body, { flex: 1, color: c.ink900 }]}>{children}</Text>
      <Pressable onPress={onChange} accessibilityRole="button" accessibilityLabel={`Change ${what}`} hitSlop={10} style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={[t.label, { color: c.orange }]}>Change</Text>
      </Pressable>
    </View>
  );
}

/** A section's name, its explanation behind (i) (D27-236 3.3). */
function Explained({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={`About ${title.toLowerCase()}`} accessibilityState={{ expanded: open }} style={{ minHeight: 28, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={[t.label, { color: c.ink900 }]}>{title}</Text>
        <Info size={14} color="#9aa2a9" />
      </Pressable>
      {open ? <Text style={[t.label, body, { color: c.grey600 }]}>{children}</Text> : null}
    </View>
  );
}
