# admin — defects (prefix MADM-)

Every defect found in the phone's Administration module: what happened, how it was found, what was
done about it, and the rule it leaves. Fixed entries stay.

## MADM-1 · The phone's console list is older than the web's (20 Nov) — open, the core's

**What happened.** The core's port of the Settings console (`src/core/menu.ts` PAGES, 4 Nov) has no
"Backfill data" (`/settings/property/backfill-data`, D27-398) and no "Bring in old data"
(`/settings/property/old-data`, D27-383), and calls Money's "Room discounts" "Discounts" (D27-395);
nor the "Backfilled records" entry the Accountant reaches (`admin/nav.ts`, `/h/:code/backfill`). So
the phone's Settings list cannot show Backfill data, though the screen is built.
**How found.** Listing `sidebarFor(…, "settings")` for a GM against today's `*.settings.ts`.
**What was done.** Nothing in the core (frozen): the exact diff is in the lane's report. The Backfill
screen opens from its own route meanwhile, with the web's own read rule (`refusedBackfill`).
**The rule.** Before building on a ported list, compare it with the web's of today, not of the day it
was ported.
