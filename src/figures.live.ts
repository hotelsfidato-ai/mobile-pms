/* What the two screens will show, from a running API, in text.
   Run: node --experimental-strip-types mobile/src/figures.live.ts http://<host>:<port> <dev person> */
import { addUp, cash, count, methodsToday, monthStart, pct, pick, todaysWork, type HotelsResponse, type PeriodStatistics, type ReportDoc } from "./figures.ts";

const [base, who] = [process.argv[2], process.argv[3] ?? "dev-owner"];
const get = async <T,>(p: string): Promise<T> => {
  const r = await fetch(base + p, { headers: { "x-dev-staff-id": who } });
  if (!r.ok) throw new Error(`${p}: ${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
};
const s = await get<HotelsResponse>("/api/hotels");
const real = s.hotels.filter((h) => !h.testOf);
const today: PeriodStatistics[] = [], month: PeriodStatistics[] = [];
for (const h of real) {
  const d = h.businessDate;
  today.push(await get<PeriodStatistics>(`/api/hotels/${h.code}/statistics/period?from=${d}&to=${d}`));
  month.push(await get<PeriodStatistics>(`/api/hotels/${h.code}/statistics/period?from=${monthStart(d)}&to=${d}`));
}
const g = addUp(today), gm = addUp(month);
console.log(`ALL PROPERTIES (${s.scope.fullName}): occupancy ${pct(g?.occupancy)} (month ${pct(gm?.occupancy)}), ARR ${cash(g?.arr)}, RevPAR ${cash(g?.revpar)}, room revenue ${cash(g?.revenue)} (month ${cash(gm?.revenue)})`);

for (const h of real) {
  const d = h.businessDate;
  const r = await get<ReportDoc>(`/api/hotels/${h.code}/reports/manager?asOn=${d}`);
  const labels: Array<[string, string]> = [["statistics", "Occupancy Rate (%)"], ["statistics", "Average Daily Rate (ADR)"],
    ["statistics", "Revenue Per Available Room"], ["room-charges", "Room Charges"], ["payment", "Total Payment"],
    ["guest-ledger", "Closing Balance*"], ["city-ledger", "Closing Balance"], ["city-ledger", "Payment Received"], ["room-summary", "No Show Rooms"]];
  const missing = labels.filter(([sec, l]) => !pick(r, sec, l));
  const w = todaysWork(d, await get(`/api/hotels/${h.code}/stays?from=${d}&to=${d}&board=1`), await get(`/api/hotels/${h.code}/rooms`), await get(`/api/hotels/${h.code}/house-now`));
  const f = (sec: string, l: string, money = true) => { const x = pick(r, sec, l); const fm = money ? cash : pct; return `${fm(x?.today)} / ${fm(x?.ptd)} / ${fm(x?.ytd)}`; };
  console.log(`DASHBOARD ${h.code} ${d}`);
  console.log(`  work: ${JSON.stringify(w)}`);
  console.log(`  occupancy today/month/year: ${f("statistics", "Occupancy Rate (%)", false)}`);
  console.log(`  ARR: ${f("statistics", "Average Daily Rate (ADR)")} · RevPAR: ${f("statistics", "Revenue Per Available Room")} · room revenue: ${f("room-charges", "Room Charges")}`);
  console.log(`  collected today ${cash(pick(r, "payment", "Total Payment")?.today)} (${methodsToday(r).map((m) => `${m.label} ${cash(m.today)}`).join(", ") || "none"}) · owed by guests ${cash(pick(r, "guest-ledger", "Closing Balance*")?.today)} · city ledger ${cash(pick(r, "city-ledger", "Closing Balance")?.today)} · no-shows ${count(pick(r, "room-summary", "No Show Rooms")?.today)}`);
  console.log(`  labels not found in the report: ${missing.length ? missing.map((m) => m.join(" / ")).join("; ") : "none"}`);
}
