# settings — defects (prefix MSET-, then the lane's letter)

Every defect found in the Settings console's own pages on the phone: what happened, how it was
found, what was done about it, and the rule it leaves. Fixed entries stay. Each lane appends its own
section; numbers carry the lane's letter so two lanes never take the same one.

## Lane m13-set-lists (letter L, 20 Nov)

Found by the independent review of `ac26af2` (20 Nov), all fixed on this branch:

- **MSET-L1 (medium): a second tap sent a whole list without the first change.** ID types
  (`idTypesOff`), Reservation types (`statusColours`) and Front desk rules' required fields
  (`requiredBookingFields`) are sent whole, built from the last read, and the server puts the list in
  place of its own (api lists.ts 272-277). After a write landed the controls were live again before
  the read came back, so a quick second switch sent a list missing the first. *Found:* the review.
  *Done:* after a write that landed the page stays grey until a read BEGUN after the write's end has
  come back (`<name>/fresh` in the core's stop book, lists.ts `writeOnce` / `watchPage`), and each
  control shows the value it sent meanwhile; check cases in `lists.check.ts` (broken once: without
  the mark, "landed, not yet read again" fails). *Rule:* a write that sends a whole list built from a
  read waits for the next read before the next write. **The web has the same race**
  (FrontDeskPage.tsx 69-70, ListPages.tsx 163-166 and 202-204: each change is sent from the hotel
  list in hand, re-read only after) - for `docs/api-requests.md`: ask the PMS to send one item's
  change (add or remove one ID type, one colour, one field) rather than the whole list.
- **MSET-L2: leaving the page mid-write let a second write go.** The page's latch was a `useRef` and
  the doubt a module map that only knew a lost write, not one on its way. *Done:* both replaced by the
  core's stop book (`src/core/stop.ts`, `stops`), which holds a write on its way outside React and
  waits 5 s after a lost reply before a read may let it go. *Rule:* MEMORY 22.
- **MSET-L3: Move up on two rows of the same order did nothing** (ported from the web's `swap`,
  which gives the moving row one more whichever way it moves; the server orders a tie by name).
  *Done:* on a tie the row to come first keeps the order and the other takes one more
  (`swapSorts(moving, other, up)`, only the sorts that change are sent); check cases apply each move
  to the server's order. The web's own Move up on a tie still does nothing - for the PMS.
- **MSET-L4: Times and rules drew the web's built-in defaults when the server sent no rules**, and
  Save would have sent them as the hotel's. *Done:* it says "The server sent no front desk settings
  for this property." with no card and no Save, as Front desk rules does.

Found in the web or the API (for `docs/api-requests.md`, through the mobile chat):
- **`POST /:code/holidays` fails on a day that is not real** (api/src/modules/front-desk/lists.ts
  137-152): the check is only the shape `^\d{4}-\d{2}-\d{2}$`, then `$2::date` throws for
  "2026-02-30" and the route answers a 500, not a sentence. The web's date box never sends one; the
  phone checks the day before it asks. Ask the PMS to refuse it with "Choose the day."
- **Two refusals say less than the truth.** `PATCH /lists/:kind/:id` turns ANY database error into
  "That one is on the list already." (line 94), and `POST /vip-levels` turns any into "The group's
  VIP levels are set by the owner or an administrator." (line 184) - while row security
  (`app.sets_group_settings`, 192) lets a GM change them too, and VipLevelsPage says "Only the owner
  or an administrator changes it". The phone shows the server's words as sent.
- **No idempotency key on these writes** (lists, holidays, VIP levels, desk-settings, front-desk).
  A repeat of an add is refused by the unique names ("on the list already", "a holiday already"),
  and the PATCHes set values, so a lost reply is not doubled; the phone still stops the page until a
  read begun after the loss is back (MEMORY 22).
- **The web's ListEditor moves with two PATCHes** (`swap`), not one: a failure between them leaves
  two rows on one sort until the next move. The phone does the same (ported), and reads again.
