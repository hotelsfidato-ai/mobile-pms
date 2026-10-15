/* ══════════════════════════════════════════════════════════════════
   THE TILL'S SHAPES — copied by name, word for word, from the web's
   src/modules/pos/data/till.ts (the API's answers). The web's file wins
   if the two ever differ: copy again, do not edit here. Its comments
   explain every field.
   ══════════════════════════════════════════════════════════════════ */

export interface MenuItem {
  id: string;
  name: string;
  /** The item's own price. **Meaningless once it has variations** — the
      variation carries the price, and the database refuses a line that
      names none. */
  price: number;
  /** Per ITEM, not per outlet: 5% on food, 18% on packaged water. The
      rate the till RINGS it at - its own, else its section's - as the
      server resolves it. Null is "none set": a dash, never 0% (POS-15). */
  taxRate: number | null;
  isActive: boolean;

  /** What a fast biller types. Null for most items. */
  shortCode: string | null;
  /** THREE states. `null` means nobody has said, and it must not render
      as the green mark — an unmarked dish is not a vegetarian one. */
  isVeg: boolean | null;
  isFavourite: boolean;
  /** "We are out of paneer", until this moment. A timestamp rather than
      a flag somebody must remember to unset. */
  offUntil: string | null;
  offReason: string | null;

  /** HOW LONG IT TAKES, resolved: this dish's own time, else its
      category's, else null.

      ⚠ NULL MEANS UNTIMED, NEVER INSTANT. It renders as a dash, the
      same rule the prices follow — "0 minutes" would sort a dish to the
      front of a kitchen display and get it started last. */
  prepMinutes: number | null;
  /** Set on the dish itself. Lets a screen tell "12 minutes, chosen for
      this dish" from "12 minutes, inherited from Main course". */
  ownPrepMinutes: number | null;

  /** Which course, resolved. NULL is an unsequenced dish — a drink —
      which is not course zero and sorts after the sequence. */
  course: number | null;
  ownCourse: number | null;

  /** Oil ₹300, Butter ₹400. Empty for most of a menu. */
  variations: MenuVariation[];
  addonGroups: AddonGroup[];
}

export interface MenuVariation {
  id: string;
  label: string;
  /** Type 1: the dish's price. A later type: what it adds (D27-192). */
  price: number;
  /* Its type. Absent on a menu cached before 30 September: read as type 1
     with no kind, which is what every choice was then. */
  typeNo?: number;
  kind?: VariationKind | null;
  heading?: string | null;
}

export type VariationKind = "size" | "quantity" | "option";

export interface AddonGroup {
  id: string;
  label: string;
  /** `minSelect` above zero makes the group a required choice. */
  minSelect: number;
  maxSelect: number | null;
  addons: Addon[];
}

export interface Addon {
  id: string;
  label: string;
  price: number;
  offUntil: string | null;
}

export type SectionHeading = "restaurant" | "bar" | "banquet" | "alcohol" | "other";

export interface MenuCategory {
  id: string;
  name: string;
  /** Its tax heading (D22-4). Null is not set. Absent in a menu cached
      before 23 September, which reads the same. */
  taxKind?: SectionHeading | null;
  /** The preparation time every dish in here inherits unless it sets
      its own. Null means nobody has said. */
  prepMinutes: number | null;
  /** The course everything in here belongs to, unless a dish says
      otherwise. Null takes the whole category out of the sequence. */
  course: number | null;
  items: MenuItem[];
}

export interface OrderLine {
  id: string;
  name: string;
  qty: number;
  /** Copied onto the line when it was added, so a price rise next
      month does not re-price a bill printed today. */
  unitPrice: number;
  taxRate: number;
  /** "vat" for alcohol (D21-91): its tax prints as one VAT line, never as a
      CGST and SGST pair. The server always sends it; absent reads as GST. */
  taxScheme?: "gst" | "vat";
  note: string | null;
  /** Struck, not removed. A manager settling a dispute wants to see
      that a dish was added and cancelled four times. */
  voided: boolean;
  /** pending · sent · preparing · ready · served.
   *
   *  `pending` until a waiter sends the ticket. The till shows it so a
   *  second KOT does not re-fire the starters while they are being
   *  eaten. */
  kotStatus: string;
  /** Null when the reader may not see that person (staff is row-secured). */
  addedBy: string | null;

  /** Set on an ADD-ON line, naming the dish it belongs to. The bill and
      the kitchen docket both indent on it, exactly as the printed
      ticket does. */
  parentLineId: string | null;
  isAddon: boolean;
  variationId: string | null;
  /** The numbered Add-ons folded into this dish (D27-289), as chosen: the
      bill prints "Veg Biryani 310 · Kebab +120" under the line, and
      Customise opens on them. Null or absent when it has none. */
  numberedAddons?: LineAddons | null;
  /** An add-on as a line of its own under parentLineId (D27-291): custom
      (typed by staff) or numbered (put on a dish already sent). Its own
      quantity; the bill reads "+ Extra papad". Null or absent otherwise. */
  extra?: "custom" | "numbered" | null;
}

export interface CustomAddon { name: string; price: number; qty: number }

export interface ExtraInput {
  numberedId?: string;
  name?: string;
  price?: number;
  free?: boolean;
  qty: number;
}

export interface NumberedAddon {
  id: string;
  number: number;
  name: string;
  /** A line on what it is - "two pieces of seekh kebab". */
  description: string | null;
  price: number;
  /** A 0 that somebody chose (D27-120); a blank is never a 0. */
  free: boolean;
  isActive: boolean;
  offUntil: string | null;
  offReason: string | null;
}

export interface LineAddon {
  id: string; number: number; name: string; price: number;
  /** How many on ONE of the dish: "Kebab ×2". */
  qty: number;
}

export interface LineAddons {
  /** The dish as named before them: "Veg Biryani". */
  dish: string;
  /** One of it before them, in rupees. */
  base: number;
  addons: LineAddon[];
}

export interface NumberedChoice { id: string; qty: number }

export interface Order {
  id: string;
  orderNo: string;
  outlet: string;
  outletName: string;
  /** Copied onto the order, so a reprint next year is not re-dressed
      in whatever the property list says by then. */
  hotelName: string;
  hotelCity: string | null;
  hotelGstin: string | null;
  /** The hotel's FSSAI licence number (A16), null until typed. */
  hotelFssai?: string | null;
  table: string | null;
  status: "open" | "settled" | "abandoned";
  businessDate: string;
  paymentMethod: string | null;
  /** Null when the reader may not see that person: a GM reading an order
      the group owner opened (D27-1). Printed as a dash. */
  openedBy: string | null;
  settledBy: string | null;
  settledAt: string | null;
  abandonedReason: string | null;
  ticketId: string | null;
  /** The banquet function this order is on (D17-21), and its name. An
      order on a function is paid on the function's bill: it settles "to
      the function" and no other way (the owner, 17 September). */
  eventId: string | null;
  eventTitle: string | null;
  /** The VAT bill issued for the alcohol when it was paid here (D22-44).
      Optional: an answer from before it existed has no such key. */
  vatBill?: string | null;
  /** Bills printed after payment (D27-292): the next one is BILL · DUPLICATE. */
  billsPrinted?: number;
  lines: OrderLine[];

  net: number;
  /** As APPLIED, which is what the arithmetic used. */
  discount: number;
  /** What the biller ENTERED, and what the bill prints. "10% off" reads
      differently from "₹115.70 off" even when the money is identical, and
      recomputing the rate from the amount fails once a line moves. */
  discountType: "percent" | "fixed" | null;
  discountValue: number | null;
  discountReason: string | null;
  /* ⚠ WHICH PROMOTION, not only that a discount happened. NULL is a
     free-hand discount inside the cap — a different act from a policy
     decided in advance, and month end has to be able to tell them
     apart. A report that cannot is reporting on neither. */
  promotionId: string | null;
  promotionName: string | null;
  taxable: number;
  tax: number;
  gross: number;
  /** Signed, and under a rupee. Its own line on the bill. */
  roundOff: number;
  /** gross + roundOff. What the guest actually hands over. */
  payable: number;
  tenders: Tender[];

  /* ── The header ──────────────────────────────────────────────────
     `covers` is people EATING, not seats. Average per cover is the
     metric a restaurant runs on, and a table for two that seats six
     says nothing. Null means nobody recorded it — which is excluded
     from the average, not counted as one. */
  covers: number | null;
  /** Who took the order. Not `openedBy`, which on a shared terminal is
      one person for the whole evening. */
  waiter: string | null;
  orderType: "dine_in" | "takeaway" | "room_service" | "delivery";
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerLocality: string | null;
  /** Parked. A table on drinks and not ready for food should not be a
      bill a waiter has to remember. */
  heldAt: string | null;
}

export interface Tender {
  id: string;
  method: "room" | "cash" | "card" | "upi";
  amount: number;
  /** Cash handed over. Null for every other method. */
  tendered: number | null;
  /** Derived from `tendered`, never stored — a stored figure is one more
      thing that can disagree with the arithmetic. */
  change: number | null;
  reference: string | null;
  takenBy: string | null;
}

export interface OrderSummary {
  id: string;
  orderNo: string;
  outlet: string;
  table: string | null;
  status: string;
  businessDate: string;
  gross: number;
  paymentMethod: string | null;
  openedAt: string;
  lines: number;
}

export interface ChargeableRoom {
  room: string;
  guest: string;
  folioId: string;
  /** The company, when this is a split stay's company bill (D27-162). */
  company?: string | null;
}

export type TillResult =
  | { ok: true; order: Order; guest?: string; room?: string }
  | { ok: false; reason: string; choices?: { folioId: string; guest: string; company?: string | null }[] };

export interface Promotion {
  id: string;
  /** What the biller types. Short — a terminal has a queue behind it. */
  code: string;
  /** What prints on the bill and groups the report. */
  name: string;
  kind: "percent" | "fixed";
  value: number;
  isActive: boolean;
  /** Bills that used it at this property. */
  used: number;
}

export interface PromotionList {
  /** ⚠ THE CAP COMES FROM THE SERVER. It is one number, defined in 083,
      and a copy of it in the browser would be a second thing to be
      wrong — which is the most expensive shape in this codebase. */
  freehandCapPercent: number;
  promotions: Promotion[];
}

export interface CashId {
  pan?: string;
  form97?: boolean;
  nonResident?: boolean;
}

export interface TenderInput {
  method: "room" | "cash" | "card" | "upi";
  amount: number;
  /** Cash only. The change is worked out from it. */
  tendered?: number;
  /** Card last four, a UPI reference. Never validated — the shape differs
      per method and a wrong format must not stop a guest leaving. */
  reference?: string;
}

export type TableState = "blank" | "running" | "kot" | "printed" | "paid" | "closed";

export interface FloorTable {
  id: string;
  label: string;
  seats: number | null;
  row: number;
  col: number;
  orderId: string | null;
  orderNo: string | null;
  state: TableState;
  /** How long the table has been sitting. The number a manager scans
      the room for. Null when nothing is on it. */
  minutes: number | null;
  payable: number | null;
  /** Dishes the kitchen made Ready that nobody has Taken (D27-221), and
      their lines. Absent on a floor cached before 1 October: none. */
  ready?: number;
  readyIds?: string[];
}

export interface FloorSection {
  id: string;
  name: string;
  tables: FloorTable[];
}

export interface Floor {
  outlet: {
    code: string; name: string;
    /** When it reopens. Null when it is open. */
    closedUntil: string | null;
    /** Why, if anybody said. Null is ordinary and shows nothing —
        it is not "no reason", it is "nobody wrote one". */
    closedReason: string | null;
  } | null;
  sections: FloorSection[];
}

export interface SendLine {
  /** The dish. Absent on add-ons for a dish already on the bill (extraFor). */
  itemId?: string;
  qty: number;
  note?: string;
  /* A dish WITH variations requires one and the server refuses without
     it; a dish with none must not be sent one. */
  variationId?: string;
  /** The choice of each further type (D27-192). */
  moreChoiceIds?: string[];
  addonIds?: string[];
  /** The numbered Add-ons on this dish (D27-289). */
  numberedAddons?: NumberedChoice[];
  /** Add-ons as lines of their own (D27-291): under this dish, or with
      extraFor under a dish already on the bill. */
  extras?: ExtraInput[];
  extraFor?: string;
}

export type SendResult =
  | { ok: true; held: false; order: Order; opened: boolean; kotNo: number | null }
  | { ok: true; held: true; message: string }
  | { ok: false; reason: string };
