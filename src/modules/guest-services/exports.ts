/* ══════════════════════════════════════════════════════════════════
   THE GUEST-SERVICES LISTS AS FILES — the web's column lists, ported by
   hand: LOST_EXPORT (pages/LostProperty.tsx), CALL_EXPORT
   (pages/WakeUpCalls.tsx), REQUEST_EXPORT (pages/Requests.tsx),
   WAITING_EXPORT (online-checkin/pages/Desk.tsx). Each cell written as
   the screen writes it (a dash for none); the rows are the ones the
   screen shows. An ID number is masked as the web's file masks it.
   Pure: exports.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

import type { ExportTable } from "../../core/exportDoc.ts";
import { maskId } from "../reports/listExportRules.ts";
import {
  dateShort, dateTime, ID_LABEL, TEAM_LABEL, wakeWhen,
  type GuestRequest, type LostItem, type WaitingDetails, type WakeUpCall,
} from "./rules.ts";

type Table = Omit<ExportTable, "title">;
const or = (v: string | number | null | undefined) => (v == null || v === "" ? "-" : String(v));

const LOST_STATUS: Record<LostItem["status"], string> = { kept: "Kept", returned: "Returned", disposed: "Disposed of" };
export const lostTable = (items: LostItem[], showing: string): Table => ({
  subtitle: `Showing ${showing}`,
  columns: ["What", "Found where", "Room", "Found on", "Found by", "Kept where", "Days kept", "Status", "Returned to", "Why disposed of", "Handled by", "Handled on"],
  rows: items.map((i) => [
    i.what, or(i.foundWhere), or(i.room), dateShort(i.foundOn), or(i.foundBy), or(i.keptWhere), or(i.daysKept),
    LOST_STATUS[i.status], or(i.returnedTo), or(i.disposeReason), or(i.handledBy), dateShort(i.handledOn),
  ]),
});

const CALL_STATUS: Record<WakeUpCall["status"], string> = { asked: "Asked by the guest", set: "Set", done: "Done", cancelled: "Cancelled" };
export const callTable = (calls: WakeUpCall[], showing: string): Table => ({
  subtitle: `Showing ${showing}`,
  columns: ["Call at", "Room", "Guest", "Status", "Note", "Set by", "Handled by", "Handled", "Why cancelled"],
  rows: calls.map((w) => [
    wakeWhen(w.callAt), or(w.room), or(w.guest), CALL_STATUS[w.status], or(w.note), w.fromGuest ? "The guest" : or(w.setBy),
    or(w.handledBy), dateTime(w.handledAt), or(w.cancelReason),
  ]),
});

const REQUEST_STATUS: Record<GuestRequest["status"], string> = { open: "Open", in_progress: "Being done", done: "Done", cancelled: "Cancelled" };
export const requestTable = (requests: GuestRequest[], showing: string): Table => ({
  subtitle: `Showing ${showing}`,
  columns: ["Team", "Room", "Guest", "What", "When wanted", "Status", "From", "Raised", "Taken by", "Closed", "Minutes", "What was done"],
  rows: requests.map((r) => [
    TEAM_LABEL[r.team], or(r.room), or(r.guest), r.what, or(r.when), REQUEST_STATUS[r.status], r.fromGuest ? "The guest" : or(r.raisedBy),
    dateTime(r.raisedAt), or(r.takenBy), dateTime(r.closedAt), or(r.minutes), or(r.resolution),
  ]),
});

export const waitingTable = (waiting: WaitingDetails[]): Table => ({
  subtitle: "Showing details waiting for the desk",
  columns: ["Guest", "Booking", "Sent", "ID", "ID number", "From DigiLocker", "Passport expires", "Visa number", "Visa expires", "Address", "City", "Country", "ID photo"],
  rows: waiting.map((w) => [
    w.guest, w.reference, dateTime(w.submittedAt), ID_LABEL[w.idType] ?? w.idType, maskId(w.idNumber), w.fromDigilocker ? "Yes" : "No",
    dateShort(w.passportExpiry), w.visaNumber ? maskId(w.visaNumber) : "-", dateShort(w.visaExpiry), or(w.addressLine), or(w.city), or(w.country),
    w.photo ? "Sent" : "-",
  ]),
});
