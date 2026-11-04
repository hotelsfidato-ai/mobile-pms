# Defects — CRS bookings (phone)

Numbering `MCRS-1`, `MCRS-2`, … Each entry: what happened, how it was found, what was done about it,
and the rule it leaves. Fixed entries stay. A fault in the PMS itself (its API or website) is not
fixed here: it goes to `docs/api-requests.md` through the mobile chat.

---

## Open

None.

## Fixed

### MCRS-1 · The first check of the last-read time could not see a missing `instant()` (4 Nov) — fixed

**What happened:** `connectionOf` writes "Last read from the CRS 31 Oct 2026, 7:35 AM." from
`last_read_at::text`, Postgres's own text. Breaking the rule on purpose (reading it with
`Date.parse(text)`, no `instant()`) left `bookings.check.ts` green: node reads Postgres's text,
Hermes answers NaN, so the phone would have said "-" (MEMORY 7). **How found:** the rule broken
once, before the first commit of the check. **What was done:** the check now replaces `Date.parse`
with one as strict as Hermes (ISO only, anything else NaN) before it runs; broken again, it fails.
**The rule:** a check of a server time makes node's `Date.parse` as strict as the phone's engine,
or it proves nothing about the phone.

## Seen in the web twin, not the phone's (for the PMS, through the mobile chat)

- The web draws **Done** for every role that can open the page and lets the server refuse it; the
  revenue manager, housekeeping, the kitchen manager, a waiter, a bar person, the accountant and a
  viewer read the page but are refused Done ("Changing a booking is for …"). The phone greys it
  with that sentence under it (AGENTS rule 1).
