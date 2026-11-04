# reports — defects (MRP-)

Every defect found in this module, numbered **MRP-1, MRP-2 …** (AGENTS.md). Each entry: what
happened, how it was found, what was done about it, and the rule it leaves. Fixed entries stay.

---

### MRP-1 · Every role but the owner's opens All properties, not its Dashboard (4 Nov) — asked of the core

**What happened:** on the website the GM, the hotel manager, reception, the accountant and the
revenue manager start on their property's Dashboard (`/`, pictures `roles/r-gm-home`,
`r-hotel-manager-home`, `r-reception-home`, `r-accountant-home`, `r-revenue-home`); only the owner (a
group administrator) starts on All properties (`r-owner-home`). The phone's `app/index.tsx` sends all
of them to `/all`. **How it was found:** the align helper, matching the role pictures against the
routes. **What was done:** nothing in the frozen core; the exact change is asked of the mobile chat
(the align helper's report, 4 Nov): the owner to `/all`, anybody else to the shell's
`landing(role, code)` (mobile/shell `src/core/menu.ts`: their working home, else the Dashboard).
**The rule:** a role's first screen is its picture's (`roles/r-<role>-home`), not one screen for all.
