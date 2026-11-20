# settings — defects (prefix MSET-, then the lane's letter)

Every defect found in the Settings console's own pages on the phone: what happened, how it was
found, what was done about it, and the rule it leaves. Fixed entries stay. Each lane appends its own
section; numbers carry the lane's letter so two lanes never take the same one.

## Lane m13-set-messages (letter G, 20 Nov)

None found in the phone's pages while building them.

Found in the web or the API (for `docs/api-requests.md`, through the mobile chat):
- **`POST /:code/report-schedules` reads no `idempotency-key`** (api/src/modules/reports/emails.ts
  371-384), R-30's class: a lost reply then a second Save adds the schedule twice, and each sends the
  report every night. The phone stops the page until a read begun after the loss is back; ask the PMS
  to read the key.
- **The web's Scheduled reports sends a second write while one is on its way**: only the row being
  paused shows loading, so Edit, Delete and another row's Pause stay live (ScheduledReports.tsx
  108-115). Harmless for the PUTs, but a Delete and a Pause of the same row can cross. The phone greys
  every write while one is out.
