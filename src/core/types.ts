/* ══════════════════════════════════════════════════════════════════
   THE PMS'S DATA SHAPES THE APP READS — copied from the web's
   src/data/repositories/types.ts (Stay, StayStatus, Source, Room,
   RoomBlock, PeriodStatistics), so the app stands alone: a cloud build
   uploads `mobile/` only (M-8, PLAN § 7). The web's file wins if the two
   ever differ: copy, do not eyeball. Its comments explain each field.
   ══════════════════════════════════════════════════════════════════ */

export type StayStatus =
  | "due-in" | "in-house" | "due-out" | "checked-out" | "no-show" | "cancelled"
  | "tentative";

/** Any source a manager added; null is a real answer, shown as a dash. */
export type Source = string;

export interface Stay {
  id: string;
  hotelId: string;
  reference: string;
  guest: string;
  roomNumber: string;
  roomType: string;
  source: Source | null;
  ratePlan: string;
  arrival: string;          // ISO date
  departure: string;        // ISO date — equal to arrival for day-use
  nights: number;           // 0 for day-use
  adults: number;
  children: number;
  status: StayStatus;
  isDayUse: boolean;
  isComplimentary: boolean;
  /** Per night, before discount. NULL when the room type has no rate: a dash, never ₹0. */
  rackTariff: number | null;
  offeredTariff: number;    // per night, after discount
  groupId?: string;
  group?: { id: string; name: string; rooms: number };
  notes?: string;
  isVip: boolean;
  vipLevel?: string | null;
  guestId?: string;
  isSingleLady: boolean;
  businessSource: string | null;
  marketSegment: string | null;
  salesPerson: string | null;
  voidReason?: string;
  phone?: string | null;
  email?: string | null;
  nationality?: string;
}

export interface RoomBlock {
  id: string;
  from: string;
  /** Null means open-ended: the room is out until somebody says otherwise. */
  to: string | null;
  reason: string | null;
}

export interface Room {
  number: string;
  type: string;
  floor: number;
  /** Independent of occupancy: a room can be occupied and dirty. */
  status: string;
  maxOccupancy: number;
  /** NULL when nobody has set one: a dash, never an invented price. */
  rackRate: number | null;
  blocks: RoomBlock[];
}

export interface PeriodStatistics {
  from: string;
  to: string;
  availableRoomNights: number;
  roomsSold: number;
  occupancyPct: number;
  adr: number;
  revpar: number;
  roomRevenue: number;
}
