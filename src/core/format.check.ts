/* The core's figures and times (format.ts). Run: node --experimental-strip-types src/core/format.check.ts
   Node reads Postgres's text too, so the converted TEXT is checked, not only the result (MEMORY 7). */
import { cash, count, DASH, instant, msAt, pct } from "./format.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

eq(instant("2026-10-31 07:35:58.215147+05:30"), "2026-10-31T07:35:58.215+05:30", "Postgres text as ISO");
eq(instant("2026-10-31 07:35:58+05"), "2026-10-31T07:35:58+05:00", "an hour-only offset");
eq(instant("2026-10-31T02:05:58.215Z"), "2026-10-31T02:05:58.215Z", "ISO kept as sent");
eq(msAt("2026-10-31 07:35:58.215147+05:30"), Date.UTC(2026, 9, 31, 2, 5, 58, 215), "the same moment");
eq(msAt(null), null, "no time");
eq(msAt("not a time"), null, "an unreadable time is none, never NaN");
eq(cash(null), DASH, "a missing figure is a dash");
eq(cash(0), "₹0", "a real zero is a figure");
eq(pct(undefined), DASH, "a missing share is a dash");
eq(count(0), "0", "nothing there is a real zero");
console.log("core format: all checks pass");
