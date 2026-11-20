import { api, send } from "../../core/api";
import type {
  CommissionView, Day, Discount, ExtraChargesView, PaymentMethodsView, PlanSettings, PlanStep, SlabBody, TaxKind, TaxSetup,
} from "./moneyRules";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS → RATES AND TAX, AND MONEY: THE READS AND WRITES (lane
   m13-set-money, 20 Nov). Every call through the core's api client, the
   hotel's code in every path; the screens key every read
   ["settings", code, "<page>"] (AGENTS rule 5). Ported from the PMS's
   src/modules/finance/data/money.ts, data/tax.ts and
   src/modules/inventory/data/planSettings.ts, pricing.ts (setBasis,
   setAddon). Rate plans' prices are read through inventory/data.ts
   (readInventory, readPricing, readBreakup) and its sources through
   inventory/configData.ts (readSources): the same reads Rates and Booking
   sources make, not a second copy.

   OFFLINE: none of these writes is listed in the web's src/lib/offline.ts,
   so `send` refuses each with the web's sentence for an unlisted write (an
   ApiError 503): nothing is held. A refusal (409 {ok:false, reason}, 403
   the role gate's sentence) is an ApiError carrying the server's words.
   NO KEY is read by these routes; the screens keep the unknown-outcome
   stop on the core's stop book (moneyKit.tsx useWriter, src/core/stop.ts).
   ══════════════════════════════════════════════════════════════════ */

const H = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;
type Ok = { ok: true; id?: string };

/* ── The three lists (money.ts moneyList) ─────────────────────────── */

export type MoneyList = "payment-methods" | "extra-charges" | "discounts";

export const readPaymentMethods = (code: string) => api<PaymentMethodsView>(`${H(code)}/payment-methods`);
export const readExtraCharges = (code: string) => api<ExtraChargesView>(`${H(code)}/extra-charges`);
export const readDiscounts = (code: string) => api<{ discounts: Discount[] }>(`${H(code)}/discounts`);
export const readCommission = (code: string) => api<CommissionView>(`${H(code)}/commission`);

export const listAdd = (code: string, list: MoneyList, body: object) => send<Ok>("POST", `${H(code)}/${list}`, body);
export const listChange = (code: string, list: MoneyList, id: string, body: object) =>
  send<Ok>("PATCH", `${H(code)}/${list}/${encodeURIComponent(id)}`, body);
/** Only what nothing used: the server says "Switch it Off instead" otherwise. */
export const listRemove = (code: string, list: MoneyList, id: string) => send<Ok>("DELETE", `${H(code)}/${list}/${encodeURIComponent(id)}`);
export const listOrder = (code: string, list: Exclude<MoneyList, "discounts">, ids: string[]) =>
  send<Ok>("PUT", `${H(code)}/${list}/order`, { ids });

export const makeDefaultMethod = (code: string, id: string) =>
  send<Ok>("POST", `${H(code)}/payment-methods/${encodeURIComponent(id)}/default`);

/** The early check-in and late check-out fees live on the hotel (063): null is no fee. */
export const setEarlyLateFees = (code: string, fees: { earlyCheckinCharge: number | null; lateCheckoutCharge: number | null }) =>
  send<Ok>("PATCH", `${H(code)}/front-desk`, fees);

/** A source's commission here (082): null is "not agreed", not 0. */
export const setSourceCommission = (code: string, sourceId: string, commissionPct: number | null) =>
  send<Ok>("PUT", `${H(code)}/booking-sources/${encodeURIComponent(sourceId)}/commission`, { commissionPct });

/* ── Taxes (tax.ts) ──────────────────────────────────────────────── */

export const readTaxSetup = (code: string) => api<TaxSetup>(`${H(code)}/tax`);
/** Replaces every band of one kind at once; an empty list puts the kind back to unset. */
export const setTaxRules = (code: string, kind: TaxKind, slabs: SlabBody[]) =>
  send<{ ok: true; slabs: number }>("PUT", `${H(code)}/tax/${kind}`, { slabs });
export const setTaxSac = (code: string, kind: TaxKind, sacCode: string | null) =>
  send<Ok>("PUT", `${H(code)}/tax/${kind}/sac`, { sacCode });
export const setCategoryTaxKind = (code: string, category: string, kind: TaxKind | null) =>
  send<Ok>("PATCH", `${H(code)}/menu-categories/${encodeURIComponent(category)}/tax-kind`, { kind });

/* ── Rate plans and meal plans (planSettings.ts, pricing.ts) ─────── */

export const readPlanSettings = (code: string) => api<PlanSettings>(`${H(code)}/plan-settings`);
export const setPlanOn = (code: string, roomTypeId: string, mealPlan: string, isActive: boolean) =>
  send<Ok>("PUT", `${H(code)}/plan-settings/${encodeURIComponent(roomTypeId)}/${encodeURIComponent(mealPlan)}`, { isActive });
export const orderPlans = (code: string, plans: { roomTypeId: string; mealPlan: string }[]) =>
  send<Ok>("PUT", `${H(code)}/plan-settings/order`, { plans });
export const setMealDays = (code: string, mealPlan: string, days: { breakfast: Day[]; lunch: Day[]; dinner: Day[] }) =>
  send<Ok>("PUT", `${H(code)}/meal-days/${encodeURIComponent(mealPlan)}`, days);

/** One of the Rate plan editor's writes (planSteps), as the web sends it. */
export function planStep(code: string, row: { roomTypeId: string; plan: string }, step: PlanStep) {
  switch (step.what) {
    case "basis": return send<Ok>("PUT", `${H(code)}/pricing/basis`, { roomTypeId: step.roomTypeId });
    case "addon": return send<Ok>("PUT", `${H(code)}/pricing/addon`, step.body);
    case "sources":
      return send<Ok>("PUT", `${H(code)}/plan-settings/${encodeURIComponent(row.roomTypeId)}/${encodeURIComponent(row.plan)}`, { sources: step.sources });
  }
}
