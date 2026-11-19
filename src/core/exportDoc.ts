/* ══════════════════════════════════════════════════════════════════
   EXPORT A LIST OR A REPORT FROM THE PHONE (the owner, 19 Nov: "make the
   export thing live"), with what Expo already gives both phones — no new
   package (M-13):
   - exportPdf: the phone's own print sheet (expo-print, M-9), which
     prints or saves a PDF on an iPhone ("Save to Files" from the share
     button of the print preview) and on Android ("Save as PDF").
   - shareTable: the phone's own share sheet (React Native's Share), the
     rows as plain text to WhatsApp, mail, notes.
   A file attached to the share (a real .pdf or .xlsx) needs expo-file-
   system and expo-sharing: asked of the owner, not used here.

   Every figure is the screen's, as the server sent it and as the screen
   already writes it (a dash for none, paise kept): this file formats
   nothing and adds nothing up. `tableHtml` and `tableText` are pure, so
   exportDoc.check.ts runs them under node.
   ══════════════════════════════════════════════════════════════════ */

export interface ExportTable {
  /** "GST sales register" */
  title: string;
  /** "Fidato Agra · 1 Nov 2026 to 15 Nov 2026" */
  subtitle?: string;
  columns: readonly string[];
  /** Each cell already written as the screen shows it. */
  rows: readonly (readonly string[])[];
  /** The server's own totals row, when it sends one; never a phone sum. */
  totals?: readonly string[];
  /** A line under the table, e.g. why a total is not drawn. */
  note?: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The table as one printable page (Inter's look, the web's grey and ink). */
export function tableHtml(t: ExportTable, made: string): string {
  const head = t.columns.map((c) => `<th>${esc(c)}</th>`).join("");
  const body = t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
  const foot = t.totals ? `<tfoot><tr>${t.totals.map((c) => `<td>${esc(c)}</td>`).join("")}</tr></tfoot>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: -apple-system, Roboto, "Inter", sans-serif; color: #031728; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; } p { color: #67737e; font-size: 12px; margin: 0 0 12px; }
  table { border-collapse: collapse; width: 100%; font-size: 11px; }
  th { text-align: left; color: #4c5b67; border-bottom: 1px solid #ccd0d4; padding: 6px 8px; }
  td { border-bottom: 1px solid #eef0f2; padding: 6px 8px; font-variant-numeric: tabular-nums; }
  tfoot td { font-weight: 600; border-top: 1px solid #ccd0d4; }
</style></head><body>
<h1>${esc(t.title)}</h1><p>${t.subtitle ? `${esc(t.subtitle)} · ` : ""}Made on the phone ${esc(made)}. Figures as the server sent them.</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>
${t.note ? `<p style="margin-top:12px">${esc(t.note)}</p>` : ""}
</body></html>`;
}

/** The table as text for a message: one line per row, "label: value" pairs. */
export function tableText(t: ExportTable): string {
  const line = (r: readonly string[]) => r.map((c, i) => `${t.columns[i] ?? ""}: ${c}`).join(" · ");
  return [t.title, t.subtitle ?? "", "", ...t.rows.map(line), ...(t.totals ? ["", `Total · ${line(t.totals)}`] : []), ...(t.note ? ["", t.note] : [])]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
}
