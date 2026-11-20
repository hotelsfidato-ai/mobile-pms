import type { Stay } from "../../core/types.ts";
import type { ChartRoom } from "../reservations/chart.ts";
import { day } from "./desk.ts";

/* ══════════════════════════════════════════════════════════════════
   ROOMS — THE HOUSE AS TILES, FOR TODAY: the web's /h/:code/stay
   (src/modules/front-desk/pages/StayView.tsx, view "floor", and
   flows/HouseFloor.tsx), its rules ported by hand:
     StayView.tsx    todaysStays (who is in each room TODAY, not the
                     chart's window), bookRoom (a free tile's walk-in)
     HouseFloor.tsx  stateOf (the order a person cares in), LABEL, the
                     "dirty" mark, "out today" / "to 13 Oct 2026", what a
                     tile opens, an odd last tile taking the row
   The house itself (the rooms, their state, the eight counts, room type or
   floor, the filter) is the Calendar's own port, imported from
   reservations/chart.ts (buildChart, groupsOf, roomVisible), never copied:
   one house, one answer (the web's "nothing new is fetched").
   Pure: no React Native here, so `rooms.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

export type TileState = "out-of-service" | "due-out" | "occupied" | "arriving" | "dirty" | "free";

/** ORDER MATTERS (HouseFloor.tsx stateOf): a room occupied AND due out today
    is a departure, the thing somebody has to act on. */
export function tileState(room: ChartRoom): TileState {
  if (room.outOfService) return "out-of-service";
  if (room.state.dueOut) return "due-out";
  if (room.state.occupied) return "occupied";
  if (room.state.arriving) return "arriving";
  if (room.state.dirty) return "dirty";
  return "free";
}

/** HouseFloor.tsx LABEL: the filter tiles' words. */
export const TILE_LABEL: Record<TileState, string> = {
  free: "Free",
  occupied: "In house",
  arriving: "Arriving",
  "due-out": "Due out",
  dirty: "Needs cleaning",
  "out-of-service": "Out of service",
};

/** WHO IS IN EACH ROOM TODAY (StayView.tsx todaysStays), from the day's read
    of the stays: checked in, or arriving today. The guest IN the room is its
    name: an arrival given the room ahead does not print under Due out. */
export function todaysStays(stays: Stay[], businessDate: string): Record<string, Stay> {
  const map: Record<string, Stay> = {};
  for (const s of stays) {
    if (!s.roomNumber) continue;
    const live = s.status === "in-house" || s.status === "due-out" || (s.status === "due-in" && s.arrival === businessDate);
    const arrivalBehindGuest = s.status === "due-in" && map[s.roomNumber] !== undefined;
    if (live && !arrivalBehindGuest) map[s.roomNumber] = s;
  }
  return map;
}

/** What a tap on the tile does (HouseFloor.tsx act): out of service, nothing
    (the web's button is disabled, a guest in it or not); else the stay in it;
    else a walk-in into it. */
export type TileAct = { kind: "stay"; id: string } | { kind: "walk-in"; room: string } | { kind: "none" };
export function tileAct(room: ChartRoom, stay: Stay | undefined): TileAct {
  if (room.outOfService) return { kind: "none" };
  if (stay) return { kind: "stay", id: stay.id };
  return { kind: "walk-in", room: room.number };
}

/** The housekeeping mark beside the pill, when the pill says something else. */
export const dirtyMark = (room: ChartRoom) => room.state.dirty && tileState(room) !== "dirty";

/** The tile's last line under the guest: "out today" when due out, else "to 13 Oct 2026". */
export const tileWhen = (state: TileState, stay: Stay) => (state === "due-out" ? "out today" : `to ${day(stay.departure)}`);

/** Without a guest: the room's type, or a dash for one out of service. */
export const tileType = (room: ChartRoom) => (room.outOfService ? "-" : room.type);

/** Two across on a phone; an odd last tile takes the row so none sits alone. */
export function inPairs<T>(list: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));
  return rows;
}
