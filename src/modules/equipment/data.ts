import { api, send } from "../../core/api";
import type { ImportReport } from "../../core/importSpec";
import type { KeyKeeper } from "../../core/keys";
import { listApprovals } from "../approvals/data";
import type { Approval } from "../approvals/rules";
import type { WorkOrderList } from "../housekeeping/workOrders";
import {
  itemPath, listPath, movePath, optionsPath, repairsPath, retirePath, statusPath,
  type EquipmentItem, type EquipmentOptions, type HistoryEntry,
} from "./register";

/* ══════════════════════════════════════════════════════════════════
   THE EQUIPMENT REGISTER'S CALLS - the web's data/equipment.ts, through
   the core only. A refusal is the server's: 403 (grants.ts, who may) or
   409 ({ ok: false, reason }), which `send` throws as an ApiError with
   that sentence.

   OFFLINE: /equipment is on no list in the web's tiers (src/lib/offline.ts),
   so `send` refuses every write here with the web's sentence and holds
   nothing. A repair is housekeeping's POST /work-orders, which the web
   holds ("Work order") and which reads the idempotency key (062): the
   dialog sends ONE key for the whole form (repair.ts formKeeper, MHK-3).

   KEYS: the register's routes read no key. What stops a second write is
   the server's own state ("It is already there", "It is already retired",
   a request already waiting); adding is not stopped (a counted line would
   be added twice), so every dialog latches its tap and, on an unknown
   outcome, takes no more taps until it is closed and the register read
   again (MEMORY 8, 16).

   DECIDING a waiting request is the ONE approvals engine's, through the
   app's Approvals module (its listApprovals and decide, with its keeper):
   no second engine here.
   ══════════════════════════════════════════════════════════════════ */

export const readEquipment = async (code: string) => (await api<{ items: EquipmentItem[] }>(listPath(code))).items;
export const readOptions = (code: string) => api<EquipmentOptions>(optionsPath(code));
export const readItem = (code: string, id: string) => api<{ item: EquipmentItem; history: HistoryEntry[] }>(itemPath(code, id));

/** The one inbox's waiting equipment requests (the web's listEquipmentApprovals). */
export async function readEquipmentApprovals(code: string): Promise<Approval[]> {
  const answer = await listApprovals(code, "pending");
  return answer.rows.filter((r) => r.kind === "equipment_issue" || r.kind === "equipment_retire");
}

export const addEquipment = (code: string, body: Record<string, unknown>) =>
  send<{ ok: true; id: string }>("POST", listPath(code), body);

/** The opening register from a file (equipment.ts importEquipment): `{ rows, dryRun }`, the dry run first. */
export const importEquipment = (code: string, rows: Record<string, string>[], dryRun: boolean) =>
  send<ImportReport>("POST", `${listPath(code)}/import`, { rows, dryRun });

export const editEquipment = (code: string, id: string, changes: Record<string, string | null>) =>
  send<{ ok: true; id: string; changed: boolean }>("PATCH", itemPath(code, id), changes);

export const moveEquipment = (code: string, id: string, body: { roomId?: string; locationId?: string; count?: number; note?: string }) =>
  send<{ ok: true; id: string; quantity: number; split: boolean; requested: boolean; approvalId: string | null }>("POST", movePath(code, id), body);

export const setEquipmentStatus = (code: string, id: string, body: { status: "in_use" | "under_repair"; count?: number; note?: string }) =>
  send<{ ok: true; id: string; quantity: number; split: boolean }>("POST", statusPath(code, id), body);

export const retireEquipment = (code: string, id: string, body: { reason: string; count?: number }) =>
  send<{ ok: true; id: string; requested: boolean; approvalId: string | null; split?: boolean }>("POST", retirePath(code, id), body);

/** Its repairs, open and closed (housekeeping's listRepairsForItem). */
export const readRepairs = (code: string, id: string) => api<WorkOrderList>(repairsPath(code, id));

/** A repair on it (RepairFlow with the item fixed): one key for the whole form. */
export const raiseRepair = (
  code: string,
  body: { title: string; detail: string; category: string; priority: string; roomNumber?: string; equipmentItemId: string },
  keeper: KeyKeeper,
) => send<{ ok: true; id: string }>("POST", `/api/hotels/${encodeURIComponent(code)}/work-orders`, body, keeper);
