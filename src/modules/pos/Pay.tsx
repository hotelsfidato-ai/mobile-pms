import type { Hotel } from "../../core/api";
import type { Order } from "./types";

/* ══════════════════════════════════════════════════════════════════
   PAYING AND PRINTING — the contract between slice 3's screens (the
   mobile chat, 15 Oct). The pay helper builds these two; the order
   screen renders PayActions under its own buttons, and both the order
   screen and a table's tile render PrintBill. Until built they draw
   nothing.
   ══════════════════════════════════════════════════════════════════ */

export interface PayProps {
  hotel: Hotel;
  order: Order;
  role: string | null;
  /** Re-read the order (and the floor) after a payment changed it. */
  onChanged: () => void;
}

/** Charge to room, Cash · Card · UPI, Part - pay two ways: the web's Till
    (Till.tsx 1269-1346, Terminal.tsx 1000-1051) and its rules. */
export function PayActions(_props: PayProps) {
  return null;
}

/** Print the bill: queued for the bill-printer computer (POST bill-print),
    else from the phone (expo-print, M-9). */
export function PrintBill(_props: { hotel: Hotel; orderId: string; onPrinted?: () => void }) {
  return null;
}
