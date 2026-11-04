# pos — defects (MPOS-)

Every defect found in this module, numbered **MPOS-1, MPOS-2 …** (AGENTS.md). Each entry: what
happened, how it was found, what was done about it, and the rule it leaves. Fixed entries stay.
The web twin's own faults go to the PMS (`docs/api-requests.md`), not here.

---

None yet.

## Kitchen

### MPOS-K1 · The pass drew each column as its own scroll; the PMS at phone width is one page (4 Nov)

**What happened:** By stage put Ordered and On the fire in two side-by-side scrolls under fixed
printer lines, so at 375 px the printer lines and the chef's card took the top of the screen for
good and each column scrolled on its own.
**How found:** reading `reference/pms-shots/all/45-point-of-sale-kitchen.png` (4 Nov): the picture is
18000 px tall with both columns running down it, so the web's page scrolls as one.
**What was done:** one scroll under the header holds the printer lines, the stale line, Start here
and the board (By stage and By table), with one pull to refresh (`2dd8bb6`).
**The rule:** a full-length picture taller than the screen means the page scrolls as one; draw
inner scrolls only where the picture shows a clipped box.
