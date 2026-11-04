# inventory — defects (MINV-)

Every defect found in this module, numbered **MINV-1, MINV-2 …** (AGENTS.md). Each entry: what
happened, how it was found, what was done about it, and the rule it leaves. Fixed entries stay.
The web twin's own faults go to the PMS (`docs/api-requests.md`), not here.

---

### MINV-2 · A read per room type was a hook in a loop (4 Nov) — fixed before it ran

**What happened:** the first `Grid.tsx` called `useQuery` inside `pricing.roomTypes.map(...)` for
each type's break-up, as the web's one `BreakupRows` component per type does. A room type added or
switched off between two reads changes the number of hooks, and React stops the screen.
**How it was found:** the helper, re-reading the grid before its commit. **What was done:** one
`useQueries` over the room types. **The rule:** a read per item of a list is `useQueries`, never a
hook inside `map`.

### MINV-1 · A typed "4,099" would have cleared the base (4 Nov) — fixed before it ran

**What happened:** the web sends `Number(price)` from an `<input type="number">`, which cannot hold
a comma. Ported as is to a phone's text field, "4,099" (a decimal pad that offers a comma, or a
pasted figure) is `NaN`, which `JSON.stringify` writes as `null` — and `price: null` is the API's
**Clear**: the base would have been removed for every day of the range, with "Base set" on screen.
**How it was found:** the helper, porting `BaseDialog.save` and asking what `Number()` does with
what a phone can type. **What was done:** the field keeps only what can be sent (`rates.ts
typedPrice`: digits, one point, two places), empty sends nothing, and `rates.check.ts` holds that
"₹4,099.505" becomes 4099.50 and that an empty field never becomes a zero or a clear. **The rule:**
a figure typed on a phone is filtered to what can be sent before it is a number; `NaN` must never
reach a JSON body, where it is `null`.

### MINV-3 · An unknown outcome on a base price or a restriction: checked, safe (4 Nov) — no change

Checked applying MEMORY 16 across the modules: PUT pricing/base sets the price for the dates
(`app.set_base_price`), POST restrictions upserts each date (`on conflict … do update`), so a second
tap after a lost reply sets the same values again. **The rule:** a write that sets a value needs no
stop.
