/* Run: node --experimental-strip-types mobile/src/modules/guest-services/rules.check.ts
   The web's words for guest services, on small made-up rows. */
import {
  clearedLine, closeAsks, dateShort, dateTime, daysFrom, detailLines, foundLine, keptLine, minutes, photoLine, replyFits,
  requestLine, thread, timeOf, unread, wakeLine, wakeWhen,
  type GuestRequest, type LostItem, type WaitingDetails, type WakeUpCall,
} from "./rules.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* Dates as the web writes them; a moment built on this machine's own clock. */
eq(dateShort("2026-10-07"), "7 Oct 2026", "a day");
eq(dateShort(null), "-", "no day is a dash");
eq(dateTime(new Date(2026, 9, 17, 9, 5).toISOString()), "17 Oct 2026, 9:05 AM", "morning");
eq(dateTime(new Date(2026, 9, 17, 0, 30).toISOString()), "17 Oct 2026, 12:30 AM", "after midnight");
eq(dateTime(new Date(2026, 9, 17, 12, 0).toISOString()), "17 Oct 2026, 12:00 PM", "noon");
eq(dateTime(new Date(2026, 9, 17, 18, 45).toISOString()), "17 Oct 2026, 6:45 PM", "evening");

/* How long. */
eq([minutes(12), minutes(65), minutes(60 * 51)], ["12 min", "1 h 5 min", "2 d 3 h"], "minutes");

/* A request's grey line. */
const req = (x: Partial<GuestRequest>): GuestRequest => ({
  id: "1", team: "housekeeping", room: "204", guest: "Tanvi Bhide", what: "Towels", when: null, status: "open",
  fromGuest: false, raisedBy: "Asha", raisedAt: "", takenBy: null, closedAt: null, resolution: null, minutes: 12, ...x,
});
eq(requestLine(req({})), "Room 204 · Tanvi Bhide · raised by Asha · waiting 12 min · nobody has taken it", "open");
eq(requestLine(req({ fromGuest: true, guest: null, takenBy: "Ravi", status: "in_progress" })),
  "Room 204 · from the guest's page · waiting 12 min · Ravi has it", "taken, no names for this role");
eq(requestLine(req({ status: "done", takenBy: "Ravi", minutes: 65 })), "Room 204 · Tanvi Bhide · raised by Asha · took 1 h 5 min · done by Ravi", "done");
eq(requestLine(req({ status: "cancelled", takenBy: "Ravi", room: null, raisedBy: null })), "- · Tanvi Bhide · took 12 min · taken by Ravi", "cancelled");

/* A close asks for words only where the server needs them. */
eq(closeAsks("housekeeping", "done"), null, "housekeeping done is one tap");
eq(closeAsks("fnb", "done"), null, "food and drink done is one tap");
eq(closeAsks("maintenance", "done")?.label, "What was done", "something broken asks what was done");
eq(closeAsks("fnb", "cancel")?.label, "Why it is cancelled", "a cancel asks why");

/* Wake-up calls. */
const wake = (x: Partial<WakeUpCall>): WakeUpCall => ({
  id: "w", status: "set", fromGuest: false, room: "301", guest: "Rekha", callAt: "2026-10-18T06:30", note: null,
  setBy: "Asha", handledBy: null, handledAt: null, cancelReason: null, due: false, ...x,
});
eq(wakeWhen("2026-10-18T06:30"), "18 Oct 2026, 06:30", "the hotel's clock, as written");
eq(wakeLine(wake({})), "Room 301 · Rekha · set by Asha", "set");
eq(wakeLine(wake({ fromGuest: true, status: "done", handledBy: "Ravi" })), "Room 301 · Rekha · asked from the guest's page · called by Ravi", "done");
eq(wakeLine(wake({ status: "cancelled", handledBy: "Ravi" })), "Room 301 · Rekha · set by Asha · cancelled by Ravi", "cancelled");
eq([timeOf("7:30"), timeOf("0730"), timeOf("730"), timeOf("07.30"), timeOf("23:59")], ["07:30", "07:30", "07:30", "07:30", "23:59"], "times read");
eq([timeOf("24:00"), timeOf("7:5"), timeOf("seven"), timeOf("")], [null, null, null, null], "times refused");

eq(daysFrom("2026-10-30", 3), [
  { value: "2026-10-30", label: "30-10-2026" }, { value: "2026-10-31", label: "31-10-2026" }, { value: "2026-11-01", label: "01-11-2026" },
], "the days to choose, over a month's end");

/* Lost property. */
const lost = (x: Partial<LostItem>): LostItem => ({
  id: "l", what: "Black umbrella", foundWhere: "under the bed", room: "204", keptWhere: "Front office cupboard",
  foundOn: "2026-10-15", daysKept: 1, foundBy: "Ravi", status: "kept", returnedTo: null, disposeReason: null,
  handledBy: null, handledOn: null, ...x,
});
eq(foundLine(lost({})), "Found in room 204, under the bed · 15 Oct 2026 by Ravi · 1 day kept", "kept a day");
eq(foundLine(lost({ room: null, daysKept: 3, foundBy: null })), "Found under the bed · 15 Oct 2026 · 3 days kept", "kept days");
eq(foundLine(lost({ status: "returned" })), "Found in room 204, under the bed · 15 Oct 2026 by Ravi", "cleared: no days");
eq(clearedLine(lost({})), null, "kept: nothing cleared");
eq(clearedLine(lost({ status: "returned", returnedTo: "the guest", handledBy: "Asha", handledOn: "2026-10-16" })), "To the guest, by Asha, 16 Oct 2026", "returned");
eq(clearedLine(lost({ status: "disposed", disposeReason: "Unclaimed 90 days", handledBy: "Asha", handledOn: "2026-10-16" })), "Unclaimed 90 days - Asha, 16 Oct 2026", "disposed");

/* What a guest sent, as the desk reads it. */
const details: WaitingDetails = {
  id: "d", guest: "John Smith", reference: "5EL-1", idType: "passport", idNumber: "Z1234567", fromDigilocker: false,
  passportExpiry: "2030-01-31", visaNumber: "V99", visaExpiry: "2027-03-01", addressLine: "1 High St", city: "Leeds",
  country: null, submittedAt: "", photo: null,
  more: { purpose: "tourism", nationality: "GB", employedInIndia: false, expectedArrival: "14:00", specialRequests: "" },
};
eq(detailLines(details), [
  ["Passport", "Z1234567"], ["Passport expires", "31 Jan 2030"], ["Visa", "V99, expires 1 Mar 2027"], ["Address", "1 High St, Leeds"],
  ["Arriving at about", "14:00"], ["Nationality", "GB"], ["Purpose of the visit", "Tourism"], ["Employed in India", "No"],
], "a foreign guest's details, in the form's order");
eq(detailLines({ ...details, idType: "aadhaar", idNumber: "…1234", fromDigilocker: true, passportExpiry: null, visaNumber: null, addressLine: null, city: null, more: { nationality: "IN" } }),
  [["Aadhaar", "…1234 · from DigiLocker"], ["Nationality", "Indian"]], "an Aadhaar from DigiLocker");
eq(photoLine({ sides: ["front", "back"], at: new Date(2026, 9, 17, 9, 5).toISOString() }), "ID photo: front and back, sent 17 Oct 2026, 9:05 AM.", "photo");

eq(keptLine({ id: "k", guest: "G", reference: "R-1", sides: ["front"], at: new Date(2026, 9, 17, 9, 5).toISOString(), addedBy: null, notYetDeleted: false }),
  "R-1 · front · 17 Oct 2026, 9:05 AM · sent by the guest", "a kept photo from the guest");

/* Messages and replies, newest first. */
const box = {
  messages: [
    { id: "m1", what: "More pillows", createdAt: "2026-10-17T03:00:00.000Z", guest: "G", reference: "R", reservationId: "s", handledBy: null, handledAt: null },
    { id: "m2", what: "Late check-out?", createdAt: "2026-10-17T05:00:00.000Z", guest: "G", reference: "R", reservationId: "s", handledBy: "Asha", handledAt: "2026-10-17T05:10:00.000Z" },
  ],
  replies: [{ id: "r1", what: "On the way", sentAt: "2026-10-17T04:00:00.000Z", sentBy: "Asha" }],
  canReply: true,
};
eq(thread(box).map((x) => (x.m ? x.m.id : x.r.id)), ["m2", "r1", "m1"], "one list, newest first");
eq(unread(box), 1, "unread");
eq([replyFits(""), replyFits("   "), replyFits("Yes"), replyFits("x".repeat(500)), replyFits("x".repeat(501))], [false, false, true, true, false], "a reply's length");

console.log("guest services rules: all checks pass");
