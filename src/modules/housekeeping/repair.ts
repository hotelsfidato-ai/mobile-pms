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

/** src/data/repositories/rooms.ts BLOCK_REASONS, the web's words. */
export const BLOCK_REASONS = [
  { value: "out_of_order", label: "Out of order - something is broken" },
  { value: "out_of_service", label: "Out of service - held back deliberately" },
  { value: "refurbishment", label: "Refurbishment" },
  { value: "house_use", label: "NC - not for sale (house use: staff, storage, an office)" },
  { value: "owner_occupied", label: "Owner occupied" },
] as const;

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
export interface HouseNow { rooms: Array<{ number: string; inHouse: boolean }> }

/** "Take room N out of service too" is offered only for a room nobody is
    in (RepairFlow's mayTakeOut; the API refuses an occupied room). The
    house unknown, nothing is offered. */
export function offerTakeOut(room: string, house: HouseNow | null | undefined): boolean {
  const n = room.trim();
  return n.length > 0 && house?.rooms.find((r) => r.number === n)?.inHouse === false;
}

/** A real calendar day written YYYY-MM-DD (the web's <input type="date">). */
export function isDay(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
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
  if (f.takeOut && offered) {
    if (!isDay(f.from)) return "From which date?";
    /* ponytail: no date picker without the owner's yes; a typed day is checked here. */
    if (f.until && !isDay(f.until)) return "Until: write the day as 2026-10-20, or leave it empty if unknown.";
    if (f.until && f.until < f.from) return "A block cannot end before it starts.";
  }
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
