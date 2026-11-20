# settings — defects (prefix MSET-, then the lane's letter)

Every defect found in the Settings console's own pages on the phone: what happened, how it was
found, what was done about it, and the rule it leaves. Fixed entries stay. Each lane appends its own
section; numbers carry the lane's letter so two lanes never take the same one.

## Lane m13-set-lists (letter L, 20 Nov)

None found in the phone's pages while building them.

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
