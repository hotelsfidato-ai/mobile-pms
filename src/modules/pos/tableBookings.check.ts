/* Run: node --experimental-strip-types src/modules/pos/tableBookings.check.ts
   Table bookings' rules: the lists, the words, what each card offers and sends. */
import { answer, dayWords, detailLine, dinerBody, lists, offers, people, statusOf, tableLabel, type TableBooking } from "./tableBookings.ts";

const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const b = (over: Partial<TableBooking>): TableBooking => ({
  id: "1", at: "2026-11-06T14:30:00.000Z", date: "2026-11-06", time: "20:00", party: 2, note: null, status: "confirmed",
  answer: null, table: null, outlet: "Fidato Restaurant", guest: "Asha", reference: "R-1", room: "204", answeredBy: null, ...over,
});

eq(dayWords("2026-11-06", "2026-11-06"), "Today");
eq(dayWords("2026-11-07", "2026-11-06"), "Sat, 7 Nov");
eq(people(1), "1 person");
eq(people(4), "4 people");

const l = lists([b({ id: "w", status: "requested", date: "2026-11-09" }), b({ id: "t" }), b({ id: "u", date: "2026-11-08" })], "2026-11-06");
eq([l.waiting.map((x) => x.id), l.todays.map((x) => x.id), l.later.map((x) => x.id)], [["w"], ["t"], ["u"]]);

eq(offers({ status: "requested" }), { answer: true, seat: false, arrived: false, noShow: false, cancel: false });
eq(offers({ status: "arrived" }), { answer: false, seat: true, arrived: false, noShow: false, cancel: true });
eq(offers({ status: "seated" }), { answer: false, seat: false, arrived: false, noShow: false, cancel: false });

eq(detailLine(b({ table: { id: "t", label: "T4" }, answeredBy: "Test GM" })), "Table T4 · by Test GM");
eq(detailLine(b({ status: "arrived", arrivedAt: "19:58" })), "No table named · arrived 19:58");
eq(detailLine(b({ status: "seated", table: { id: "t", label: "T4" }, order: { id: "o", orderNo: "20261106-4" } })), "At table T4 · bill 20261106-4 is open on Tables");
eq(detailLine(b({ status: "cancelled" })), null);
eq(detailLine(b({ status: "declined", answer: "Full tonight" })), "Told the guest: Full tonight");

eq(answer("confirm", "9", "", ""), { path: "9/confirm", body: { tableId: null } });
eq(answer("seat", "9", "t1", ""), { path: "9/seat", body: { tableId: "t1" } });
eq(answer("decline", "9", "", "Full"), { path: "9/decline", body: { reason: "Full" } });
eq(tableLabel({ label: "T4", section: "A/C" }), "T4 · A/C");

/* A table named wins over an area; the party as a number. */
eq(dinerBody({ name: "Ravi", phone: "98", party: "3", date: "2026-11-06", time: "20:00", tableId: "t1", sectionId: "s1", note: "" }),
  { name: "Ravi", phone: "98", party: 3, date: "2026-11-06", time: "20:00", tableId: "t1", sectionId: null, note: "" });
eq(dinerBody({ name: "Ravi", phone: "98", party: "3", date: "2026-11-06", time: "20:00", tableId: "", sectionId: "s1", note: "" }).sectionId, "s1");
eq(statusOf("no_show").words, "No-show");

console.log("tableBookings.check: ok");
