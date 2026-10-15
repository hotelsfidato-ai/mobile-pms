/* ══════════════════════════════════════════════════════════════════
   REPORT A REPAIR — the rules of the web's RepairFlow
   (src/modules/housekeeping/flows/RepairFlow.tsx), ported, and the
   API's own sentences (api/src/modules/housekeeping/housekeeping.ts
   POST /work-orders; roomStatus.ts POST /rooms/:n/block).
   Most repairs do not take the room out: that is a second, deliberate
   choice, unticked until somebody ticks it, offered only for a room
   nobody is in.
   Pure: no React Native here, so `repair.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { whyNotTake } from "./block.ts";
import { whyNotRepair } from "./roles.ts";

/** RepairFlow.tsx PRIORITIES; the API's default is "normal". */
export const PRIORITIES = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
] as const;

/** RepairFlow.tsx REPAIR_KINDS, shown as the web shows them; the API's default is "maintenance". */
export const REPAIR_KINDS = ["maintenance", "housekeeping", "electrical", "plumbing", "furniture", "it", "other"] as const;

/** The web's block reasons: one list, in ./block.ts (src/data/repositories/rooms.ts). */
export { BLOCK_REASONS } from "./block.ts";

export interface RepairForm {
  what: string;
  /** Empty: not a room (a lift, the lobby). */
  room: string;
  kind: string;
  priority: string;
  detail: string;
  takeOut: boolean;
  reason: string;
  from: string;
  /** Empty: no return date. */
  until: string;
}

/** A fresh form, as RepairFlow opens one. */
export const blankForm = (room: string, businessDate: string): RepairForm => ({
  what: "", room, kind: "maintenance", priority: "normal", detail: "",
  takeOut: false, reason: "out_of_order", from: businessDate, until: "",
});

/** GET /house-now's rooms (src/modules/front-desk/data/stays.ts HouseNow). */
export interface HouseNow { rooms: Array<{ number: string; inHouse: boolean; outOfOrder: boolean }> }

/** "Take room N out of service too" is offered only for a room nobody is
    in (RepairFlow's mayTakeOut; the API refuses an occupied room). The
    house unknown, nothing is offered. */
export function offerTakeOut(room: string, house: HouseNow | null | undefined): boolean {
  const n = room.trim();
  const r = house?.rooms.find((x) => x.number === n);
  /* Stricter than the web (M-7): not for a room already out of service. */
  return n.length > 0 && r?.inHouse === false && r.outOfOrder === false;
}

/** Why "Raise it" is disabled, or null. The person's role first (the
    API's sentence; the web leaves it open and lets the server refuse,
    the phone does not - MODULE.md difference 1), then the API's own
    refusals, asked before sending: an empty title, a block without a
    start, a block ending before it starts. */
export function whyNotRaise(f: RepairForm, role: string | null, offered: boolean): string | null {
  const refused = whyNotRepair(role);
  if (refused) return refused;
  if (!f.what.trim()) return "What needs fixing?";
  /* The block's own rules (./block.ts): one place for both forms. */
  if (f.takeOut && offered) return whyNotTake({ reason: f.reason, from: f.from, to: f.until || null, note: "" });
  return null;
}

/** POST /work-orders's body, as RepairFlow sends it: no room for the building. */
export function workOrderBody(f: RepairForm) {
  const room = f.room.trim();
  return {
    title: f.what.trim(), detail: f.detail.trim(), category: f.kind, priority: f.priority,
    ...(room ? { roomNumber: room } : {}),
  };
}

/** POST /rooms/:n/block's body for the repair just raised (RepairFlow, blockRoomForRepair). */
export function blockBody(f: RepairForm, workOrderId: string) {
  return { reason: f.reason, from: f.from, to: f.until || null, workOrderId, note: f.what.trim() };
}

/** Taking a room off sale is never held (src/core/offline.ts refuses it): RepairFlow's words. */
export const needsLine = (room: string) =>
  `Taking room ${room.trim()} out of service needs the connection - do it when you are back online.`;

/** What the person is told when the repair could not leave the phone (RepairFlow's HeldError branch). */
export function heldSentence(message: string, f: RepairForm, out: boolean): string {
  return out ? `${message} ${needsLine(f.room)}` : message;
}
