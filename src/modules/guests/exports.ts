/* ══════════════════════════════════════════════════════════════════
   GUESTS AND COMPANIES AS FILES — the web's GUEST_EXPORT and
   COMPANY_EXPORT (src/modules/guests/pages/Guests.tsx), ported by hand,
   each cell as the card writes it (a dash for none; a balance in credit
   said so, as the card's colour says it). Pure: exports.check.ts.
   ══════════════════════════════════════════════════════════════════ */

import type { ExportTable } from "../../core/exportDoc.ts";
import { dayOf, rupees } from "../laundry/docket.ts";
import { commissionWords, owed, revenueWords, type CompanyRecord, type GuestRecord } from "./lookup.ts";

type Table = Omit<ExportTable, "title">;
const owedText = (n: number) => { const o = owed(n); return o.tone === "credit" ? `${o.text} in credit` : o.text; };

export const guestTable = (guests: GuestRecord[], search: string): Table => ({
  subtitle: `${search.trim() ? `Search ${search.trim()} · ` : ""}Sorted repeat guests first`,
  columns: ["Guest", "Overlapping stays", "Stays", "Nights", "Last stay", "Next stay", "Booked via", "Total spend", "Balance"],
  rows: guests.map((g) => [
    g.name, g.possibleDuplicate ? "Yes" : "-", String(g.stays), String(g.nights), g.lastStay ? dayOf(g.lastStay) : "-",
    g.nextStay ? dayOf(g.nextStay) : "-", g.sources.join(", ") || "-", rupees(g.totalSpend), owedText(g.openBalance),
  ]),
});

export const companyTable = (rows: CompanyRecord[]): Table => ({
  subtitle: "Grouped agents, direct, companies",
  columns: ["Source", "Kind", "Bookings", "Room nights", "Revenue", "Commission", "Owed"],
  rows: rows.map((r) => [r.name, r.kind, String(r.bookings), String(r.roomNights), revenueWords(r), commissionWords(r), owedText(r.openBalance)]),
});
