# Defects — reputation (phone)

Numbering `MREP-1`, `MREP-2`, … Each entry: what happened, how it was found, what was done about
it, and the rule it leaves. Fixed entries stay. A fault in the PMS itself (its API or website) is
not fixed here: it goes to `docs/api-requests.md` through the mobile chat.

---

## Open

### MREP-1 · An ask whose reply is lost can message the guest twice (4 Nov) — open, the PMS's

**What happened:** `POST /api/hotels/:code/reviews/:id/ask` never reads `idempotency-key`, and the
web's button sends again on a second tap whatever became of the first. A reply lost after the sender
had gone out, and the clerk tapping WhatsApp again, sends the guest a second review request - a
message outside the hotel that cannot be taken back. **How found:** reading the route for the
keeper rule (BRIEF-T2 "Keys"). **What was done:** the phone latches each way at the tap (MEMORY 8),
and on an outcome nobody knows (`outcomeUnknown`) says "Not known whether <guest> was asked for a
review" and keeps every way off until the list has been read again and the row's REVIEW ASKED is in
view (MEMORY 16). **Asked of the PMS:** read the key on the ask (the sender's `messages_sent` row is
the natural place to keep it). **The rule:** a write that leaves the hotel and reads no key stops on
an unknown outcome until the record is seen.

### MREP-2 · Definite refusals of the ask come back as 503 and 502, which read as an outcome nobody knows (4 Nov) — open, the PMS's

**What happened:** the ask answers 503 with `NOT_CONNECTED` when the sender is not connected - a
definite refusal, nothing attempted - and the sender's own "no" (a test hotel, or a send that
failed, recorded as "failed") comes back 502; 5xx is what the core's `outcomeUnknown` takes as
"maybe it went". **How found:** reading the route's refusals against the core's rule. **What was done:**
nothing special: the screen draws no way while `canSend` is false, so it is met only when the
sender goes down between the read and the tap; then the phone says "Not known whether…" with the
server's own sentence and asks for a read, which brings up the sender's card (or the row's "Did not
go" with its detail, after a 502). Safe, if wordier than
it needs to be. **Asked of the PMS:** answer the not-connected refusal 409 like the others, and the sender's own
no a 4xx with its reason, keeping 5xx for a send whose end is not known. **The rule:** a refusal
is a 4xx; a 5xx tells the phone it may have happened.

## Fixed

None yet.
