/* ══════════════════════════════════════════════════════════════════
   CHARGES TO ROOMS' RULES — the web's src/modules/pos/pages/Pos.tsx
   (16 Nov), its shapes from src/modules/pos/data/posBridge.ts; the API is
   api/src/modules/pos/pos.ts 530-645 (GET /pos/outlets, GET /pos/tickets:
   the business month to date unless asked).

   The web writes each bill as amount + tax and heads the Bills section
   with the posted bills added up in the browser. The phone shows the two
   figures the server sends, before tax and tax, as they are, and no total
   the server does not send (BRIEF-T3; MODULE.md). A refused bill reached
   no folio: "nobody - refused", never a dash pretending to be a value.
   Pure: roomCharges.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

export interface PosOutlet { code: string; name: string; category: string; hasKey: boolean; isActive: boolean; bills: number }

export interface PosTicket {
  id: string; outlet: string; outletName: string;
  /** The POS's own bill number - what a waiter reads off their terminal. */
  ticketRef: string;
  status: "posted" | "voided" | "rejected";
  reason: string | null;
  /** Before tax, and the tax, each to the paisa as the server rounds them. */
  amount: number; tax: number;
  businessDate: string; receivedAt: string;
  guest: string | null; room: string | null;
}
export interface PosTickets { from: string; to: string; rows: PosTicket[] }

type Tone = "success" | "warning" | "danger" | "neutral";

/** An outlet's pill (OUTLET_COLUMNS state). */
export function outletPill(o: Pick<PosOutlet, "isActive" | "hasKey">): { words: string; tone: Tone; why?: string } {
  if (!o.isActive) return { words: "inactive", tone: "neutral" };
  if (o.hasKey) return { words: "connected", tone: "success" };
  return { words: "no key", tone: "danger", why: "No API key has been issued. This outlet cannot post a charge." };
}

/** A bill's pill (TICKET_COLUMNS state), with the web's tooltip as words under it. */
export function ticketPill(t: Pick<PosTicket, "status" | "reason">): { words: string; tone: Tone; why?: string } {
  if (t.status === "posted") return { words: "on the bill", tone: "success" };
  if (t.status === "voided") return { words: "voided", tone: "warning", why: "A reversing entry cancels it. Both rows stay on the bill." };
  return { words: "refused", tone: "danger", why: t.reason ?? "Refused." };
}

/** The head's pill: the refused count first, else how many reached a guest's bill. Counts, not money. */
export function headPill(rows: readonly Pick<PosTicket, "status">[]): { words: string; tone: Tone } {
  const refused = rows.filter((t) => t.status === "rejected").length;
  const onFolio = rows.filter((t) => t.status === "posted").length;
  return refused ? { words: `${refused} refused`, tone: "danger" } : { words: `${onFolio} on guest bills`, tone: "success" };
}

/** The refusals box: the first five, and how many more. */
export function refusals(rows: readonly PosTicket[]) {
  const refused = rows.filter((t) => t.status === "rejected");
  return { count: refused.length, first: refused.slice(0, 5), more: Math.max(refused.length - 5, 0) };
}

export const refusedTitle = (n: number) => `${n} bill${n === 1 ? "" : "s"} did not reach a folio`;
