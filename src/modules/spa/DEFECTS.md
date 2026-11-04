# Defects — spa (phone)

Numbering `MSPA-1`, `MSPA-2`, … Each entry: what happened, how it was found, what was done about it,
and the rule it leaves. Fixed entries stay. A fault in the PMS itself (its API or website) is not
fixed here: it goes to `docs/api-requests.md` through the mobile chat.

---

## Open

None yet.

## Fixed

### MSPA-1 · A typed "4:00" would have booked four in the morning, unseen (4 Nov) — fixed

**What happened:** the phone has no time picker (no package), so the booking's time is typed and
read by guest-services' `timeOf`, on the 24-hour clock: "4:00" is 04:00. A receptionist on the
telephone meaning four in the afternoon would have booked a therapist's 4 AM, and the only hint
("Type the time as 16:00…") showed only for a time it could not read. The web's time input shows
AM / PM itself, so the web never had this. **How found:** reading the first version of the Book
dialog against the web's, before the gates. **What was done:** under the field the phone now says
back what will be booked, as the diary will show it — "At 4:00 AM on 11 Oct 2026." (`diary.ts`
`timeWords`, checked, broken once). **The rule:** a value the phone reads from free typing is said
back in the words the screen will later show, before it is sent.

## Seen in the web twin, not the phone's (for the PMS, through the mobile chat)

- The web's `money()` prints whole rupees, so a treatment priced ₹1,250.50 reads ₹1,251 on the
  diary and in the booking's picker; the phone shows the server's figure (`diary.ts` `rupees`,
  MEMORY 9).
- A therapist's band says "1 today" on every day the diary shows, the day before and after too
  (`SpaDiary.tsx` 224). Kept as the web's words.
- The spa routes do not read the `idempotency-key`. Charge to room is safe (the row is locked and a
  second close answers "That treatment is already closed and on the bill."); Book it tapped again
  after a lost reply is refused by the therapist guard naming the person's own first booking, which
  reads as somebody else's.
- `POST /spa/appointments/:id/close` lets a stay that is `checked_out` or `cancelled` past its
  "not checked in yet" guard (`!["checked_in", "checked_out", "cancelled"].includes(...)`, spa.ts
  662); what then refuses it is finance's `postCharge`. Whether that is meant is the PMS's to say.

### MSPA-2 · Book could be sent twice after a lost reply (4 Nov) — narrowed at the merge

`POST /spa/appointments` reads no key (PMS R-30): a second tap after a lost reply books again (the
therapist guard then refuses it, naming the person's own first booking). On an unknown outcome the
Book dialog now takes no more taps: "Not known whether it was booked: close this and look at the
diary before booking again" (MEMORY 16).
