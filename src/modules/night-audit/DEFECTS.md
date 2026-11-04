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

### MNA-2 · After a close on this phone, every other screen kept the old business date (4 Nov) — fixed

**What happened:** the close invalidated the cached reads, but each screen takes its day from the
session's hotels (`useSession().who`), which is not a query: Arrivals would still list the day just
closed. The web refreshes its session first (`NightAudit.tsx` 97-108: "how this shipped broken
once"). **How found:** the independent review before the merge. **What was done:** the core's
session has `refresh()` (re-reads `/api/hotels`), awaited after a close, before the invalidation.
**The rule:** a write that moves the business date refreshes the person's hotels.

### MNA-3 · The confirm window could turn into a day nobody checked (4 Nov) — fixed

**What happened:** the window drew and sent the live checklist, so a re-read underneath (another
desk closed the day; a held change sent, which re-reads everything) changed "Close 3 Nov" into
"Close 4 Nov" with the box still ticked. **How found:** the independent review. **What was done:**
the window holds the checklist as it stood when Run was tapped, and sends that day; a day closed
elsewhere comes back as the server's "already closed" with its record. **The rule:** a confirmation
sends exactly what it showed.

### MNA-4 · An unknown outcome on Close the day: checked, safe (4 Nov) — no change

Checked applying MEMORY 16 across the modules: the run reads no idempotency key, but a second run
finds the day already closed and is refused (409, "… was already closed"), and the no-show charges
it posts match `status = 'confirmed'` rows it has already moved (nightAudit.ts), so a second tap
after a lost reply makes nothing twice. The phone's keeper stays (harmless). **The rule:** a write
the server refuses twice needs no stop.
