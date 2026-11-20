# reports — defects (MRP-)

Every defect found in this module, numbered **MRP-1, MRP-2 …** (AGENTS.md). Each entry: what
happened, how it was found, what was done about it, and the rule it leaves. Fixed entries stay.

---

### MRP-1 · Every role but the owner's opens All properties, not its Dashboard (4 Nov) — fixed at the merge

**What happened:** on the website the GM, the hotel manager, reception, the accountant and the
revenue manager start on their property's Dashboard (`/`, pictures `roles/r-gm-home`,
`r-hotel-manager-home`, `r-reception-home`, `r-accountant-home`, `r-revenue-home`); only the owner (a
group administrator) starts on All properties (`r-owner-home`). The phone's `app/index.tsx` sends all
of them to `/all`. **How it was found:** the align helper, matching the role pictures against the
routes. **What was done:** nothing in the frozen core; the exact change is asked of the mobile chat
(the align helper's report, 4 Nov): the owner to `/all`, anybody else to the shell's
`landing(role, code)` (mobile/shell `src/core/menu.ts`: their working home, else the Dashboard).
**Fixed** by the mobile chat at the merge (4 Nov): `app/index.tsx` sends the group's owner to `/all`
and anybody else to `landing(role, code)` (`src/core/menu.ts`, pinned by `menu.check.ts`).
**The rule:** a role's first screen is its picture's (`roles/r-<role>-home`), not one screen for all.

---

## Lane mobile/m13-rep-ops (19-20 Nov) — MRP-O

### MRP-O1 · The phone's menu port does not know the reports added on 16 Nov (19 Nov) — open, core

**What happened:** `src/core/menu.ts` is the web's menu as of 4 Nov. Today's `reports/nav.ts` adds NC
bills, Item sales, Money owed by age, Statement of account, Commission owed, GSTR-1, Input tax credit,
GST on advances and Group reports; the core's `mayReach` answers false for every role on those
addresses, so All reports could not use it to decide who sees them, and the frame's menu cannot list
them. **How found:** porting Index.tsx's `mayReach(role, path, modules)` for every row. **What was
done:** each row carries its nav.ts rule in `opsIndex.ts`, asked of the core's matrix (identical to
the PMS's); `opsIndex.check.ts` holds the two equal wherever the core has the entry, so they cannot
drift silently. The core's port is the mobile chat's to bring up to date (asked in the lane's
report). **The rule:** a lane that needs the web's reach for an address the core lacks carries the
web's rule beside a check against the core, never a guess.
