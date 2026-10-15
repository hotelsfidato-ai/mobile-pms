import type { Room, Stay } from "../../../../src/data/repositories/types";
import type { OutboxEntry } from "../../core/offline.ts";
import { whyNotMark } from "./roles.ts";

/* ══════════════════════════════════════════════════════════════════
   THE HOUSEKEEPING BOARD'S RULES — the web's, ported, so the phone and
   the desk sort and refuse a room the same way:
     src/modules/housekeeping/data/housekeeping.ts   listHousekeeping
     src/modules/housekeeping/pages/Housekeeping.tsx GROUPS, bucket, the
       sheet filter, readHeld, whyNotClean / whyNotInspected
   Pure: no React Native here, so `board.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

/** data/housekeeping.ts HousekeepingRoom. */
export interface BoardRoom {
  number: string;
  type: string;
  floor: number;
  /** dirty · clean · inspected · out-of-service, the server's. */
  housekeeping: string;
  occupied: boolean;
  guest?: string;
  dueOut: boolean;
}
/** data/housekeeping.ts Housekeeper. */
export interface Housekeeper { id: string; name: string; role: string }
/** data/housekeeping.ts RoomAssignment. */
export interface RoomAssignment { room: string; staffId: string; staffName: string; role: string | null; note: string | null }
/** front-desk/data/stays.ts HouseNow, the field read here. */
export interface HouseNow { rooms: Array<{ number: string; inHouse: boolean }> }

/** The board's rooms (listHousekeeping): whether somebody is in a room is
    house-now's (D21-36); the stays only name who, and say Due out. `stays`
    null = the API refused them to this person: no names, no Due out. */
export function boardRooms(rooms: Room[], house: HouseNow, stays: Stay[] | null): BoardRoom[] {
  const now = new Map(house.rooms.map((r) => [r.number, r]));
  /* listStays hands them over by arrival; the first match names the room. */
  const live = [...(stays ?? [])].filter((s) => s.status !== "cancelled").sort((a, b) => a.arrival.localeCompare(b.arrival));
  return rooms.map((room) => {
    const inRoom = live.find((s) => s.roomNumber === room.number && (s.status === "in-house" || s.status === "due-out"));
    const leaving = live.find((s) => s.roomNumber === room.number && s.status === "due-out");
    return {
      number: room.number,
      type: room.type,
      floor: room.floor,
      housekeeping: room.status,
      occupied: now.get(room.number)?.inHouse ?? false,
      guest: inRoom?.guest ?? leaving?.guest,
      dueOut: !!leaving,
    };
  });
}

/** The web's GROUPS, in its order and words. */
export const GROUPS = [
  { key: "dirty", label: "Needs cleaning" },
  { key: "clean", label: "Clean" },
  { key: "inspected", label: "Inspected" },
  { key: "occupied", label: "In house" },
  { key: "out-of-service", label: "Out of service" },
] as const;

/** A group's rooms (the web's bucket): every room with a guest in it is In
    house, out of service or not; the rest by the server's state. */
export const inGroup = (rooms: BoardRoom[], key: string) =>
  key === "occupied" ? rooms.filter((r) => r.occupied) : rooms.filter((r) => !r.occupied && r.housekeeping === key);

/* ── What this phone holds (the web's readHeld) ────────────────── */
/* Matched on the whole path, the hotel's code in it, so a held change for
   room 204 at one property never shows on 204 at another (AGENTS rule 5). */
export const markPath = (code: string, n: string) => `/api/hotels/${code}/rooms/${n}/housekeeping`;
export const assignPath = (code: string, n: string) => `/api/hotels/${code}/housekeeping/assignments/${n}`;

const lastWaiting = (held: OutboxEntry[], path: string) =>
  held.filter((e) => e.status === "waiting" && e.path === path).pop();
const field = (body: string | undefined, name: string): string | null => {
  try {
    return (JSON.parse(body ?? "{}") as Record<string, string | undefined>)[name] ?? null;
  } catch {
    return null;
  }
};

/** The state the room's last held mark asks for, or null when none is held. */
export function heldMark(held: OutboxEntry[], code: string, n: string): string | null {
  const e = lastWaiting(held, markPath(code, n));
  return e ? field(e.body, "state") ?? "" : null;
}

/** The room's last held assignment: a staff id, null for a held "take it
    off them", undefined when nothing is held. */
export function heldAssignee(held: OutboxEntry[], code: string, n: string): string | null | undefined {
  const e = lastWaiting(held, assignPath(code, n));
  if (!e) return undefined;
  return e.method === "DELETE" ? null : field(e.body, "staffId");
}

/** Whose sheet: the web's All / a person / Unassigned, the person being me. */
export type Sheet = "mine" | "all" | "unassigned";
export const onSheet = (rooms: BoardRoom[], sheet: Sheet, assignee: (n: string) => string | null, me: string | null) =>
  sheet === "all" ? rooms
    : sheet === "unassigned" ? rooms.filter((r) => assignee(r.number) == null)
      : rooms.filter((r) => me != null && assignee(r.number) === me);

/* ── Why a button is grey (Housekeeping.tsx whyNotClean / whyNotInspected)
   The API's refusal of the person first (roles.ts), then the order the
   server refuses in (roomStatus.ts): cleaned, then inspected. "On this
   phone" while the state is a tap still waiting to sync. null = allowed. */
export function whyNotClean(role: string | null, n: string, state: string, held: boolean): string | null {
  const refused = whyNotMark(role);
  if (refused) return refused;
  const here = held ? ", on this phone, waiting to sync" : "";
  if (state === "dirty") return null;
  if (state === "clean") return `Room ${n} is already marked clean${here}.`;
  if (state === "inspected") return `Room ${n} is already inspected${here}.`;
  return `Room ${n} cannot be marked clean from here.`;
}

export function whyNotInspected(role: string | null, n: string, state: string, held: boolean): string | null {
  const refused = whyNotMark(role);
  if (refused) return refused;
  const here = held ? ", on this phone, waiting to sync" : "";
  if (state === "clean") return null;
  if (state === "dirty") return `Room ${n} needs cleaning first.`;
  if (state === "inspected") return `Room ${n} is already inspected${here}.`;
  return `Room ${n} cannot be marked inspected from here.`;
}
