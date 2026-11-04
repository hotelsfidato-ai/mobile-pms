# Defects — approvals (phone)

Numbering `MAPR-1`, `MAPR-2`, … Each entry: what happened, how it was found, what was done about it,
and the rule it leaves. Fixed entries stay.

---

## Open

### MAPR-3 · A request sent back for more would read "Refused by" (4 Nov)

- **What happened:** the web's `Approvals.tsx` writes `{approved ? "Approved" : "Refused"} by …` under
  every decided row, so a `clarify` row (pill "Asked for more") says it was refused.
- **How found:** porting the decided line.
- **What was done:** the phone says "Asked for more by …" (`rules.ts decidedLine`, checked). Open
  until the owner says which words, and the web is told (the mobile chat's report).
- **The rule it leaves:** a line under a pill says the same thing as the pill.

## Fixed (before it shipped)

### MAPR-4 · An unknown outcome on Approve, Refuse or Send back: checked, safe (4 Nov) — no change

Checked applying MEMORY 16 across the modules: the decision route reads no idempotency key, but
it refuses any request no longer pending ("That was already approved. To change it, raise a new
request", routes/approvals.ts), so a second tap after a lost reply makes nothing twice. The phone's
keeper per hotel stays (harmless). **The rule:** a write the server refuses twice needs no stop.

### MAPR-1 · The amount an approver reads would have been rounded to the rupee (4 Nov)

- **What happened:** the web prints `money(Number(a.amount))`, whole rupees: a ₹450.50 cash expense
  reads "₹451" to the person approving it, and goes through a float on the way.
- **How found:** porting the row against MEMORY 9 and MFIN-4.
- **What was done:** `amountText` regroups the server's own text (Indian grouping, paise only when
  there are any, a dash for text it cannot read, nothing for no amount); `rules.check.ts` chooses
  450.50, 0.20 and 99,99,99,99,999.99, and failed when `amountText` was made the web's `money()`.
- **The rule it leaves:** the figure someone is asked to approve is the server's, to the paisa.

### MAPR-2 · "3 days ago" would have read "-" on a phone (4 Nov)

- **What happened:** the route sends `requested_at::text`, Postgres's own text; the core's
  `relative` parses with `Date.parse`, which Hermes cannot do with that text (MEMORY 7).
- **How found:** reading the route's select.
- **What was done:** `askedWhen` converts with the core's `instant()` first; the check runs it with
  `Date.parse` made ISO-only, as Hermes, and failed when `instant()` was taken out.
- **The rule it leaves:** a server time goes through `instant()`; a check that only runs on node must
  imitate the phone's reader.
