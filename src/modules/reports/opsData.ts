import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, orNull } from "../../core/api";
import { queryString, type ReportDoc, type ReportQuery } from "./opsDoc";
import { groupQuery, type GroupReportKey } from "./opsGroup";

/* ══════════════════════════════════════════════════════════════════
   THE OPERATIONS REPORTS' READS (mobile/m13-rep-ops) — GETs only; this lane
   writes nothing to the API.
   - one report: data/document.ts getReport, GET /api/hotels/:code/reports/
     <key>?asOn&month&year&from (api/src/modules/reports/documents.ts);
     a 404 ("No such property.") is null, as the web's;
   - a group report: getGroupReport, GET /api/group/reports/:key?hotels=…
     (reports/group.ts); a refusal comes back with the server's sentence;
   - the hotel's switches: the shell's own read and key (core/Shell.tsx),
     so the index's Bar stock rows follow the menu's.
   Every key names the hotel: ["reports", code, …].
   ══════════════════════════════════════════════════════════════════ */

const H = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;

/** The report keys this lane draws (document.ts ReportKey). */
export type OpsReportKey = "manager" | "night-audit" | "no-show" | "monthly-occupancy" | "monthly-statistics" | "yearly-statistics" | "item-sales";

export const readReport = (code: string, key: OpsReportKey, q: ReportQuery) =>
  orNull<ReportDoc>(`${H(code)}/reports/${key}${queryString(q)}`);

export const readGroupReport = (key: GroupReportKey, codes: readonly string[], q: ReportQuery) =>
  api<ReportDoc>(`/api/group/reports/${key}?${groupQuery(codes, q)}`);

export type Modules = Record<string, boolean>;
/** core/Shell.tsx's read of the switches, word for word: an unreadable answer is not a property losing a module. */
export const readModules = (code: string) =>
  api<{ modules: { module: string; enabled: boolean }[] }>(`${H(code)}/modules`)
    .then((b): Modules => Object.fromEntries(b.modules.map((m) => [m.module, m.enabled])))
    .catch((): Modules => ({}));

/* The stars: the web keeps them in the browser (lib/ui.ts favouriteReports, persisted);
   the phone on the phone. A store that cannot be read is no stars, never an error. */
const STARS = "fidato.reports.starred";
export async function readStars(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STARS);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
export async function keepStars(list: readonly string[]) {
  try { await AsyncStorage.setItem(STARS, JSON.stringify(list)); } catch { /* kept for this session only */ }
}
