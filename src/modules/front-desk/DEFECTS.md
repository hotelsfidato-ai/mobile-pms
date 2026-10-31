# front desk — defects (MFD-n)

What happened, how it was found, what was done, the rule it leaves. Fixed entries stay.

## MFD-1 · The brief's route name would have failed the gate

`check-in/[stayId].tsx` (the brief's example) has a capital in its parameter; the gate's route check
(`scripts/gates.sh`, `\[[a-z]+\]`) cannot read it, so the bundle's routes would not equal `app/`.
**Done:** `[id]` here. **The rule:** route parameters are lower case until the gate's pattern changes
(the folio copy's `app/folio/[code]/[stayId].tsx` meets the same pattern: said in the report).

## MFD-2 · The spec moved under the copy

This copy's root is the PMS of 15 October; M-11's pictures are today's (`pms-ref`). Check-in lists
every room type (D27-330), blocks refuse a room (D27-339), voids leave the lists (FD-32), the walk-in
page gained the guest's company and a special request. Found by reading picture 14 against the
copy's `BookingPage.tsx`. **Done:** every rule re-read from `.claude/worktrees/pms-ref`.
**The rule:** the web twin is `pms-ref`, not the copy's own root.
