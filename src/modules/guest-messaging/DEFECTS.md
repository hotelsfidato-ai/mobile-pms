# Defects — guest-messaging (the phone)

Every defect found in this module: what happened, how it was found, **what was done about it**, and
the rule it leaves. Numbered `MGM-1`, `MGM-2` … Fixed entries stay. A lesson that would bite any
module goes in `MEMORY.md` instead; a fault in the PMS itself in `docs/api-requests.md`.

---

## Open

None.

## Fixed

None.

## Watched (not defects)

- The web's own Guest messages reads an arrival day (`checkIn`, "YYYY-MM-DD") through `new Date()`,
  which is UTC midnight: a browser west of UTC would show the day before. The phone reads the day as
  written (`dayShort`, held by `rules.check.ts` under two zones), so it cannot move.
