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

---

## Lane m13-config (19-20 Nov): the property's set-up — prefix MINV-C

### MINV-C1 · Several rooms carried on past a lost reply (19 Nov) — fixed before it ran

**What happened:** the web's "Several rooms" adds 101 to 109 one POST at a time and files every
failure as "already exists, skipped" or "not added: <reason>" and goes on. Ported as is, a reply
lost on 104 (the phone on a weak line) would have said "104 not added: Could not reach the server"
while the server may have made it, and gone on to 105-109. **How it was found:** the helper, asking
MEMORY 16's question of every POST in the lane. **What was done:** on `outcomeUnknown(e)` the run
stops at that number, the sheet says "Not known whether room 104 was added; nothing after it was
tried. Look at the rooms before adding again." and takes no more taps (`useStuck`);
`config.check.ts` holds the words (`severalWords`). **The rule:** a loop of creates stops at the
first unknown outcome; it never files one as refused.

### MINV-C2 · A room type added, then said "Not saved" (19 Nov) — fixed before it ran

**What happened:** the web adds a room type in two writes (POST the type, then PATCH its beds,
view, size, colour…) and answers either failure with "Not saved". When the second fails, the type
exists but the person reads that nothing was saved, and a second Save is refused ("This property
already has a type coded DLX"). **How it was found:** the helper, porting `TypeDialog.submit`.
**What was done:** on the phone the first write's success stands: "Room type added — its other
details were not saved: <the server's words> Edit it to try again." The web's fault is listed for
`docs/api-requests.md` in the report. **The rule:** a two-step write says which step stood.

### MINV-C3 · A server time read raw would show NaN on a phone (19 Nov) — guarded, checked

The channel manager's times (`lastLogin.at`, `sentAt`, `receivedAt`, a push's `at`) may be
Postgres text. `config.ts whenOf` reads every one through the core's `msAt` (MEMORY 7);
`config.check.ts` makes `Date.parse` ISO-only for the test, as Hermes is (MEMORY 17), and was broken
once (a raw `Date.parse`) to see it fail. **The rule:** as MEMORY 7.
