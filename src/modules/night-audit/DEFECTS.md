# Defects — night audit (phone)

Numbering `MNA-1`, `MNA-2`, … Each entry: what happened, how it was found, what was done about it,
and the rule it leaves. Fixed entries stay.

---

## Open

### MNA-1 · A refusal's body is lost: the "already closed" record and the blockers (4 Nov)

- **What happened:** the run's 409 for a day already closed carries `{ alreadyClosed, record }`
  (D17-12) and a blocked run carries `blockers`; the core's `ApiError` keeps only the sentence
  (`status`, `message`, `needs`), so the phone cannot read the record the web shows.
- **How found:** porting `NightAudit.tsx` 85-117 against `src/core/api.ts` `refused()`, before the
  first write.
- **What was done:** after a 409 the phone reads `GET /night-audit/runs` again and shows the closing
  day's line of it (`audit.ts alreadyMade`), which is the same row the server returned (`closedDays`
  in `nightAudit.ts` builds both). A 409 for any other reason finds no such line and is shown as the
  server's sentence in red. The blockers are read from the checklist, not the refusal. Asked of the
  mobile chat as a core change: `ApiError` keeping the parsed body.
- **The rule:** when a refusal carries data the screen must show, read it again from the server's own
  read rather than guessing it from the sentence.
